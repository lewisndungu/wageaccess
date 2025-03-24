import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ChevronDown, Download, FileSpreadsheet, Filter, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { payrollRecords, departments, formatCurrency, formatDate } from "@/lib/mock-data";

interface PayrollRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  periodStart: string;
  periodEnd: string;
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
  ewaDeductions: number;
  taxDeductions: number;
  otherDeductions: number;
  netPay: number;
  status: string;
}

export default function PayrollPage() {
  const navigate = useNavigate();
  const [payPeriod, setPayPeriod] = useState("current");
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  
  const { data: records, isLoading } = useQuery<PayrollRecord[]>({
    queryKey: ['/api/payroll'],
    initialData: payrollRecords,
  });
  
  const columns: ColumnDef<PayrollRecord>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src="" alt={record.employeeName} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{record.employeeName}</p>
              <p className="text-xs text-muted-foreground">{record.department}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "hourlyRate",
      header: "Rate",
      cell: ({ row }) => formatCurrency(row.original.hourlyRate),
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ row }) => row.original.hoursWorked.toString(),
    },
    {
      accessorKey: "grossPay",
      header: "Gross Pay",
      cell: ({ row }) => formatCurrency(row.original.grossPay),
    },
    {
      accessorKey: "ewaDeductions",
      header: "EWA",
      cell: ({ row }) => formatCurrency(row.original.ewaDeductions),
    },
    {
      accessorKey: "taxDeductions",
      header: "Tax",
      cell: ({ row }) => formatCurrency(row.original.taxDeductions),
    },
    {
      accessorKey: "netPay",
      header: "Net Pay",
      cell: ({ row }) => formatCurrency(row.original.netPay),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={row.original.status === "processed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => navigate(`/payroll/${row.original.id}`)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </Button>
      ),
    },
  ];
  
  const payrollSummary = {
    totalEmployees: records.length,
    totalGrossPay: records.reduce((sum, record) => sum + record.grossPay, 0),
    totalNetPay: records.reduce((sum, record) => sum + record.netPay, 0),
    totalEwaDeductions: records.reduce((sum, record) => sum + record.ewaDeductions, 0),
    totalTaxDeductions: records.reduce((sum, record) => sum + record.taxDeductions, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 pb-6 mb-6 border-b border-blue-100 dark:border-blue-900">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
            Payroll Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage employee compensation and payment processing</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50"
          >
            <Download className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
            Export Records
          </Button>
          <Button 
            onClick={() => setIsProcessingDialogOpen(true)} 
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Process Payroll
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-800 dark:text-blue-300 text-sm font-medium">Total Employees</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-blue-600 dark:text-blue-400"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">{payrollSummary.totalEmployees}</span>
                  <span className="text-xs text-blue-700 dark:text-blue-400">
                    Processed this period
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-800 dark:text-emerald-300 text-sm font-medium">Gross Payroll</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                  >
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{formatCurrency(payrollSummary.totalGrossPay)}</span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    Before deductions
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-800 dark:text-amber-300 text-sm font-medium">EWA Deductions</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-amber-600 dark:text-amber-400"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m8 14 2.5-2.5M8 10l4 4 4-4"></path>
                  </svg>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(payrollSummary.totalEwaDeductions)}</span>
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
                  <span className="text-purple-800 dark:text-purple-300 text-sm font-medium">Net Payroll</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-purple-600 dark:text-purple-400"
                  >
                    <path d="M2 17h2m4 0h2m4 0h2m4 0h2M6 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path>
                    <path d="M18 7V5c0-1.1-.9-2-2-2H8a2 2 0 0 0-2 2v2h12Z"></path>
                  </svg>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatCurrency(payrollSummary.totalNetPay)}</span>
                  <span className="text-xs text-purple-700 dark:text-purple-400">
                    After all deductions
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="border border-blue-100 dark:border-blue-900">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-950/50 border-b border-blue-100 dark:border-blue-900">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                <div>
                  <CardTitle className="text-blue-900 dark:text-blue-50 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 20h4a2 2 0 0 0 2-2V8c0-1.1-.9-2-2-2h-4"></path>
                      <path d="M12 4H8a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h4"></path>
                      <path d="M12 4v16"></path>
                      <path d="M3 15h5"></path>
                      <path d="M3 10h5"></path>
                      <path d="M3 5h5"></path>
                    </svg>
                    Payroll Records
                  </CardTitle>
                  <CardDescription>Manage and view payroll information for all employees</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Select defaultValue={payPeriod} onValueChange={setPayPeriod}>
                    <SelectTrigger className="w-[180px] border-blue-200 dark:border-blue-800">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Month</SelectItem>
                      <SelectItem value="previous">Previous Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="all" className="w-full">
                <div className="px-6 pt-4 pb-2 flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                  <TabsList className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                    <TabsTrigger value="all">All Records</TabsTrigger>
                    <TabsTrigger value="processed">Processed</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex flex-wrap gap-2">
                    <div className="relative w-60">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search employee..." className="pl-8 border-blue-200 dark:border-blue-800" />
                    </div>
                    <Button variant="outline" size="icon" className="border-blue-200 dark:border-blue-800">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <TabsContent value="all" className="mt-0 pt-0">
                  <div className="border-t border-blue-100 dark:border-blue-900">
                    <div className="overflow-hidden rounded-b-lg">
                      <DataTable columns={columns} data={records} />
                    </div>
                    <div className="p-4 bg-blue-50/30 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900 text-sm text-muted-foreground">
                      Showing {records.length} records
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="processed" className="mt-0 pt-0">
                  <div className="border-t border-blue-100 dark:border-blue-900">
                    <div className="overflow-hidden rounded-b-lg">
                      <DataTable columns={columns} data={records.filter(r => r.status === 'processed')} />
                    </div>
                    <div className="p-4 bg-blue-50/30 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900 text-sm text-muted-foreground">
                      Showing {records.filter(r => r.status === 'processed').length} processed records
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="draft" className="mt-0 pt-0">
                  <div className="border-t border-blue-100 dark:border-blue-900">
                    <div className="overflow-hidden rounded-b-lg">
                      <DataTable columns={columns} data={records.filter(r => r.status === 'draft')} />
                    </div>
                    <div className="p-4 bg-blue-50/30 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900 text-sm text-muted-foreground">
                      Showing {records.filter(r => r.status === 'draft').length} draft records
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="border border-blue-100 dark:border-blue-900">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-950/50 border-b border-blue-100 dark:border-blue-900">
              <CardTitle className="text-blue-900 dark:text-blue-50 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"></path>
                  <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>
                  <path d="m12 2 2 2"></path>
                  <path d="M12 22v-2"></path>
                  <path d="m17 20.66-1-1.73"></path>
                  <path d="M11 3.41 9.6 2"></path>
                  <path d="m3.34 7 1.73 1"></path>
                  <path d="M2 12h2"></path>
                  <path d="m3.34 17 1.73-1"></path>
                  <path d="m20.66 7-1.73 1"></path>
                  <path d="M22 12h-2"></path>
                  <path d="m20.66 17-1.73-1"></path>
                </svg>
                Payroll Settings
              </CardTitle>
              <CardDescription>Configure payroll calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-blue-900 dark:text-blue-50 font-medium">Auto Process</Label>
                  <p className="text-sm text-muted-foreground">
                    Process payroll automatically on month end
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-900 dark:text-blue-50 font-medium">Default Tax Rate (%)</Label>
                <Input 
                  type="number" 
                  defaultValue="10" 
                  min="0" 
                  max="100" 
                  className="border-blue-200 dark:border-blue-800" 
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-900 dark:text-blue-50 font-medium">Pay Period</Label>
                <Select defaultValue="monthly">
                  <SelectTrigger className="border-blue-200 dark:border-blue-800">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-blue-900 dark:text-blue-50 font-medium">Currency</Label>
                <Select defaultValue="kes">
                  <SelectTrigger className="border-blue-200 dark:border-blue-800">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kes">Kenyan Shilling (KES)</SelectItem>
                    <SelectItem value="usd">US Dollar (USD)</SelectItem>
                    <SelectItem value="eur">Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                className="w-full border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/40" 
                variant="outline"
              >
                Save Settings
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border border-blue-100 dark:border-blue-900">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-950/50 border-b border-blue-100 dark:border-blue-900">
              <CardTitle className="text-blue-900 dark:text-blue-50 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4"></path>
                  <path d="M12 18v4"></path>
                  <path d="m4.93 7.5 2.83 2.83"></path>
                  <path d="M16.24 13.67 19.07 16.5"></path>
                  <path d="M2 12h4"></path>
                  <path d="M18 12h4"></path>
                  <path d="m4.93 16.5 2.83-2.83"></path>
                  <path d="M16.24 10.33 19.07 7.5"></path>
                </svg>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <Button 
                variant="outline" 
                className="w-full justify-start border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/50"
                onClick={() => navigate('/payroll/process')}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                Process New Payroll
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/50"
              >
                <svg className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M8 13h2"></path>
                  <path d="M8 17h2"></path>
                  <path d="M14 13h2"></path>
                  <path d="M14 17h2"></path>
                </svg>
                Export Payroll Sheet
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/50"
              >
                <svg className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <path d="M12 11h4"></path>
                  <path d="M12 16h4"></path>
                  <path d="M8 11h.01"></path>
                  <path d="M8 16h.01"></path>
                </svg>
                Generate Tax Report
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/50"
              >
                <svg className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v6"></path>
                  <path d="M17.113 7.887a6.003 6.003 0 0 1 0 8.226M19.927 5.073a10.003 10.003 0 0 1 0 14.854M6.887 7.887a6.003 6.003 0 0 0 0 8.226M4.073 5.073a10.003 10.003 0 0 0 0 14.854"></path>
                </svg>
                Payroll Announcements
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 dark:from-blue-950/50 dark:to-indigo-950/50 dark:border-blue-900">
            <CardContent className="p-5">
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Need Help?</h3>
                <p className="text-sm text-blue-800/80 dark:text-blue-300/80">
                  Access our comprehensive payroll guides and video tutorials.
                </p>
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-center bg-white/80 hover:bg-white border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/60 dark:border-blue-800 dark:text-blue-300"
                  >
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <path d="M12 17h.01"></path>
                    </svg>
                    View Resources
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Process Payroll Dialog */}
      <Dialog open={isProcessingDialogOpen} onOpenChange={setIsProcessingDialogOpen}>
        <DialogContent className="sm:max-w-[525px] border-blue-200 dark:border-blue-800">
          <DialogHeader className="bg-blue-50/50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900 mb-4 pb-4">
            <DialogTitle className="text-blue-900 dark:text-blue-50 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5"></path>
                <path d="M11 11h2"></path>
                <path d="M3 17a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2Z"></path>
              </svg>
              Process Payroll
            </DialogTitle>
            <DialogDescription>
              Generate payroll records for all employees for the current pay period.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-0 space-y-5">
            <div className="space-y-2 p-3 rounded-lg bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/50">
              <Label className="text-blue-900 dark:text-blue-50 text-sm font-medium">Pay Period</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-blue-700 dark:text-blue-300">Start Date</Label>
                  <Input 
                    type="date" 
                    defaultValue="2023-07-01" 
                    className="border-blue-200 dark:border-blue-800" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-blue-700 dark:text-blue-300">End Date</Label>
                  <Input 
                    type="date" 
                    defaultValue="2023-07-31" 
                    className="border-blue-200 dark:border-blue-800" 
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900 dark:text-blue-50 text-sm font-medium">Department Filter (Optional)</Label>
              <Select>
                <SelectTrigger className="border-blue-200 dark:border-blue-800">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-blue-900 dark:text-blue-50 text-sm font-medium">Include EWA Deductions</Label>
                  <Switch defaultChecked={true} />
                </div>
                <p className="text-xs text-blue-700/70 dark:text-blue-300/70">
                  Automatically deduct any outstanding EWA advances from employee pay
                </p>
              </div>
              
              <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-blue-900 dark:text-blue-50 text-sm font-medium">Auto-Calculate Taxes</Label>
                  <Switch defaultChecked={true} />
                </div>
                <p className="text-xs text-blue-700/70 dark:text-blue-300/70">
                  Apply default tax rates to gross pay amounts
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-blue-900 dark:text-blue-50 text-sm font-medium">Round Amounts</Label>
                  <Switch defaultChecked={true} />
                </div>
                <p className="text-xs text-blue-700/70 dark:text-blue-300/70">
                  Round monetary amounts to nearest whole number
                </p>
              </div>
              
              <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-blue-900 dark:text-blue-50 text-sm font-medium">Send Notifications</Label>
                  <Switch defaultChecked={true} />
                </div>
                <p className="text-xs text-blue-700/70 dark:text-blue-300/70">
                  Notify employees when payroll is processed
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6 pt-4 border-t border-blue-100 dark:border-blue-900">
            <Button 
              variant="outline" 
              onClick={() => setIsProcessingDialogOpen(false)}
              className="border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600"
              onClick={() => {
                setIsProcessingDialogOpen(false);
                navigate('/payroll/process');
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2Z"></path>
                <path d="M9 7h6"></path>
                <path d="M9 11h6"></path>
                <path d="M9 15h4"></path>
              </svg>
              Begin Payroll Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
