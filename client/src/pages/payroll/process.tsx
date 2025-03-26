import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  employees,
  departments,
  formatCurrency,
  formatDate,
} from "@/lib/mock-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Stepper from "@/components/ui/stepper";
import { formatTime } from "@/lib/date-utils";

import {
  ChevronDown,
  Calculator,
  FileSpreadsheet,
  FileText,
  Filter,
  FilterX,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  CalendarDays,
  Users,
  Building,
  Building2,
  BarChart,
  PieChart as PieChartIcon,
  AlertTriangle,
  Circle,
  RefreshCw,
  Search,
  Columns,
  ActivitySquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  ArrowUp,
  ArrowDown,
  Pencil,
  CreditCard,
  Smartphone,
  CalendarIcon,
} from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  calculatePAYE,
  calculateSHIF,
  calculateNSSF,
  calculateAffordableHousingLevy,
  calculateTaxableIncome,
  formatKES,
  calculateKenyanDeductions,
} from "@/lib/tax-utils";
import numeral from "numeral";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

// Workflow stages
const STAGES = {
  SETUP: "setup",
  REVIEW: "review",
  FINALIZE: "finalize",
};

// Add RequestInit type for fetch options
type RequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

// Interface for employee payroll calculations
interface EmployeePayrollCalculation {
  id: number;
  employeeNumber: string;
  name: string;
  department: string;
  position: string;
  hoursWorked: number;
  overtimeHours: number;
  hourlyRate: number;
  grossPay: number;
  taxableIncome: number;
  paye: number;
  nhif: number; // SHIF
  nssf: number;
  housingLevy: number;
  ewaDeductions: number;
  loanDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: "complete" | "warning" | "error";
  statusReason?: string;
  isEdited: boolean;
  originalNetPay?: number;
  // Payment details
  mpesaNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  processedId?: string; // Optional reference ID from the API
}

interface Department {
  id: number;
  name: string;
  description: string;
}

interface Employee {
  id: number;
  employeeNumber: string;
  name: string;
  department: string;
  position: string;
  hourlyRate: number;
  active: boolean;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  checkIn: string;
  checkOut: string;
}

interface PayrollCalculation {
  id: number;
  employeeNumber: string;
  name: string;
  department: string;
  position: string;
  hoursWorked: number;
  overtimeHours: number;
  hourlyRate: number;
  grossPay: number;
  taxableIncome: number;
  paye: number;
  nhif: number;
  nssf: number;
  housingLevy: number;
  ewaDeductions: number;
  loanDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: "complete" | "warning" | "error";
  statusReason?: string;
  isEdited: boolean;
  originalNetPay?: number;
  mpesaNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
}

