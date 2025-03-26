import { useState, useEffect } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

interface PayrollDateRange {
  startDate: string;
  endDate: string;
}

export default function PayrollPage() {
  const navigate = useNavigate();
  const [payPeriod, setPayPeriod] = useState<"current" | "previous" | "custom">("current");
  const [dateRange, setDateRange] = useState<PayrollDateRange>({ startDate: "", endDate: "" });
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  
  // For the date range picker
  const [date, setDate] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  // Update date range when payPeriod changes
  useEffect(() => {
    const today = new Date();
    
    if (payPeriod === "current") {
      // Current month: 1st day of current month to last day of current month
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Update date range picker state
      setDate({
        from: startDate,
        to: endDate
      });
      
      setDateRange({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0]
      });
    } else if (payPeriod === "previous") {
      // Previous month: 1st day of previous month to last day of previous month
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      
      // Update date range picker state
      setDate({
        from: startDate,
        to: endDate
      });
      
      setDateRange({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0]
      });
    } else if (payPeriod === "custom" && date.from && date.to) {
      // Custom range - use the date range picker values
      setDateRange({
        startDate: date.from.toISOString().split("T")[0],
        endDate: date.to.toISOString().split("T")[0]
      });
    }
  }, [payPeriod, date]);

  // Fetch payroll data with date filtering
  const { data: records, isLoading, refetch } = useQuery<PayrollRecord[]>({
    queryKey: ["payroll", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      if (!dateRange.startDate || !dateRange.endDate) {
        return payrollRecords; // Initial data or fallback
      }
      
      try {
        console.log(`Fetching payroll for ${dateRange.startDate} to ${dateRange.endDate}`);
        const response = await fetch(
          `/api/payroll?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch payroll data");
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching payroll data:", error);
        return payrollRecords; // Fallback to mock data on error
      }
    },
    initialData: payrollRecords,
    enabled: Boolean(dateRange.startDate && dateRange.endDate),
    staleTime: 60000, // Data considered fresh for 1 minute
    refetchOnWindowFocus: false, // Prevent refetching when window regains focus
  });

  // Handle custom date range selection
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDate({
        from: range.from,
        to: range.to
      });
      setPayPeriod("custom");
    }
  };

  const handlePeriodChange = (period: "current" | "previous" | "custom") => {
    setPayPeriod(period);
  };

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
                <CardTitle className="text-2xl font-semibold leading-none tracking-tight">
                  Payroll Records
                </CardTitle>
                <CardDescription>
                  Manage and view payroll information for all employees
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Select value={payPeriod} onValueChange={(value) => handlePeriodChange(value as "current" | "previous" | "custom")}>
                  <SelectTrigger className="w-[180px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select period">
                      {payPeriod === "current" 
                        ? "Current Month" 
                        : payPeriod === "previous" 
                          ? "Previous Month" 
                          : "Custom Range"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Month</SelectItem>
                    <SelectItem value="previous">Previous Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Date Range Picker */}
                {payPeriod === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "LLL dd, y")} -{" "}
                              {format(date.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(date.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={handleDateRangeChange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="all">
              <div className="flex justify-between items-center mb-4 p-4 pt-0">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="processed">Processed</TabsTrigger>
                  <TabsTrigger value="draft">Draft</TabsTrigger>
                </TabsList>
                <div className="flex space-x-2">
                  <div className="relative w-60">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employee..."
                      className="pl-8"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="h-10 w-10"
                    title="Filter records"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <TabsContent value="all" className="p-4 mt-0">
                {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <p>Loading payroll data...</p>
                  </div>
                ) : (
                  <DataTable columns={columns} data={records} />
                )}
              </TabsContent>
              <TabsContent value="processed" className="p-4 mt-0">
                {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <p>Loading payroll data...</p>
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    data={records.filter(
                      (record) => record.status === "processed"
                    )}
                  />
                )}
              </TabsContent>
              <TabsContent value="draft" className="p-4 mt-0">
                {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <p>Loading payroll data...</p>
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    data={records.filter((record) => record.status === "draft")}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Processing Dialog */}
      <Dialog
        open={isProcessingDialogOpen}
        onOpenChange={setIsProcessingDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processing Payroll</DialogTitle>
            <DialogDescription>
              Calculating payroll for all eligible employees. This may take a few
              moments.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="bg-primary h-full w-1/2"></div>
            </div>
            <span className="text-sm">50%</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {}}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
