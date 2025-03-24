import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
import { employees, departments, formatCurrency, formatDate } from "@/lib/mock-data";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  BarChart,
  AlertTriangle,
  Circle,
  RefreshCw,
  Search,
} from "lucide-react";
import { 
  calculatePAYE, 
  calculateSHIF, 
  calculateNSSF, 
  calculateAffordableHousingLevy,
  calculateTaxableIncome,
  formatKES 
} from "@/lib/tax-utils";

// Workflow stages
const STAGES = {
  SETUP: "setup",
  CALCULATE: "calculate",
  REVIEW: "review",
  FINALIZE: "finalize"
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
  status: 'complete' | 'warning' | 'error';
  statusReason?: string;
  isEdited: boolean;
  originalNetPay?: number;
}

export default function ProcessPayrollPage() {
  // Stage management
  const [currentStage, setCurrentStage] = useState<string>(STAGES.SETUP);
  
  // Step 1: Initial Setup state
  const [payPeriod, setPayPeriod] = useState(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      startDate: firstDayOfMonth.toISOString().split('T')[0],
      endDate: lastDayOfMonth.toISOString().split('T')[0]
    };
  });
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [excludedEmployees, setExcludedEmployees] = useState<number[]>([]);
  
  // Step 2: Calculation state
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationProgress, setCalculationProgress] = useState<number>(0);
  const [validationIssues, setValidationIssues] = useState<{
    employeeId: number;
    issue: string;
  }[]>([]);
  
  // Step 3: Review state
  const [payrollCalculations, setPayrollCalculations] = useState<EmployeePayrollCalculation[]>([]);
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
    previousPeriodComparison: 0
  });
  
  // Step 4: Finalization state
  const [finalizationNote, setFinalizationNote] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportType, setExportType] = useState<string>("xlsx");
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  
  // Fetch department data
  const { data: departmentData } = useQuery({
    queryKey: ['/api/departments'],
    initialData: departments,
  });
  
  // Fetch employee data
  const { data: employeeData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['/api/employees', selectedDepartment],
    queryFn: async () => {
      if (selectedDepartment === "all") {
        return employees; // Return all employees for now
      } else {
        // Filter employees by department
        return employees.filter(emp => emp.department === selectedDepartment);
      }
    },
    initialData: employees, // Use mock data as initial data
  });
  
  // Calculate eligible employees count
  const eligibleEmployeeCount = employeeData.filter(
    emp => !excludedEmployees.includes(emp.id)
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
            {status === 'complete' && (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            )}
            {status === 'warning' && (
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            )}
            {status === 'error' && (
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
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
          {row.getValue("hoursWorked")}
          {Number(row.getValue("overtimeHours")) > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              (+{row.getValue("overtimeHours")} OT)
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
  ];
  
  // Handle period selection via preset buttons
  const handlePeriodSelection = (periodType: 'current' | 'previous') => {
    const today = new Date();
    
    if (periodType === 'current') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setPayPeriod({
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0]
      });
    } else {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      
      setPayPeriod({
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0]
      });
    }
  };
  
  // Toggle employee exclusion
  const toggleEmployeeExclusion = (employeeId: number) => {
    if (excludedEmployees.includes(employeeId)) {
      setExcludedEmployees(excludedEmployees.filter(id => id !== employeeId));
    } else {
      setExcludedEmployees([...excludedEmployees, employeeId]);
    }
  };
  
  // Calculate payroll for all eligible employees
  const calculatePayroll = async () => {
    // Validate first
    if (eligibleEmployeeCount === 0) {
      toast({
        title: "No Employees Selected",
        description: "Please select at least one employee to process payroll.",
        variant: "destructive",
      });
      return;
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
        return;
      }
      
      // Get eligible employees
      const eligibleEmployees = employeeData.filter(
        emp => !excludedEmployees.includes(emp.id)
      );
      
      // Calculate progress increment per employee
      const progressIncrement = 100 / eligibleEmployees.length;
      
      // Initialize calculations array
      const calculations: EmployeePayrollCalculation[] = [];
      
      // Process each employee (with simulated async timing for UI feedback)
      for (let i = 0; i < eligibleEmployees.length; i++) {
        const employee = eligibleEmployees[i];
        
        // Simulate async calculation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Calculate employee payroll
        const calculation = await calculateEmployeePayroll(employee);
        calculations.push(calculation);
        
        // Update progress
        setCalculationProgress(prevProgress => {
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
      
      // Proceed to next stage
      setCurrentStage(STAGES.REVIEW);
      
      toast({
        title: "Calculation Complete",
        description: `Successfully calculated payroll for ${calculations.length} employees.`,
      });
      
    } catch (error) {
      console.error("Payroll calculation error:", error);
      toast({
        title: "Calculation Error",
        description: "An error occurred during calculation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Validate employee data before calculation
  const validateEmployeeData = async (): Promise<void> => {
    // Reset validation issues
    setValidationIssues([]);
    
    // Get eligible employees
    const eligibleEmployees = employeeData.filter(
      emp => !excludedEmployees.includes(emp.id)
    );
    
    const newIssues = [];
    
    // Validate each employee
    for (const employee of eligibleEmployees) {
      // Check for missing hourly rate
      if (!employee.hourlyRate) {
        newIssues.push({
          employeeId: employee.id,
          issue: "Missing hourly rate"
        });
      }
      
      // Simulate attendance check
      // In a real implementation, this would query the attendance records
      const hasCompleteAttendance = Math.random() > 0.1; // 10% chance of incomplete attendance
      if (!hasCompleteAttendance) {
        newIssues.push({
          employeeId: employee.id,
          issue: "Incomplete attendance records"
        });
      }
    }
    
    setValidationIssues(newIssues);
  };
  
  // Calculate payroll for a single employee
  const calculateEmployeePayroll = async (employee: any): Promise<EmployeePayrollCalculation> => {
    // Get mock EWA withdrawals for this employee
    // In a real implementation, this would query the database
    const ewaDeductions = Math.random() > 0.7 ? 
      Math.round(Math.random() * 15000) : 0;
    
    // Get mock loan deductions
    const loanDeductions = Math.random() > 0.8 ? 
      Math.round(Math.random() * 10000) : 0;
    
    // Other deductions (e.g., benefits, insurance)
    const otherDeductions = Math.random() > 0.5 ? 
      Math.round(Math.random() * 3000) : 0;
    
    // Calculate hours worked (typically from attendance)
    // For this demo, we'll simulate it
    const workingDays = 22; // Average working days in a month
    const dailyHours = 8;
    const overtimeHours = Math.random() > 0.5 ? 
      Math.round(Math.random() * 20) : 0;
    
    // Simulating some randomness in hours worked
    const attendanceRate = 0.9 + (Math.random() * 0.1); // 90-100% attendance
    const hoursWorked = Math.round(workingDays * dailyHours * attendanceRate);
    
    // Get hourly rate (converted from hourlyRate in KES)
    const hourlyRate = employee.hourlyRate || 500; // Default if missing
    
    // Calculate gross pay
    const regularPay = hoursWorked * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * 1.5; // Overtime at 1.5x
    const grossPay = regularPay + overtimePay;
    
    // Calculate statutory deductions
    const housingLevy = calculateAffordableHousingLevy(grossPay);
    const shif = calculateSHIF(grossPay);
    const nssf = calculateNSSF(grossPay);
    const taxableIncome = calculateTaxableIncome(grossPay);
    const paye = calculatePAYE(taxableIncome);
    
    // Calculate total deductions
    const statutoryDeductions = housingLevy + shif + nssf + paye;
    const totalDeductions = statutoryDeductions + ewaDeductions + loanDeductions + otherDeductions;
    
    // Calculate net pay
    const netPay = grossPay - totalDeductions;
    
    // Determine status
    let status: 'complete' | 'warning' | 'error' = 'complete';
    let statusReason = '';
    
    if (netPay < 0) {
      status = 'error';
      statusReason = 'Net pay is negative';
    } else if (ewaDeductions > grossPay * 0.5) {
      status = 'warning';
      statusReason = 'EWA deductions exceed 50% of gross pay';
    } else if (totalDeductions > grossPay * 0.7) {
      status = 'warning';
      statusReason = 'Total deductions exceed 70% of gross pay';
    }
    
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
      nhif: shif, // SHIF is the replacement for NHIF
      nssf,
      housingLevy,
      ewaDeductions,
      loanDeductions,
      otherDeductions,
      totalDeductions,
      netPay,
      status,
      statusReason,
      isEdited: false
    };
  };
  
  // Calculate payroll summary statistics
  const calculatePayrollSummary = (calculations: EmployeePayrollCalculation[]) => {
    // Calculate totals
    const totalGrossPay = calculations.reduce((sum, calc) => sum + calc.grossPay, 0);
    const totalDeductions = calculations.reduce((sum, calc) => sum + calc.totalDeductions, 0);
    const totalNetPay = calculations.reduce((sum, calc) => sum + calc.netPay, 0);
    const totalEwaDeductions = calculations.reduce((sum, calc) => sum + calc.ewaDeductions, 0);
    
    // Group by department
    const departments = [...new Set(calculations.map(calc => calc.department))];
    const departmentSummary = departments.map(dept => {
      const deptEmployees = calculations.filter(calc => calc.department === dept);
      const deptTotal = deptEmployees.reduce((sum, calc) => sum + calc.netPay, 0);
      return {
        department: dept,
        employeeCount: deptEmployees.length,
        totalAmount: deptTotal,
        percentageOfTotal: (deptTotal / totalNetPay) * 100
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
      previousPeriodComparison
    });
  };
  
  // Handle editing an employee's payroll calculation
  const handleEditEmployee = (employee: EmployeePayrollCalculation) => {
    // In a real implementation, this would open a modal for editing
    // For now, we'll just simulate an edit
    
    const editedCalculations = payrollCalculations.map(calc => {
      if (calc.id === employee.id) {
        // Store original value if not already stored
        const originalNetPay = calc.originalNetPay || calc.netPay;
        
        // Simulate a manual adjustment (±5%)
        const adjustmentFactor = 1 + (Math.random() * 0.1 - 0.05);
        const adjustedNetPay = Math.round(calc.netPay * adjustmentFactor);
        
        return {
          ...calc,
          netPay: adjustedNetPay,
          isEdited: true,
          originalNetPay
        };
      }
      return calc;
    });
    
    setPayrollCalculations(editedCalculations);
    calculatePayrollSummary(editedCalculations);
    
    toast({
      title: "Payroll Adjusted",
      description: `Manual adjustment applied to ${employee.name}'s payroll.`
    });
  };
  
  // Handle viewing employee details
  const handleViewDetails = (employee: EmployeePayrollCalculation) => {
    // In a real implementation, this would open a detailed view
    toast({
      title: "Employee Details",
      description: `Viewing detailed calculation for ${employee.name}.`,
    });
  };
  
  // Handle recalculation of payroll
  const handleRecalculate = async () => {
    setCurrentStage(STAGES.CALCULATE);
    calculatePayroll();
  };
  
  // Handle finalization of payroll
  const handleFinalizePayroll = async () => {
    // In a real implementation, this would commit the payroll to the database
    
    // Simulate API call
    try {
      // Mark calculations as finalized
      const finalizedCalculations = payrollCalculations.map(calc => ({
        ...calc,
        status: 'complete' as const
      }));
      
      // Update state
      setPayrollCalculations(finalizedCalculations);
      setCurrentStage(STAGES.FINALIZE);
      
      toast({
        title: "Payroll Finalized",
        description: `Payroll for period ${new Date(payPeriod.startDate).toLocaleDateString()} - ${new Date(payPeriod.endDate).toLocaleDateString()} has been finalized.`,
      });
    } catch (error) {
      console.error("Error finalizing payroll:", error);
      toast({
        title: "Finalization Error",
        description: "An error occurred while finalizing the payroll. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle export functionality
  const handleExport = async (exportType: string) => {
    setIsExporting(true);
    setExportType(exportType);
    
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let fileName = "";
      const periodStr = `${new Date(payPeriod.startDate).toLocaleDateString().replace(/\//g, '-')}_${new Date(payPeriod.endDate).toLocaleDateString().replace(/\//g, '-')}`;
      
      if (exportType === 'xlsx') {
        fileName = `Payroll_${periodStr}.xlsx`;
      } else if (exportType === 'payslips') {
        fileName = `Payslips_${periodStr}.zip`;
      } else if (exportType === 'summary') {
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
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Process Payroll</h1>
          <p className="text-muted-foreground">
            Calculate, review, and finalize payroll for all employees
          </p>
        </div>
      </div>
      
      {/* Process Status Tracker */}
      <div className="relative">
        <div className="flex justify-between mb-2">
          {Object.values(STAGES).map((stage, index) => (
            <div 
              key={stage}
              className={`flex flex-col items-center w-1/4 ${
                currentStage === stage 
                  ? "text-primary font-medium" 
                  : Object.values(STAGES).indexOf(currentStage) > index 
                    ? "text-muted-foreground" 
                    : "text-muted-foreground/50"
              }`}
            >
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full mb-2
                ${currentStage === stage 
                  ? "bg-primary text-primary-foreground" 
                  : Object.values(STAGES).indexOf(currentStage) > index 
                    ? "bg-muted border border-primary" 
                    : "bg-muted"
                }
              `}>
                {index + 1}
              </div>
              <span className="capitalize">{stage}</span>
            </div>
          ))}
        </div>
        <div className="absolute top-5 left-0 right-0 flex">
          <div className="h-0.5 bg-muted-foreground/30 flex-1"></div>
        </div>
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ 
            width: `${(Object.values(STAGES).indexOf(currentStage) / (Object.values(STAGES).length - 1)) * 100}%` 
          }}
        ></div>
      </div>
      
      {/* Stage Content */}
      {currentStage === STAGES.SETUP && (
        <div className="space-y-8">
          {/* Summary Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Pay Period</span>
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {formatDate(payPeriod.startDate)} - {formatDate(payPeriod.endDate)}
                    </span>
                  </div>
                  <span className="text-xs text-blue-700 dark:text-blue-400">
                    {(() => {
                      const start = new Date(payPeriod.startDate);
                      const end = new Date(payPeriod.endDate);
                      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      return `${days} days period`;
                    })()}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Eligible Employees</span>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{eligibleEmployeeCount}</span>
                  </div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    From {employeeData.length} total employees
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Estimated Processing</span>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                    <span className="text-lg font-bold text-amber-900 dark:text-amber-100">~{Math.round(eligibleEmployeeCount * 0.5)} minutes</span>
                  </div>
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    Based on employee count and complexity
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-purple-800 dark:text-purple-300">Previous Payroll</span>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">Feb 1 - Feb 28, 2025</span>
                  </div>
                  <span className="text-xs text-purple-700 dark:text-purple-400">
                    Last processed on March 1, 2025
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pay Period Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Pay Period Selection
                </CardTitle>
                <CardDescription>
                  Select the date range for this payroll processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date <span className="text-xs text-muted-foreground">(YYYY-MM-DD)</span></Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={payPeriod.startDate}
                      onChange={(e) => setPayPeriod({...payPeriod, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date <span className="text-xs text-muted-foreground">(YYYY-MM-DD)</span></Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={payPeriod.endDate}
                      onChange={(e) => setPayPeriod({...payPeriod, endDate: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handlePeriodSelection('current')}
                    title="March 1 - March 31, 2025"
                  >
                    Current Month
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handlePeriodSelection('previous')}
                    title="February 1 - February 28, 2025"
                  >
                    Previous Month
                  </Button>
                </div>
                
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center">
                    <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 8v4M12 16h.01"></path>
                    </svg>
                    Period Information
                  </h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    This pay period contains approximately {(() => {
                      const start = new Date(payPeriod.startDate);
                      const end = new Date(payPeriod.endDate);
                      // Count only weekdays (Monday-Friday)
                      let workdays = 0;
                      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const day = d.getDay();
                        if (day !== 0 && day !== 6) workdays++;
                      }
                      return workdays;
                    })()} working days.
                  </p>
                </div>
              </CardContent>
            </Card>
            
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
                        <SelectItem value="all">All Departments ({employeeData.length})</SelectItem>
                        {departmentData.map((dept: any) => {
                          const deptEmployeeCount = employees.filter(emp => emp.department === dept.name).length;
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
                      <h4 className="text-sm font-medium">Employees ({eligibleEmployeeCount})</h4>
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
                        onClick={() => setExcludedEmployees(employeeData.map(emp => emp.id))}
                        className="text-xs h-7"
                        disabled={excludedEmployees.length === employeeData.length}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-md h-[280px] overflow-y-auto p-2 bg-card/20">
                    {isLoadingEmployees ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading employees...
                        </div>
                      </div>
                    ) : employeeData.length === 0 ? (
                      <div className="flex flex-col justify-center items-center h-full text-center p-4">
                        <Users className="h-10 w-10 text-muted-foreground mb-2 opacity-20" />
                        <h3 className="font-medium text-muted-foreground">No employees found</h3>
                        <p className="text-xs text-muted-foreground/70 mt-1 max-w-[250px]">
                          There are no employees in the selected department or matching your search criteria.
                        </p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="mt-2"
                        >
                          Add New Employee
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {employeeData.map((employee: any) => (
                          <div 
                            key={employee.id} 
                            className={`flex items-center space-x-2 p-2 rounded-md ${
                              !excludedEmployees.includes(employee.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <Checkbox 
                              id={`exclude-${employee.id}`}
                              checked={!excludedEmployees.includes(employee.id)}
                              onCheckedChange={(checked) => {
                                toggleEmployeeExclusion(employee.id);
                              }}
                            />
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {employee.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <label
                              htmlFor={`exclude-${employee.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                            >
                              {employee.name}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({employee.employeeNumber})
                              </span>
                            </label>
                            <Badge variant="outline" className="text-xs">
                              {employee.department}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Employee selection helper text */}
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      Selecting an employee will include them in payroll calculations. Employees missing
                      attendance records or with incomplete profiles may trigger validation warnings in the next step.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Additional Options and Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Payroll Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-ewa" className="flex items-center">
                      <span>Include EWA Deductions</span>
                      <span className="ml-1 text-xs text-blue-600">(?)</span>
                    </Label>
                    <Switch id="include-ewa" defaultChecked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-tax" className="flex items-center">
                      <span>Auto-Calculate Taxes</span>
                    </Label>
                    <Switch id="auto-tax" defaultChecked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="save-template">
                      <span>Save as Template</span>
                    </Label>
                    <Switch id="save-template" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Validation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded-md border border-green-200 dark:bg-green-900/20 dark:border-green-900">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      Ready to Process
                    </h4>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                      {eligibleEmployeeCount} employees selected for processing
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-md border border-muted bg-card/20">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      Processing Time
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estimated ~{Math.round(eligibleEmployeeCount * 0.5)} minutes to complete
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button variant="outline">
                    Save for Later
                  </Button>
                  
                  <Button 
                    size="lg"
                    onClick={() => setCurrentStage(STAGES.CALCULATE)}
                    disabled={eligibleEmployeeCount === 0}
                  >
                    <Calculator className="mr-2 h-5 w-5" />
                    Proceed to Calculation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {currentStage === STAGES.CALCULATE && (
        <div className="space-y-8">
          {/* Summary Cards - Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Pay Period</span>
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {formatDate(payPeriod.startDate)} - {formatDate(payPeriod.endDate)}
                    </span>
                  </div>
                  <span className="text-xs text-blue-700 dark:text-blue-400">
                    {(() => {
                      const start = new Date(payPeriod.startDate);
                      const end = new Date(payPeriod.endDate);
                      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return `${days} days period`;
                    })()}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Processing Scope</span>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{eligibleEmployeeCount} Employees</span>
                  </div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    {selectedDepartment === "all" ? "All departments" : `Department: ${selectedDepartment}`}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className={validationIssues.length > 0 ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"}>
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Validation Status</span>
                  <div className="flex items-center">
                    {validationIssues.length > 0 ? (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                        <span className="text-lg font-bold text-amber-900 dark:text-amber-100">{validationIssues.length} Issues</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                        <span className="text-lg font-bold text-green-900 dark:text-green-100">Ready to Process</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    {validationIssues.length > 0 ? 'Review issues below' : 'All data validated successfully'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pre-Calculation Validation */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Validation Check
                  </CardTitle>
                  <CardDescription>
                    Verify employee data before calculation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {validationIssues.length > 0 ? (
                    <div className="border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center mb-3">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Validation Issues ({validationIssues.length})
                      </h4>
                      
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {validationIssues.map((issue, index) => {
                          const employee = employeeData.find(emp => emp.id === issue.employeeId);
                          return (
                            <div key={index} className="flex p-2 bg-white dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/50">
                              <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-full mr-3">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                              </div>
                              <div>
                                <h5 className="font-medium text-sm">{employee?.name}</h5>
                                <p className="text-xs text-amber-700 dark:text-amber-400">{issue.issue}</p>
                                <div className="mt-1 flex space-x-2">
                                  <Button variant="outline" size="sm" className="h-7 text-xs px-2 py-0">
                                    Fix Issue
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2 py-0">
                                    Ignore
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800/70">
                        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          These issues may affect payroll accuracy. Consider fixing them before proceeding.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-green-200 bg-green-50 dark:bg-green-900/10 p-5 rounded-md">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-green-100 dark:bg-green-800/40 p-3 mb-4">
                          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-300" />
                        </div>
                      </div>
                      <h4 className="text-center text-green-800 dark:text-green-300 font-medium mb-2">All Employees Validated</h4>
                      <p className="text-center text-sm text-green-700 dark:text-green-400">
                        {eligibleEmployeeCount} employees are ready to have their payroll calculated.
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-md border border-blue-200 dark:border-blue-800/50">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      Processing Information
                    </h4>
                    <ul className="text-sm space-y-1.5 text-blue-700 dark:text-blue-400">
                      <li className="flex items-center">
                        <Circle className="h-1.5 w-1.5 mr-2" />
                        {eligibleEmployeeCount} employees selected for calculation
                      </li>
                      <li className="flex items-center">
                        <Circle className="h-1.5 w-1.5 mr-2" />
                        The calculation will include KRA statutory deductions
                      </li>
                      <li className="flex items-center">
                        <Circle className="h-1.5 w-1.5 mr-2" />
                        EWA (Earned Wage Access) deductions will be applied where applicable
                      </li>
                      <li className="flex items-center">
                        <Circle className="h-1.5 w-1.5 mr-2" />
                        Attendance data from {formatDate(payPeriod.startDate)} to {formatDate(payPeriod.endDate)} will be used
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Calculation Controls */}
            <div>
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Calculation Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="include-overtime" className="flex items-center">
                        <span>Include Overtime</span>
                        <span className="ml-1 text-xs text-blue-600 cursor-help" title="Includes overtime hours at 1.5x hourly rate">(?)</span>
                      </Label>
                      <Switch id="include-overtime" defaultChecked={true} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="calculate-bonuses" className="flex items-center">
                        <span>Performance Bonuses</span>
                      </Label>
                      <Switch id="calculate-bonuses" defaultChecked={false} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="round-amounts">
                        <span>Round to Nearest KES</span>
                      </Label>
                      <Switch id="round-amounts" defaultChecked={true} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Calculation Button */}
              <Card className={isCalculating ? "border-blue-300 shadow-blue-100 dark:shadow-none" : ""}>
                <CardContent className="pt-6 pb-6">
                  {isCalculating ? (
                    <div>
                      <div className="mb-4 flex justify-center">
                        <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-3">
                          <RefreshCw className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                        </div>
                      </div>
                      <h3 className="text-center font-medium mb-2">Calculating Payroll</h3>
                      <div className="mb-2 text-center">
                        <p className="text-xs text-muted-foreground">
                          Processing {Math.round(calculationProgress / 100 * eligibleEmployeeCount)} of {eligibleEmployeeCount} employees
                        </p>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 dark:bg-muted my-4">
                        <div 
                          className="bg-blue-500 dark:bg-blue-600 h-3 rounded-full transition-all duration-300" 
                          style={{ width: `${calculationProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">This may take a few moments</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="mb-4 flex justify-center">
                        <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-3">
                          <Calculator className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                      <h3 className="text-center font-medium mb-2">Ready to Calculate</h3>
                      <p className="text-center text-sm text-muted-foreground mb-4">
                        {validationIssues.length === 0 
                          ? "All employee data has been validated and is ready for processing." 
                          : `There are ${validationIssues.length} issues that may affect calculation accuracy.`}
                      </p>
                      <Button 
                        size="lg"
                        variant="default"
                        className="min-w-[200px]"
                        onClick={calculatePayroll}
                        disabled={eligibleEmployeeCount === 0}
                      >
                        <Calculator className="mr-2 h-5 w-5" />
                        Calculate Payroll
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={() => setCurrentStage(STAGES.SETUP)}
                        disabled={isCalculating}
                      >
                        Back to Setup
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      
      {currentStage === STAGES.REVIEW && (
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
                  Review the payroll data before finalizing for the period {formatDate(payPeriod.startDate)} - {formatDate(payPeriod.endDate)}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Preview
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recalculate
                </Button>
              </div>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-800 dark:text-blue-300 text-sm font-medium">Total Gross Pay</span>
                  <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatKES(payrollSummary.totalGrossPay)}</span>
                  <span className="text-xs text-blue-700 dark:text-blue-400">
                    Before deductions and taxes
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-800 dark:text-emerald-300 text-sm font-medium">Total Net Pay</span>
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{formatKES(payrollSummary.totalNetPay)}</span>
                  <span className={`text-xs ${payrollSummary.previousPeriodComparison >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {payrollSummary.previousPeriodComparison >= 0 ? '↑' : '↓'} {Math.abs(payrollSummary.previousPeriodComparison).toFixed(1)}% from previous
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-800 dark:text-amber-300 text-sm font-medium">EWA Withdrawals</span>
                  <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatKES(payrollSummary.totalEwaDeductions)}</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-[50px] bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-amber-500 dark:bg-amber-600 h-1.5 rounded-full" 
                        style={{ width: `${(payrollSummary.totalEwaDeductions / payrollSummary.totalGrossPay * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      {(payrollSummary.totalEwaDeductions / payrollSummary.totalGrossPay * 100).toFixed(1)}% of gross
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-800 dark:text-purple-300 text-sm font-medium">Employees</span>
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">{payrollSummary.employeeCount}</span>
                    <span className="text-sm ml-1 text-purple-600 dark:text-purple-400">processed</span>
                  </div>
                  <span className="text-xs text-purple-700 dark:text-purple-400">
                    {payrollCalculations.filter(calc => calc.status === 'complete').length} complete, {
                      payrollCalculations.filter(calc => calc.status !== 'complete').length} with issues
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Department Breakdown */}
          <Card>
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
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          index === 0 ? "bg-blue-500" :
                          index === 1 ? "bg-green-500" :
                          index === 2 ? "bg-purple-500" :
                          index === 3 ? "bg-yellow-500" :
                          index === 4 ? "bg-red-500" : "bg-orange-500"
                        }`}></div>
                        {dept.department}
                      </span>
                      <div className="flex space-x-4">
                        <span className="text-muted-foreground text-xs">{dept.employeeCount} employees</span>
                        <span className="font-medium">{formatKES(dept.totalAmount)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`${
                          index === 0 ? "bg-blue-500" :
                          index === 1 ? "bg-green-500" :
                          index === 2 ? "bg-purple-500" :
                          index === 3 ? "bg-yellow-500" :
                          index === 4 ? "bg-red-500" : "bg-orange-500"
                        } h-2 rounded-full`}
                        style={{ width: `${dept.percentageOfTotal}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
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
                    Review and adjust individual employee calculations before finalizing
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      className="pl-8 w-full"
                      value={(columnFilters.find(f => f.id === 'name')?.value as string) || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setColumnFilters(prev => {
                          const filtered = prev.filter(filter => filter.id !== 'name');
                          if (value) {
                            return [...filtered, { id: 'name', value }];
                          }
                          return filtered;
                        });
                      }}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9">
                        <Filter className="h-3.5 w-3.5 mr-1" />
                        View
                        <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {columns
                        .filter(column => column.accessorKey !== 'id' && column.id !== "actions")
                        .map(column => (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            checked={columnVisibility[column.id as string]}
                            onCheckedChange={(value) =>
                              setColumnVisibility(prev => ({
                                ...prev,
                                [column.id as string]: value,
                              }))
                            }
                          >
                            {column.header as string}
                          </DropdownMenuCheckboxItem>
                        ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setColumnFilters([]);
                      }}>
                        <FilterX className="h-3.5 w-3.5 mr-2" />
                        Clear Filters
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <DataTable
                  columns={columns}
                  data={payrollCalculations}
                  searchColumn="name"
                  onRowClick={(employee) => handleViewDetails(employee as EmployeePayrollCalculation)}
                />
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{payrollCalculations.length}</span> employees 
                    with <span className="font-medium">{payrollCalculations.filter(e => e.status === 'warning' || e.status === 'error').length}</span> warnings/errors
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // Filter to show only employees with warnings or errors
                      const hasIssues = payrollCalculations.filter(emp => emp.status !== 'complete');
                      if (hasIssues.length > 0) {
                        setColumnFilters(prev => {
                          const filtered = prev.filter(filter => filter.id !== 'status');
                          return [...filtered, { id: 'status', value: ['warning', 'error'] }];
                        });
                      }
                    }}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-500" />
                    Show Issues Only
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setColumnFilters([])}
                  >
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Show All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => setCurrentStage(STAGES.CALCULATE)}
            >
              Back to Calculation
            </Button>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleRecalculate}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalculate
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>
                    Finalize Payroll
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalize Payroll</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will finalize the payroll for the selected period. After finalization, 
                      the payroll records will be locked and can no longer be modified.
                      
                      <div className="mt-4 bg-muted p-3 rounded-md text-sm">
                        <p><strong>Period:</strong> {new Date(payPeriod.startDate).toLocaleDateString()} - {new Date(payPeriod.endDate).toLocaleDateString()}</p>
                        <p><strong>Total Amount:</strong> {formatKES(payrollSummary.totalNetPay)}</p>
                        <p><strong>Employees:</strong> {payrollSummary.employeeCount}</p>
                      </div>
                      
                      <div className="mt-4">
                        <Label htmlFor="finalization-note">Add a note (optional)</Label>
                        <Input
                          id="finalization-note"
                          value={finalizationNote}
                          onChange={(e) => setFinalizationNote(e.target.value)}
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
                The payroll for {new Date(payPeriod.startDate).toLocaleDateString()} - {new Date(payPeriod.endDate).toLocaleDateString()} has been finalized successfully.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Total Gross Pay</p>
                  <p className="font-medium">{formatKES(payrollSummary.totalGrossPay)}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Total Deductions</p>
                  <p className="font-medium">{formatKES(payrollSummary.totalDeductions)}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Total Net Pay</p>
                  <p className="font-bold">{formatKES(payrollSummary.totalNetPay)}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Employees Processed</p>
                  <p className="font-medium">{payrollSummary.employeeCount}</p>
                </div>
              </div>
              
              {finalizationNote && (
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-800 mb-6">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Note</p>
                  <p className="text-sm">{finalizationNote}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-700 dark:text-green-300">Export Options</h4>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleExport('xlsx')}
                    disabled={isExporting}
                    className="border-green-200 text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {isExporting && exportType === 'xlsx' ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exporting...
                      </span>
                    ) : (
                      "Export XLSX"
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleExport('payslips')}
                    disabled={isExporting}
                    className="border-green-200 text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {isExporting && exportType === 'payslips' ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </span>
                    ) : (
                      "Generate Payslips"
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleExport('summary')}
                    disabled={isExporting}
                    className="border-green-200 text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30"
                  >
                    <BarChart className="mr-2 h-4 w-4" />
                    {isExporting && exportType === 'summary' ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  
                  return {
                    startDate: firstDayOfMonth.toISOString().split('T')[0],
                    endDate: lastDayOfMonth.toISOString().split('T')[0]
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
    </div>
  );
}