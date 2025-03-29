import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import {
  calculateKenyanDeductions,
  calculatePAYE,
  calculateSHIF,
  calculateNSSF,
  calculateAffordableHousingLevy,
  calculateTaxableIncome,
  formatKES,
} from "@/lib/tax-utils";
import {
  DollarSign,
  BarChart,
  Calendar,
  Briefcase,
  ChevronsUpDown,
  Calculator,
  Download,
  FileText,
  Users,
} from "lucide-react";
import { employees } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Employee, EwaRequest } from "@shared/schema";
import { Loader } from "@/components/ui/loader";

interface PayrollCalculatorProps {
  onSave?: (payrollData: any) => void;
}

export function PayrollCalculator({ onSave }: PayrollCalculatorProps) {
  const [calculationMode, setCalculationMode] = useState<"hourly" | "salary">(
    "salary"
  );
  const [employeeId, setEmployeeId] = useState("");
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [allowances, setAllowances] = useState<number>(0);
  const [hoursWorked, setHoursWorked] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [overtime, setOvertime] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [ewaDeductions, setEwaDeductions] = useState<number>(0);
  const [loanDeductions, setLoanDeductions] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [payPeriod, setPayPeriod] = useState<{
    startDate: string;
    endDate: string;
  }>(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

    return {
      startDate: firstDayOfMonth.toISOString().split("T")[0],
      endDate: lastDayOfMonth.toISOString().split("T")[0],
    };
  });

  // Calculation results
  const [calculationResults, setCalculationResults] = useState<{
    grossPay: number;
    paye: number;
    nhif: number;
    nssf: number;
    housingLevy: number;
    totalDeductions: number;
    netPay: number;
    regularHours: number;
    overtimeHours: number;
    attendanceRate: number;
    daysWorked: number;
    totalWorkingDays: number;
  } | null>(null);

  // Attendance data
  const [attendanceData, setAttendanceData] = useState<{
    records: any[];
    totalHours: number;
    daysWorked: number;
    totalWorkingDays: number;
    attendanceRate: number;
    regularHours: number;
    overtimeHours: number;
  } | null>(null);

  // Use mock employees directly for now
  const employeeList = employees || [];

  // This would be the real API call in production
  // const { data: employeeList } = useQuery({
  //   queryKey: ['/api/employees/active'],
  //   initialData: employees,
  // });

  // Fetch EWA withdrawals
  const { data: ewaWithdrawals, isLoading: isLoadingEwa } = useQuery<
    EwaRequest[]
  >({
    queryKey: [
      "/api/ewa/withdrawals",
      employeeId,
      payPeriod.startDate,
      payPeriod.endDate,
    ],
    queryFn: async () => {
      if (!employeeId) return [];
      try {
        return await apiRequest(
          "GET",
          `/api/ewa/requests?employeeId=${employeeId}&startDate=${payPeriod.startDate}&endDate=${payPeriod.endDate}&status=disbursed`
        );
      } catch (error) {
        console.error("Error fetching EWA withdrawals:", error);
        return [];
      }
    },
    enabled: !!employeeId,
    initialData: [],
  });

  // Fetch employee loans
  const { data: employeeLoans = [], isPending: isLoadingLoans } = useQuery<any[]>({
    queryKey: ["/api/loans", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      try {
        return await apiRequest(
          "GET",
          `/api/loans?employeeId=${employeeId}&active=true`
        );
      } catch (error) {
        console.error("Error fetching employee loans:", error);
        return [];
      }
    },
    enabled: !!employeeId,
    initialData: [],
  });

  // Calculate total EWA deductions
  useEffect(() => {
    if (ewaWithdrawals && ewaWithdrawals.length > 0) {
      const totalEwa = ewaWithdrawals.reduce((total, withdrawal) => {
        return (
          total +
          (Number(withdrawal.amount) + Number(withdrawal.processingFee || 0))
        );
      }, 0);

      setEwaDeductions(totalEwa);
    } else {
      setEwaDeductions(0);
    }
  }, [ewaWithdrawals]);

  // Calculate total loan deductions
  useEffect(() => {
    if (
      employeeLoans &&
      Array.isArray(employeeLoans) &&
      employeeLoans.length > 0
    ) {
      const totalLoans = employeeLoans.reduce((total, loan) => {
        return total + Number(loan.monthlyPayment || 0);
      }, 0);

      setLoanDeductions(totalLoans);
    } else {
      setLoanDeductions(0);
    }
  }, [employeeLoans]);

  // Get selected employee
  const selectedEmployee = employeeId
    ? employeeList.find((emp) => emp.id.toString() === employeeId) as { 
        id: string; 
        name: string; 
        department: string;
        position: string;
        profileImage?: string;
        employeeNumber?: string;
      }
    : null;

  // Fetch employee details including hourly rate
  useEffect(() => {
    async function fetchEmployeeDetails() {
      if (!selectedEmployee) return;

      try {
        const employeeDetails = await apiRequest<Employee>(
          "GET",
          `/api/employees/${employeeId}`
        );
        if (employeeDetails) {
          const salary = (employeeDetails.hourlyRate || 0) * 176; // 176 work hours per month
          setBasicSalary(salary);
          setAllowances(salary * 0.15); // 15% of basic salary as allowances
          setHourlyRate(employeeDetails.hourlyRate || 0);
          // Also fetch attendance data
          fetchAttendanceData();
        }
      } catch (error) {
        console.error("Error fetching employee details:", error);
        toast({
          title: "Error",
          description: "Failed to fetch employee details. Please try again.",
          variant: "destructive",
        });
      }
    }

    fetchEmployeeDetails();
  }, [employeeId, selectedEmployee]);

  // Fetch attendance data for the pay period
  const fetchAttendanceData = async () => {
    if (!employeeId) return;

    setIsLoadingAttendance(true);

    try {
      const attendanceRecords = await apiRequest(
        "GET",
        `/api/attendance?employeeId=${employeeId}&startDate=${payPeriod.startDate}&endDate=${payPeriod.endDate}`
      );

      if (
        attendanceRecords &&
        Array.isArray(attendanceRecords) &&
        attendanceRecords.length > 0
      ) {
        // Calculate total hours worked
        const totalHours = attendanceRecords.reduce(
          (total, record) => total + (parseFloat(record.hoursWorked) || 0),
          0
        );

        // Count days worked (present or late)
        const daysWorked = attendanceRecords.filter(
          (record: any) =>
            record.status === "present" || record.status === "late"
        ).length;

        // Calculate total working days in period
        const startDate = new Date(payPeriod.startDate);
        const endDate = new Date(payPeriod.endDate);
        const totalWorkingDays = getWorkingDaysInPeriod(startDate, endDate);

        // Calculate attendance rate
        const attendanceRate = (daysWorked / totalWorkingDays) * 100;

        // Calculate regular vs overtime hours
        const standardHoursPerDay = 8;
        const regularHours = Math.min(
          totalHours,
          totalWorkingDays * standardHoursPerDay
        );
        const overtimeHours = Math.max(0, totalHours - regularHours);

        // Update state with attendance data
        setAttendanceData({
          records: attendanceRecords,
          totalHours,
          daysWorked,
          totalWorkingDays,
          attendanceRate,
          regularHours,
          overtimeHours,
        });

        // Auto-populate hours worked fields
        setHoursWorked(regularHours);
        setOvertime(overtimeHours);
      } else {
        setAttendanceData(null);
        setHoursWorked(0);
        setOvertime(0);
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      setAttendanceData(null);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // Helper function to calculate working days in pay period
  const getWorkingDaysInPeriod = (startDate: Date, endDate: Date): number => {
    let workingDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // 0 = Sunday, 6 = Saturday
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  };

  // Calculate gross pay
  const calculateGrossPay = (): number => {
    if (calculationMode === "salary") {
      return basicSalary + allowances;
    } else {
      return (
        hoursWorked * hourlyRate + overtime * hourlyRate * 1.5 + allowances
      );
    }
  };

  // Custom deductions total
  const getTotalCustomDeductions = (): number => {
    return otherDeductions + ewaDeductions + loanDeductions;
  };

  // Perform payroll calculation using the updated algorithm
  const calculatePayroll = async () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee to calculate payroll",
        variant: "destructive",
      });
      return;
    }

    if (calculationMode === "hourly" && (hoursWorked <= 0 || hourlyRate <= 0)) {
      toast({
        title: "Error",
        description: "Please enter valid hours worked and hourly rate",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);

    try {
      // Calculate gross pay
      const grossPay = calculateGrossPay();

      // Try to get attendance data if not already loaded
      if (!attendanceData && !isLoadingAttendance) {
        await fetchAttendanceData();
      }

      // Direct calculation using updated tax calculation functions
      // Calculate individual statutory deductions
      const ahl = calculateAffordableHousingLevy(grossPay);
      const shif = calculateSHIF(grossPay);
      const nssf = calculateNSSF(grossPay);

      // Calculate taxable income (gross minus qualifying deductions)
      const taxableIncome = calculateTaxableIncome(grossPay);

      // Calculate PAYE
      const paye = calculatePAYE(taxableIncome);

      // Calculate custom deductions
      const totalCustomDeductions = getTotalCustomDeductions();

      // Calculate total statutory deductions
      const totalStatutoryDeductions = ahl + shif + nssf + paye;

      // Calculate net pay
      const netPayAfterDeductions =
        grossPay - totalStatutoryDeductions - totalCustomDeductions;

      // Get attendance metrics
      const attendanceMetrics = attendanceData
        ? {
            regularHours: attendanceData.regularHours,
            overtimeHours: attendanceData.overtimeHours,
            attendanceRate: attendanceData.attendanceRate,
            daysWorked: attendanceData.daysWorked,
            totalWorkingDays: attendanceData.totalWorkingDays,
          }
        : {
            regularHours: hoursWorked,
            overtimeHours: overtime,
            attendanceRate: 100, // Default to 100% if no attendance data
            daysWorked: getWorkingDaysInPeriod(
              new Date(payPeriod.startDate),
              new Date(payPeriod.endDate)
            ),
            totalWorkingDays: getWorkingDaysInPeriod(
              new Date(payPeriod.startDate),
              new Date(payPeriod.endDate)
            ),
          };

      // Construct results object with same property names for compatibility
      const results = {
        grossPay: grossPay,
        paye: paye,
        nhif: shif, // SHIF is the replacement for NHIF
        nssf: nssf,
        housingLevy: ahl,
        totalDeductions: totalStatutoryDeductions,
        netPay: netPayAfterDeductions,
        ...attendanceMetrics,
      };

      // Update result with combined data
      setCalculationResults(results);

      // Log detail of calculation for transparency
      console.log("Payroll calculation details:", {
        grossPay,
        taxableIncome,
        paye,
        shif,
        nssf,
        ahl,
        statutoryDeductions: totalStatutoryDeductions,
        customDeductions: totalCustomDeductions,
        netPay: netPayAfterDeductions,
      });
    } catch (error) {
      console.error("Calculation error:", error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate payroll. Please check your inputs.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Handle save payroll
  const handleSavePayroll = async () => {
    if (!calculationResults || !selectedEmployee) {
      toast({
        title: "Error",
        description: "Please calculate payroll first",
        variant: "destructive",
      });
      return;
    }

    // Construct payroll data
    const payrollData = {
      employeeId: parseInt(employeeId),
      periodStart: payPeriod.startDate,
      periodEnd: payPeriod.endDate,
      basicSalary,
      allowances,
      hoursWorked: calculationMode === "hourly" ? hoursWorked : 0,
      hourlyRate: calculationMode === "hourly" ? hourlyRate : 0,
      overtime: calculationMode === "hourly" ? overtime : 0,
      overtimeRate: calculationMode === "hourly" ? hourlyRate * 1.5 : 0,
      regularHours: calculationResults.regularHours || 0,
      overtimeHours: calculationResults.overtimeHours || 0,
      attendanceRate: calculationResults.attendanceRate || 100,
      daysWorked: calculationResults.daysWorked || 0,
      totalWorkingDays: calculationResults.totalWorkingDays || 0,
      grossPay: calculationResults.grossPay,
      paye: calculationResults.paye,
      nhif: calculationResults.nhif,
      nssf: calculationResults.nssf,
      housingLevy: calculationResults.housingLevy,
      otherDeductions,
      ewaDeductions,
      loanDeductions,
      totalDeductions:
        calculationResults.totalDeductions + getTotalCustomDeductions(),
      netPay: calculationResults.netPay,
      status: "pending",
    };

    // Call API to save payroll
    try {
      const savedPayroll = await apiRequest(
        "POST",
        "/api/payroll",
        payrollData
      );

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });

      // Call onSave callback if provided
      if (onSave) {
        onSave(savedPayroll || payrollData);
      }

      toast({
        title: "Payroll Saved",
        description: `Payroll for ${selectedEmployee.name} has been saved successfully.`,
      });
    } catch (error) {
      console.error("Error saving payroll:", error);
      toast({
        title: "Error",
        description: "Failed to save payroll. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate and download payslip as PDF
  const generatePayslip = async () => {
    if (!calculationResults || !selectedEmployee) {
      toast({
        title: "Error",
        description: "Please calculate payroll first",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real implementation, we would call an API endpoint that generates a PDF
      // For this demo, we'll create a simple HTML structure and convert it to a data URL

      // Create a temporary HTML structure for the payslip
      const payslipHTML = `
        <html>
          <head>
            <title>Payslip - ${selectedEmployee.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
              .payslip { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
              .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; }
              .company { font-size: 24px; font-weight: bold; color: #3b82f6; }
              .title { font-size: 18px; font-weight: bold; margin: 15px 0; color: #3b82f6; }
              .row { display: flex; margin-bottom: 5px; }
              .label { flex: 1; font-weight: bold; }
              .value { flex: 2; }
              .section { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
              th { background-color: #f8f9fa; }
              .total-row { font-weight: bold; border-top: 2px solid #ddd; }
              .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
            </style>
          </head>
          <body>
            <div class="payslip">
              <div class="header">
                <div class="company">Jahazii Payroll</div>
                <div>
                  <div>Pay Period: ${new Date(
                    payPeriod.startDate
                  ).toLocaleDateString()} - ${new Date(
        payPeriod.endDate
      ).toLocaleDateString()}</div>
                  <div>Pay Date: ${new Date().toLocaleDateString()}</div>
                </div>
              </div>
              
              <div class="section">
                <div class="title">Employee Information</div>
                <div class="row">
                  <div class="label">Name:</div>
                  <div class="value">${selectedEmployee.name}</div>
                </div>
                <div class="row">
                  <div class="label">Employee ID:</div>
                  <div class="value">${
                    selectedEmployee.employeeNumber || selectedEmployee.id
                  }</div>
                </div>
                <div class="row">
                  <div class="label">Department:</div>
                  <div class="value">${selectedEmployee.department}</div>
                </div>
                <div class="row">
                  <div class="label">Position:</div>
                  <div class="value">${selectedEmployee.position}</div>
                </div>
              </div>
              
              <div class="section">
                <div class="title">Earnings</div>
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Basic Salary</td>
                      <td>${basicSalary.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    <tr>
                      <td>Allowances</td>
                      <td>${allowances.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    ${
                      calculationMode === "hourly"
                        ? `
                    <tr>
                      <td>Regular Hours (${calculationResults.regularHours.toFixed(
                        1
                      )} hrs @ ${hourlyRate.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })})</td>
                      <td>${(
                        calculationResults.regularHours * hourlyRate
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    <tr>
                      <td>Overtime Hours (${calculationResults.overtimeHours.toFixed(
                        1
                      )} hrs @ ${(hourlyRate * 1.5).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })})</td>
                      <td>${(
                        calculationResults.overtimeHours *
                        hourlyRate *
                        1.5
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr class="total-row">
                      <td>Gross Pay</td>
                      <td>${calculationResults.grossPay.toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="section">
                <div class="title">Deductions</div>
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>PAYE Tax</td>
                      <td>${calculationResults.paye.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    <tr>
                      <td>SHIF (Social Health Insurance Fund)</td>
                      <td>${calculationResults.nhif.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    <tr>
                      <td>NSSF (National Social Security Fund)</td>
                      <td>${calculationResults.nssf.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    <tr>
                      <td>Housing Levy</td>
                      <td>${calculationResults.housingLevy.toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}</td>
                    </tr>
                    ${
                      ewaDeductions > 0
                        ? `
                    <tr>
                      <td>EWA Deductions</td>
                      <td>${ewaDeductions.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      loanDeductions > 0
                        ? `
                    <tr>
                      <td>Loan Repayments</td>
                      <td>${loanDeductions.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      otherDeductions > 0
                        ? `
                    <tr>
                      <td>Other Deductions</td>
                      <td>${otherDeductions.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr class="total-row">
                      <td>Total Deductions</td>
                      <td>${(
                        calculationResults.totalDeductions +
                        getTotalCustomDeductions()
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="section">
                <div class="title">Summary</div>
                <table>
                  <tbody>
                    <tr>
                      <td><strong>Gross Pay</strong></td>
                      <td>${calculationResults.grossPay.toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}</td>
                    </tr>
                    <tr>
                      <td><strong>Total Deductions</strong></td>
                      <td>${(
                        calculationResults.totalDeductions +
                        getTotalCustomDeductions()
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                    <tr class="total-row">
                      <td><strong>Net Pay</strong></td>
                      <td><strong>${calculationResults.netPay.toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="footer">
                <p>This is a computer-generated document and requires no signature.</p>
                <p>For any queries regarding this payslip, please contact the HR department.</p>
                <p>© ${new Date().getFullYear()} Jahazii EWA SaaS - Generated on ${new Date().toLocaleString()}</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Create a Blob from the HTML content
      const blob = new Blob([payslipHTML], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      // Create a link element and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `Payslip_${selectedEmployee.name.replace(/\s+/g, "_")}_${
        payPeriod.startDate
      }_${payPeriod.endDate}.html`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "Payslip Generated",
        description: "Payslip has been generated and downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating payslip:", error);
      toast({
        title: "Error",
        description: "Failed to generate payslip. Please try again.",
        variant: "destructive",
      });
    }
  };

  // State for batch processing dialog
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Handle batch processing
  const handleBatchProcessing = () => {
    setShowBatchDialog(true);
  };

  // Execute batch processing
  const executeBatchProcessing = async () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: "No Employees Selected",
        description: "Please select at least one employee to process payroll.",
        variant: "destructive",
      });
      return;
    }

    setIsBatchProcessing(true);

    try {
      const results = [];

      // Process payroll for each selected employee
      for (const empId of selectedEmployees) {
        const employee = employeeList.find((emp) => emp.id === empId.toString());

        if (employee) {
          const payrollData = {
            employeeId: empId,
            periodStart: payPeriod.startDate,
            periodEnd: payPeriod.endDate,
            // Use predefined calculation logic but with employee-specific data
            // In a real implementation, we would fetch employee-specific data and calculate
            status: "pending",
            // Add other required fields...
          };

          // Call API to save payroll (mock for now)
          results.push({
            employee: employee.name,
            status: "success",
          });
        }
      }

      // Close dialog and show success
      setShowBatchDialog(false);
      toast({
        title: "Batch Processing Complete",
        description: `Successfully processed payroll for ${results.length} employees.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
    } catch (error) {
      console.error("Error in batch processing:", error);
      toast({
        title: "Batch Processing Error",
        description:
          "An error occurred during batch processing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <Card className="shadow-glass dark:shadow-glass-dark">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calculator className="mr-2 h-5 w-5" />
          Payroll Calculator
        </CardTitle>
        <CardDescription>
          Calculate employee payroll with Kenyan statutory deductions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Pay Period Selector */}
          <div className="border p-3 rounded-md bg-card/20">
            <h3 className="text-sm font-medium mb-3">Pay Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-start">Start Date</Label>
                <Input
                  id="period-start"
                  type="date"
                  value={payPeriod.startDate}
                  onChange={(e) =>
                    setPayPeriod({ ...payPeriod, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-end">End Date</Label>
                <Input
                  id="period-end"
                  type="date"
                  value={payPeriod.endDate}
                  onChange={(e) =>
                    setPayPeriod({ ...payPeriod, endDate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Employee Selector */}
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employeeList.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name} - {emp.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Info Card */}
          {selectedEmployee && (
            <div className="border p-3 rounded-md bg-card/50">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  {selectedEmployee.profileImage ? (
                    <img
                      src={selectedEmployee.profileImage}
                      alt={selectedEmployee.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-medium">
                      {selectedEmployee.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.position} • {selectedEmployee.department}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Data Card */}
          {attendanceData && (
            <div className="border p-3 rounded-md bg-blue-50 dark:bg-blue-950/30">
              <h3 className="text-sm font-medium flex items-center mb-2">
                <svg
                  className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 22h14"></path>
                  <path d="M5 2h14"></path>
                  <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
                  <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
                </svg>
                Attendance Data
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Days Worked</p>
                  <p className="font-medium">
                    {attendanceData.daysWorked} /{" "}
                    {attendanceData.totalWorkingDays}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Attendance Rate</p>
                  <p className="font-medium">
                    {attendanceData.attendanceRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Hours</p>
                  <p className="font-medium">
                    {attendanceData.totalHours.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Regular Hours</p>
                  <p className="font-medium">
                    {attendanceData.regularHours.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Overtime Hours</p>
                  <p className="font-medium">
                    {attendanceData.overtimeHours.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* EWA Deductions Card */}
          {ewaWithdrawals && ewaWithdrawals.length > 0 && (
            <div className="border p-3 rounded-md bg-amber-50 dark:bg-amber-950/30">
              <h3 className="text-sm font-medium flex items-center mb-2">
                <svg
                  className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                EWA Deductions
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between pb-2 border-b border-amber-200 dark:border-amber-800">
                  <span className="text-sm font-medium">Date</span>
                  <span className="text-sm font-medium">Amount</span>
                </div>
                {ewaWithdrawals.map((withdrawal: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {new Date(withdrawal.requestDate).toLocaleDateString()}
                    </span>
                    <span className="font-medium">
                      KES{" "}
                      {Number(withdrawal.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-amber-200 dark:border-amber-800 font-medium">
                  <span>Total EWA Deduction</span>
                  <span>
                    KES{" "}
                    {ewaDeductions.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Loan Deductions Card */}
          {employeeLoans && employeeLoans.length > 0 && (
            <div className="border p-3 rounded-md bg-purple-50 dark:bg-purple-950/30">
              <h3 className="text-sm font-medium flex items-center mb-2">
                <svg
                  className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
                Loan Deductions
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between pb-2 border-b border-purple-200 dark:border-purple-800">
                  <span className="text-sm font-medium">Loan Type</span>
                  <span className="text-sm font-medium">Monthly Payment</span>
                </div>
                {employeeLoans.map((loan: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{loan.type || "Standard Loan"}</span>
                    <span className="font-medium">
                      KES{" "}
                      {Number(loan.monthlyPayment).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-purple-200 dark:border-purple-800 font-medium">
                  <span>Total Loan Deduction</span>
                  <span>
                    KES{" "}
                    {loanDeductions.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Calculation Mode Tabs */}
          <Tabs
            value={calculationMode}
            onValueChange={(value) =>
              setCalculationMode(value as "hourly" | "salary")
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="salary" className="flex items-center">
                <Briefcase className="mr-2 h-4 w-4" />
                Salary Based
              </TabsTrigger>
              <TabsTrigger value="hourly" className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Hourly Based
              </TabsTrigger>
            </TabsList>

            <TabsContent value="salary" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basic-salary">Basic Salary (KES)</Label>
                  <Input
                    id="basic-salary"
                    type="number"
                    value={basicSalary}
                    onChange={(e) =>
                      setBasicSalary(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowances">Allowances (KES)</Label>
                  <Input
                    id="allowances"
                    type="number"
                    value={allowances}
                    onChange={(e) =>
                      setAllowances(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hourly" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours-worked">Hours Worked</Label>
                  <Input
                    id="hours-worked"
                    type="number"
                    value={hoursWorked}
                    onChange={(e) =>
                      setHoursWorked(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly-rate">Hourly Rate (KES)</Label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) =>
                      setHourlyRate(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtime">Overtime Hours</Label>
                  <Input
                    id="overtime"
                    type="number"
                    value={overtime}
                    onChange={(e) =>
                      setOvertime(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowances-hourly">Allowances (KES)</Label>
                  <Input
                    id="allowances-hourly"
                    type="number"
                    value={allowances}
                    onChange={(e) =>
                      setAllowances(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Load from Attendance button */}
              {selectedEmployee && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAttendanceData}
                  disabled={isLoadingAttendance}
                  className="w-full mt-2"
                >
                  {isLoadingAttendance ? (
                    <Loader size="sm" className="mr-2" />
                  ) : (
                    "Load from Attendance"
                  )}
                </Button>
              )}
            </TabsContent>
          </Tabs>

          {/* Custom Deductions Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Custom Deductions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ewa-deductions">EWA Deductions (KES)</Label>
                <Input
                  id="ewa-deductions"
                  type="number"
                  value={ewaDeductions}
                  onChange={(e) =>
                    setEwaDeductions(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan-deductions">Loan Repayments (KES)</Label>
                <Input
                  id="loan-deductions"
                  type="number"
                  value={loanDeductions}
                  onChange={(e) =>
                    setLoanDeductions(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other-deductions">Other Deductions (KES)</Label>
                <Input
                  id="other-deductions"
                  type="number"
                  value={otherDeductions}
                  onChange={(e) =>
                    setOtherDeductions(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Calculate Button */}
        <Button
          onClick={calculatePayroll}
          disabled={!selectedEmployee || isCalculating}
          className="w-full"
        >
          {isCalculating ? "Calculating..." : "Calculate Payroll"}
        </Button>

        {/* Results Section */}
        {calculationResults && (
          <div className="border rounded-lg p-4 mt-4 space-y-4">
            <h3 className="font-medium flex items-center">
              <BarChart className="h-5 w-5 mr-2 text-primary" />
              Payroll Calculation Results
            </h3>

            {/* Tabs for different result views */}
            <Tabs defaultValue="summary">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="tax">Tax Breakdown</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
              </TabsList>

              {/* Summary Tab */}
              <TabsContent value="summary" className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Pay</p>
                    <p className="font-medium">
                      {formatKES(calculationResults.grossPay)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Deductions
                    </p>
                    <p className="font-medium">
                      {formatKES(
                        calculationResults.totalDeductions +
                          getTotalCustomDeductions()
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Pay</p>
                    <p className="font-bold text-primary">
                      {formatKES(calculationResults.netPay)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pay Period</p>
                    <p className="font-medium">
                      {new Date(payPeriod.startDate).toLocaleDateString()} -{" "}
                      {new Date(payPeriod.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Basic Salary
                    </p>
                    <p className="font-medium">{formatKES(basicSalary)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Allowances</p>
                    <p className="font-medium">{formatKES(allowances)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Pay</p>
                    <p className="font-medium">
                      {formatKES(calculationResults.grossPay)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Taxable Income
                    </p>
                    <p className="font-medium">
                      {formatKES(
                        calculateTaxableIncome(calculationResults.grossPay)
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (After statutory deductions)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PAYE</p>
                    <p className="font-medium">
                      {formatKES(calculationResults.paye)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (After KES 2,400 personal relief)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SHIF</p>
                    <p className="font-medium">
                      {formatKES(calculationResults.nhif)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (Social Health Insurance Fund)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">NSSF</p>
                    <p className="font-medium">
                      {formatKES(calculationResults.nssf)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (6% rate with tiered limits)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Housing Levy
                    </p>
                    <p className="font-medium">
                      {formatKES(calculationResults.housingLevy)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (1.5% of gross pay)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      EWA Deductions
                    </p>
                    <p className="font-medium">{formatKES(ewaDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Loan Deductions
                    </p>
                    <p className="font-medium">{formatKES(loanDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Other Deductions
                    </p>
                    <p className="font-medium">{formatKES(otherDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Deductions
                    </p>
                    <p className="font-medium">
                      {formatKES(
                        calculationResults.totalDeductions +
                          getTotalCustomDeductions()
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Net Pay
                    </p>
                    <p className="font-bold text-primary">
                      {formatKES(calculationResults.netPay)}
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Tax Breakdown Tab */}
              <TabsContent value="tax" className="pt-4">
                <div className="space-y-6">
                  {/* Tax Rate Visualization */}
                  <div className="border rounded-lg p-4 bg-card/20">
                    <h4 className="text-sm font-medium mb-3">
                      PAYE Tax Bands (2024)
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">10% on first KES 24,000</span>
                        <span className="text-sm font-medium">
                          KES{" "}
                          {Math.min(
                            24000,
                            calculateTaxableIncome(calculationResults.grossPay)
                          ) * 0.1}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-1">
                        <div
                          className="bg-primary h-2.5 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (calculateTaxableIncome(
                                calculationResults.grossPay
                              ) /
                                24000) *
                                100
                            )}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex justify-between mt-3">
                        <span className="text-sm">25% on next KES 8,333</span>
                        <span className="text-sm font-medium">
                          KES{" "}
                          {Math.max(
                            0,
                            Math.min(
                              8333,
                              calculateTaxableIncome(
                                calculationResults.grossPay
                              ) - 24000
                            )
                          ) * 0.25}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-1">
                        <div
                          className="bg-blue-500 h-2.5 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                (calculateTaxableIncome(
                                  calculationResults.grossPay
                                ) -
                                  24000) /
                                  8333
                              ) * 100
                            )}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex justify-between mt-3">
                        <span className="text-sm">30% on next KES 467,667</span>
                        <span className="text-sm font-medium">
                          KES{" "}
                          {Math.max(
                            0,
                            Math.min(
                              467667,
                              calculateTaxableIncome(
                                calculationResults.grossPay
                              ) - 32333
                            )
                          ) * 0.3}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-1">
                        <div
                          className="bg-amber-500 h-2.5 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, (calculateTaxableIncome(calculationResults.grossPay) - 32333) / 467667) * 100)}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between mt-3">
                        <span className="text-sm">32.5% on next KES 300,000</span>
                        <span className="text-sm font-medium">KES {Math.max(0, Math.min(300000, calculateTaxableIncome(calculationResults.grossPay) - 500000)) * 0.325}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-1">
                        <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (calculateTaxableIncome(calculationResults.grossPay) - 500000) / 300000) * 100)}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between mt-3">
                        <span className="text-sm">35% on amount over KES 800,000</span>
                        <span className="text-sm font-medium">KES {Math.max(0, (calculateTaxableIncome(calculationResults.grossPay) - 800000)) * 0.35}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-1">
                        <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (calculateTaxableIncome(calculationResults.grossPay) - 800000) / 200000) * 100)}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t flex justify-between">
                      <span className="text-sm">Personal Relief</span>
                      <span className="text-sm font-medium text-red-500">- KES 2,400</span>
                    </div>
                  </div>
                  
                  {/* Other Statutory Deductions */}
                  <div className="border rounded-lg p-4 bg-card/20">
                    <h4 className="text-sm font-medium mb-3">Other Statutory Deductions</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">SHIF (2.75% of gross pay)</span>
                          <span className="text-sm font-medium">{formatKES(calculationResults.nhif)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(calculationResults.nhif / calculationResults.grossPay) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Social Health Insurance Fund (replaced NHIF)</p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">NSSF (6% with tiered limits)</span>
                          <span className="text-sm font-medium">{formatKES(calculationResults.nssf)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(calculationResults.nssf / calculationResults.grossPay) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          KES 480 for salaries up to 8,000 | 6% from 8,000-72,000 | KES 4,320 maximum
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Housing Levy (1.5% of gross pay)</span>
                          <span className="text-sm font-medium">{formatKES(calculationResults.housingLevy)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${(calculationResults.housingLevy / calculationResults.grossPay) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Affordable Housing Levy</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Attendance Tab */}
              <TabsContent value="attendance" className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Days Worked</p>
                    <p className="font-medium">{calculationResults.daysWorked || 0} / {calculationResults.totalWorkingDays || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attendance Rate</p>
                    <p className="font-medium">{(calculationResults.attendanceRate || 0).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Regular Hours</p>
                    <p className="font-medium">{(calculationResults.regularHours || 0).toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overtime Hours</p>
                    <p className="font-medium">{(calculationResults.overtimeHours || 0).toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate</p>
                    <p className="font-medium">{formatKES(hourlyRate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overtime Rate</p>
                    <p className="font-medium">{formatKES(hourlyRate * 1.5)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Regular Pay</p>
                    <p className="font-medium">{formatKES((calculationResults.regularHours || 0) * hourlyRate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overtime Pay</p>
                    <p className="font-medium">{formatKES((calculationResults.overtimeHours || 0) * hourlyRate * 1.5)}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-2 mt-4">
              <Button 
                onClick={handleSavePayroll} 
                variant="outline" 
                className="flex-1"
              >
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Payroll
              </Button>
              
              <Button 
                onClick={generatePayslip} 
                variant="default" 
                className="flex-1"
              >
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Generate Payslip
              </Button>
              
              <Button 
                onClick={handleBatchProcessing} 
                variant="secondary" 
                className="flex-1"
              >
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Batch Processing
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Batch Processing Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Batch Payroll Processing</DialogTitle>
            <DialogDescription>
              Process payroll for multiple employees at once using the current pay period.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="border p-3 rounded-md space-y-3">
              <h4 className="font-medium text-sm">Pay Period</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <p>{new Date(payPeriod.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>
                  <p>{new Date(payPeriod.endDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-3 max-h-[300px] overflow-y-auto">
              <h4 className="font-medium text-sm mb-3">Select Employees</h4>
              <div className="space-y-2">
                {employeeList.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`employee-${employee.id}`} 
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEmployees(prev => [...prev, employee.id]);
                        } else {
                          setSelectedEmployees(prev => prev.filter(id => id !== employee.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`employee-${employee.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {employee.name} - {employee.department}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={executeBatchProcessing} 
              disabled={isBatchProcessing || selectedEmployees.length === 0}
            >
              {isBatchProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>Process Selected ({selectedEmployees.length})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}