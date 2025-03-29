import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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
import { formatCurrency, formatDate } from "@/lib/mock-data"; // Keep utilities but don't use mock data
import { Payroll } from '@/../../shared/schema'; // Correct import path
import { Loader } from "@/components/ui/loader";
import { toast } from "@/hooks/use-toast";

interface PayrollDateRange {
  startDate: Date;
  endDate: Date;
}

// Extended type to include properties returned by API
interface PayrollWithDetails extends Payroll {
  employeeName?: string;
  hourlyRate?: number;
}

export default function PayrollPage() {
  const navigate = useNavigate();
  const [payPeriod, setPayPeriod] = useState<"current" | "previous" | "custom">("current");
  const [dateRange, setDateRange] = useState<PayrollDateRange>({ startDate: new Date(), endDate: new Date() });
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
    console.log("Date range debug - payPeriod:", payPeriod);
    
    if (payPeriod === "current") {
      // Current month: 1st day of current month to last day of current month
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      console.log("Date range debug - current period:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Update date range picker state
      setDate({
        from: startDate,
        to: endDate
      });
      
      setDateRange({
        startDate: startDate,
        endDate: endDate
      });
    } else if (payPeriod === "previous") {
      // Previous month: 1st day of previous month to last day of previous month
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      
      console.log("Date range debug - previous period:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Update date range picker state
      setDate({
        from: startDate,
        to: endDate
      });
      
      setDateRange({
        startDate: startDate,
        endDate: endDate
      });
    } else if (payPeriod === "custom" && date.from && date.to) {
      // Custom range - use the date range picker values
      console.log("Date range debug - custom period:", {
        from: date.from.toISOString(),
        to: date.to.toISOString()
      });
      
      // Check if the selected dates are in the future and adjust if needed
      const selectedStartDate = date.from;
      const selectedEndDate = date.to;
      
      setDateRange({
        startDate: selectedStartDate,
        endDate: selectedEndDate
      });
    }
  }, [payPeriod, date]);

  // Fetch payroll data with date filtering
  const { data: records = [], isLoading, isError, error } = useQuery<PayrollWithDetails[]>({
    queryKey: ["payroll", dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    queryFn: async () => {
      console.log("Query function executing with date range:", {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      });
      
      if (!dateRange.startDate || !dateRange.endDate) {
        console.log("Date range is incomplete, returning empty array");
        return [];
      }
      
      try {
        const apiUrl = `/api/payroll?startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}`;
        console.log("Making API request to:", apiUrl);
        
        const response = await axios.get(apiUrl);
        
        console.log("API response:", {
          status: response.status,
          dataLength: response.data?.length || 0,
        });
        
        if (response.data?.length > 0) {
          console.log("First record:", response.data[0]);
        } else {
          console.log("No records returned from API");
          // Try with a wider date range as a fallback
          console.log("Trying with a wider date range as fallback...");
          const wideStartDate = new Date();
          wideStartDate.setFullYear(wideStartDate.getFullYear() - 1); // Last year
          
          const wideEndDate = new Date();
          wideEndDate.setFullYear(wideEndDate.getFullYear() + 1); // Next year
          
          const fallbackUrl = `/api/payroll?startDate=${wideStartDate.toISOString()}&endDate=${wideEndDate.toISOString()}`;
          console.log("Fallback request to:", fallbackUrl);
          
          const fallbackResponse = await axios.get(fallbackUrl);
          console.log("Fallback response:", {
            status: fallbackResponse.status,
            dataLength: fallbackResponse.data?.length || 0
          });
          
          if (fallbackResponse.data?.length > 0) {
            console.log("Using fallback data");
            return fallbackResponse.data;
          }
        }
        
        return response.data;
      } catch (error) {
        console.error("Error fetching payroll data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch payroll data. Please try again.",
          variant: "destructive"
        });
        throw error;
      }
    },
    staleTime: 60000, // Data considered fresh for 1 minute
    refetchOnWindowFocus: true, // Prevent refetching when window regains focus
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

  const columns: ColumnDef<PayrollWithDetails>[] = [
    {
      accessorKey: "employeeId",
      header: "Employee",
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={record.employee?.avatar_url} alt={record.employee?.other_names} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {record.employee 
                  ? `${record.employee.other_names} ${record.employee.surname}`
                  : record.employeeName || "Unknown Employee"}
              </p>
              <p className="text-xs text-muted-foreground">
                {record.employee?.position || ""}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "hourlyRate",
      header: "Rate",
      cell: ({ row }) => {
        const rate = row.original.employee?.hourlyRate || row.original.hourlyRate || 0;
        return formatCurrency(rate);
      }
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
      cell: ({ row }) => formatCurrency(row.original.ewaDeductions || 0),
    },
    {
      accessorKey: "taxDeductions",
      header: "Tax",
      cell: ({ row }) => formatCurrency(row.original.taxDeductions || 0),
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

  const payrollSummary = useMemo(() => ({
    totalEmployees: records.length,
    totalGrossPay: records.reduce((sum, record) => sum + Number(record.grossPay), 0),
    totalNetPay: records.reduce((sum, record) => sum + Number(record.netPay), 0),
    totalEwaDeductions: records.reduce(
      (sum, record) => sum + Number(record.ewaDeductions || 0),
      0
    ),
    totalTaxDeductions: records.reduce(
      (sum, record) => sum + Number(record.taxDeductions || 0),
      0
    ),
  }), [records]);

  // Show loading indicator
  if (isLoading) {
    return <Loader text="Loading payroll data..." />;
  }

  // Show error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] space-y-4">
        <p className="text-destructive">Failed to load payroll data</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

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
                Net Payroll
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(payrollSummary.totalNetPay)}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Deductions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  payrollSummary.totalGrossPay - payrollSummary.totalNetPay
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-glass dark:shadow-glass-dark">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <CardTitle>Payroll Records</CardTitle>
                <CardDescription>
                  View and manage employee payroll records
                </CardDescription>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <Tabs
                  value={payPeriod}
                  onValueChange={(value) =>
                    handlePeriodChange(value as "current" | "previous" | "custom")
                  }
                  className="w-full md:w-auto"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="current">Current</TabsTrigger>
                    <TabsTrigger value="previous">Previous</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex-shrink-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal md:w-[300px]",
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
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={{
                          from: date?.from,
                          to: date?.to,
                        }}
                        onSelect={handleDateRangeChange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={records}
              searchColumn="employeeName"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
