import { apiRequest, queryClient } from './queryClient';
import { formatCurrency, formatDate } from './mock-data';
import { calculateEarnedWage, calculateKenyanDeductions } from './tax-utils';

/**
 * Integration Service
 * 
 * This service handles data integration between different modules of the Jahazii application:
 * - Employee data connected to all subsystems
 * - Attendance records feeding into payroll and EWA calculations
 * - Payroll calculations affecting EWA availability
 * - EWA withdrawals updating net pay
 */

// Define types for better TypeScript support
interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  hourlyRate?: number;
  position?: string;
  status?: string;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  status: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  hoursWorked: number;
}

interface EWAWithdrawal {
  id: number;
  employeeId: number;
  amount: number;
  processingFee: number;
  status: string;
  requestDate: string;
  disbursementDate: string | null;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  netPay: number;
  taxDeductions: number;
  ewaDeductions: number;
  otherDeductions: number;
  status: string;
}

// Calculate earned wage for an employee based on attendance
export async function calculateEarnedWageFromAttendance(
  employeeId: number, 
  date?: Date
) {
  try {
    // Get employee details including salary
    const employee = await apiRequest<Employee>('GET', `/api/employees/${employeeId}`);
    if (!employee) return null;
    
    // Get attendance records for current pay period
    const attendance = await fetchAttendanceForPayPeriod(employeeId, date);
    if (!attendance || attendance.length === 0) return null;
    
    // Count working days
    const daysWorked = attendance.filter(
      (record) => record.status === 'present' || record.status === 'late'
    ).length;
    
    // Calculate total hours worked
    const hoursWorked = attendance.reduce(
      (total, record) => total + (record.hoursWorked || 0), 
      0
    );
    
    // Calculate earned wage based on days worked
    const earned = calculateEarnedWage(
      employee.salary, 
      daysWorked, 
      getWorkingDaysInMonth()
    );
    
    return {
      employeeId,
      daysWorked,
      hoursWorked,
      earnedWage: earned,
      totalSalary: employee.salary,
      asOfDate: date || new Date()
    };
  } catch (error) {
    console.error('Error calculating earned wage:', error);
    return null;
  }
}

// Calculate available amount for EWA based on earned wage and existing withdrawals
export async function calculateAvailableEWA(employeeId: number) {
  try {
    // Get earned wage calculation
    const earnedData = await calculateEarnedWageFromAttendance(employeeId);
    if (!earnedData) return null;
    
    // Get existing EWA withdrawals for current period
    const withdrawals = await fetchEWAWithdrawalsForPeriod(employeeId);
    
    // Calculate total already withdrawn
    const totalWithdrawn = withdrawals.reduce(
      (total, withdrawal) => total + withdrawal.amount, 
      0
    );
    
    // Calculate maximum allowed percentage (normally 50-70% of earned wage)
    const maxAllowedPercentage = 0.5; // 50% of earned wage
    
    // Calculate available amount
    const maxAvailable = earnedData.earnedWage * maxAllowedPercentage;
    const actualAvailable = Math.max(0, maxAvailable - totalWithdrawn);
    
    return {
      employeeId,
      earned: earnedData.earnedWage,
      totalWithdrawn,
      maxAllowedPercentage,
      availableAmount: actualAvailable,
      asOfDate: new Date()
    };
  } catch (error) {
    console.error('Error calculating available EWA:', error);
    return null;
  }
}

// Update payroll based on EWA withdrawals
export async function updatePayrollWithEWA(payrollId: number) {
  try {
    // Get payroll record
    const payroll = await apiRequest<PayrollRecord>('GET', `/api/payroll/${payrollId}`);
    if (!payroll) return null;
    
    // Get all EWA withdrawals for this employee in this period
    const withdrawals = await fetchEWAWithdrawalsForPeriod(
      payroll.employeeId,
      new Date(payroll.periodStart),
      new Date(payroll.periodEnd)
    );
    
    // Calculate total EWA deductions
    const totalEWADeductions = withdrawals.reduce(
      (total, withdrawal) => total + withdrawal.amount + withdrawal.processingFee, 
      0
    );
    
    // Recalculate net pay
    const netPay = payroll.grossPay - totalEWADeductions - payroll.taxDeductions - payroll.otherDeductions;
    
    // Update payroll record
    const updatedPayroll = await apiRequest<PayrollRecord>(
      'PATCH',
      `/api/payroll/${payrollId}`,
      {
        ewaDeductions: totalEWADeductions,
        netPay
      }
    );
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/payroll'] });
    
    return updatedPayroll;
  } catch (error) {
    console.error('Error updating payroll with EWA:', error);
    return null;
  }
}

