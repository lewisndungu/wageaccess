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
import { employees, departments, formatCurrency } from "@/lib/mock-data";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  ChevronDown,
  Calculator,
  FileSpreadsheet,
  FileText,
  Filter,
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
    initialData: [],
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
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={payPeriod.startDate}
                      onChange={(e) => setPayPeriod({...payPeriod, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
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
                  >
                    Current Month
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handlePeriodSelection('previous')}
                  >
                    Previous Month
                  </Button>
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
                      <SelectItem value="all">All Departments</SelectItem>
                      {departmentData.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Employees ({eligibleEmployeeCount})</h4>
                    {excludedEmployees.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setExcludedEmployees([])}
                      >
                        Clear Exclusions
                      </Button>
                    )}
                  </div>
                  
                  <div className="border rounded-md h-[200px] overflow-y-auto p-2">
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
                      <div className="flex justify-center items-center h-full text-muted-foreground">
                        No employees found
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {employeeData.map((employee: any) => (
                          <div key={employee.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`exclude-${employee.id}`}
                              checked={!excludedEmployees.includes(employee.id)}
                              onCheckedChange={(checked) => {
                                toggleEmployeeExclusion(employee.id);
                              }}
                            />
                            <label
                              htmlFor={`exclude-${employee.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {employee.name} - {employee.position}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end">
            <Button 
              size="lg"
              onClick={() => setCurrentStage(STAGES.CALCULATE)}
              disabled={eligibleEmployeeCount === 0}
            >
              <Calculator className="mr-2 h-5 w-5" />
              Proceed to Calculation
            </Button>
          </div>
        </div>
      )}
      
      {currentStage === STAGES.CALCULATE && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-8">
            {/* Pre-Calculation Validation */}
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
                <div className="space-y-4">
                  <div className="bg-card/20 p-4 rounded-md">
                    <h4 className="text-sm font-medium mb-2">Pay Period</h4>
                    <p>
                      {new Date(payPeriod.startDate).toLocaleDateString()} - {new Date(payPeriod.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="bg-card/20 p-4 rounded-md">
                    <h4 className="text-sm font-medium mb-2">Employees to Process</h4>
                    <p>{eligibleEmployeeCount} employees from {selectedDepartment === "all" ? "all departments" : selectedDepartment}</p>
                  </div>
                  
                  {validationIssues.length > 0 && (
                    <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center mb-2">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Validation Issues ({validationIssues.length})
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {validationIssues.slice(0, 5).map((issue, index) => {
                          const employee = employeeData.find(emp => emp.id === issue.employeeId);
                          return (
                            <li key={index} className="text-amber-700 dark:text-amber-300">
                              {employee?.name}: {issue.issue}
                            </li>
                          );
                        })}
                        {validationIssues.length > 5 && (
                          <li className="text-amber-700 dark:text-amber-300">
                            ...and {validationIssues.length - 5} more issues
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Calculation Button */}
            <div className="flex flex-col items-center">
              {isCalculating ? (
                <div className="w-full max-w-md">
                  <div className="mb-2 text-center">
                    <p className="text-sm font-medium">Calculating Payroll...</p>
                    <p className="text-xs text-muted-foreground">
                      Processing {Math.round(calculationProgress / 100 * eligibleEmployeeCount)} of {eligibleEmployeeCount} employees
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 dark:bg-muted mb-4">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${calculationProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
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
              )}
              
              <Button 
                variant="outline"
                className="mt-4"
                onClick={() => setCurrentStage(STAGES.SETUP)}
                disabled={isCalculating}
              >
                Back to Setup
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {currentStage === STAGES.REVIEW && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1.5">
                  <span className="text-muted-foreground text-sm">Total Gross Pay</span>
                  <span className="text-2xl font-bold">{formatKES(payrollSummary.totalGrossPay)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1.5">
                  <span className="text-muted-foreground text-sm">Total Net Pay</span>
                  <span className="text-2xl font-bold">{formatKES(payrollSummary.totalNetPay)}</span>
                  <span className={`text-xs ${payrollSummary.previousPeriodComparison >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {payrollSummary.previousPeriodComparison >= 0 ? '↑' : '↓'} {Math.abs(payrollSummary.previousPeriodComparison).toFixed(1)}% from previous
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1.5">
                  <span className="text-muted-foreground text-sm">Total EWA Withdrawals</span>
                  <span className="text-2xl font-bold">{formatKES(payrollSummary.totalEwaDeductions)}</span>
                  <span className="text-xs text-muted-foreground">
                    {(payrollSummary.totalEwaDeductions / payrollSummary.totalGrossPay * 100).toFixed(1)}% of gross pay
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-1.5">
                  <span className="text-muted-foreground text-sm">Employees Processed</span>
                  <span className="text-2xl font-bold">{payrollSummary.employeeCount}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Department Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Department Breakdown
              </CardTitle>
              <CardDescription>
                Payroll distribution across departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payrollSummary.departmentSummary.map((dept) => (
                  <div key={dept.department} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{dept.department}</span>
                      <span>{formatKES(dept.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{dept.employeeCount} employees</span>
                      <span>{dept.percentageOfTotal.toFixed(1)}% of total</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
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
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="mr-2 h-5 w-5" />
                Employee Payroll Details
              </CardTitle>
              <CardDescription>
                Review and adjust individual employee payroll calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={payrollCalculations}
                sorting={sorting}
                setSorting={setSorting}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                columnVisibility={columnVisibility}
                setColumnVisibility={setColumnVisibility}
              />
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