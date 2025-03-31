import { type Employee, type EmployeePayrollCalculation } from "shared/schema";
import { calculateKenyanDeductions } from "@/lib/tax-utils"; // Assuming this is accessible or can be bundled
import { eachDayOfInterval, isWeekend, endOfDay, startOfDay } from "date-fns"; // Add date-fns imports

// --- Types for Worker Communication ---

interface CalculationPayload {
  employees: Employee[];
  period: {
    startDate: string;
    endDate: string;
  };
}

interface IncomingMessage {
  type: "CALCULATE";
  payload: CalculationPayload;
}

interface ProgressMessage {
  type: "PROGRESS";
  payload: number; // Percentage complete (0-100)
}

interface ResultMessage {
  type: "RESULT";
  payload: EmployeePayrollCalculation[];
}

interface ErrorMessage {
  type: "ERROR";
  payload: string; // Error message
}

type OutgoingMessage = ProgressMessage | ResultMessage | ErrorMessage;

// --- Helper Functions (Copied from process.tsx) ---

const getWorkingDaysInPeriod = (startDate: Date, endDate: Date): number => {
  // Ensure we have clean start and end dates
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);

  // Get all days in the interval
  const days = eachDayOfInterval({ start, end });

  // Count days that are not weekends
  return days.filter(day => !isWeekend(day)).length;
};

// Calculate payroll for a single employee (Copied from process.tsx)
const calculateEmployeePayroll = (
  employee: Employee,
  period: { startDate: string; endDate: string }
): EmployeePayrollCalculation => {
  try {
    const hourlyRate = Number(employee.hourlyRate) || 0;
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // TODO: Replace this with actual attendance data fetching if needed later
    const workingDays = getWorkingDaysInPeriod(startDate, endDate);
    const attendanceRate = 0.9; // Assume 90% attendance as fallback
    const hoursWorked = Math.round(workingDays * 8 * attendanceRate);
    const overtimeHours = 0; // Assume no overtime in fallback

    const grossPay =
      hoursWorked * hourlyRate + overtimeHours * hourlyRate * 1.5;

    // TODO: Replace random deductions with actual data fetching if needed later
    const ewaDeductions = Math.max(0, Math.floor(Math.random() * (grossPay * 0.3))); // Limit EWA
    const loanDeductions = Math.max(0, Math.floor(Math.random() * (grossPay * 0.2))); // Limit loans

    const deductions = calculateKenyanDeductions(grossPay);
    const totalDeductions =
      deductions.totalDeductions + ewaDeductions + loanDeductions;
    const netPay = grossPay - totalDeductions;

    let status: "complete" | "warning" | "error" = "complete";
    let statusReason = "";

    if (netPay < 0) {
      status = "error";
      statusReason = "Net pay is negative";
    } else if (totalDeductions > grossPay * 0.8) { // Increase warning threshold slightly
      status = "warning";
      statusReason = "Deductions exceed 80% of gross pay";
    } else if (hourlyRate <= 0) {
        status = "warning";
        statusReason = "Missing or invalid hourly rate";
    }

    return {
      id: employee.id,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber || "",
      name: `${employee.other_names || ""} ${employee.surname || ""}`.trim(),
      role: employee.department?.name || "",
      position: employee.position || "",
      hoursWorked,
      overtimeHours,
      hourlyRate,
      grossPay,
      taxableIncome: grossPay,
      paye: deductions.paye,
      nhif: deductions.nhif,
      nssf: deductions.nssf,
      housingLevy: deductions.housingLevy,
      ewaDeductions,
      loanDeductions,
      otherDeductions: 0, // Assuming other deductions are part of loan deductions for now
      totalDeductions,
      netPay,
      status,
      statusReason,
      isEdited: false, // Default to not edited
      mpesaNumber: employee.contact?.phoneNumber,
      bankName: employee.bank_info?.bankName,
      bankAccountNumber: employee.bank_info?.accountNumber,
      periodStart: startDate,
      periodEnd: endDate,
    };
  } catch (error: any) {
    console.error(`Error calculating payroll for ${employee.id}:`, error);
    // Return a minimal error state object
    return {
      id: employee.id,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber || "",
      name: `${employee.other_names || ""} ${employee.surname || ""}`.trim(),
      role: employee.department?.name || "",
      position: employee.position || "",
      hoursWorked: 0, overtimeHours: 0, hourlyRate: 0, grossPay: 0, taxableIncome: 0,
      paye: 0, nhif: 0, nssf: 0, housingLevy: 0,
      ewaDeductions: 0, loanDeductions: 0, otherDeductions: 0, totalDeductions: 0, netPay: 0,
      status: "error",
      statusReason: `Calculation failed: ${error.message}`,
      isEdited: false,
      periodStart: new Date(period.startDate),
      periodEnd: new Date(period.endDate),
    };
  }
};

// --- Worker Logic ---

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  if (event.data.type === "CALCULATE") {
    const { employees, period } = event.data.payload;
    const totalEmployees = employees.length;
    const results: EmployeePayrollCalculation[] = [];
    const BATCH_SIZE = 10; // How often to report progress

    try {
      for (let i = 0; i < totalEmployees; i++) {
        const employee = employees[i];
        const calculation = calculateEmployeePayroll(employee, period);
        results.push(calculation);

        // Report progress periodically
        if ((i + 1) % BATCH_SIZE === 0 || i === totalEmployees - 1) {
          const progress = Math.round(((i + 1) / totalEmployees) * 100);
          const progressMessage: ProgressMessage = { type: "PROGRESS", payload: progress };
          self.postMessage(progressMessage);
        }
      }

      // Send final results
      const resultMessage: ResultMessage = { type: "RESULT", payload: results };
      self.postMessage(resultMessage);

    } catch (error: any) {
      console.error("Error in payroll worker:", error);
      const errorMessage: ErrorMessage = { type: "ERROR", payload: error.message || "An unknown error occurred in the worker." };
      self.postMessage(errorMessage);
    }
  }
};

// Add a handler for unhandled errors within the worker
self.onerror = (error) => {
    console.error("Unhandled worker error:", error);
    const errorMessage: ErrorMessage = { type: "ERROR", payload: `Unhandled worker error: ${error}` };
    self.postMessage(errorMessage);
};

console.log("Payroll worker initialized.");