// Calculate payroll based on attendance records
export async function calculatePayrollFromAttendance(
  employeeId: number, 
  periodStart: Date, 
  periodEnd: Date
) {
  try {
    // Get employee details
    const employee = await apiRequest<Employee>('GET', `/api/employees/${employeeId}`);
    if (!employee) return null;
    
    // Get attendance records for the period
    const attendance = await apiRequest<AttendanceRecord[]>(
      'GET',
      `/api/attendance?employeeId=${employeeId}&startDate=${periodStart.toISOString()}&endDate=${periodEnd.toISOString()}`
    );
    
    if (!attendance || attendance.length === 0) return null;
    
    // Calculate total hours worked
    const hoursWorked = attendance.reduce(
      (total, record) => total + (record.hoursWorked || 0), 
      0
    );
    
    // Calculate gross pay based on hours worked and hourly rate
    // Assuming employee.salary is monthly salary
    const workingDays = getWorkingDaysInMonth(periodStart, periodEnd);
    const hoursPerDay = 8; // Standard work day hours
    const hourlyRate = employee.salary / (workingDays * hoursPerDay);
    const grossPay = hoursWorked * hourlyRate;
    
    // Calculate tax and other deductions
    const { paye, nhif, nssf, housingLevy, totalDeductions, netPay } = 
      calculateKenyanDeductions(grossPay);
    
    // Get existing EWA withdrawals
    const withdrawals = await fetchEWAWithdrawalsForPeriod(
      employeeId, 
      periodStart, 
      periodEnd
    );
    
    // Calculate total EWA deductions
    const ewaDeductions = withdrawals.reduce(
      (total, withdrawal) => total + withdrawal.amount + withdrawal.processingFee, 
      0
    );
    
    // Calculate final net pay
    const finalNetPay = netPay - ewaDeductions;
    
    return {
      employeeId,
      employeeName: employee.name,
      department: employee.department,
      periodStart: formatDate(periodStart.toISOString()),
      periodEnd: formatDate(periodEnd.toISOString()),
      hoursWorked,
      hourlyRate,
      grossPay,
      taxDeductions: paye + nhif + nssf + housingLevy,
      ewaDeductions,
      otherDeductions: 0, // Other deductions can be added here
      netPay: finalNetPay,
      status: 'pending'
    };
  } catch (error) {
    console.error('Error calculating payroll from attendance:', error);
    return null;
  }
}

// Update attendance record and propagate changes
export async function updateAttendanceAndPropagate(
  attendanceId: number,
  updates: Record<string, any>
) {
  try {
    // Update the attendance record
    const updatedAttendance = await apiRequest<AttendanceRecord>(
      'PATCH',
      `/api/attendance/${attendanceId}`,
      updates
    );
    
    if (!updatedAttendance) return null;
    
    // Get the employee ID from the attendance record
    const employeeId = updatedAttendance.employeeId;
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/payroll'] });
    queryClient.invalidateQueries({ queryKey: ['/api/ewa'] });
    
    // Optionally, we could recalculate payroll and EWA here
    // This would happen automatically via API if server-side logic is implemented
    
    return updatedAttendance;
  } catch (error) {
    console.error('Error updating attendance and propagating changes:', error);
    return null;
  }
}

// Helper function to get attendance for a pay period
async function fetchAttendanceForPayPeriod(
  employeeId: number, 
  referenceDate?: Date
): Promise<AttendanceRecord[]> {
  const date = referenceDate || new Date();
  const { start, end } = getCurrentPayPeriod(date);
  
  try {
    const results = await apiRequest<AttendanceRecord[]>(
      'GET',
      `/api/attendance?employeeId=${employeeId}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`
    );
    return results || [];
  } catch (error) {
    console.error('Error fetching attendance for pay period:', error);
    return [];
  }
}

// Helper function to get EWA withdrawals for a period
async function fetchEWAWithdrawalsForPeriod(
  employeeId: number,
  startDate?: Date,
  endDate?: Date
): Promise<EWAWithdrawal[]> {
  let start, end;
  
  if (!startDate || !endDate) {
    const period = getCurrentPayPeriod();
    start = period.start;
    end = period.end;
  } else {
    start = startDate;
    end = endDate;
  }
  
  try {
    const results = await apiRequest<EWAWithdrawal[]>(
      'GET',
      `/api/ewa/requests?employeeId=${employeeId}&startDate=${start.toISOString()}&endDate=${end.toISOString()}&status=disbursed`
    );
    return results || [];
  } catch (error) {
    console.error('Error fetching EWA withdrawals:', error);
    return [];
  }
}

// Helper function to get the current pay period
export function getCurrentPayPeriod(referenceDate?: Date) {
  const date = referenceDate || new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Assuming pay periods are calendar months
  // Can be modified for different pay period structures
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  
  return { start, end };
}

// Helper function to get working days in a month (excluding weekends)
export function getWorkingDaysInMonth(startDate?: Date, endDate?: Date) {
  const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  
  let workingDays = 0;
  let current = new Date(start);
  
  while (current <= end) {
    // 0 = Sunday, 6 = Saturday
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}