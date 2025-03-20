import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmployeeEWADashboard } from "@/components/ewa/EmployeeEWADashboard";
import { EmployeeRequestHistory } from "@/components/ewa/EmployeeRequestHistory";
import { EWARequestForm } from "@/components/ewa/EWARequestForm";
import { userProfile } from "@/lib/mock-data";
import { formatKES } from "@/lib/tax-utils";
import { ChevronLeft, CreditCard, FileText, BarChart2, User, Clock, ArrowUpRight } from "lucide-react";

export default function SelfServicePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Mock user data
  const { data: userData } = useQuery({
    queryKey: ['/api/users/current'],
    initialData: userProfile,
  });
  
  // Mock employee data
  const { data: employeeData } = useQuery({
    queryKey: ['/api/employees/current'],
    initialData: {
      id: 1,
      employeeNumber: 'EMP001',
      name: 'James Mwangi',
      position: 'Senior Developer',
      department: 'IT',
      joinDate: '2021-01-15',
      baseSalary: 85000,
      bankName: 'Kenya Commercial Bank',
      bankAccountNumber: '1234567890',
      nextPayrollDate: '2023-08-31',
      estimatedNextSalary: 82500,
      availableForEwa: 35000,
    },
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/dashboard">
            <Button variant="ghost" className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">EWA Self-Service Portal</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4">
                  {userData?.profileImage ? (
                    <AvatarImage src={userData.profileImage} alt={userData.name || 'User'} />
                  ) : (
                    <AvatarFallback>
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <h2 className="text-xl font-bold">{employeeData.name}</h2>
                <p className="text-sm text-muted-foreground">{employeeData.position}</p>
                <div className="mt-2">
                  <Badge variant="secondary">{employeeData.department}</Badge>
                </div>
                <div className="mt-6 w-full">
                  <nav className="space-y-2">
                    <Button 
                      variant={activeTab === 'dashboard' ? 'default' : 'ghost'} 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('dashboard')}
                    >
                      <BarChart2 className="mr-2 h-4 w-4" />
                      EWA Dashboard
                    </Button>
                    <Button 
                      variant={activeTab === 'history' ? 'default' : 'ghost'} 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('history')}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Request History
                    </Button>
                    <Button 
                      variant={activeTab === 'request' ? 'default' : 'ghost'} 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('request')}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      New EWA Request
                    </Button>
                    <Button 
                      variant={activeTab === 'faq' ? 'default' : 'ghost'} 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('faq')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      FAQs & Help
                    </Button>
                  </nav>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Employee ID:</span>
                  <span className="text-sm font-medium">{employeeData.employeeNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Join Date:</span>
                  <span className="text-sm font-medium">{formatDate(employeeData.joinDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Base Salary:</span>
                  <span className="text-sm font-medium">{formatKES(employeeData.baseSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next Payroll:</span>
                  <span className="text-sm font-medium">{formatDate(employeeData.nextPayrollDate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4 bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Available for EWA</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{formatKES(employeeData.availableForEwa)}</span>
                <div className="flex items-center text-green-600 text-xs">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Updated today
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Based on your current earned wages and previous EWA requests.
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="default" 
                size="sm" 
                className="w-full"
                onClick={() => setActiveTab('request')}
              >
                Request Access
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:col-span-3">
          {activeTab === 'dashboard' && (
            <EmployeeEWADashboard employeeId={employeeData.id} />
          )}
          
          {activeTab === 'history' && (
            <EmployeeRequestHistory employeeId={employeeData.id} />
          )}
          
          {activeTab === 'request' && (
            <Card>
              <CardHeader>
                <CardTitle>Request Earned Wage Access</CardTitle>
                <CardDescription>
                  Access a portion of your earned wages before payday
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EWARequestForm onSuccess={() => setActiveTab('history')} />
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'faq' && (
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>
                  Learn more about earned wage access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium">What is Earned Wage Access (EWA)?</h3>
                  <p className="text-sm text-muted-foreground">
                    Earned Wage Access allows you to access a portion of your already earned wages before your regular payday. Unlike loans, you're accessing money you've already worked for.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">How is the available amount calculated?</h3>
                  <p className="text-sm text-muted-foreground">
                    Your available amount is based on the days you've worked in the current pay period, your salary rate, and any previous EWA requests. Generally, you can access up to 50% of your earned wages.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Are there any fees?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes, there is a small processing fee for each EWA request, typically around 2% of the requested amount. This fee will be clearly displayed before you confirm your request.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">How do I repay the amount?</h3>
                  <p className="text-sm text-muted-foreground">
                    The accessed amount plus any fees will be automatically deducted from your next paycheck. There's no need to make separate repayments.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">How long does it take to receive the money?</h3>
                  <p className="text-sm text-muted-foreground">
                    Most requests are processed within minutes, and funds are typically available in your account within 24 hours, often much sooner depending on your bank.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Who approves my EWA request?</h3>
                  <p className="text-sm text-muted-foreground">
                    Requests are automatically approved if they meet the criteria and are within your available limit. For special circumstances, your HR department may need to review the request.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <p className="text-sm text-muted-foreground">Still have questions?</p>
                <Button variant="outline">Contact Support</Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}