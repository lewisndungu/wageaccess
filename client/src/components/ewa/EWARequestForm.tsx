import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { toast } from "@/hooks/use-toast";
import { calculateEarnedWage, formatKES } from "@/lib/tax-utils";
import { AlertCircle, Check, DollarSign, HelpCircle, Info } from "lucide-react";
import { calculateAvailableEWA } from "@/lib/integration-service";

interface EWARequestFormProps {
  onSuccess?: () => void;
}

const ewaRequestSchema = z.object({
  amount: z.coerce.number()
    .min(1000, "Minimum request amount is KES 1,000")
    .max(100000, "Maximum request amount is KES 100,000"),
  reason: z.string()
    .min(5, "Please provide a reason for your request")
    .max(200, "Reason must be less than 200 characters"),
});

type EWARequestFormValues = z.infer<typeof ewaRequestSchema>;

export function EWARequestForm({ onSuccess }: EWARequestFormProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get employee data
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['/api/employees/current'],
    initialData: {
      id: 1,
      name: 'James Mwangi',
      department: 'IT',
      position: 'Senior Developer',
      baseSalary: 85000,
      hourlyRate: 500,
      daysWorked: 14,
      totalWorkingDays: 22,
      availableForEwa: 35000,
      nextPayrollDate: '2023-08-31',
    },
  });
  
  // Get available EWA using integration service (based on attendance)
  const { data: availableEWA, isLoading: isLoadingEWA } = useQuery({
    queryKey: ['/api/ewa/available', employeeData.id],
    queryFn: async () => {
      // Use integration service to calculate available amount based on attendance
      const result = await calculateAvailableEWA(employeeData.id);
      return result || {
        employeeId: employeeData.id,
        earned: 0,
        totalWithdrawn: 0,
        maxAllowedPercentage: 0.5,
        availableAmount: 0,
        asOfDate: new Date()
      };
    },
    enabled: !!employeeData.id, // Only run if we have an employee ID
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
  
  // Determine if we should use integrated data or fallback to manual calculation
  const isLoadingData = isLoadingEmployee || isLoadingEWA;
  
  // If we have the integrated data, use it, otherwise fallback to manual calculation
  const earnedWage = availableEWA?.earned || calculateEarnedWage(
    employeeData.baseSalary,
    employeeData.daysWorked,
    employeeData.totalWorkingDays
  );
  
  const totalWithdrawn = availableEWA?.totalWithdrawn || 0;
  
  const maxAvailable = availableEWA?.availableAmount || Math.min(
    earnedWage * 0.5, // 50% of earned wage
    employeeData.availableForEwa
  );
  
  // Form setup
  const form = useForm<EWARequestFormValues>({
    resolver: zodResolver(ewaRequestSchema),
    defaultValues: {
      amount: 5000,
      reason: "",
    },
  });
  
  // Get current amount value for calculations
  const watchAmount = form.watch("amount") || 0;
  
  // Calculate fee (2% of requested amount)
  const processingFee = watchAmount * 0.02;
  
  // Calculate total deduction
  const totalDeduction = watchAmount + processingFee;
  
  // Calculate percentage of available amount
  const percentageRequested = Math.min(100, (watchAmount / maxAvailable) * 100);
  
  // Submit handler
  const { mutate: submitRequest } = useMutation({
    mutationFn: async (values: EWARequestFormValues) => {
      setIsSubmitting(true);
      return await apiRequest('POST', '/api/ewa/requests', {
        employeeId: employeeData.id,
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
      
      queryClient.invalidateQueries({ queryKey: ['/api/ewa/requests'] });
      
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
    submitRequest(values);
  }
  
  // Amount presets
  const amountPresets = [5000, 10000, 15000, 20000];
  
  return (
    <div className="space-y-6">
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
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Earned (Current Period)</span>
                <span className="font-medium">{formatKES(earnedWage)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Days Worked</span>
                <span className="font-medium">{employeeData.daysWorked} of {employeeData.totalWorkingDays}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Next Payroll Date</span>
                <span className="font-medium">{new Date(employeeData.nextPayrollDate).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Your Request Summary</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Request Amount</span>
                <span className="font-medium">{formatKES(watchAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processing Fee (2%)</span>
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
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Request Amount (KES)</FormLabel>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder="Enter amount"
                      className="pl-10"
                      min={1000}
                      max={maxAvailable}
                    />
                  </FormControl>
                </div>
                <FormDescription className="flex justify-between">
                  <span>Min: {formatKES(1000)}</span>
                  <span>Max: {formatKES(maxAvailable)}</span>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-4 gap-2">
            {amountPresets.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                onClick={() => form.setValue('amount', preset, { shouldValidate: true })}
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
                <FormLabel>Reason for Request</FormLabel>
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
          
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
              <p className="text-sm">
                The requested amount plus the processing fee will be deducted from your next paycheck.
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
        </form>
      </Form>
    </div>
  );
}