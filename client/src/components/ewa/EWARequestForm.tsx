import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "@/hooks/use-toast";
import { calculateEarnedWage, formatKES } from "@/lib/tax-utils";
import { AlertCircle, Check, Banknote, HelpCircle, Info } from "lucide-react";
import { Employee, EwaRequest } from "@shared/schema";
import axios from "axios";

interface EWARequestFormProps {
  onSuccess?: () => void;
}

const ewaRequestSchema = z.object({
  employeeId: z.string().min(1, "Please select an employee"),
  amount: z.coerce.number()
    .min(100, "Minimum request amount is KES 100")
    .max(100000, "Maximum request amount is KES 100,000"),
  reason: z.string().optional()
});

type EWARequestFormValues = z.infer<typeof ewaRequestSchema>;

export function EWARequestForm({ onSuccess }: EWARequestFormProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form setup with validation mode set to onSubmit
  const form = useForm<EWARequestFormValues>({
    resolver: zodResolver(ewaRequestSchema),
    defaultValues: {
      employeeId: "",
      amount: 5000,
      reason: "",
    },
    mode: "onSubmit", // Only validate on submit
    reValidateMode: "onSubmit", // Only revalidate on submit
  });
  
  // Get active employees with proper typing
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['employees/active'],
    queryFn: async () => {
      const { data } = await axios.get('/api/employees/active');
      return data;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
  
  // Get selected employee data with proper typing
  const selectedEmployeeId = form.watch('employeeId');
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery<Employee>({
    queryKey: ['employees', selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return null;
      const { data } = await axios.get(`/api/employees/${selectedEmployeeId}`);
      return data;
    },
    enabled: !!selectedEmployeeId,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
  
  // Get available EWA using integration service
  const { data: availableEWA, isLoading: isLoadingEWA } = useQuery({
    queryKey: ['ewa/available', selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return null;
      const { data } = await axios.get(`/api/ewa/available?employeeId=${selectedEmployeeId}`);
      return data;
    },
    enabled: !!selectedEmployeeId,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
  
  // Get pending EWA requests for the selected employee
  const { data: pendingRequests } = useQuery<EwaRequest[]>({
    queryKey: ['ewa/requests/pending', selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return [];
      const { data } = await axios.get(`/api/ewa/requests/pending?employeeId=${selectedEmployeeId}`);
      return data;
    },
    enabled: !!selectedEmployeeId,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
  // Determine if we should use integrated data or fallback to manual calculation
  const isLoadingData = isLoadingEmployee || isLoadingEWA;
  
  // Calculate available amount with proper fallbacks
  const earnedWage = availableEWA?.earned || (employeeData ? calculateEarnedWage(
    employeeData.gross_income || 0,
    employeeData.hoursWorked || 0,
    22 // Standard working days per month
  ) : 0);
  
  const totalWithdrawn = availableEWA?.totalWithdrawn || 0;
  
  // Calculate max available amount considering pending requests
  const pendingAmount = pendingRequests?.reduce((sum, req) => sum + req.amount, 0) || 0;
  const maxAvailable = Math.max(0, (availableEWA?.availableAmount || (employeeData ? Math.min(
    earnedWage * 0.5,
    employeeData.available_salary_advance_limit || 0
  ) : 0)) - pendingAmount);
  
  // Get current amount value for calculations
  const watchAmount = form.watch("amount") || 0;
  
  // Calculate fee (5% of requested amount)
  const processingFee = watchAmount * 0.05;
  
  // Calculate total deduction
  const totalDeduction = watchAmount + processingFee;
  
  // Calculate percentage of available amount
  const percentageRequested = Math.min(100, (watchAmount / maxAvailable) * 100);
  
  // Calculate next payroll date (28th of current/next month)
  const getNextPayrollDate = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    
    // If we're past the 28th, use next month
    const targetMonth = currentDay > 28 ? currentMonth + 1 : currentMonth;
    const targetYear = targetMonth > 11 ? currentYear + 1 : currentYear;
    const normalizedMonth = targetMonth % 12;
    
    return new Date(targetYear, normalizedMonth, 28);
  };
  
  // Submit handler with proper error handling
  const { mutate: submitRequest } = useMutation({
    mutationFn: async (values: EWARequestFormValues) => {
      setIsSubmitting(true);
      return await axios.post('/api/ewa/requests', {
        employeeId: values.employeeId,
        amount: values.amount,
        reason: values.reason,
        processingFee: processingFee,
      });
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your EWA request has been submitted for processing.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['ewa/requests'] });
      queryClient.invalidateQueries({ queryKey: ['ewa/available'] });
      queryClient.invalidateQueries({ queryKey: ['ewa/requests/pending'] });
      
      if (onSuccess) {
        onSuccess();
      }
      
      form.reset();
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Failed to submit EWA request",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });
  
  function onSubmit(values: EWARequestFormValues) {
    if (values.amount > maxAvailable) {
      toast({
        title: "Invalid amount",
        description: "Requested amount exceeds available limit",
        variant: "destructive",
      });
      return;
    }
    submitRequest(values);
  }
  
  // Amount presets based on available amount
  const amountPresets = [5000, 10000, 15000, 20000].filter(amount => amount <= maxAvailable);
  
  // Effect to update amount if it exceeds max available
  useEffect(() => {
    const amount = form.getValues('amount');
    if (amount > maxAvailable) {
      form.setValue('amount', maxAvailable, { shouldValidate: true });
    }
  }, [maxAvailable, form]);
  
  return (
    <div className="space-y-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Employee</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingEmployees ? (
                      <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                    ) : employees?.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.other_names} {employee.surname} - {employee.employeeNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedEmployeeId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Available for EWA</p>
                      <p className="text-2xl font-bold">
                        {formatKES(maxAvailable)}
                      </p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Banknote className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Earned (Current Period)</span>
                      <span className="font-medium">{formatKES(earnedWage)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Days Worked</span>
                      <span className="font-medium">
                        {employeeData?.hoursWorked ? `${employeeData.hoursWorked} hours` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending Requests</span>
                      <span className="font-medium">
                        {pendingRequests?.length || 0} requests
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Next Payroll Date</span>
                      <span className="font-medium">
                        {getNextPayrollDate().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium">Request Summary</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Request Amount</span>
                      <span className="font-medium">{formatKES(watchAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Processing Fee (5%)</span>
                      <span className="font-medium">{formatKES(processingFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Deduction</span>
                      <span>{formatKES(totalDeduction)}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-sm mb-2">Amount Requested</p>
                    <Progress value={percentageRequested} className="h-2" />
                    <div className="flex justify-between text-xs mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {selectedEmployeeId && (
            <>
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Request Amount (KES)</FormLabel>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Enter amount"
                          className="pl-10"
                          min={1000}
                          max={maxAvailable}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? '' : Number(value));
                          }}
                        />
                      </FormControl>
                    </div>
                    <FormDescription className="flex justify-between">
                      <span>Min: {formatKES(1000)}</span>
                      <span>Max: {formatKES(maxAvailable)}</span>
                    </FormDescription>
                    {form.formState.isSubmitted && form.formState.errors.amount && (
                      <FormMessage />
                    )}
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-4 gap-2">
                {amountPresets.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    onClick={() => form.setValue('amount', preset, { shouldValidate: false })}
                    disabled={preset > maxAvailable}
                    className={watchAmount === preset ? 'border-primary' : ''}
                  >
                    {formatKES(preset)}
                  </Button>
                ))}
              </div>
              
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Request (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Briefly describe why you need an advance"
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      This information helps with processing your request
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
                  <p className="text-sm">
                    The requested amount plus the processing fee will be deducted from the employee's next paycheck.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || watchAmount > maxAvailable}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Submit EWA Request
                    </>
                  )}
                </Button>
                
                <div className="text-xs text-center text-muted-foreground flex items-center justify-center">
                  <HelpCircle className="h-3 w-3 mr-1" />
                  EWA requests are typically processed within 24 hours
                </div>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
}