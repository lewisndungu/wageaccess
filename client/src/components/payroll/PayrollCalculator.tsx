import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { calculateKenyanDeductions, formatKES } from "@/lib/tax-utils";
import { DollarSign, BarChart, Calendar, Briefcase, ChevronsUpDown, Calculator } from "lucide-react";
import { employees } from "@/lib/mock-data";

interface PayrollCalculatorProps {
  onSave?: (payrollData: any) => void;
}

export function PayrollCalculator({ onSave }: PayrollCalculatorProps) {
  const [calculationMode, setCalculationMode] = useState<'hourly' | 'salary'>('salary');
  const [employeeId, setEmployeeId] = useState('');
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [allowances, setAllowances] = useState<number>(0);
  const [hoursWorked, setHoursWorked] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [overtime, setOvertime] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [ewaDeductions, setEwaDeductions] = useState<number>(0);
  const [loanDeductions, setLoanDeductions] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Calculation results
  const [calculationResults, setCalculationResults] = useState<{
    grossPay: number;
    paye: number;
    nhif: number;
    nssf: number;
    housingLevy: number;
    totalDeductions: number;
    netPay: number;
  } | null>(null);
  
  // Fetch employees
  const { data: employeeList } = useQuery({
    queryKey: ['/api/employees/active'],
    initialData: employees,
  });
  
  // Get selected employee
  const selectedEmployee = employeeId
    ? employeeList.find(emp => emp.id.toString() === employeeId)
    : null;
    
  useEffect(() => {
    // If employee selection changes, update salary information based on mock data
    if (selectedEmployee) {
      // In a real app, we would fetch this data from the API
      // For now, generate mock salary based on employee ID
      const mockSalary = 50000 + (parseInt(employeeId) * 10000);
      setBasicSalary(mockSalary);
      setAllowances(mockSalary * 0.15); // 15% of basic salary as allowances
      setHourlyRate(Math.round(mockSalary / 176)); // 176 work hours per month
    } else {
      setBasicSalary(0);
      setAllowances(0);
      setHourlyRate(0);
    }
  }, [employeeId, selectedEmployee]);
  
  // Calculate gross pay
  const calculateGrossPay = (): number => {
    if (calculationMode === 'salary') {
      return basicSalary + allowances;
    } else {
      return (hoursWorked * hourlyRate) + (overtime * hourlyRate * 1.5) + allowances;
    }
  };
  
  // Custom deductions total
  const getTotalCustomDeductions = (): number => {
    return otherDeductions + ewaDeductions + loanDeductions;
  };
  
  // Perform payroll calculation
  const calculatePayroll = () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee to calculate payroll",
        variant: "destructive",
      });
      return;
    }
    
    if (calculationMode === 'hourly' && (hoursWorked <= 0 || hourlyRate <= 0)) {
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
      
      // Calculate statutory deductions
      const deductions = calculateKenyanDeductions(grossPay);
      
      // Apply custom deductions
      const totalCustomDeductions = getTotalCustomDeductions();
      const netPayAfterCustomDeductions = deductions.netPay - totalCustomDeductions;
      
      // Update result
      setCalculationResults({
        ...deductions,
        netPay: netPayAfterCustomDeductions
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
      periodStart: new Date().toISOString().slice(0, 10), // Start of current month
      periodEnd: new Date().toISOString().slice(0, 10), // End of current month
      basicSalary,
      allowances,
      hoursWorked: calculationMode === 'hourly' ? hoursWorked : 0,
      hourlyRate: calculationMode === 'hourly' ? hourlyRate : 0,
      overtime: calculationMode === 'hourly' ? overtime : 0,
      grossPay: calculationResults.grossPay,
      paye: calculationResults.paye,
      nhif: calculationResults.nhif,
      nssf: calculationResults.nssf,
      housingLevy: calculationResults.housingLevy,
      otherDeductions,
      ewaDeductions,
      loanDeductions,
      totalDeductions: calculationResults.totalDeductions + getTotalCustomDeductions(),
      netPay: calculationResults.netPay,
      status: 'pending'
    };
    
    // Call onSave callback if provided
    if (onSave) {
      onSave(payrollData);
    }
    
    toast({
      title: "Payroll Saved",
      description: `Payroll for ${selectedEmployee.name} has been saved successfully.`,
    });
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
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employeeList.map(emp => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name} - {emp.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
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
          
          <Tabs value={calculationMode} onValueChange={(value) => setCalculationMode(value as 'hourly' | 'salary')}>
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
                    onChange={(e) => setBasicSalary(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowances">Allowances (KES)</Label>
                  <Input
                    id="allowances"
                    type="number"
                    value={allowances}
                    onChange={(e) => setAllowances(parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly-rate">Hourly Rate (KES)</Label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtime">Overtime Hours</Label>
                  <Input
                    id="overtime"
                    type="number"
                    value={overtime}
                    onChange={(e) => setOvertime(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowances-hourly">Allowances (KES)</Label>
                  <Input
                    id="allowances-hourly"
                    type="number"
                    value={allowances}
                    onChange={(e) => setAllowances(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Custom Deductions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ewa-deductions">EWA Deductions (KES)</Label>
                <Input
                  id="ewa-deductions"
                  type="number"
                  value={ewaDeductions}
                  onChange={(e) => setEwaDeductions(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan-deductions">Loan Repayments (KES)</Label>
                <Input
                  id="loan-deductions"
                  type="number"
                  value={loanDeductions}
                  onChange={(e) => setLoanDeductions(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other-deductions">Other Deductions (KES)</Label>
                <Input
                  id="other-deductions"
                  type="number"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={calculatePayroll} 
          disabled={!selectedEmployee || isCalculating}
          className="w-full"
        >
          {isCalculating ? "Calculating..." : "Calculate Payroll"}
        </Button>
        
        {calculationResults && (
          <div className="border rounded-lg p-4 mt-4 space-y-4">
            <h3 className="font-medium flex items-center">
              <BarChart className="h-5 w-5 mr-2 text-primary" />
              Payroll Calculation Results
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Gross Pay</p>
                <p className="font-medium">{formatKES(calculationResults.grossPay)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PAYE</p>
                <p className="font-medium">{formatKES(calculationResults.paye)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NHIF</p>
                <p className="font-medium">{formatKES(calculationResults.nhif)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NSSF</p>
                <p className="font-medium">{formatKES(calculationResults.nssf)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Housing Levy</p>
                <p className="font-medium">{formatKES(calculationResults.housingLevy)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custom Deductions</p>
                <p className="font-medium">{formatKES(getTotalCustomDeductions())}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="font-medium">{formatKES(calculationResults.totalDeductions + getTotalCustomDeductions())}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Net Pay</p>
                <p className="font-bold text-primary">{formatKES(calculationResults.netPay)}</p>
              </div>
            </div>
            
            <Button 
              onClick={handleSavePayroll} 
              variant="outline" 
              className="w-full mt-2"
            >
              Save Payroll
            </Button>
          </div>
        )}
      </CardContent>
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