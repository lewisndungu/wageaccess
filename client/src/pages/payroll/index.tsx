import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  CalendarIcon,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Filter,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import {
  payrollRecords,
  departments,
  formatCurrency,
  formatDate,
} from "@/lib/mock-data";

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
    queryKey: ["/api/payroll"],
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
              <p className="text-xs text-muted-foreground">
                {record.department}
              </p>
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
        <Badge
          className={
            row.original.status === "processed"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }
        >
          {row.original.status.charAt(0).toUpperCase() +
            row.original.status.slice(1)}
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
    totalEwaDeductions: records.reduce(
      (sum, record) => sum + record.ewaDeductions,
      0
    ),
    totalTaxDeductions: records.reduce(
      (sum, record) => sum + record.taxDeductions,
      0
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Payroll Management
        </h1>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={() => navigate("/payroll/process")}
            className="flex items-center"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Process Payroll
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payrollSummary.totalEmployees}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gross Payroll
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(payrollSummary.totalGrossPay)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                EWA Deductions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(payrollSummary.totalEwaDeductions)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Payroll
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(payrollSummary.totalNetPay)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-glass dark:shadow-glass-dark">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
              <div>
                <CardTitle>Payroll Records</CardTitle>
                <CardDescription>
                  Manage and view payroll information for all employees
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Select defaultValue={payPeriod} onValueChange={setPayPeriod}>
                  <SelectTrigger className="w-[180px]">
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
          <CardContent>
            <Tabs defaultValue="all">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="processed">Processed</TabsTrigger>
                  <TabsTrigger value="draft">Draft</TabsTrigger>
                </TabsList>

                <div className="flex space-x-2">
                  <div className="relative w-60">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search employee..." className="pl-8" />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <TabsContent value="all" className="mt-0">
                <DataTable columns={columns} data={records} />
              </TabsContent>

              <TabsContent value="processed" className="mt-0">
                <DataTable
                  columns={columns}
                  data={records.filter((r) => r.status === "processed")}
                />
              </TabsContent>

              <TabsContent value="draft" className="mt-0">
                <DataTable
                  columns={columns}
                  data={records.filter((r) => r.status === "draft")}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Process Payroll Dialog */}
      <Dialog
        open={isProcessingDialogOpen}
        onOpenChange={setIsProcessingDialogOpen}
      >
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Process Payroll</DialogTitle>
            <DialogDescription>
              Generate payroll records for all employees for the current pay
              period.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Pay Period</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" defaultValue="2023-07-01" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" defaultValue="2023-07-31" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Department Filter (Optional)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Include EWA Deductions</Label>
                <Switch defaultChecked={true} />
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically deduct any outstanding EWA advances from employee
                pay
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Auto-Calculate Taxes</Label>
                <Switch defaultChecked={true} />
              </div>
              <p className="text-sm text-muted-foreground">
                Apply default tax rates to gross pay amounts
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProcessingDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Process Payroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