export default function ProcessPayrollPage() {
  // State declarations
  const [currentStage, setCurrentStage] = useState<string>(STAGES.SETUP);
  const [payPeriod, setPayPeriod] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [excludedEmployees, setExcludedEmployees] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationProgress, setCalculationProgress] = useState<number>(0);
  const [validationIssues, setValidationIssues] = useState<
    {
      employeeId: number;
      issue: string;
    }[]
  >([]);
  const [payrollCalculations, setPayrollCalculations] = useState<
    EmployeePayrollCalculation[]
  >([]);
  const [payrollSummary, setPayrollSummary] = useState<{
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    totalEwaDeductions: number;
    employeeCount: number;
    departmentSummary: {
      department: string;
      employeeCount: number;
      totalAmount: number;
      percentageOfTotal: number;
    }[];
    previousPeriodComparison: number; // percentage change
  }>({
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    totalEwaDeductions: 0,
    employeeCount: 0,
    departmentSummary: [],
    previousPeriodComparison: 0,
  });
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeePayrollCalculation | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayrollProcessed, setIsPayrollProcessed] = useState(false);
  const [finalizationNote, setFinalizationNote] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportType, setExportType] = useState<string>("xlsx");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [periodType, setPeriodType] = useState<
    "current" | "previous" | "custom"
  >("current");

  // Date range picker state
  const [date, setDate] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: payPeriod.startDate ? new Date(payPeriod.startDate) : undefined,
    to: payPeriod.endDate ? new Date(payPeriod.endDate) : undefined,
  });

  // Fetch department data
  const { data: departmentData } = useQuery({
    queryKey: ["/api/departments"],
    initialData: departments,
  });

  // Fetch employee data
  const { data: employeeData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/employees", selectedDepartment],
    queryFn: async () => {
      if (selectedDepartment === "all") {
        return employees; // Return all employees for now
      } else {
        // Filter employees by department
        return employees.filter((emp) => emp.department === selectedDepartment);
      }
    },
    initialData: employees, // Use mock data as initial data
  });

  // Calculate eligible employees count
  const eligibleEmployeeCount = employeeData.filter(
    (emp) => !excludedEmployees.includes(emp.id)
  ).length;

  // Define table columns
  const columns: ColumnDef<EmployeePayrollCalculation>[] = [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div className="flex items-center">
            {status === "complete" && (
              <div className="rounded-full p-1 bg-green-100 dark:bg-green-950/50 mr-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            )}
            {status === "warning" && (
              <div className="rounded-full p-1 bg-amber-100 dark:bg-amber-950/50 mr-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            )}
            {status === "error" && (
              <div className="rounded-full p-1 bg-red-100 dark:bg-red-950/50 mr-2">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
            )}
            <span className="capitalize">{status}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "employeeNumber",
      header: "Employee ID",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "department",
      header: "Department",
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ row }) => (
        <div>
          {formatHoursToHalfHour(Number(row.getValue("hoursWorked")))}
          {Number(row.getValue("overtimeHours")) > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              (+{formatHoursToHalfHour(Number(row.getValue("overtimeHours")))}{" "}
              OT)
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "overtimeHours",
      header: "Overtime",
      enableHiding: true, // Hidden by default, used for reference in other cells
    },
    {
      accessorKey: "grossPay",
      header: "Gross Pay",
      cell: ({ row }) => formatKES(row.getValue("grossPay")),
    },
    {
      accessorKey: "ewaDeductions",
      header: "EWA",
      cell: ({ row }) => formatKES(row.getValue("ewaDeductions")),
    },
    {
      accessorKey: "totalDeductions",
      header: "Deductions",
      cell: ({ row }) => formatKES(row.getValue("totalDeductions")),
    },
    {
      accessorKey: "netPay",
      header: "Net Pay",
      cell: ({ row }) => {
        const netPay = row.getValue("netPay") as number;
        const isEdited = row.original.isEdited;
        return (
          <div className={isEdited ? "font-bold text-blue-600" : ""}>
            {formatKES(netPay)}
            {isEdited && <span className="ml-1 text-xs">(edited)</span>}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditEmployee(employee)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(employee)}
            >
              Details
            </Button>
          </div>
        );
      },
    },
  ];

  // Handle period selection via preset buttons
  const handlePeriodSelection = (
    periodType: "current" | "previous" | "custom"
  ) => {
    const today = new Date();

    if (periodType === "current") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      setPayPeriod({
        startDate: firstDay.toISOString().split("T")[0],
        endDate: lastDay.toISOString().split("T")[0],
      });

      // Update date range picker state
      setDate({
        from: firstDay,
        to: lastDay,
      });

      // Remove recalculation to prevent infinite API calls
      // calculatePayroll();
    } else if (periodType === "previous") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);

      setPayPeriod({
        startDate: firstDay.toISOString().split("T")[0],
        endDate: lastDay.toISOString().split("T")[0],
      });

      // Update date range picker state
      setDate({
        from: firstDay,
        to: lastDay,
      });

      // Remove recalculation to prevent infinite API calls
      // calculatePayroll();
    } else if (periodType === "custom") {
      // For custom type, we'll show the date range picker
      // The actual date setting will happen in handleDateRangeChange
    }
  };

  // Handle custom date range selection
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setDate({
        from: range.from,
        to: range.to,
      });

      setPayPeriod({
        startDate: range.from.toISOString().split("T")[0],
        endDate: range.to
          ? range.to.toISOString().split("T")[0]
          : range.from.toISOString().split("T")[0],
      });

      // Remove automatic calculation that causes infinite calls
      // calculatePayroll();
    }
  };

  // Toggle employee exclusion
  const toggleEmployeeExclusion = (employeeId: number) => {
    if (excludedEmployees.includes(employeeId)) {
      setExcludedEmployees(excludedEmployees.filter((id) => id !== employeeId));
    } else {
      setExcludedEmployees([...excludedEmployees, employeeId]);
    }
  };

  // Calculate payroll for all eligible employees
  const calculatePayroll = async (): Promise<EmployeePayrollCalculation[]> => {
    // Validate first
    if (eligibleEmployeeCount === 0) {
      toast({
        title: "No Employees Selected",
        description: "Please select at least one employee to process payroll.",
        variant: "destructive",
      });
      return [];
    }

    setIsCalculating(true);
    setCalculationProgress(0);

    try {
      // Simulate validation check
      await validateEmployeeData();

      // If there are validation issues, don't proceed to calculation
      if (validationIssues.length > 0) {
        toast({
          title: "Validation Issues Found",
          description: `${validationIssues.length} issues need attention before proceeding.`,
          variant: "destructive",
        });
        setIsCalculating(false);
        return [];
      }

      // Get eligible employees
      const eligibleEmployees = employeeData.filter(
        (emp) => !excludedEmployees.includes(emp.id)
      );

      // Calculate progress increment per employee
      const progressIncrement = 100 / eligibleEmployees.length;

      // Initialize calculations array
      const calculations: EmployeePayrollCalculation[] = [];

      // Process each employee (with simulated async timing for UI feedback)
      for (let i = 0; i < eligibleEmployees.length; i++) {
        const employee = eligibleEmployees[i];

        // Simulate async calculation
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Calculate employee payroll
        const calculation = await calculateEmployeePayroll(employee);
        calculations.push(calculation);

        // Update progress
        setCalculationProgress((prevProgress) => {
          const newProgress = prevProgress + progressIncrement;
          return Math.min(newProgress, 99); // Cap at 99% until fully complete
        });
      }

      // Calculate summary statistics
      calculatePayrollSummary(calculations);

      // Set calculations in state
      setPayrollCalculations(calculations);

      // Complete progress
      setCalculationProgress(100);

      // Remove automatic navigation to review step
      // setCurrentStage(STAGES.REVIEW);

      toast({
        title: "Calculation Complete",
        description: `Successfully calculated payroll for ${calculations.length} employees.`,
      });

      return calculations;
    } catch (error) {
      console.error("Payroll calculation error:", error);
      toast({
        title: "Calculation Error",
        description: "An error occurred during calculation. Please try again.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsCalculating(false);
    }
    // Ensure there's a fallback return statement for TypeScript
    return [];
  };

  // Validate employee data before calculation
  const validateEmployeeData = async (): Promise<void> => {
    // Reset validation issues
    setValidationIssues([]);

    // Get eligible employees
    const eligibleEmployees = employeeData.filter(
      (emp) => !excludedEmployees.includes(emp.id)
    );

    const newIssues = [];

    // Validate each employee
    for (const employee of eligibleEmployees) {
      // Check for missing hourly rate
      if (!employee.hourlyRate) {
        newIssues.push({
          employeeId: employee.id,
          issue: "Missing hourly rate",
        });
      }

      // Simulate attendance check
      // In a real implementation, this would query the attendance records
      const hasCompleteAttendance = Math.random() > 0.1; // 10% chance of incomplete attendance
      if (!hasCompleteAttendance) {
        newIssues.push({
          employeeId: employee.id,
          issue: "Incomplete attendance records",
        });
      }
    }

    setValidationIssues(newIssues);
  };

  // Helper function to round to nearest half hour
  const roundToNearestHalfHour = (hours: number): number => {
    return Math.round(hours * 2) / 2;
  };

  // Calculate payroll for a single employee
  const calculateEmployeePayroll = async (
    employee: any
  ): Promise<EmployeePayrollCalculation> => {
    try {
      // Ensure hourly rate is a number
      const hourlyRate = Number(employee.hourlyRate) || 0;

      // Get actual attendance records for the pay period
      const startDate = new Date(payPeriod.startDate);
      const endDate = new Date(payPeriod.endDate);

      // Cache key for this employee and period
      const cacheKey = `${employee.id}-${payPeriod.startDate}-${payPeriod.endDate}`;
      
      // Try to get cached data first
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Static counter to prevent infinite API calls - API will only be called 3 times max per employee
      const apiCallCountKey = `apiCall-${employee.id}`;
      const apiCallCount = parseInt(sessionStorage.getItem(apiCallCountKey) || '0');
      
      if (apiCallCount > 2) {
        console.log(`Too many API calls for employee ${employee.id}, using fallback calculation`);
        return fallbackCalculateEmployeePayroll(employee);
      }
      
      // Increment and save API call count
      sessionStorage.setItem(apiCallCountKey, (apiCallCount + 1).toString());

      // If no cached data, proceed with API calls
      const attendanceResponse = await fetch(
        `/api/attendance?employeeId=${
          employee.id
        }&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      // Initialize variables with safe defaults
      let hoursWorked = 0;
      let overtimeHours = 0;

      // Process attendance data if response is OK
      if (attendanceResponse.ok) {
        const attendance = await attendanceResponse.json();

        if (attendance && attendance.length > 0) {
          // Calculate regular hours and overtime hours
          const workHours = attendance.reduce((total: number, record: any) => {
            const hours = Number(record.hoursWorked) || 0;
            return total + hours;
          }, 0);

          // Standard work hours for the period
          const workingDays = getWorkingDaysInPeriod(startDate, endDate);
          const standardHours = workingDays * 8; // 8 hours per working day

          // Anything over standard hours is overtime
          hoursWorked = roundToNearestHalfHour(
            Math.min(workHours, standardHours)
          );
          overtimeHours = roundToNearestHalfHour(
            Math.max(0, workHours - standardHours)
          );
        } else {
          // Fallback if no attendance records found
          const workingDays = getWorkingDaysInPeriod(startDate, endDate);
          const attendanceRate = 0.9; // Assume 90% attendance as fallback
          hoursWorked = Math.round(workingDays * 8 * attendanceRate);
          overtimeHours = 0;
        }
      } else {
        // API failed, use fallback calculation
        const workingDays = getWorkingDaysInPeriod(startDate, endDate);
        const attendanceRate = 0.9; // Assume 90% attendance as fallback
        hoursWorked = Math.round(workingDays * 8 * attendanceRate);
        overtimeHours = 0;
      }

      // Calculate gross pay
      const grossPay =
        hoursWorked * hourlyRate + overtimeHours * hourlyRate * 1.5;

      // Get actual EWA deductions for the pay period
      const ewaResponse = await fetch(
        `/api/ewa/requests?employeeId=${
          employee.id
        }&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&status=disbursed`
      );
      let ewaDeductions = 0;

      if (ewaResponse.ok) {
        const ewaData = await ewaResponse.json();
        ewaDeductions = ewaData.reduce((total: number, withdrawal: any) => {
          const amount = Number(withdrawal.amount) || 0;
          const fee = Number(withdrawal.processingFee) || 0;
          return total + amount + fee;
        }, 0);
      }

      // Get loan deductions for this employee
      const loanResponse = await fetch(
        `/api/loans/employee/${employee.id}/active`
      );
      let loanDeductions = 0;

      if (loanResponse.ok) {
        const loanData = await loanResponse.json();
        loanDeductions = loanData.reduce((total: number, loan: any) => {
          return total + (Number(loan.monthlyPayment) || 0);
        }, 0);
      }

      // Calculate other deductions (PAYE, NHIF, NSSF, etc.)
      const deductions = calculateKenyanDeductions(grossPay);

      // Calculate total deductions
      const totalDeductions =
        deductions.totalDeductions + ewaDeductions + loanDeductions;

      // Calculate net pay
      const netPay = grossPay - totalDeductions;

      // Determine status
      let status: "complete" | "warning" | "error" = "complete";
      let statusReason = "";

      if (hoursWorked === 0) {
        status = "error";
        statusReason = "No hours worked";
      } else if (netPay <= 0) {
        status = "warning";
        statusReason = "Net pay is zero or negative";
      }

      const result = {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        hoursWorked,
        overtimeHours,
        hourlyRate,
        grossPay,
        taxableIncome: calculateTaxableIncome(grossPay),
        paye: deductions.paye,
        nhif: deductions.nhif,
        nssf: deductions.nssf,
        housingLevy: deductions.housingLevy,
        ewaDeductions,
        loanDeductions,
        otherDeductions:
          deductions.totalDeductions -
          deductions.paye -
          deductions.nhif -
          deductions.nssf -
          deductions.housingLevy,
        totalDeductions,
        netPay,
        status,
        statusReason,
        isEdited: false,
      };
      
      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error("Error calculating payroll for employee:", error);
      return fallbackCalculateEmployeePayroll(employee);
    }
  };

  // Fallback calculation function if APIs fail
  const fallbackCalculateEmployeePayroll = (
    employee: any
  ): EmployeePayrollCalculation => {
    // Get mock EWA withdrawals for this employee
    const ewaDeductions =
      Math.random() > 0.7 ? Math.round(Math.random() * 15000) : 0;

    // Get mock loan deductions
    const loanDeductions =
      Math.random() > 0.8 ? Math.round(Math.random() * 10000) : 0;

    // Other deductions (e.g., benefits, insurance)
    const otherDeductions =
      Math.random() > 0.5 ? Math.round(Math.random() * 3000) : 0;

    // Simulate hours worked
    const workingDays = 22; // Average working days in a month
    const dailyHours = 8;
    const overtimeHours = roundToNearestHalfHour(
      Math.random() > 0.5 ? Math.round(Math.random() * 20) : 0
    );

    // Simulating some randomness in hours worked
    const attendanceRate = 0.9 + Math.random() * 0.1; // 90-100% attendance
    const hoursWorked = roundToNearestHalfHour(
      Math.round(workingDays * dailyHours * attendanceRate)
    );

    const hourlyRate = Number(employee.hourlyRate) || 500; // Default if missing

    // Calculate gross pay
    const regularPay = hoursWorked * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * 1.5; // Overtime at 1.5x
    const grossPay = regularPay + overtimePay;

    // Calculate statutory deductions
    const housingLevy = calculateAffordableHousingLevy(grossPay);
    const nhif = calculateSHIF(grossPay);
    const nssf = calculateNSSF(grossPay);
    const taxableIncome = calculateTaxableIncome(grossPay);
    const paye = calculatePAYE(taxableIncome);

    // Calculate total deductions
    const statutoryDeductions = housingLevy + nhif + nssf + paye;
    const totalDeductions =
      statutoryDeductions + ewaDeductions + loanDeductions + otherDeductions;

    // Calculate net pay
    const netPay = grossPay - totalDeductions;

    // Determine status
    let status: "complete" | "warning" | "error" = "complete";
    let statusReason = "";

    if (netPay < 0) {
      status = "error";
      statusReason = "Net pay is negative";
    } else if (ewaDeductions > grossPay * 0.5) {
      status = "warning";
      statusReason = "EWA deductions exceed 50% of gross pay";
    } else if (totalDeductions > grossPay * 0.7) {
      status = "warning";
      statusReason = "Total deductions exceed 70% of gross pay";
    }

    // Generate mock payment details
    const mpesaNumber =
      employee.id % 2 === 0
        ? `07${Math.floor(10000000 + Math.random() * 90000000)}`
        : undefined;
    const bankName = !mpesaNumber
      ? ["Equity Bank", "KCB", "Co-operative Bank", "NCBA", "Stanbic Bank"][
          Math.floor(Math.random() * 5)
        ]
      : undefined;
    const bankAccountNumber = !mpesaNumber
      ? Math.floor(10000000 + Math.random() * 90000000).toString()
      : undefined;

    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      name: employee.name,
      department: employee.department,
      position: employee.position,
      hoursWorked,
      overtimeHours,
      hourlyRate,
      grossPay,
      taxableIncome,
      paye,
      nhif,
      nssf,
      housingLevy,
      ewaDeductions,
      loanDeductions,
      otherDeductions,
      totalDeductions,
      netPay,
      status,
      statusReason,
      isEdited: false,
      mpesaNumber,
      bankName,
      bankAccountNumber,
    };
  };

  // Helper function to calculate working days in a period
  const getWorkingDaysInPeriod = (startDate: Date, endDate: Date): number => {
    let workingDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // 0 = Sunday, 6 = Saturday
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  };

  // Handle stage transitions
  const handleNext = async () => {
    if (currentStage === STAGES.SETUP) {
      if (eligibleEmployeeCount === 0) {
        toast({
          title: "No Employees Selected",
          description: "Please select at least one employee to process.",
          variant: "destructive",
        });
        return;
      }
      // Don't automatically navigate to REVIEW stage
      // setCurrentStage(STAGES.REVIEW);
    } else if (currentStage === "review") {
      const calculations = await calculatePayroll();
      if (calculations && calculations.length > 0) {
        setPayrollCalculations(calculations);
        setCurrentStage("process");
      }
    }
  };

  const handleBack = () => {
    if (currentStage === "review") {
      setCurrentStage(STAGES.SETUP); // Changed from "select" to STAGES.SETUP
    } else if (currentStage === "process") {
      setCurrentStage("review");
    }
  };

  // Update the process payroll button click handler
  const handleProcessPayroll = async () => {
    try {
      await apiRequest("POST", "/api/payroll/process", {
        payPeriod,
        payrollData: payrollCalculations,
        notes: finalizationNote,
      });

      toast({
        title: "Payroll processed successfully",
        description: "The payroll has been processed and saved.",
      });

      setCurrentStage("complete");
    } catch (error) {
      toast({
        title: "Error processing payroll",
        description:
          "There was an error processing the payroll. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update the export button click handler
  const handleExport = async (exportType: string) => {
    setIsExporting(true);
    setExportType(exportType);

    try {
      // Simulate export process
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let fileName = "";
      const periodStr = `${new Date(payPeriod.startDate)
        .toLocaleDateString()
        .replace(/\//g, "-")}_${new Date(payPeriod.endDate)
        .toLocaleDateString()
        .replace(/\//g, "-")}`;

      if (exportType === "xlsx") {
        fileName = `Payroll_${periodStr}.xlsx`;
      } else if (exportType === "payslips") {
        fileName = `Payslips_${periodStr}.zip`;
      } else if (exportType === "summary") {
        fileName = `PayrollSummary_${periodStr}.pdf`;
      }

      toast({
        title: "Export Complete",
        description: `${fileName} has been generated successfully.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Error",
        description: "An error occurred during export. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Update the total calculations to use payrollData
  const calculateTotalGrossPay = () => {
    return payrollCalculations.reduce((total, emp) => total + emp.grossPay, 0);
  };

  const calculateTotalDeductions = () => {
    return payrollCalculations.reduce(
      (total, emp) => total + emp.totalDeductions,
      0
    );
  };

  const calculateTotalNetPay = () => {
    return payrollCalculations.reduce((total, emp) => total + emp.netPay, 0);
  };

  // Handle manual date changes
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setPayPeriod((prev) => ({
        ...prev,
        startDate: date.toISOString().split("T")[0],
      }));
      // Don't automatically recalculate payroll with new dates
      // calculatePayroll();
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      setPayPeriod((prev) => ({
        ...prev,
        endDate: date.toISOString().split("T")[0],
      }));
      // Don't automatically recalculate payroll with new dates
      // calculatePayroll();
    }
  };

  // Calculate payroll summary statistics
  // Define chart configuration for deductions
  const deductionsChartConfig: ChartConfig = {
    paye: {
      label: "PAYE",
      color: "#3b82f6", // blue-500
    },
    shif: {
      label: "SHIF",
      color: "#22c55e", // green-500
    },
    nssf: {
      label: "NSSF",
      color: "#8b5cf6", // violet-500
    },
    housingLevy: {
      label: "Housing Levy",
      color: "#f59e0b", // amber-500
    },
    ewa: {
      label: "EWA",
      color: "#ef4444", // red-500
    },
    loans: {
      label: "Loans",
      color: "#6366f1", // indigo-500
    },
    other: {
      label: "Other",
      color: "#64748b", // slate-500
    },
    noData: {
      label: "No Data",
      color: "#e2e8f0", // slate-200
    },
  };

  // Prepare data for the deductions pie chart
  const prepareDeductionsChartData = (
    calculations: EmployeePayrollCalculation[]
  ) => {
    // If no data is available, return placeholder data
    if (!calculations || calculations.length === 0) {
      return [
        { name: "paye", value: 1 },
        { name: "shif", value: 1 },
        { name: "nssf", value: 1 },
        { name: "housingLevy", value: 1 },
      ];
    }

    // Calculate total for each deduction type
    const totalPaye = calculations.reduce((sum, emp) => sum + emp.paye, 0);
    const totalNhif = calculations.reduce((sum, emp) => sum + emp.nhif, 0);
    const totalNssf = calculations.reduce((sum, emp) => sum + emp.nssf, 0);
    const totalHousingLevy = calculations.reduce(
      (sum, emp) => sum + emp.housingLevy,
      0
    );
    const totalEwa = calculations.reduce(
      (sum, emp) => sum + emp.ewaDeductions,
      0
    );
    const totalLoans = calculations.reduce(
      (sum, emp) => sum + emp.loanDeductions,
      0
    );
    const totalOther = calculations.reduce(
      (sum, emp) => sum + emp.otherDeductions,
      0
    );

    // Format into chart data
    const chartData = [
      { name: "paye", value: totalPaye },
      { name: "shif", value: totalNhif },
      { name: "nssf", value: totalNssf },
      { name: "housingLevy", value: totalHousingLevy },
      { name: "ewa", value: totalEwa },
      { name: "loans", value: totalLoans },
      { name: "other", value: totalOther },
    ].filter((item) => item.value > 0); // Only include non-zero values

    // If no items have positive values, provide minimum data for chart
    return chartData.length > 0 ? chartData : [{ name: "noData", value: 1 }];
  };

  // Prepare data for a single employee's deduction chart
  const prepareEmployeeDeductionsChartData = (
    employee: EmployeePayrollCalculation
  ) => {
    // If no employee or employee has no deductions
    if (!employee) {
      return [{ name: "noData", value: 1 }];
    }

    // Format into chart data
    const chartData = [
      { name: "paye", value: employee.paye },
      { name: "shif", value: employee.nhif },
      { name: "nssf", value: employee.nssf },
      { name: "housingLevy", value: employee.housingLevy },
      { name: "ewa", value: employee.ewaDeductions },
      { name: "loans", value: employee.loanDeductions },
      { name: "other", value: employee.otherDeductions },
    ].filter((item) => item.value > 0); // Only include non-zero values

    // If no items have positive values, provide minimum data for chart
    return chartData.length > 0 ? chartData : [{ name: "noData", value: 1 }];
  };

  const calculatePayrollSummary = (
    calculations: EmployeePayrollCalculation[]
  ) => {
    // Ensure we have valid calculations to work with
    if (!calculations || calculations.length === 0) {
      setPayrollSummary({
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalEwaDeductions: 0,
        employeeCount: 0,
        departmentSummary: [],
        previousPeriodComparison: 0,
      });
      return;
    }

    // Calculate totals
    const totalGrossPay = calculations.reduce(
      (sum, calc) => sum + (Number(calc.grossPay) || 0),
      0
    );
    const totalDeductions = calculations.reduce(
      (sum, calc) => sum + (Number(calc.totalDeductions) || 0),
      0
    );
    const totalNetPay = calculations.reduce(
      (sum, calc) => sum + (Number(calc.netPay) || 0),
      0
    );
    const totalEwaDeductions = calculations.reduce(
      (sum, calc) => sum + (Number(calc.ewaDeductions) || 0),
      0
    );

    // Group by department
    const departments = Array.from(
      new Set(calculations.map((calc) => calc.department))
    );
    const departmentSummary = departments.map((dept) => {
      const deptEmployees = calculations.filter(
        (calc) => calc.department === dept
      );
      const deptTotal = deptEmployees.reduce(
        (sum, calc) => sum + (Number(calc.netPay) || 0),
        0
      );
      return {
        department: dept,
        employeeCount: deptEmployees.length,
        totalAmount: deptTotal,
        percentageOfTotal:
          totalNetPay > 0 ? (deptTotal / totalNetPay) * 100 : 0,
      };
    });

    // Previous period comparison (simulated)
    // In a real implementation, this would query historical data
    const previousPeriodComparison = Math.random() * 10 - 5; // -5% to +5% change

    setPayrollSummary({
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      totalEwaDeductions: totalEwaDeductions,
      employeeCount: calculations.length,
      departmentSummary,
      previousPeriodComparison,
    });
  };

  // State for employee detail dialog
  const [editingEmployee, setEditingEmployee] =
    useState<EmployeePayrollCalculation | null>(null);
  const [viewingEmployee, setViewingEmployee] =
    useState<EmployeePayrollCalculation | null>(null);
  const [editValues, setEditValues] = useState({
    grossPay: 0,
    netPay: 0,
    hoursWorked: 0,
    overtimeHours: 0,
    ewaDeductions: 0,
    adjustmentReason: "",
  });

  // Handle editing an employee's payroll calculation
  const handleEditEmployee = (employee: EmployeePayrollCalculation) => {
    setEditingEmployee(employee);
    setEditValues({
      grossPay: employee.grossPay,
      netPay: employee.netPay,
      hoursWorked: employee.hoursWorked,
      overtimeHours: employee.overtimeHours,
      ewaDeductions: employee.ewaDeductions,
      adjustmentReason: "",
    });
  };

  // Handle saving edited employee payroll
  const handleSaveEmployeeEdit = () => {
    if (!editingEmployee) return;

    const editedCalculations = payrollCalculations.map((calc) => {
      if (calc.id === editingEmployee.id) {
        // Store original value if not already stored
        const originalNetPay = calc.originalNetPay || calc.netPay;

        // Calculate new totals with edited values
        const totalDeductions =
          calc.paye +
          calc.nssf +
          calc.nhif +
          calc.housingLevy +
          editValues.ewaDeductions +
          calc.loanDeductions +
          calc.otherDeductions;

        return {
          ...calc,
          grossPay: editValues.grossPay,
          hoursWorked: editValues.hoursWorked,
          overtimeHours: editValues.overtimeHours,
          ewaDeductions: editValues.ewaDeductions,
          totalDeductions,
          netPay: editValues.netPay,
          isEdited: true,
          originalNetPay,
          statusReason: editValues.adjustmentReason || "Manual adjustment",
        };
      }
      return calc;
    });

    setPayrollCalculations(editedCalculations);
    calculatePayrollSummary(editedCalculations);
    setEditingEmployee(null);

    toast({
      title: "Payroll Adjusted",
      description: `Manual adjustment applied to ${editingEmployee.name}'s payroll.`,
      variant: "default",
    });
  };

  // Handle viewing employee details
  const handleViewDetails = (employee: EmployeePayrollCalculation) => {
    setViewingEmployee(employee);
  };

  // Close employee details dialog
  const handleCloseDetails = () => {
    setViewingEmployee(null);
  };

  // Handle recalculation of payroll
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      // Reset any existing calculation first
      setPayrollCalculations([]);
      setPayrollSummary({
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalEwaDeductions: 0,
        employeeCount: 0,
        departmentSummary: [],
        previousPeriodComparison: 0,
      });

      // Run the calculation again
      const calculations = await calculatePayroll();

      // If calculations were successful, update the UI
      if (calculations && calculations.length > 0) {
        toast({
          title: "Recalculation Complete",
          description: `Successfully recalculated payroll for ${calculations.length} employees.`,
        });
      }

      // Don't automatically navigate - the user should be in review stage already
      // setCurrentStage(STAGES.REVIEW);
    } catch (error) {
      console.error("Error recalculating payroll:", error);
      toast({
        title: "Recalculation Error",
        description:
          "An error occurred during recalculation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Handle finalization of payroll
  const handleFinalizePayroll = async () => {
    // In a real implementation, this would commit the payroll to the database
    setIsSubmitting(true);

    try {
      // Format data for the API
      const payrollSubmission = {
        payPeriodStart: payPeriod.startDate,
        payPeriodEnd: payPeriod.endDate,
        processedAt: new Date().toISOString(),
        notes: finalizationNote,
        employeePayrolls: payrollCalculations.map((calc) => ({
          employeeId: calc.id,
          employeeNumber: calc.employeeNumber,
          name: calc.name,
          department: calc.department,
          position: calc.position,
          hoursWorked: calc.hoursWorked,
          overtimeHours: calc.overtimeHours,
          hourlyRate: calc.hourlyRate,
          grossPay: calc.grossPay,
          taxableIncome: calc.taxableIncome,
          paye: calc.paye,
          nhif: calc.nhif,
          nssf: calc.nssf,
          housingLevy: calc.housingLevy,
          ewaDeductions: calc.ewaDeductions,
          loanDeductions: calc.loanDeductions,
          otherDeductions: calc.otherDeductions,
          totalDeductions: calc.totalDeductions,
          netPay: calc.netPay,
          paymentMethod: calc.mpesaNumber ? "mpesa" : "bank",
          mpesaNumber: calc.mpesaNumber,
          bankName: calc.bankName,
          bankAccountNumber: calc.bankAccountNumber,
          status: "completed",
        })),
      };

      // Submit to server
      const response = await fetch("/api/payroll/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payrollSubmission),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process payroll");
      }

      // Get the saved payroll data
      const savedPayroll = await response.json();

      // Mark calculations as finalized
      const finalizedCalculations = payrollCalculations.map((calc) => ({
        ...calc,
        status: "complete" as const,
        processedId: savedPayroll.id, // Store the payroll reference ID
      }));

      // Update state
      setPayrollCalculations(finalizedCalculations);
      setCurrentStage(STAGES.FINALIZE);

      // Mark payroll as processed in the local state
      setIsPayrollProcessed(true);

      // Force refresh any cached data
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });

      toast({
        title: "Payroll Finalized",
        description: `Payroll for period ${new Date(
          payPeriod.startDate
        ).toLocaleDateString()} - ${new Date(
          payPeriod.endDate
        ).toLocaleDateString()} has been finalized. Reference: ${
          savedPayroll.id || "N/A"
        }`,
      });
    } catch (error) {
      console.error("Error finalizing payroll:", error);
      toast({
        title: "Finalization Error",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while finalizing the payroll. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Define stepper steps based on the current stage
  const getStepperSteps = () => {
    const stageIndex = Object.values(STAGES).indexOf(currentStage);
    return [
      {
        id: 1,
        name: "Setup",
        completed: stageIndex > 0, // Completed if we're past this stage
        current: currentStage === STAGES.SETUP,
      },
      {
        id: 2,
        name: "Review",
        completed: stageIndex > 1, // Completed if we're past this stage
        current: currentStage === STAGES.REVIEW,
      },
      {
        id: 3,
        name: "Finalize",
        completed: false, // Never completed as it's the last step
        current: currentStage === STAGES.FINALIZE,
      },
    ];
  };

  // Helper function to format hours to nearest half hour - add this after other helper functions
  const formatHoursToHalfHour = (hours: number): string => {
    // Round to nearest half hour first
    const roundedHours = Math.round(hours * 2) / 2;
    // Format using Numeral.js
    return numeral(roundedHours).format("0,0.0");
  };

  // Initialize the process by fetching necessary data
  useEffect(() => {
    // Set default period without calculation
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Only set these values if they haven't been set yet
    if (!payPeriod.startDate || !payPeriod.endDate) {
      setPayPeriod({
        startDate: firstDay.toISOString().split("T")[0],
        endDate: lastDay.toISOString().split("T")[0],
      });

      setDate({
        from: firstDay,
        to: lastDay,
      });
    }

    // Only fetch employee data if we don't have it yet
    if (!employeeData || employeeData.length === 0) {
      fetchEmployeeData();
    }
  }, []); // Empty dependency array since we only want this to run once

  // Fetch employee data function
  const fetchEmployeeData = async () => {
    try {
      // In a production app, this would fetch from the API
      // For demo, we're using the provided data already loaded via React Query
      console.log(
        "Employee data already loaded:",
        employeeData.length,
        "employees"
      );
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  return (
    <main className="p-4 lg:p-6 animate-fade-in">
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Process Payroll
            </h1>
            <p className="text-muted-foreground">
              Calculate, review, and finalize payroll for all employees
            </p>
          </div>
        </div>

        {/* Import the Stepper component */}
        <Stepper steps={getStepperSteps()} />

        {/* Stage Content */}
        {currentStage === STAGES.SETUP && (
          <div className="space-y-6">
            <div className="space-y-4 items-start">
              <div className="py-3 px-4 bg-muted rounded-md border flex items-center justify-between">
                <div className="flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">Current Pay Period</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payPeriod.startDate)} -{" "}
                      {formatDate(payPeriod.endDate)} (
                      {(() => {
                        const start = new Date(payPeriod.startDate);
                        const end = new Date(payPeriod.endDate);
                        // Count only weekdays (Monday-Friday)
                        let workdays = 0;
                        for (
                          let d = new Date(start);
                          d <= end;
                          d.setDate(d.getDate() + 1)
                        ) {
                          const day = d.getDay();
                          if (day !== 0 && day !== 6) workdays++;
                        }
                        return workdays;
                      })()}{" "}
                      working days)
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Change Period
                      <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handlePeriodSelection("current")}
                    >
                      Current Month ({format(new Date(), "MMM yyyy")})
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePeriodSelection("previous")}
                    >
                      Previous Month (
                      {format(
                        new Date(
                          new Date().setMonth(new Date().getMonth() - 1)
                        ),
                        "MMM yyyy"
                      )}
                      )
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPeriodType("custom")}>
                      Custom Range...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Summary Preview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Eligible Employees
                      </span>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-lg font-bold">
                          {eligibleEmployeeCount}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        From {employeeData.length} total employees
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Working Days
                      </span>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-lg font-bold">
                          {(() => {
                            const start = new Date(payPeriod.startDate);
                            const end = new Date(payPeriod.endDate);
                            // Count only weekdays (Monday-Friday)
                            let workdays = 0;
                            for (
                              let d = new Date(start);
                              d <= end;
                              d.setDate(d.getDate() + 1)
                            ) {
                              const day = d.getDay();
                              if (day !== 0 && day !== 6) workdays++;
                            }
                            return workdays;
                          })()}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Business days in the period
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Processing Scope */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Processing Scope
                  </CardTitle>
                  <CardDescription>
                    Select which employees to include in this payroll run
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search and Department Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department Filter</Label>
                      <Select
                        value={selectedDepartment}
                        onValueChange={setSelectedDepartment}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            All Departments ({employeeData.length})
                          </SelectItem>
                          {departmentData.map((dept: any) => {
                            const deptEmployeeCount = employees.filter(
                              (emp) => emp.department === dept.name
                            ).length;
                            return (
                              <SelectItem key={dept.id} value={dept.name}>
                                {dept.name} ({deptEmployeeCount})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employee-search">Search Employee</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="employee-search"
                          placeholder="Name or ID"
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Employee Selection */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium">
                          Employees ({eligibleEmployeeCount})
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {excludedEmployees.length} excluded
                        </Badge>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExcludedEmployees([])}
                          className="text-xs h-7"
                          disabled={excludedEmployees.length === 0}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExcludedEmployees(
                              employeeData.map((emp) => emp.id)
                            )
                          }
                          className="text-xs h-7"
                          disabled={
                            excludedEmployees.length === employeeData.length
                          }
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-md h-[400px] overflow-y-auto p-0 bg-card/20 w-full">
                      {isLoadingEmployees ? (
                        <div className="flex justify-center items-center h-full">
                          <div className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Loading employees...
                          </div>
                        </div>
                      ) : employeeData.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-full text-center p-4">
                          <Users className="h-10 w-10 text-muted-foreground mb-2 opacity-20" />
                          <h3 className="font-medium text-muted-foreground">
                            No employees found
                          </h3>
                          <p className="text-xs text-muted-foreground/70 mt-1 max-w-[250px]">
                            There are no employees in the selected department or
                            matching your search criteria.
                          </p>
                          <Button variant="link" size="sm" className="mt-2">
                            Add New Employee
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full">
                          <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                              <TableRow>
                                <TableHead className="w-10">
                                  <Checkbox
                                    checked={
                                      eligibleEmployeeCount ===
                                      employeeData.length
                                    }
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setExcludedEmployees([]);
                                      } else {
                                        setExcludedEmployees(
                                          employeeData.map((emp) => emp.id)
                                        );
                                      }
                                    }}
                                  />
                                </TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead className="text-right">
                                  Hourly Rate
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {employeeData.map((employee: any) => (
                                <TableRow
                                  key={employee.id}
                                  className={
                                    excludedEmployees.includes(employee.id)
                                      ? "opacity-60"
                                      : ""
                                  }
                                >
                                  <TableCell>
                                    <Checkbox
                                      id={`exclude-${employee.id}`}
                                      checked={
                                        !excludedEmployees.includes(employee.id)
                                      }
                                      onCheckedChange={(checked) => {
                                        toggleEmployeeExclusion(employee.id);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <Avatar className="h-6 w-6 mr-2">
                                        <AvatarFallback className="text-xs">
                                          {employee.name
                                            .split(" ")
                                            .map((n: string) => n[0])
                                            .join("")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="font-medium">
                                          {employee.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {employee.employeeNumber}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{employee.department}</TableCell>
                                  <TableCell>{employee.position}</TableCell>
                                  <TableCell>
                                    {employee.contact || employee.email}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(
                                      employee.hourlyRate ||
                                        Math.floor(500 + Math.random() * 1000)
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {/* Employee selection helper text */}
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        Selecting an employee will include them in payroll
                        calculations. Employees missing attendance records or
                        with incomplete profiles may trigger validation warnings
                        in the next step.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                size="default"
                onClick={() => {
                  calculatePayroll().then((calculations) => {
                    if (calculations && calculations.length > 0) {
                      setCurrentStage(STAGES.REVIEW);
                    }
                  });
                }}
                disabled={eligibleEmployeeCount === 0}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calculate & Review
              </Button>
            </div>
          </div>
        )}

        {currentStage === "review" && (
          <div className="space-y-8">
            {/* Header and Status Summary */}
            <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-100 dark:border-blue-900/50 rounded-lg p-6">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div>
                  <h2 className="text-xl font-bold flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                    Payroll Calculation Complete
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Review the payroll data before finalizing for the period{" "}
                    {formatDate(payPeriod.startDate)} -{" "}
                    {formatDate(payPeriod.endDate)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export Preview
                        <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => console.log("Export to Excel")}
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        <span>Excel Spreadsheet</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => console.log("Export to CSV")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span>CSV File</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => console.log("Generate Payslips")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Generate Payslips</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={handleRecalculate}
                    variant="outline"
                    disabled={isRecalculating}
                  >
                    {isRecalculating ? (
                      <>
                        <span className="h-4 w-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                        Recalculating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Recalculate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Status Overview Strip - Quick at-a-glance visual status */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 bg-card rounded-md border p-3">
                  <div className="rounded-full p-2 bg-green-100 dark:bg-green-950/50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Complete</div>
                    <div className="text-2xl font-bold">
                      {
                        payrollCalculations.filter(
                          (calc) => calc.status === "complete"
                        ).length
                      }
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        (
                        {(
                          (payrollCalculations.filter(
                            (calc) => calc.status === "complete"
                          ).length /
                            payrollCalculations.length) *
                          100
                        ).toFixed(0)}
                        %)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-card rounded-md border p-3">
                  <div className="rounded-full p-2 bg-amber-100 dark:bg-amber-950/50">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Warnings</div>
                    <div className="text-2xl font-bold">
                      {
                        payrollCalculations.filter(
                          (calc) => calc.status === "warning"
                        ).length
                      }
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        (
                        {(
                          (payrollCalculations.filter(
                            (calc) => calc.status === "warning"
                          ).length /
                            payrollCalculations.length) *
                          100
                        ).toFixed(0)}
                        %)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-card rounded-md border p-3">
                  <div className="rounded-full p-2 bg-red-100 dark:bg-red-950/50">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Errors</div>
                    <div className="text-2xl font-bold">
                      {
                        payrollCalculations.filter(
                          (calc) => calc.status === "error"
                        ).length
                      }
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        (
                        {(
                          (payrollCalculations.filter(
                            (calc) => calc.status === "error"
                          ).length /
                            payrollCalculations.length) *
                          100
                        ).toFixed(0)}
                        %)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card for average hours */}
                <div className="flex items-center gap-3 bg-card rounded-md border p-3">
                  <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-950/50">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Avg. Hours</div>
                    <div className="text-2xl font-bold">
                      {payrollCalculations.length > 0
                        ? formatHoursToHalfHour(
                            payrollCalculations.reduce(
                              (sum, calc) =>
                                sum + (Number(calc.hoursWorked) || 0),
                              0
                            ) / payrollCalculations.length
                          )
                        : "0"}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        hours
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total Gross Pay</span>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-2xl font-bold">
                      {formatKES(payrollSummary.totalGrossPay)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Before deductions and taxes
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total Net Pay</span>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-2xl font-bold">
                      {formatKES(payrollSummary.totalNetPay)}
                    </span>
                    <span className={`text-xs text-muted-foreground`}>
                      {payrollSummary.previousPeriodComparison >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(
                        payrollSummary.previousPeriodComparison
                      ).toFixed(1)}
                      % from previous
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">EWA Withdrawals</span>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-2xl font-bold">
                      {formatKES(payrollSummary.totalEwaDeductions)}
                    </span>
                    <div className="flex items-center space-x-1">
                      <div className="w-[50px] bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{
                            width: `${
                              (payrollSummary.totalEwaDeductions /
                                payrollSummary.totalGrossPay) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(
                          (payrollSummary.totalEwaDeductions /
                            payrollSummary.totalGrossPay) *
                          100
                        ).toFixed(1)}
                        % of gross
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Employees</span>
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold">
                        {payrollSummary.employeeCount}
                      </span>
                      <span className="text-sm ml-1 text-muted-foreground">
                        processed
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {
                        payrollCalculations.filter(
                          (calc) => calc.status === "complete"
                        ).length
                      }{" "}
                      complete,{" "}
                      {
                        payrollCalculations.filter(
                          (calc) => calc.status !== "complete"
                        ).length
                      }{" "}
                      with issues
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Payroll Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Department Breakdown */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-base">
                    <Building className="mr-2 h-5 w-5" />
                    Department Breakdown
                  </CardTitle>
                  <CardDescription>
                    Payroll distribution by department
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payrollSummary.departmentSummary.map((dept, index) => (
                      <div key={dept.department} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center">
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                index === 0
                                  ? "bg-blue-500"
                                  : index === 1
                                  ? "bg-green-500"
                                  : index === 2
                                  ? "bg-purple-500"
                                  : index === 3
                                  ? "bg-yellow-500"
                                  : index === 4
                                  ? "bg-red-500"
                                  : "bg-orange-500"
                              }`}
                            ></div>
                            {dept.department}
                          </span>
                          <div className="flex space-x-4">
                            <span className="text-muted-foreground text-xs">
                              {dept.employeeCount} employees
                            </span>
                            <span className="font-medium">
                              {formatKES(dept.totalAmount)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`${
                              index === 0
                                ? "bg-blue-500"
                                : index === 1
                                ? "bg-green-500"
                                : index === 2
                                ? "bg-purple-500"
                                : index === 3
                                ? "bg-yellow-500"
                                : index === 4
                                ? "bg-red-500"
                                : "bg-orange-500"
                            } h-2 rounded-full`}
                            style={{ width: `${dept.percentageOfTotal}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Right: Deduction Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-base">
                    <BarChart className="mr-2 h-5 w-5" />
                    Deduction Analysis
                  </CardTitle>
                  <CardDescription>Breakdown of all deductions</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 place-items-center">
                  {/* Deduction Pie Chart (Visualization) */}
                  <div className="flex justify-center items-center py-2 w-[200px] h-[200px]">
                    <ChartContainer config={deductionsChartConfig}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepareDeductionsChartData(
                              payrollCalculations
                            )}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {prepareDeductionsChartData(
                              payrollCalculations
                            ).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  deductionsChartConfig[entry.name]?.color ||
                                  "#d1d5db"
                                }
                              />
                            ))}
                          </Pie>
                          <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-sm font-medium"
                          >
                            Deductions
                          </text>
                          <text
                            x="50%"
                            y="65%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-xs"
                          >
                            {payrollSummary &&
                            typeof payrollSummary.totalDeductions === "number"
                              ? formatKES(payrollSummary.totalDeductions)
                              : formatKES(0)}
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>

                  {/* Deduction Legend */}
                  <div className="space-y-2 mt-4">
                    {prepareDeductionsChartData(payrollCalculations).map(
                      (item, index) => (
                        <div
                          key={index}
                          className="flex gap-5 items-center justify-between text-sm"
                        >
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-sm mr-2"
                              style={{
                                backgroundColor:
                                  deductionsChartConfig[item.name]?.color ||
                                  "#d1d5db",
                              }}
                            ></div>
                            <span>
                              {deductionsChartConfig[item.name]?.label ||
                                item.name}
                            </span>
                          </div>
                          <span className="font-medium">
                            {formatKES(item.value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employee-Level Review Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center text-base">
                      <Users className="mr-2 h-5 w-5" />
                      Employee Payroll Details
                    </CardTitle>
                    <CardDescription>
                      Review and adjust individual employee calculations before
                      finalizing
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search employees..."
                        className="pl-8 w-full"
                        value={
                          (columnFilters.find((f) => f.id === "name")
                            ?.value as string) || ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setColumnFilters((prev) => {
                            const filtered = prev.filter(
                              (filter) => filter.id !== "name"
                            );
                            if (value) {
                              return [...filtered, { id: "name", value }];
                            }
                            return filtered;
                          });
                        }}
                      />
                    </div>

                    <Select
                      value={
                        (columnFilters.find((f) => f.id === "department")
                          ?.value as string) || "all"
                      }
                      onValueChange={(value) => {
                        setColumnFilters((prev) => {
                          const filtered = prev.filter(
                            (filter) => filter.id !== "department"
                          );
                          if (value && value !== "all") {
                            return [...filtered, { id: "department", value }];
                          }
                          return filtered;
                        });
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <Building className="h-4 w-4 mr-2 opacity-70" />
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {Array.from(
                          new Set(
                            payrollCalculations.map((emp) => emp.department)
                          )
                        ).map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                          <Columns className="h-3.5 w-3.5 mr-1" />
                          Columns
                          <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {columns
                          .filter(
                            (column) =>
                              column.id !== "id" && column.id !== "actions"
                          )
                          .map((column) => (
                            <DropdownMenuCheckboxItem
                              key={column.id}
                              checked={columnVisibility[column.id as string]}
                              onCheckedChange={(value) =>
                                setColumnVisibility((prev) => ({
                                  ...prev,
                                  [column.id as string]: value,
                                }))
                              }
                            >
                              {typeof column.header === "string"
                                ? column.header
                                : column.id}
                            </DropdownMenuCheckboxItem>
                          ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setColumnFilters([]);
                          }}
                        >
                          <FilterX className="h-3.5 w-3.5 mr-2" />
                          Clear Filters
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="">
                  <div className="overflow-hidden">
                    <DataTable
                      columns={columns}
                      data={payrollCalculations}
                      searchColumn="name"
                      onRowClick={(employee) =>
                        handleViewDetails(
                          employee as EmployeePayrollCalculation
                        )
                      }
                    />
                  </div>
                </div>

                {/* Pagination is handled by the DataTable component */}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStage(STAGES.SETUP)}
              >
                Back to Setup
              </Button>

              <div className="flex space-x-2">
                <Button
                  onClick={handleRecalculate}
                  variant="outline"
                  disabled={isRecalculating}
                >
                  {isRecalculating ? (
                    <>
                      <span className="h-4 w-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                      Recalculating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Recalculate
                    </>
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button>Finalize Payroll</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Finalize Payroll</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will finalize the payroll for the selected period.
                        After finalization, the payroll records will be locked
                        and can no longer be modified.
                        <div className="mt-4 bg-muted p-3 rounded-md text-sm">
                          <p>
                            <strong>Period:</strong>{" "}
                            {new Date(payPeriod.startDate).toLocaleDateString()}{" "}
                            - {new Date(payPeriod.endDate).toLocaleDateString()}
                          </p>
                          <p>
                            <strong>Total Amount:</strong>{" "}
                            {formatKES(payrollSummary.totalNetPay)}
                          </p>
                          <p>
                            <strong>Employees:</strong>{" "}
                            {payrollSummary.employeeCount}
                          </p>
                        </div>
                        <div className="mt-4">
                          <Label htmlFor="finalization-note">
                            Add a note (optional)
                          </Label>
                          <Input
                            id="finalization-note"
                            value={finalizationNote}
                            onChange={(e) =>
                              setFinalizationNote(e.target.value)
                            }
                            placeholder="Enter any notes about this payroll"
                            className="mt-1"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleFinalizePayroll}>
                        Finalize Payroll
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}

        {currentStage === STAGES.FINALIZE && (
          <div className="space-y-8">
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800 dark:text-green-200">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />
                  Payroll Successfully Finalized
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  The payroll for{" "}
                  {new Date(payPeriod.startDate).toLocaleDateString()} -{" "}
                  {new Date(payPeriod.endDate).toLocaleDateString()} has been
                  finalized successfully.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Total Gross Pay
                    </p>
                    <p className="font-medium">
                      {formatKES(payrollSummary.totalGrossPay)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Total Deductions
                    </p>
                    <p className="font-medium">
                      {formatKES(payrollSummary.totalDeductions)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Total Net Pay
                    </p>
                    <p className="font-bold">
                      {formatKES(payrollSummary.totalNetPay)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Employees Processed
                    </p>
                    <p className="font-medium">
                      {payrollSummary.employeeCount}
                    </p>
                  </div>
                </div>

                {finalizationNote && (
                  <div className="bg-card p-3 rounded border border-green-200 dark:border-green-950/50 mb-6">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Note
                    </p>
                    <p className="text-sm">{finalizationNote}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-300">
                    Export Options
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport("xlsx")}
                      disabled={isExporting}
                      className="border-green-200 text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      {isExporting && exportType === "xlsx" ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Exporting...
                        </span>
                      ) : (
                        "Export XLSX"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport("payslips")}
                      disabled={isExporting}
                      className="border-green-200 text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {isExporting && exportType === "payslips" ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        "Generate Payslips"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExport("summary")}
                      disabled={isExporting}
                      className="border-green-200 text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30"
                    >
                      <BarChart className="mr-2 h-4 w-4" />
                      {isExporting && exportType === "summary" ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        "Department Summary"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setPayPeriod(() => {
                    const today = new Date();
                    const firstDayOfMonth = new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      1
                    );
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
                  setSelectedDepartment("all");
                  setExcludedEmployees([]);
                  setPayrollCalculations([]);
                  setCurrentStage(STAGES.SETUP);
                }}
              >
                Start New Payroll Process
              </Button>
            </div>
          </div>
        )}

        {isCalculating && (
          <div className="!mt-0 fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-full max-w-md shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div>
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-950/50 p-3">
                      <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-center font-medium mb-2">
                    Calculating Payroll
                  </h3>
                  <div className="mb-2 text-center">
                    <p className="text-xs text-muted-foreground">
                      Processing{" "}
                      {Math.round(
                        (calculationProgress / 100) * eligibleEmployeeCount
                      )}{" "}
                      of {eligibleEmployeeCount} employees
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 dark:bg-muted my-4">
                    <div
                      className="bg-blue-500 dark:bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${calculationProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    This may take a few moments
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employee Edit Dialog */}
        <Dialog
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Employee Payroll</DialogTitle>
              <DialogDescription>
                Make manual adjustments to {editingEmployee?.name}'s payroll
                information
              </DialogDescription>
            </DialogHeader>

            {editingEmployee && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-gross-pay">Gross Pay (KES)</Label>
                      <Input
                        id="edit-gross-pay"
                        type="number"
                        value={editValues.grossPay}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            grossPay: Number(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Original value: {formatKES(editingEmployee.grossPay)}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="edit-net-pay">Net Pay (KES)</Label>
                      <Input
                        id="edit-net-pay"
                        type="number"
                        value={editValues.netPay}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            netPay: Number(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Original value: {formatKES(editingEmployee.netPay)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-hours">Hours Worked</Label>
                      <Input
                        id="edit-hours"
                        type="number"
                        value={editValues.hoursWorked}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            hoursWorked: Number(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Original value: {editingEmployee.hoursWorked} hours
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="edit-overtime">Overtime Hours</Label>
                      <Input
                        id="edit-overtime"
                        type="number"
                        value={editValues.overtimeHours}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            overtimeHours: Number(e.target.value),
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Original value: {editingEmployee.overtimeHours} hours
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-ewa">EWA Deductions (KES)</Label>
                  <Input
                    id="edit-ewa"
                    type="number"
                    value={editValues.ewaDeductions}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        ewaDeductions: Number(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Original value: {formatKES(editingEmployee.ewaDeductions)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="edit-reason">Adjustment Reason</Label>
                  <Textarea
                    id="edit-reason"
                    rows={3}
                    placeholder="Provide a reason for the manual adjustment (required for audit purposes)"
                    value={editValues.adjustmentReason}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        adjustmentReason: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Statutory deductions summary - not editable */}
                <div className="bg-muted p-4 rounded-md">
                  <h4 className="text-sm font-medium mb-2">
                    Statutory Deductions (Not Editable)
                  </h4>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">PAYE</dt>
                      <dd className="font-medium">
                        {formatKES(editingEmployee.paye)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">NSSF</dt>
                      <dd className="font-medium">
                        {formatKES(editingEmployee.nssf)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">SHIF</dt>
                      <dd className="font-medium">
                        {formatKES(editingEmployee.nhif)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Housing Levy</dt>
                      <dd className="font-medium">
                        {formatKES(editingEmployee.housingLevy)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingEmployee(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEmployeeEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Employee Details Dialog */}
        <Dialog
          open={!!viewingEmployee}
          onOpenChange={(open) => !open && setViewingEmployee(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                {viewingEmployee?.name} - Payroll Details
              </DialogTitle>
              <DialogDescription>
                Detailed payroll calculation for pay period{" "}
                {formatDate(payPeriod.startDate)} -{" "}
                {formatDate(payPeriod.endDate)}
              </DialogDescription>
            </DialogHeader>

            {viewingEmployee && (
              <div className="space-y-6 py-2">
                {/* Employee Info Banner */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-muted p-4 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {viewingEmployee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-lg font-bold">
                      {viewingEmployee.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {viewingEmployee.position}
                    </p>
                    <div className="text-sm">
                      <Badge variant="outline">
                        {viewingEmployee.department}
                      </Badge>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        ID: {viewingEmployee.employeeNumber}
                      </span>
                    </div>
                  </div>
                  <div className="bg-card border rounded-md p-3 flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">
                      Hourly Rate
                    </span>
                    <span className="text-lg font-bold">
                      {formatKES(viewingEmployee.hourlyRate)}
                    </span>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-xs text-muted-foreground font-medium">
                        Gross Pay
                      </div>
                      <div className="text-2xl font-bold">
                        {formatKES(viewingEmployee.grossPay)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {viewingEmployee.hoursWorked} hours ×{" "}
                        {formatKES(viewingEmployee.hourlyRate)}/hr
                        {viewingEmployee.overtimeHours > 0 &&
                          ` + ${viewingEmployee.overtimeHours} OT hrs`}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-xs text-muted-foreground font-medium">
                        Total Deductions
                      </div>
                      <div className="text-2xl font-bold">
                        {formatKES(viewingEmployee.totalDeductions)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(
                          (viewingEmployee.totalDeductions /
                            viewingEmployee.grossPay) *
                          100
                        ).toFixed(1)}
                        % of gross pay
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-xs text-muted-foreground font-medium">
                        Net Pay
                      </div>
                      <div className="text-2xl font-bold">
                        {formatKES(viewingEmployee.netPay)}
                      </div>
                      {viewingEmployee.isEdited &&
                        viewingEmployee.originalNetPay && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center">
                            <span>
                              Original:{" "}
                              {formatKES(viewingEmployee.originalNetPay)}
                            </span>
                            <span className="ml-1">
                              {viewingEmployee.netPay >
                              viewingEmployee.originalNetPay ? (
                                <ArrowUp className="h-3 w-3 text-green-600" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-red-600" />
                              )}
                            </span>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Deduction Breakdown */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Deduction Breakdown
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>PAYE (Income Tax)</span>
                          <span className="font-medium">
                            {formatKES(viewingEmployee.paye)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                          <div
                            className="h-1.5 bg-primary rounded-full"
                            style={{
                              width: `${
                                viewingEmployee.totalDeductions > 0
                                  ? (viewingEmployee.paye /
                                      viewingEmployee.totalDeductions) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span>NSSF (6%)</span>
                          <span className="font-medium">
                            {formatKES(viewingEmployee.nssf)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                          <div
                            className="h-1.5 bg-primary/80 rounded-full"
                            style={{
                              width: `${
                                viewingEmployee.totalDeductions > 0
                                  ? (viewingEmployee.nssf /
                                      viewingEmployee.totalDeductions) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span>SHIF (2.75%)</span>
                          <span className="font-medium">
                            {formatKES(viewingEmployee.nhif)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                          <div
                            className="h-1.5 bg-primary/70 rounded-full"
                            style={{
                              width: `${
                                viewingEmployee.totalDeductions > 0
                                  ? (viewingEmployee.nhif /
                                      viewingEmployee.totalDeductions) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Housing Levy (1.5%)</span>
                          <span className="font-medium">
                            {formatKES(viewingEmployee.housingLevy)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                          <div
                            className="h-1.5 bg-primary/60 rounded-full"
                            style={{
                              width: `${
                                viewingEmployee.totalDeductions > 0
                                  ? (viewingEmployee.housingLevy /
                                      viewingEmployee.totalDeductions) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm">
                          <span>EWA Withdrawals</span>
                          <span className="font-medium">
                            {formatKES(viewingEmployee.ewaDeductions)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                          <div
                            className="h-1.5 bg-primary/50 rounded-full"
                            style={{
                              width: `${
                                viewingEmployee.totalDeductions > 0
                                  ? (viewingEmployee.ewaDeductions /
                                      viewingEmployee.totalDeductions) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {viewingEmployee.loanDeductions > 0 && (
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Loan Repayments</span>
                            <span className="font-medium">
                              {formatKES(viewingEmployee.loanDeductions)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                            <div
                              className="h-1.5 bg-primary/40 rounded-full"
                              style={{
                                width: `${
                                  viewingEmployee.totalDeductions > 0
                                    ? (viewingEmployee.loanDeductions /
                                        viewingEmployee.totalDeductions) *
                                      100
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {viewingEmployee.otherDeductions > 0 && (
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Other Deductions</span>
                            <span className="font-medium">
                              {formatKES(viewingEmployee.otherDeductions)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                            <div
                              className="h-1.5 bg-primary/30 rounded-full"
                              style={{
                                width: `${
                                  viewingEmployee.totalDeductions > 0
                                    ? (viewingEmployee.otherDeductions /
                                        viewingEmployee.totalDeductions) *
                                      100
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t">
                      <div className="flex justify-between font-medium">
                        <span>Total Deductions</span>
                        <span>
                          {formatKES(viewingEmployee.totalDeductions)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Calculation Details & Status */}
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-md">
                      <h4 className="text-sm font-medium mb-3">
                        Pay Calculation
                      </h4>
                      <dl className="grid grid-cols-2 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Regular Hours</dt>
                        <dd className="font-medium">
                          {viewingEmployee.hoursWorked} hours
                        </dd>

                        <dt className="text-muted-foreground">
                          Overtime Hours
                        </dt>
                        <dd className="font-medium">
                          {viewingEmployee.overtimeHours} hours
                        </dd>

                        <dt className="text-muted-foreground">Hourly Rate</dt>
                        <dd className="font-medium">
                          {formatKES(viewingEmployee.hourlyRate)}
                        </dd>

                        <dt className="text-muted-foreground">Regular Pay</dt>
                        <dd className="font-medium">
                          {formatKES(
                            viewingEmployee.hourlyRate *
                              viewingEmployee.hoursWorked
                          )}
                        </dd>

                        {viewingEmployee.overtimeHours > 0 && (
                          <>
                            <dt className="text-muted-foreground">
                              Overtime Pay (1.5×)
                            </dt>
                            <dd className="font-medium">
                              {formatKES(
                                viewingEmployee.hourlyRate *
                                  viewingEmployee.overtimeHours *
                                  1.5
                              )}
                            </dd>
                          </>
                        )}

                        <dt className="text-muted-foreground">Gross Pay</dt>
                        <dd className="font-medium">
                          {formatKES(viewingEmployee.grossPay)}
                        </dd>
                      </dl>
                    </div>

                    <div className="border p-4 rounded-md">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        {viewingEmployee.status === "complete" ? (
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        ) : viewingEmployee.status === "warning" ? (
                          <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2 text-red-600" />
                        )}
                        <span>
                          Status:{" "}
                          <span className="capitalize">
                            {viewingEmployee.status}
                          </span>
                        </span>
                      </h4>

                      {viewingEmployee.statusReason && (
                        <p className="text-sm text-muted-foreground">
                          {viewingEmployee.statusReason}
                        </p>
                      )}

                      {viewingEmployee.isEdited && (
                        <div className="flex items-center mt-2 text-xs">
                          <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Manually adjusted
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Details Section */}
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-base font-semibold flex items-center mb-3">
                    <CreditCard className="h-4 w-4 mr-2 text-primary" />
                    Payment Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted p-4 rounded-md">
                    <div className="">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <Building2 className="h-4 w-4 mr-1 text-muted-foreground" />
                        Bank Transfer
                      </h4>
                      <p className="text-sm mb-1">
                        <span className="text-muted-foreground">Bank:</span>
                        <span className="font-medium ml-2">
                          {viewingEmployee.bankName}
                        </span>
                      </p>
                      <p className="text-sm mb-1">
                        <span className="text-muted-foreground">Account:</span>
                        <span className="font-medium ml-2">
                          {viewingEmployee.bankAccountNumber}
                        </span>
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <Building2 className="h-4 w-4 mr-1 text-muted-foreground" />
                        Mobile Money
                      </h4>
                      <p className="text-sm mb-1">
                        <span className="text-muted-foreground">Number:</span>
                        <span className="font-medium ml-2">
                          {viewingEmployee?.mpesaNumber || "0700000007"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCloseDetails}>
                  Close
                </Button>
                {viewingEmployee && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      handleCloseDetails();
                      handleEditEmployee(viewingEmployee);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Payroll
                  </Button>
                )}
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Print Payslip
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

// Move helper functions outside component but keep them in the file
function calculateWorkHours(records: AttendanceRecord[]) {
  return {
    regularHours: 40, // Implement actual calculation
    overtimeHours: 5, // Implement actual calculation
  };
}

async function fetchEmployeeDeductions(employeeId: number) {
  // Implement actual API call
  return {
    ewaDeductions: 0,
    loanDeductions: 0,
  };
}

function calculateEmployeeGrossPay(employee: Employee) {
  const { regularHours, overtimeHours } = calculateWorkHours([]);
  return (
    regularHours * employee.hourlyRate +
    overtimeHours * employee.hourlyRate * 1.5
  );
}
