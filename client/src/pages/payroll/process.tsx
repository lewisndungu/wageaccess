import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
import { queryClient } from "@/lib/queryClient";
import { Stepper } from "@/components/ui/stepper";
import { formatTime } from "@/lib/date-utils";
import {
  Employee,
  Attendance as AttendanceRecord,
  EmployeePayrollCalculation,
} from "shared/schema";

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
  ScrollText,
  Loader2,
  ClipboardList,
  Download,
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Workflow stages
const STAGES = {
  SELECT_PERIOD: "SELECT_PERIOD",
  FINALIZE: "FINALIZE",
  EXPORT: "EXPORT",
};

// Add RequestInit type for fetch options
type RequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

// Define a helper function to make API requests (with types for the response)
const apiRequest = async <T = any>(
  method: string,
  url: string,
  data?: any
): Promise<T> => {
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("API Request Error:", error);
    throw error;
  }
};

export default function ProcessPayrollPage() {
  // State declarations
  const [currentStage, setCurrentStage] = useState<string>(
    STAGES.SELECT_PERIOD
  );
  const [payPeriod, setPayPeriod] = useState<{
    startDate: string;
    endDate: string;
  }>(() => {
    // Auto-select current month by default
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      startDate: firstDay.toISOString().split("T")[0],
      endDate: lastDay.toISOString().split("T")[0],
    };
  });
  const [excludedEmployees, setExcludedEmployees] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationProgress, setCalculationProgress] = useState<number>(0);
  const [validationIssues, setValidationIssues] = useState<
    {
      employeeId: string;
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

  // Fetch employee data using React Query with axios
  const { data: employeeData = [], isLoading: isLoadingEmployees } = useQuery<
    Employee[]
  >({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await axios.get("/api/employees");
      return response.data;
    },
    staleTime: 60000, // 1 minute
  });

  // Calculate eligible employees count
  const eligibleEmployeeCount = employeeData.filter(
    (emp) => !excludedEmployees.includes(String(emp.id))
  ).length;

  // Define table columns
  const columns: ColumnDef<EmployeePayrollCalculation>[] = useMemo(
    () => [
      {
        accessorKey: "employeeNumber",
        header: "Employee Number",
        cell: ({ row }) => (
          <div className="capitalize">{row.getValue("employeeNumber")}</div>
        ),
      },
      {
        accessorKey: "name",
        header: "Employee Name",
        cell: ({ row }) => <div>{row.getValue("name")}</div>,
      },
      {
        accessorKey: "hoursWorked",
        header: "Hours",
        cell: ({ row }) => (
          <div>
            {formatHoursToHalfHour(Number(row.getValue("hoursWorked")))}
            {row.original.overtimeHours && Number(row.original.overtimeHours) > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                (+{formatHoursToHalfHour(Number(row.original.overtimeHours))}{" "}
                OT)
              </span>
            )}
          </div>
        ),
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
    ],
    []
  );

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
    }
  };

  // Toggle employee exclusion
  const toggleEmployeeExclusion = (employeeId: string) => {
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
        description: "Please select at least one employee to process.",
        variant: "destructive",
      });
      return [];
    }

    try {
      // Get eligible employees
      const eligibleEmployees =
        excludedEmployees.length > 0
          ? employeeData.filter(
              (emp) => !excludedEmployees.includes(String(emp.id))
            )
          : employeeData;

      // Check if there are any eligible employees after filtering
      if (eligibleEmployees.length === 0) {
        toast({
          title: "No Eligible Employees",
          description:
            "No employees are eligible for payroll calculation based on the current selection and filters.",
          variant: "destructive",
        });

        // Keep this to ensure we reset the state if no employees
        setIsCalculating(false);
        return [];
      }

      // Initialize calculations array
      const calculations: EmployeePayrollCalculation[] = [];

      // Process employees in batches to avoid UI freezing
      return new Promise((resolve) => {
        // Number of employees to process in each batch
        const BATCH_SIZE = 5;
        let currentIndex = 0;

        const processBatch = async () => {
          const endIndex = Math.min(
            currentIndex + BATCH_SIZE,
            eligibleEmployees.length
          );

          // Get the current batch of employees
          const batchEmployees = eligibleEmployees.slice(currentIndex, endIndex);
          
          // Process the batch asynchronously
          const batchCalculations = batchEmployees.map(employee => 
            calculateEmployeePayroll(employee)
          );
          
          // Add all batch calculations to the main array
          calculations.push(...batchCalculations);

          // Update progress
          setCalculationProgress(prevProgress => {
            const newProgress = (endIndex / eligibleEmployees.length) * 100;
            return Math.min(newProgress, 99); // Cap at 99% until fully complete
          });

          currentIndex = endIndex;

          // If there are more employees to process, schedule next batch
          if (currentIndex < eligibleEmployees.length) {
            // Use setTimeout to yield to the browser's event loop
            setTimeout(processBatch, 0);
          } else {
            // All employees processed
            // Calculate summary statistics
            calculatePayrollSummary(calculations);

            // Set calculations in state
            setPayrollCalculations(calculations);

            // Complete progress
            setCalculationProgress(100);

            toast({
              title: "Calculation Complete",
              description: `Successfully calculated payroll for ${calculations.length} employees.`,
            });

            resolve(calculations);
          }
        };

        // Start processing the first batch with setTimeout
        setTimeout(processBatch, 0);
      });
    } catch (error) {
      console.error("Payroll calculation error:", error);
      toast({
        title: "Calculation Error",
        description: "An error occurred during calculation. Please try again.",
        variant: "destructive",
      });

      return [];
    }
  };

  // Validate employee data before calculation
  const validateEmployeeData = async (): Promise<void> => {
    // Reset validation issues
    setValidationIssues([]);

    // Get eligible employees
    const eligibleEmployees = employeeData.filter(
      (emp) => !excludedEmployees.includes(String(emp.id))
    );

    const newIssues = [];

    // Validate each employee
    for (const employee of eligibleEmployees) {
      // Check for missing hourly rate
      if (!employee.hourlyRate) {
        newIssues.push({
          employeeId: String(employee.id),
          issue: "Missing hourly rate",
        });
      }

      // Simulate attendance check
      // In a real implementation, this would query the attendance records
      const hasCompleteAttendance = Math.random() > 0.1; // 10% chance of incomplete attendance
      if (!hasCompleteAttendance) {
        newIssues.push({
          employeeId: String(employee.id),
          issue: "Incomplete attendance records",
        });
      }
    }

    setValidationIssues(newIssues as any);
  };

  // Helper function to round to nearest half hour
  const roundToNearestHalfHour = (hours: number): number => {
    return Math.round(hours * 2) / 2;
  };

  // Calculate payroll for a single employee
  const calculateEmployeePayroll = (
    employee: any
  ): EmployeePayrollCalculation => {
    // Ensure hourly rate is a number
    const hourlyRate = Number(employee.hourlyRate) || 0;

    // Get actual attendance records for the pay period
    const startDate = new Date(payPeriod.startDate);
    const endDate = new Date(payPeriod.endDate);

    // Initialize variables with safe defaults
    let hoursWorked = 0;
    let overtimeHours = 0;

    // Calculate working days and attendance rate
    const workingDays = getWorkingDaysInPeriod(startDate, endDate);
    const attendanceRate = 0.9; // Assume 90% attendance as fallback
    hoursWorked = Math.round(workingDays * 8 * attendanceRate);
    overtimeHours = 0;

    // Calculate gross pay
    const grossPay =
      hoursWorked * hourlyRate + overtimeHours * hourlyRate * 1.5;

    // Randomly generate EWA and loan deductions from the gross pay,
    // but ensure they don't exceed 50% of the gross pay
    let ewaDeductions = Math.floor(Math.random() * (grossPay * 0.5));
    let loanDeductions = Math.floor(Math.random() * (grossPay * 0.5));

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

    if (netPay < 0) {
      status = "error";
      statusReason = "Net pay is negative";
    } else if (totalDeductions > grossPay * 0.7) {
      status = "warning";
      statusReason = "Deductions exceed 70% of gross pay";
    }

    // Create the calculation result
    const calculationResult: EmployeePayrollCalculation = {
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
      taxableIncome: grossPay, // Use grossPay instead of deductions.taxablePay
      paye: deductions.paye,
      nhif: deductions.nhif,
      nssf: deductions.nssf,
      housingLevy: deductions.housingLevy,
      ewaDeductions,
      loanDeductions,
      otherDeductions: 0,
      totalDeductions,
      netPay,
      status,
      statusReason,
      isEdited: false,
      mpesaNumber: employee.contact?.phoneNumber,
      bankName: employee.bank_info?.bankName,
      bankAccountNumber: employee.bank_info?.accountNumber,
      periodStart: startDate,
      periodEnd: endDate,
    };

    return calculationResult;
  };

  // Handle calculation and navigation to next step
  const handleCalculateAndReview = async () => {
    if (eligibleEmployeeCount === 0) {
      toast({
        title: "No Employees Selected",
        description: "Please select at least one employee to process.",
        variant: "destructive",
      });
      return;
    }

    // Set loading state immediately
    setIsCalculating(true);
    setCalculationProgress(0);

    calculatePayroll()
      .then((calculations) => {
        if (calculations && calculations.length > 0) {
          setPayrollCalculations(calculations);
          setCurrentStage(STAGES.FINALIZE);
        }
      })
      .catch((error) => {
        console.error("Error calculating payroll:", error);
        toast({
          title: "Calculation Error",
          description:
            "An error occurred during calculation. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsCalculating(false);
      });
  };

  const handleBack = () => {
    if (currentStage === STAGES.FINALIZE) {
      setCurrentStage(STAGES.SELECT_PERIOD);
    } else if (currentStage === STAGES.EXPORT) {
      setCurrentStage(STAGES.FINALIZE);
    }
  };

  // Fallback calculation when API calls fail
  const fallbackCalculateEmployeePayroll = (
    employee: any
  ): EmployeePayrollCalculation => {
    try {
      // Get the start and end dates of the pay period
      const startDate = new Date(payPeriod.startDate);
      const endDate = new Date(payPeriod.endDate);

      // Standard working days in the period
      const workingDays = getWorkingDaysInPeriod(startDate, endDate);

      // Assume hourly rate from employee data or fallback to 10 units
      const hourlyRate = Number(employee.hourlyRate) || 10;

      // Assume 90% attendance as fallback
      const attendanceRate = 0.9;
      const hoursWorked = Math.round(workingDays * 8 * attendanceRate);
      const overtimeHours = 0; // No overtime in fallback

      // Calculate gross pay
      const grossPay = hoursWorked * hourlyRate;

      // Use simple rules for deductions in fallback
      const taxRate = 0.15; // Simple 15% tax rate
      const nhifRate = 0.03; // Simple 3% NHIF
      const nssfRate = 0.06; // Simple 6% NSSF
      const housingLevyRate = 0.015; // 1.5% housing levy

      // Calculate deductions
      const paye = grossPay * taxRate;
      const nhif = grossPay * nhifRate;
      const nssf = grossPay * nssfRate;
      const housingLevy = grossPay * housingLevyRate;

      // Assume no EWA or loan deductions in fallback
      const ewaDeductions = 0;
      const loanDeductions = 0;

      // Calculate total deductions
      const totalDeductions = paye + nhif + nssf + housingLevy;

      // Calculate net pay
      const netPay = grossPay - totalDeductions;

      // Create the calculation result - ensure we match the schema interface
      return {
        id: employee.id, // Changed from number to string
        employeeId: employee.id, // Add required employeeId field
        employeeNumber: employee.employeeNumber || "",
        name: `${employee.other_names || ""} ${employee.surname || ""}`.trim(),
        role: employee.department?.name || "", // Use role instead of department
        position: employee.position || "",
        hoursWorked,
        overtimeHours,
        hourlyRate,
        grossPay,
        taxableIncome: grossPay,
        paye,
        nhif,
        nssf,
        housingLevy,
        ewaDeductions,
        loanDeductions,
        otherDeductions: 0,
        totalDeductions,
        netPay,
        status: "complete",
        statusReason: "Calculated with fallback method",
        isEdited: false,
        mpesaNumber: employee.contact?.phoneNumber,
        bankName: employee.bank_info?.bankName,
        bankAccountNumber: employee.bank_info?.accountNumber,
        periodStart: startDate, // Add period information
        periodEnd: endDate,
      };
    } catch (error) {
      console.error("Error in fallback calculation:", error);
      // Return a minimal valid object in case of errors
      return {
        id: String(employee.id || Date.now()), // Ensure it's a string
        employeeId: String(employee.id || Date.now()),
        employeeNumber: employee.employeeNumber || "",
        name:
          `${employee.other_names || ""} ${employee.surname || ""}`.trim() ||
          "Unknown Employee",
        position: employee.position || "Unknown",
        role: "", // Use role instead of department
        hoursWorked: 0,
        overtimeHours: 0,
        hourlyRate: 0,
        grossPay: 0,
        taxableIncome: 0,
        paye: 0,
        nhif: 0,
        nssf: 0,
        housingLevy: 0,
        ewaDeductions: 0,
        loanDeductions: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        netPay: 0,
        status: "error",
        statusReason: "Calculation failed",
        isEdited: false,
      };
    }
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
    if (currentStage === STAGES.SELECT_PERIOD) {
      if (eligibleEmployeeCount === 0) {
        toast({
          title: "No Employees Selected",
          description: "Please select at least one employee to process.",
          variant: "destructive",
        });
        return;
      }

      // Set loading state immediately
      setIsCalculating(true);
      setCalculationProgress(0);

      try {
        // Calculate payroll and move to finalize step
        const calculations = await calculatePayroll();
        if (calculations && calculations.length > 0) {
          setPayrollCalculations(calculations);
          setCurrentStage(STAGES.FINALIZE);
        }
      } catch (error) {
        console.error("Error calculating payroll:", error);
        toast({
          title: "Calculation Error",
          description: "An error occurred during calculation. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCalculating(false);
      }
    } else if (currentStage === STAGES.FINALIZE) {
      // Handle finalizing payroll and move to export
      await handleFinalizePayroll();
      setCurrentStage(STAGES.EXPORT);
    }
  };

  // Add state for storing the payroll reference number
  const [payrollReferenceNumber, setPayrollReferenceNumber] = useState<string | null>(null);

  // Update the process payroll button click handler
  const handleProcessPayroll = async () => {
    try {
      const response = await axios.post("/api/payroll/process", {
        payPeriod,
        payrollData: payrollCalculations,
        notes: finalizationNote,
      });

      // Store the reference number from the response
      if (response.data && response.data.id) {
        setPayrollReferenceNumber(response.data.id);
      }

      toast({
        title: "Payroll processed successfully",
        description: "The payroll has been processed and saved.",
      });

      setCurrentStage("complete");
    } catch (error) {
      console.error("Error processing payroll:", error);
      toast({
        title: "Error processing payroll",
        description:
          "There was an error processing the payroll. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update the export button click handler to use axios
  const handleExport = async (exportType: string) => {
    setIsExporting(true);
    setExportType(exportType);

    try {
      // Format date for the filename
      const periodStr = `${new Date(payPeriod.startDate)
        .toLocaleDateString()
        .replace(/\//g, "-")}_${new Date(payPeriod.endDate)
        .toLocaleDateString()
        .replace(/\//g, "-")}`;

      let fileName = "";

      if (exportType === "xlsx") {
        // Check if we have a payroll reference number
        if (!payrollReferenceNumber) {
          toast({
            title: "Missing Payroll Reference",
            description: "Please process the payroll before exporting.",
            variant: "destructive",
          });
          setIsExporting(false);
          return;
        }

        // Include the reference number in the filename
        fileName = `Payroll_${payrollReferenceNumber}_${periodStr}.xlsx`;
        
        // Call the Excel export API endpoint with axios
        // Only send the reference number and period - server will fetch the data
        const response = await axios.post("/api/payroll/export/xlsx", {
          referenceNumber: payrollReferenceNumber,
          payPeriod,
        }, {
          responseType: 'blob' // Important for handling binary data
        });
        
        // Create a download link and trigger the download
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (exportType === "payslips") {
        // Validate that we have a reference number for other export types too
        if (!payrollReferenceNumber) {
          toast({
            title: "Missing Payroll Reference",
            description: "Please process the payroll before exporting.",
            variant: "destructive",
          });
          setIsExporting(false);
          return;
        }
        
        fileName = `Payslips_${payrollReferenceNumber}_${periodStr}.zip`;
        // Simulate export process for other types
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else if (exportType === "summary") {
        // Validate that we have a reference number for other export types too
        if (!payrollReferenceNumber) {
          toast({
            title: "Missing Payroll Reference",
            description: "Please process the payroll before exporting.",
            variant: "destructive",
          });
          setIsExporting(false);
          return;
        }
        
        fileName = `PayrollSummary_${payrollReferenceNumber}_${periodStr}.pdf`;
        // Simulate export process for other types
        await new Promise((resolve) => setTimeout(resolve, 1500));
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

    // Group by department (use role field instead of department)
    const departments = Array.from(
      new Set(calculations.map((calc) => calc.role || ""))
    );
    const departmentSummary = departments.map((dept) => {
      const deptEmployees = calculations.filter((calc) => calc.role === dept);
      const deptTotal = deptEmployees.reduce(
        (sum, calc) => sum + (Number(calc.netPay) || 0),
        0
      );
      return {
        department: dept || "Unassigned", // Provide default value to avoid undefined
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
      totalEwaDeductions,
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
          department: calc.role, // Use role instead of department
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
      
      // Store the payroll reference number in state
      setPayrollReferenceNumber(savedPayroll.id);

      // Mark calculations as finalized
      const finalizedCalculations = payrollCalculations.map((calc) => ({
        ...calc,
        status: "complete" as const,
        processedId: savedPayroll.id, // Store the payroll reference ID
      }));

      // Update state
      setPayrollCalculations(finalizedCalculations);
      setCurrentStage(STAGES.EXPORT);

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
    return [
      {
        id: 1,
        label: "Select Period",
        completed: currentStage !== STAGES.SELECT_PERIOD,
        current: currentStage === STAGES.SELECT_PERIOD,
      },
      {
        id: 2,
        label: "Finalize",
        completed: currentStage === STAGES.EXPORT,
        current: currentStage === STAGES.FINALIZE,
      },
      {
        id: 3,
        label: "Export",
        completed: false,
        current: currentStage === STAGES.EXPORT,
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

  // Define columns for the employee DataTable
  const employeeColumns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={eligibleEmployeeCount === employeeData.length}
            onCheckedChange={(value) => {
              if (value === true) {
                setExcludedEmployees([]);
              } else {
                setExcludedEmployees(employeeData.map((emp) => String(emp.id)));
              }
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={!excludedEmployees.includes(String(row.original.id))}
            onCheckedChange={(checked) => {
              toggleEmployeeExclusion(String(row.original.id));
            }}
            id={`exclude-${row.original.id}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "employeeNumber",
        header: "Employee ID",
        cell: ({ row }) => <div>{row.getValue("employeeNumber") || "N/A"}</div>,
      },
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => {
          const employee = row.original;
          return (
            <div className="flex items-center">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarFallback className="text-xs">
                  {employee.surname && employee.other_names
                    ? employee.surname[0] + (employee.other_names[0] || "")
                    : "??"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {employee.surname} {employee.other_names}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "position",
        header: "Position",
      },
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }) => {
          const employee = row.original;
          return (
            <div>
              {employee.contact?.phoneNumber ||
                employee.contact?.email ||
                "N/A"}
            </div>
          );
        },
      },
      {
        accessorKey: "hourlyRate",
        header: () => <div className="text-right">Hourly Rate</div>,
        cell: ({ row }) => {
          const rate = row.getValue("hourlyRate") as number | undefined;
          return (
            <div className="text-right">
              {formatCurrency(rate || Math.floor(500 + Math.random() * 1000))}
            </div>
          );
        },
      },
    ],
    [eligibleEmployeeCount, employeeData.length, excludedEmployees]
  );

  // Add missing initialization useEffect to set default period dates
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
  }, []); // Empty dependency array since we only want this to run once

  // Handle recalculation of payroll
  const handleRecalculate = async () => {
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

    // Set loading state immediately 
    setIsCalculating(true);
    setIsRecalculating(true);
    setCalculationProgress(0);

    try {
      // Run the calculation again
      const calculations = await calculatePayroll();
      if (calculations && calculations.length > 0) {
        setPayrollCalculations(calculations);
        setCurrentStage(STAGES.FINALIZE);
      }
    } catch (error) {
      console.error("Error recalculating payroll:", error);
      toast({
        title: "Recalculation Error",
        description:
          "An error occurred during recalculation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
      setIsRecalculating(false);
    }
  };

  // Update Stepper component in the render function to match the updated workflow
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
        <ScrollText className="mr-2 h-4 w-4" />
        <h1 className="text-xl font-bold">Process Payroll</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <Stepper
          steps={getStepperSteps().map(({ id, label }) => ({ id, label }))}
          currentStep={
            currentStage === STAGES.SELECT_PERIOD
              ? 1
              : currentStage === STAGES.FINALIZE
              ? 2
              : 3
          }
        />

        {/* Payroll Processing Stages */}
        {currentStage === STAGES.SELECT_PERIOD && (
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
                              employeeData.map((emp) => String(emp.id))
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

                    <div className="overflow-y-auto p-0 w-full">
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
                            There are no employees matching your search
                            criteria.
                          </p>
                          <Button variant="link" size="sm" className="mt-2">
                            Add New Employee
                          </Button>
                        </div>
                      ) : (
                        <DataTable
                          columns={employeeColumns}
                          data={employeeData}
                          searchColumn={[
                            "surname",
                            "other_names",
                            "employeeNumber",
                            "position",
                          ]}
                          onRowClick={(row) => {
                            // Handle row click if needed
                          }}
                        />
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
                onClick={handleCalculateAndReview}
                disabled={eligibleEmployeeCount === 0 || isCalculating}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating ({Math.round(calculationProgress)}%)
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate & Review
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {currentStage === STAGES.FINALIZE && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle>Review & Finalize</CardTitle>
              <CardDescription>
                Review and finalize payroll calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Payroll Summary */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total Employees
                          </p>
                          <h4 className="text-2xl font-bold">
                            {payrollSummary.employeeCount}
                          </h4>
                        </div>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Gross Pay
                          </p>
                          <h4 className="text-2xl font-bold">
                            {formatKES(payrollSummary.totalGrossPay)}
                          </h4>
                        </div>
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total Deductions
                          </p>
                          <h4 className="text-2xl font-bold">
                            {formatKES(payrollSummary.totalDeductions)}
                          </h4>
                        </div>
                        <ArrowDown className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Net Pay
                          </p>
                          <h4 className="text-2xl font-bold">
                            {formatKES(payrollSummary.totalNetPay)}
                          </h4>
                        </div>
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payroll Data */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Employee Payroll</h3>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRecalculate}
                        disabled={isRecalculating}
                      >
                        {isRecalculating ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Recalculate</span>
                      </Button>
                    </div>
                  </div>

                  <div className="">
                    {payrollCalculations.length > 0 ? (
                      <DataTable columns={columns} data={payrollCalculations} />
                    ) : (
                      <div className="border rounded-md p-8 text-center">
                        <p className="text-muted-foreground">
                          No payroll data available. Please calculate payroll
                          first.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Finalization Notes */}
                <div>
                  <Label htmlFor="finalization-notes">Finalization Notes</Label>
                  <Textarea
                    id="finalization-notes"
                    placeholder="Add notes about this payroll processing..."
                    className="mt-1"
                    value={finalizationNote}
                    onChange={(e) => setFinalizationNote(e.target.value)}
                  />
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleNext}
                    disabled={isSubmitting || payrollCalculations.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="mr-2">Processing</span>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        Finalize Payroll
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStage === STAGES.EXPORT && (
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
              <CardTitle className="text-xl font-bold flex items-center">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                Export Payroll
              </CardTitle>
              <CardDescription>
                Export payroll data and generate reports
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Main Content with New Layout */}
                <div className="grid gap-6 md:grid-cols-12">
                  {/* Large Payroll Summary Card */}
                  <Card className="border md:col-span-5 shadow-sm bg-white dark:bg-background flex flex-col">
                    <CardHeader className="pb-2 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-background">
                      <CardTitle className="text-base font-semibold flex items-center">
                        <ClipboardList className="h-4 w-4 mr-2 text-primary" />
                        Payroll Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-grow">
                      <div className="space-y-3">
                        {payrollReferenceNumber && (
                          <div className="flex justify-between items-center py-2 border-b border-border/40 bg-blue-50/50 dark:bg-blue-900/10 px-2 rounded">
                            <span className="font-semibold text-muted-foreground">Reference No.</span>
                            <span className="font-medium text-primary">{payrollReferenceNumber}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-2 border-b border-border/40">
                          <span className="font-semibold text-muted-foreground">Period</span>
                          <span className="font-medium">
                            {formatDate(payPeriod.startDate)} - {formatDate(payPeriod.endDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/40">
                          <span className="font-semibold text-muted-foreground">Employees Processed</span>
                          <span className="font-medium text-lg">{payrollSummary.employeeCount}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/40">
                          <span className="font-semibold text-muted-foreground">Total Gross</span>
                          <span className="font-medium text-lg">{formatKES(payrollSummary.totalGrossPay)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/40">
                          <span className="font-semibold text-muted-foreground">Total Deductions</span>
                          <span className="font-medium text-lg">{formatKES(payrollSummary.totalDeductions)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <div className="mt-auto border-t">
                      <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-md m-3">
                        <span className="font-bold text-green-800 dark:text-green-300">Total Net Pay</span>
                        <span className="font-bold text-2xl text-green-700 dark:text-green-400">{formatKES(payrollSummary.totalNetPay)}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Export Options Column */}
                  <div className="md:col-span-7 space-y-4">
                    <Card className="border shadow-sm bg-gradient-to-b from-white to-blue-50/50 dark:from-background dark:to-blue-950/10">
                      <CardHeader className="pb-2 border-b">
                        <CardTitle className="text-base font-semibold flex items-center">
                          <Download className="h-4 w-4 mr-2 text-primary" />
                          Export Options
                        </CardTitle>
                        <CardDescription>Select your preferred export format</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-3">
                            <Button
                              onClick={() => handleExport("xlsx")}
                              className="h-auto py-4 px-4 justify-start rounded-md border-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all"
                              variant="outline"
                              disabled={isExporting}
                            >
                              <div className="flex items-center w-full">
                                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mr-4">
                                  {isExporting && exportType === "xlsx" ? (
                                    <RefreshCw className="h-5 w-5 text-green-600 animate-spin" />
                                  ) : (
                                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium text-base">Excel Spreadsheet</span>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {isExporting && exportType === "xlsx"
                                      ? "Generating spreadsheet..."
                                      : "Export detailed payroll data"}
                                  </span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            </Button>

                            <Button
                              onClick={() => handleExport("payslips")}
                              className="h-auto py-4 px-4 justify-start rounded-md border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                              variant="outline"
                              disabled={isExporting}
                            >
                              <div className="flex items-center w-full">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-4">
                                  {isExporting && exportType === "payslips" ? (
                                    <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-blue-600" />
                                  )}
                                </div>
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium text-base">Payslips</span>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {isExporting && exportType === "payslips"
                                      ? "Generating payslips..."
                                      : "Generate PDF payslips"}
                                  </span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            </Button>

                            <Button
                              onClick={() => handleExport("summary")}
                              className="h-auto py-4 px-4 justify-start rounded-md border-2 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all"
                              variant="outline"
                              disabled={isExporting}
                            >
                              <div className="flex items-center w-full">
                                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full mr-4">
                                  {isExporting && exportType === "summary" ? (
                                    <RefreshCw className="h-5 w-5 text-purple-600 animate-spin" />
                                  ) : (
                                    <BarChart className="h-5 w-5 text-purple-600" />
                                  )}
                                </div>
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium text-base">Summary Report</span>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {isExporting && exportType === "summary"
                                      ? "Generating report..."
                                      : "Export summary statistics"}
                                  </span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            </Button>
                          </div>

                          {isExporting && (
                            <div className="flex items-center space-x-2 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                              <div className="bg-white dark:bg-background p-1 rounded-full">
                                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                              </div>
                              <span className="text-sm font-medium">
                                Generating {exportType === "xlsx" ? "Excel spreadsheet" : exportType === "payslips" ? "PDF payslips" : "summary report"}...
                                <span className="text-xs text-muted-foreground ml-2">This may take a moment</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center py-3 px-4 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={handleBack}
                    className="font-medium px-5"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  <Button 
                    className="bg-primary hover:bg-primary/90 text-white font-medium px-6 shadow-md"
                    onClick={() => window.location.href = "/payroll"}
                  >
                    Complete & Return to Payroll
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isCalculating && (
          <div className="!mt-0 fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Processing in small batches for better performance
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
    </div>
  );
}

