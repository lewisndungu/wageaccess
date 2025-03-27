import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { calculateEarnedWage, formatKES } from "@/lib/tax-utils";
import { Calendar, CreditCard, ArrowRight, PieChart, CircleAlert, Clock, CheckCircle2, InfoIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Employee } from '@shared/schema';
import axios from 'axios';

interface EwaHistoryItem {
  id: number;
  date: string;
  amount: number;
  status: string;
  processingFee: number;
  disbursementDate: string | null;
}

interface EmployeeEWADashboardProps {
  employeeId: string;
}

export function EmployeeEWADashboard({ employeeId }: EmployeeEWADashboardProps) {
  const [currentDate] = useState(new Date());
  const [payPeriodStart] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const [payPeriodEnd] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
  const [daysWorked, setDaysWorked] = useState(0);
  const [totalWorkingDays] = useState(22); // Assuming 22 working days in a month
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [earnedSoFar, setEarnedSoFar] = useState(0);
  const [availableForWithdrawal, setAvailableForWithdrawal] = useState(0);
  const [withdrawnAmount, setWithdrawnAmount] = useState(0);
  
  // Calculate days worked so far this month
  useEffect(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate business days between startOfMonth and today
    let count = 0;
    const currentDate = new Date(startOfMonth);
    
    while (currentDate <= today) {
      const dayOfWeek = currentDate.getDay();
      // Count only weekdays (Monday to Friday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setDaysWorked(count);
  }, []);
  
  // Fetch employee data
  const { data: employee } = useQuery<Employee>({
    queryKey: ['/api/employees', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const response = await axios.get(`/api/employees/${employeeId}`);
      return response.data;
    }
  });
  
  // Fetch EWA history for the employee
  const { data: ewaHistory } = useQuery<EwaHistoryItem[]>({
    queryKey: ['/api/ewa/employee-history', employeeId],
    // Mock data for now
    initialData: [
      { id: 1, date: '2023-07-05', amount: 10000, status: 'disbursed', processingFee: 200, disbursementDate: '2023-07-05' },
      { id: 2, date: '2023-07-15', amount: 15000, status: 'disbursed', processingFee: 300, disbursementDate: '2023-07-15' },
      { id: 3, date: '2023-07-25', amount: 5000, status: 'pending', processingFee: 100, disbursementDate: null }
    ]
  });
  
  // Calculate EWA metrics
  useEffect(() => {
    if (employee?.gross_income) {
      const salary = employee.gross_income;
      setMonthlySalary(salary);
      
      // Calculate earned wages so far based on days worked
      const earned = calculateEarnedWage(salary, daysWorked, totalWorkingDays);
      setEarnedSoFar(earned);
      
      // Calculate withdrawn amount
      const withdrawn = ewaHistory
        .filter(item => item.status === 'disbursed')
        .reduce((sum, item) => sum + item.amount, 0);
      setWithdrawnAmount(withdrawn);
      
      // Calculate available for withdrawal (50% of earned so far minus what's already withdrawn)
      const maxAvailable = Math.floor(earned * 0.5) - withdrawn;
      setAvailableForWithdrawal(Math.max(0, maxAvailable));
    }
  }, [employee, daysWorked, ewaHistory, totalWorkingDays]);
  
  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6">
      <Card className="shadow-glass dark:shadow-glass-dark">
        <CardHeader className="pb-3">
          <CardTitle>Earned Wage Summary</CardTitle>
          <CardDescription>
            {formatDate(payPeriodStart.toISOString())} - {formatDate(payPeriodEnd.toISOString())}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Pay Period Progress</div>
              <div className="text-sm text-muted-foreground">{Math.round((daysWorked / totalWorkingDays) * 100)}%</div>
            </div>
            <Progress value={(daysWorked / totalWorkingDays) * 100} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Day {daysWorked}</span>
              <span>Day {totalWorkingDays}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Earned So Far</span>
                  </div>
                  <div className="text-2xl font-bold">{formatKES(earnedSoFar)}</div>
                  <p className="text-xs text-muted-foreground">
                    Based on {daysWorked} days worked
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Available to Access</span>
                  </div>
                  <div className="text-2xl font-bold">{formatKES(availableForWithdrawal)}</div>
                  <p className="text-xs text-muted-foreground">
                    50% of earned wages minus accessed amount
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Accessed So Far</span>
                  </div>
                  <div className="text-2xl font-bold">{formatKES(withdrawnAmount)}</div>
                  <p className="text-xs text-muted-foreground">
                    {withdrawnAmount > 0 
                      ? `${Math.round((withdrawnAmount / earnedSoFar) * 100)}% of earned wages` 
                      : 'No withdrawals yet'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {availableForWithdrawal > 0 ? (
            <Button className="mt-6 w-full sm:w-auto">
              Request Earned Wage Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-start p-4 border rounded-md border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
              <CircleAlert className="h-5 w-5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">EWA limit reached</p>
                <p className="text-sm">You've accessed your maximum available earned wages for this pay period.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-glass dark:shadow-glass-dark">
        <CardHeader>
          <CardTitle>EWA History</CardTitle>
          <CardDescription>Your earned wage access history</CardDescription>
        </CardHeader>
        <CardContent>
          {ewaHistory.length > 0 ? (
            <div className="space-y-4">
              {ewaHistory.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      {item.status === 'pending' ? (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{formatKES(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested on {formatDate(item.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={
                      item.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }>
                      {item.status === 'disbursed' ? 'Disbursed' : 'Pending'}
                    </Badge>
                    {item.status === 'disbursed' && item.disbursementDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Disbursed on {formatDate(item.disbursementDate)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <InfoIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <h3 className="mt-2 text-lg font-medium">No EWA History</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You haven't requested any early wage access yet.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-between">
          <div className="text-xs text-muted-foreground">
            <p className="mb-1">
              <span className="font-medium text-foreground">Processing fee: </span>
              2% of requested amount
            </p>
            <p>
              <span className="font-medium text-foreground">Deduction: </span>
              EWA amounts are deducted from your next paycheck
            </p>
          </div>
          <Link to="/ewa">
            <Button variant="outline" size="sm">View All EWA</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}