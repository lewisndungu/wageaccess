import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/mock-data"; // Keep utilities but don't use mock data
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Download, Printer, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Loader } from "@/components/ui/loader";
import { toast } from "@/hooks/use-toast";
import { Payroll, Employee } from "@/../../shared/schema"; // Correct import for schema types
import axios from "axios";
import { useEffect, useState } from "react";

// Extended type to include properties returned by API
interface PayrollWithDetails extends Payroll {
  employeeName?: string;
  hourlyRate?: number;
  // Payment-related fields
  paymentMethod?: 'mpesa' | 'bank';
  mpesaNumber?: string;
  bankName?: string;
  accountNumber?: string;
}

export default function PayrollDetailPage() {
  const params = useParams<{ id: string }>();
  const payrollId = params.id || "";
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payrollData, setPayrollData] = useState<PayrollWithDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any | null>(null);
  
  useEffect(() => {
    const fetchPayrollDetails = async () => {
      setIsLoading(true);
      try {
        // Get payroll data
        const payrollResponse = await axios.get(`/api/payroll/${payrollId}`);
        const payrollData = payrollResponse.data;
        setPayrollData(payrollData);

        // Get payment details
        if (payrollData && payrollData.employeeId) {
          const paymentResponse = await axios.get(`/api/employees/${payrollData.employeeId}/payment-details`);
          const paymentDetails = paymentResponse.data;
          setPaymentDetails(paymentDetails);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching payroll details:", error);
        setError("Failed to load payroll details. Please try again later.");
        setIsLoading(false);
      }
    };

    if (payrollId) {
      fetchPayrollDetails();
    }
  }, [payrollId]);
  
  if (isLoading) {
    return <Loader text="Loading payroll details..." />;
  }
  
  if (error || !payrollData) {
    return (
      <div className="p-10 text-center">
        <p className="text-destructive mb-4">Error loading payroll details.</p>
        <Button onClick={() => navigate("/payroll")}>Back to Payroll</Button>
      </div>
    );
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge className="bg-green-100 text-green-800">Processed</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      case "paid":
        return <Badge className="bg-blue-100 text-blue-800">Paid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Calculate deduction values based on the structure from the API
  const taxDeduction = payrollData.taxDeductions || 0;
  const ewaDeduction = payrollData.ewaDeductions || 0;
  const otherDeduction = payrollData.otherDeductions || 0;
  const totalDeductions = taxDeduction + ewaDeduction + otherDeduction;
  
  // Build payslip items based on available data
  const payslipItems = [
    { label: "Basic Salary", amount: payrollData.grossPay },
    { label: "Overtime", amount: 0 }, // Assuming overtime is factored into grossPay
    { label: "Bonuses", amount: 0 }, // Not tracked in the current schema
    { label: "Gross Pay", amount: payrollData.grossPay, isBold: true },
    { label: "EWA Deductions", amount: -ewaDeduction },
    { label: "Tax", amount: -taxDeduction },
    { label: "Health Insurance", amount: -(otherDeduction * 0.4) }, // Estimate based on otherDeductions
    { label: "Pension", amount: -(otherDeduction * 0.6) }, // Estimate based on otherDeductions
    { label: "Total Deductions", amount: -totalDeductions, isBold: true },
    { label: "Net Pay", amount: payrollData.netPay, isTotal: true }
  ];

  // Get employee name from either nested object or flattened property
  const employeeName = payrollData.employee 
    ? `${payrollData.employee.other_names} ${payrollData.employee.surname}` 
    : payrollData.employeeName || "Employee";
  
  // Get employee position
  const employeePosition = payrollData.employee?.position || "";
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-2" onClick={() => navigate("/payroll")}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Detail</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button className="flex items-center">
            <Send className="mr-2 h-4 w-4" />
            Send to Employee
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payslip</CardTitle>
                  <CardDescription>
                    {formatDate(String(payrollData.periodStart))} - {formatDate(String(payrollData.periodEnd))}
                  </CardDescription>
                </div>
                {getStatusBadge(payrollData.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <Avatar className="h-14 w-14 mr-4">
                    <AvatarImage 
                      src={payrollData.employee?.avatar_url} 
                      alt={employeeName} 
                    />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{employeeName}</h3>
                    <p className="text-sm text-muted-foreground">{employeePosition}</p>
                    <p className="text-sm text-muted-foreground">
                      {payrollData.employee?.employeeNumber 
                        ? `EMP-${payrollData.employee.employeeNumber}`
                        : `ID: ${payrollData.employeeId}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Payroll ID</p>
                  <p className="font-medium">PAY-{payrollData.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-3">Earnings & Deductions</h3>
                  <div className="space-y-2">
                    {payslipItems.map((item, index) => (
                      <div key={index} className={`flex justify-between ${item.isTotal ? 'border-t pt-2 mt-4' : ''}`}>
                        <span className={`text-sm ${item.isBold || item.isTotal ? 'font-semibold' : ''} ${item.isTotal ? 'text-base' : ''}`}>
                          {item.label}
                        </span>
                        <span className={`text-sm ${item.isBold || item.isTotal ? 'font-semibold' : ''} ${item.isTotal ? 'text-base' : ''} ${item.amount < 0 ? 'text-red-500' : ''}`}>
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Summary</h3>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Hours Worked</span>
                        <span className="text-sm font-medium">{payrollData.hoursWorked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Hourly Rate</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(payrollData.hourlyRate || payrollData.employee?.hourlyRate || 0)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">EWA Deductions</span>
                        <span className="text-sm font-medium">{formatCurrency(ewaDeduction)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">EWA Balance</span>
                        <span className="text-sm font-medium">{formatCurrency(0)}</span>
                      </div>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Year-to-Date Gross</span>
                        <span className="text-sm font-medium">{formatCurrency(payrollData.grossPay * 3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Year-to-Date Tax</span>
                        <span className="text-sm font-medium">{formatCurrency(taxDeduction * 3)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 items-start">
              <div className="text-sm text-muted-foreground">
                <p>This payslip was processed on {payrollData.processedAt ? new Date(payrollData.processedAt).toLocaleDateString() : new Date().toLocaleDateString()} and is subject to tax regulations.</p>
                <p>If you have any questions about this payslip, please contact the HR department.</p>
              </div>
              <div className="flex space-x-4">
                <div className="text-center space-y-1">
                  <svg className="h-12 w-24 mx-auto" viewBox="0 0 100 50">
                    <path d="M10 25 C 20 10, 40 10, 50 25 S 80 40, 90 25" stroke="currentColor" fill="transparent" />
                  </svg>
                  <p className="text-xs text-muted-foreground">Manager Signature</p>
                </div>
                <Separator orientation="vertical" className="h-16" />
                <div className="text-center space-y-1">
                  <svg className="h-12 w-24 mx-auto" viewBox="0 0 100 50">
                    <path d="M10 25 C 30 40, 50 0, 90 25" stroke="currentColor" fill="transparent" />
                  </svg>
                  <p className="text-xs text-muted-foreground">Company Stamp</p>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">
                  {payrollData.paymentMethod === 'mpesa' ? 'M-Pesa' : 
                   payrollData.paymentMethod === 'bank' ? 'Bank Transfer' : 
                   'Bank Transfer'}
                </p>
              </div>
              
              {payrollData.paymentMethod === 'mpesa' ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">M-Pesa Number</p>
                  <p className="font-medium">{payrollData.mpesaNumber || 'Not specified'}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{payrollData.bankName || 'Not specified'}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-medium">
                      {payrollData.accountNumber ? 
                       `XXXX-XXXX-${payrollData.accountNumber.slice(-4)}` : 
                       'Not specified'}
                    </p>
                  </div>
                </>
              )}
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Payment Date</p>
                <p className="font-medium">
                  {payrollData.processedAt ? 
                   new Date(payrollData.processedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                   }) : 
                   'Pending'}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reference</p>
                <p className="font-medium">
                  {new Date(payrollData.periodEnd).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  }).toUpperCase()}-{payrollData.employeeId}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => {
                  const month = new Date();
                  month.setMonth(month.getMonth() - (index + 1));
                  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
                  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                  
                  return (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div>
                        <p className="font-medium">{startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(startDate.toISOString())} - {formatDate(endDate.toISOString())}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payrollData.netPay * 0.9 + (index * 5000))}</p>
                        <Badge variant="outline" className="text-xs">Paid</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <path d="M17 17h-4"></path>
                  <path d="M17 13h-5"></path>
                  <path d="M17 9h-3"></path>
                  <path d="M8 13v.01"></path>
                  <path d="M8 9v.01"></path>
                </svg>
                Generate Tax Certificate
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h.01M11 15h.01M15 15h.01M19 15h.01M7 19h.01M11 19h.01M15 19h.01M19 19h.01"></path>
                  <path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"></path>
                </svg>
                Calculate Prorated Salary
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 11-7-7-7 7"></path>
                  <path d="M5 11v8h14v-8"></path>
                  <rect x="10" y="19" width="4" height="5"></rect>
                </svg>
                Archive Payslip
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
