import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { employees } from "@/lib/mock-data";
import { calculateEarnedWage, formatKES } from "@/lib/tax-utils";
import { Calendar, CreditCard, DollarSign, HelpCircle, BadgePercent, AlertCircle } from "lucide-react";

interface EWARequestFormProps {
  onSuccess?: () => void;
}

export function EWARequestForm({ onSuccess }: EWARequestFormProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [requestAmount, setRequestAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [processingFee, setProcessingFee] = useState<number>(0);
  const [maxAvailable, setMaxAvailable] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // Fetch employees
  const { data: employeeList } = useQuery({
    queryKey: ['/api/employees/active'],
    initialData: employees,
  });
  
  // Get selected employee
  const selectedEmployee = employeeId 
    ? employeeList.find(emp => emp.id.toString() === employeeId) 
    : null;
    
  // Calculate max available amount when employee changes
  useEffect(() => {
    if (selectedEmployee) {
      // In a real app, we would fetch this data from the API
      // For now, generate mock data based on employee ID
      
      // Mock salary data - 50,000 KES base + 10,000 per employee ID
      const monthlySalary = 50000 + (parseInt(employeeId) * 10000);
      
      // Assume employee has worked 15 days out of 22 working days
      const daysWorked = 15;
      const workingDaysInMonth = 22;
      
      // Calculate earned wage so far
      const earnedWageSoFar = calculateEarnedWage(monthlySalary, daysWorked, workingDaysInMonth);
      
      // Maximum available is 50% of earned wage
      const maxAvailableAmount = Math.floor(earnedWageSoFar * 0.5);
      
      setMaxAvailable(maxAvailableAmount);
      setRequestAmount(Math.min(10000, maxAvailableAmount)); // Set a default amount
    } else {
      setMaxAvailable(0);
      setRequestAmount(0);
    }
  }, [employeeId, selectedEmployee]);
  
  // Calculate processing fee (2% of request amount)
  useEffect(() => {
    const fee = Math.round(requestAmount * 0.02);
    setProcessingFee(fee);
  }, [requestAmount]);
  
  // Format amount in KES
  const formatAmount = (amount: number): string => {
    return formatKES(amount);
  };
  
  // Handle amount slider change
  const handleAmountChange = (value: number[]) => {
    setRequestAmount(value[0]);
  };
  
  // Handle submission
  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }
    
    if (requestAmount <= 0 || requestAmount > maxAvailable) {
      toast({
        title: "Error",
        description: `Please enter a valid amount between 1 and ${formatAmount(maxAvailable)}`,
        variant: "destructive",
      });
      return;
    }
    
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the request",
        variant: "destructive",
      });
      return;
    }
    
    if (!agreeToTerms) {
      toast({
        title: "Error",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real app, we would call the API
      // Mock successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Request Submitted",
        description: `Your EWA request for ${formatAmount(requestAmount)} has been submitted successfully.`,
      });
      
      // Reset form
      setEmployeeId('');
      setRequestAmount(0);
      setReason('');
      setAgreeToTerms(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/ewa'] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="shadow-glass dark:shadow-glass-dark">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Earned Wage Access Request
        </CardTitle>
        <CardDescription>
          Request early access to your earned wages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="employee">
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
            <div className="border p-4 rounded-md bg-primary/5">
              <div className="flex items-center mb-3">
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
                  <p className="text-sm text-muted-foreground">{selectedEmployee.department}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Maximum Available</p>
                  <p className="font-medium">{formatAmount(maxAvailable)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Processing Fee</p>
                  <p className="font-medium">{formatAmount(processingFee)}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount">Request Amount (KES)</Label>
              <span className="text-lg font-medium">{formatAmount(requestAmount)}</span>
            </div>
            
            <Slider
              disabled={!selectedEmployee}
              value={[requestAmount]}
              min={0}
              max={maxAvailable || 10000}
              step={500}
              onValueChange={handleAmountChange}
              className="my-4"
            />
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>KES 0</span>
              <span>KES {formatKES(maxAvailable || 10000)}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Request</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for your EWA request"
              rows={3}
            />
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-blue-800 text-sm">
            <div className="flex items-start">
              <HelpCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Earned Wage Access Information</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>You can only access wages you've already earned</li>
                  <li>A processing fee of 2% applies to all EWA requests</li>
                  <li>The requested amount will be deducted from your next paycheck</li>
                  <li>Funds will be transferred to your registered bank account</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="terms" 
              checked={agreeToTerms}
              onCheckedChange={setAgreeToTerms}
            />
            <Label htmlFor="terms" className="text-sm cursor-pointer">
              I agree to the terms and conditions for early wage access
            </Label>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={!selectedEmployee || requestAmount <= 0 || !reason.trim() || !agreeToTerms || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </CardFooter>
    </Card>
  );
}