import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Filter,
  Search,
  Timer,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Attendance, Employee } from "../../../../shared/schema";
import { Loader } from "@/components/ui/loader";

// Helper functions for date/time formatting
const formatDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return "-";
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "-"; // Invalid date

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (dateString: string | Date | undefined): string => {
  if (!dateString) return "-";
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "-"; // Invalid date

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Constants
const WORK_START_HOUR = 8; // Work day starts at 8 AM

// Define the interface for department attendance data
interface DepartmentAttendance {
  department: string;
  records: Attendance[];
}

// Define the interface for time distribution data
interface TimeDistribution {
  hour: string;
  count: number;
}

// Define the interface for trend data
interface TrendData {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
}

// Define the interface for lateness stats
interface LatenessStats {
  avgLateness: string;
  maxLateness: string;
  latenessRate: number;
}

interface AttendanceDashboardProps {
  records: Attendance[];
  isLoading?: boolean;
}

export function AttendanceDashboard({
  records,
  isLoading = false,
}: AttendanceDashboardProps) {
  // State for date range and view type
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  });

  const [viewType, setViewType] = useState("daily");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter the records based on date range
  const filteredRecords = records
    .filter((record) => {
      // Check for both clockInTime and date fields
      const clockInDate = record.clockInTime
        ? new Date(record.clockInTime)
        : null;
      const recordDate = record.date ? new Date(record.date) : null;

      // Use the clockInTime if available, otherwise use the date field
      const dateToCheck = clockInDate || recordDate;

      // Skip records without a valid date
      if (!dateToCheck) return false;

      // For startDate and endDate, create new date objects to avoid mutation
      const startOfDay = startDate ? new Date(startDate) : null;
      if (startOfDay) startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = endDate ? new Date(endDate) : null;
      if (endOfDay) endOfDay.setHours(23, 59, 59, 999);

      // Apply date range filter
      if (startOfDay && endOfDay) {
        return dateToCheck >= startOfDay && dateToCheck <= endOfDay;
      } else if (startOfDay) {
        return dateToCheck >= startOfDay;
      }

      return true;
    })
    .filter((record) => {
      // Apply department filter
      if (selectedDepartment && selectedDepartment !== "all") {
        return record.employee?.department?.name === selectedDepartment;
      }
      return true;
    })
    .filter((record) => {
      // Apply search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.employee?.other_names?.toLowerCase().includes(query) ||
          record.employee?.surname?.toLowerCase().includes(query) ||
          record.status?.toLowerCase().includes(query)
        );
      }
      return true;
    });

  // Query to fetch dashboard statistics
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/statistics/dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/statistics/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard statistics");
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Data stays fresh for 30 seconds
    initialData: {
      employeeCount: { total: 0, active: 0, inactive: 0, change: "0%" },
      attendance: { rate: "0%", change: "0%" },
      payroll: { expected: "KES 0", change: "0%" },
      ewa: { total: "KES 0", pending: 0, change: "0%" },
    },
  });

  // Query to fetch attendance statistics
  const { data: attendanceStats } = useQuery({
    queryKey: ["/api/attendance/stats"],
    queryFn: async () => {
      const response = await fetch("/api/attendance/stats");
      if (!response.ok)
        throw new Error("Failed to fetch attendance statistics");
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Data stays fresh for 30 seconds
    initialData: {
      totalClockIns: 0,
      totalClockOuts: 0,
      averageClockInTime: "--:--",
      uniqueEmployees: 0,
      todayCount: 0,
      absenceCount: 0,
    },
  });

  // Use the filtered records as display records
  const displayRecords =
    filteredRecords?.sort((a, b) => {
      const dateA = new Date(a.clockInTime || "");
      const dateB = new Date(b.clockInTime || "");
      return dateA.getTime() - dateB.getTime();
    }) || [];

  // Function to calculate rate change (needs to be defined before metrics)
  function calculateRateChange(
    currentRate: number,
    previousRate: number
  ): number {
    return currentRate - previousRate;
  }

  // Calculate lateness statistics
  const latenessStats = calculateLatenessStats(displayRecords);

  // Calculate attendance percentage based on API data or local data if needed
  const attendanceRate = dashboardStats.attendance.rate
    ? parseInt(dashboardStats.attendance.rate.replace("%", ""))
    : calculateAttendanceRate(displayRecords);

  const previousRate = calculatePreviousAttendanceRate();

  // Extract rate change value from API or calculate it
  const rateChangeValue = dashboardStats.attendance.change
    ? parseFloat(dashboardStats.attendance.change.replace("%", ""))
    : calculateRateChange(attendanceRate, previousRate);

  // Calculate metrics based on the records and API data
  const metrics = {
    // Use employee count from dashboard stats API
    totalEmployees: dashboardStats.employeeCount.active,

    // Use filtered records for present/late/absent counts (more accurate for current view)
    present: displayRecords.filter((r) => r.status === "present").length,
    late: displayRecords.filter((r) => r.status === "late").length,
    absent: displayRecords.filter((r) => r.status === "absent").length,

    // Use the API's average clock-in time if available
    averageClockInTime: attendanceStats.averageClockInTime,

    // Use attendance rate from API or calculate if not available
    attendanceRate: attendanceRate,
    previousRate: previousRate,
    rateChange: rateChangeValue,

    // Keep using locally calculated lateness stats for specific view
    avgLateness: latenessStats.avgLateness,
    maxLateness: latenessStats.maxLateness,
    latenessRate: latenessStats.latenessRate,

    // Sum hours from filtered records
    totalHours: displayRecords
      .reduce((acc, record) => acc + (record.hoursWorked || 0), 0)
      .toFixed(2),

    // Add additional metrics from attendance stats API
    totalClockIns: attendanceStats.totalClockIns,
    totalClockOuts: attendanceStats.totalClockOuts,
    uniqueEmployees: attendanceStats.uniqueEmployees,
    todayCount: attendanceStats.todayCount,
    absenceCount: attendanceStats.absenceCount,
  };

  // Generate department attendance data
  const departmentData = generateDepartmentData(displayRecords);

  // Generate time distribution data
  const timeDistributionData = generateTimeDistributionData(displayRecords);

  // Generate trend data
  const trendData = generateTrendData(7); // Last 7 days

  // Define columns for the attendance table
  const columns: ColumnDef<Attendance>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const record = row.original;
        const employee = record.employee;

        return (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage
                src={employee?.avatar_url}
                alt={`${employee?.other_names} ${employee?.surname}`}
              />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {employee?.other_names} {employee?.surname}
              </p>
              <p className="text-xs text-muted-foreground">
                {employee?.department?.name}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "clockInTime",
      header: "Clock In",
      cell: ({ row }) => formatTime(row.original.clockInTime),
    },
    {
      accessorKey: "clockOutTime",
      header: "Clock Out",
      cell: ({ row }) => formatTime(row.original.clockOutTime),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ row }) => {
        const hours = row.original.hoursWorked || 0;
        return hours.toFixed(2);
      },
    },
  ];

  // Function to get status badge
  function getStatusBadge(status: string) {
    switch (status) {
      case "present":
        return (
          <Badge className="bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20">
            Present
          </Badge>
        );
      case "late":
        return (
          <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/20">
            Late
          </Badge>
        );
      case "absent":
        return (
          <Badge className="bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20">
            Absent
          </Badge>
        );
      case "left-early":
        return (
          <Badge className="bg-[#6C2BD9]/20 text-[#6C2BD9] hover:bg-[#6C2BD9]/20">
            Left Early
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  }

  // Function to calculate average check-in time
  function calculateAverageCheckInTime(records: Attendance[]): string {
    const validRecords = records.filter((r) => r.clockInTime !== null);
    if (validRecords.length === 0) return "N/A";

    const totalMinutes = validRecords.reduce((acc, record) => {
      const date = new Date(record.clockInTime || "");
      return acc + (date.getHours() * 60 + date.getMinutes());
    }, 0);

    const avgMinutes = Math.floor(totalMinutes / validRecords.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  // Function to calculate attendance rate with more detailed breakdown
  function calculateAttendanceRate(records: Attendance[]): number {
    if (records.length === 0) return 0;

    const presentCount = records.filter((r) => r.status === "present").length;
    const lateCount = records.filter((r) => r.status === "late").length;
    const absentCount = records.filter((r) => r.status === "absent").length;

    // Consider both present and late as "in attendance" but possibly weight them differently
    // Late employees are still present, just not on time
    const effectivePresent = presentCount + lateCount * 0.8; // Late counts as 80% of present

    return Math.round((effectivePresent / records.length) * 100);
  }

  // Function to calculate previous attendance rate (mock)
  function calculatePreviousAttendanceRate(): number {
    return 87; // Mock previous rate
  }

  // Function to generate department data
  function generateDepartmentData(
    records: Attendance[]
  ): DepartmentAttendance[] {
    const departments: { [key: string]: DepartmentAttendance } = {};

    // Group attendance records by department
    records.forEach((record) => {
      if (record.employee?.department?.name) {
        const departmentName = record.employee.department.name;

        if (!departments[departmentName]) {
          departments[departmentName] = {
            department: departmentName,
            records: [],
          };
        }

        departments[departmentName].records.push(record);
      }
    });

    return Object.values(departments);
  }

  // Function to generate time distribution data
  function generateTimeDistributionData(
    records: Attendance[]
  ): TimeDistribution[] {
    const hourCounts: { [key: string]: number } = {};

    // Initialize hours from 6 AM to 6 PM
    for (let i = 6; i <= 18; i++) {
      const hour = i < 10 ? `0${i}:00` : `${i}:00`;
      hourCounts[hour] = 0;
    }

    // Count check-ins by hour
    records.forEach((record) => {
      if (record.clockInTime) {
        const date = new Date(record.clockInTime);
        const hour = date.getHours();
        const formattedHour = hour < 10 ? `0${hour}:00` : `${hour}:00`;

        if (hourCounts[formattedHour] !== undefined) {
          hourCounts[formattedHour]++;
        }
      }
    });

    return Object.entries(hourCounts).map(([hour, count]) => ({ hour, count }));
  }

  // Function to generate trend data (mock data for demonstration)
  function generateTrendData(days: number): TrendData[] {
    const data: TrendData[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Generate random but realistic attendance numbers
      const total = metrics.totalEmployees;
      const present = Math.floor(total * (0.75 + Math.random() * 0.15));
      const late = Math.floor(total * (0.05 + Math.random() * 0.1));
      const absent = total - present - late;
      const rate = Math.round(((present + late) / total) * 100);

      data.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        present,
        late,
        absent,
        total,
        rate,
      });
    }

    return data;
  }

  // Function to handle export
  const handleExport = (format: "csv" | "pdf" | "excel") => {
    console.log(`Exporting in ${format} format...`);
    // Implementation would go here in a real application
  };

  // Function to calculate lateness statistics
  function calculateLatenessStats(records: Attendance[]): LatenessStats {
    const lateRecords = records.filter(
      (r) => r.status === "late" && r.clockInTime
    );

    if (lateRecords.length === 0) {
      return {
        avgLateness: "0 min",
        maxLateness: "0 min",
        latenessRate: 0,
      };
    }

    const expectedStartTime = WORK_START_HOUR * 60; // Convert to minutes
    const latenessDurations = lateRecords.map((record) => {
      const clockIn = new Date(record.clockInTime || "");
      const clockInMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
      return clockInMinutes - expectedStartTime;
    });

    const avgLateness = Math.round(
      latenessDurations.reduce((a, b) => a + b, 0) / latenessDurations.length
    );
    const maxLateness = Math.max(...latenessDurations);
    const latenessRate = Math.round(
      (lateRecords.length / records.length) * 100
    );

    return {
      avgLateness: `${avgLateness} min`,
      maxLateness: `${maxLateness} min`,
      latenessRate,
    };
  }

  // If loading, show loading skeleton
  if (isLoading) {
    return <Loader text="Loading attendance data..." />;
  }

  // Render the dashboard
  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-glass dark:shadow-glass-dark">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Present Today</p>
                <h3 className="text-2xl font-bold">{metrics.present}</h3>
                <p className="text-xs text-muted-foreground">
                  out of {metrics.totalEmployees} employees
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-glass dark:shadow-glass-dark">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-muted-foreground text-sm">On-time vs Late</p>
                <h3 className="text-2xl font-bold">
                  {metrics.present} / {metrics.late}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {Math.round(
                    (metrics.present / (metrics.present + metrics.late || 1)) *
                      100
                  )}
                  % on time
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-glass dark:shadow-glass-dark">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-muted-foreground text-sm">
                  Avg. Check-in Time
                </p>
                <h3 className="text-2xl font-bold">
                  {metrics.averageClockInTime}
                </h3>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Timer className="h-3 w-3 mr-1" />
                  <span>target: 08:30</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-glass dark:shadow-glass-dark">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Lateness Stats</p>
                <h3 className="text-2xl font-bold">
                  {metrics.averageClockInTime}
                </h3>

                <div className="flex items-center text-xs text-muted-foreground">
                  <Timer className="h-3 w-3 mr-1" />
                  <span>max: {metrics.maxLateness}</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Timer className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-glass dark:shadow-glass-dark">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Attendance Rate</p>
                <h3 className="text-2xl font-bold">
                  {metrics.attendanceRate}%
                </h3>
                <div className="flex items-center text-xs">
                  {metrics.rateChange > 0 ? (
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />+
                      {metrics.rateChange}% vs last period
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {metrics.rateChange}% vs last period
                    </span>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Card className="shadow-glass dark:shadow-glass-dark">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Attendance Dashboard</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <DatePicker
                  date={startDate}
                  setDate={setStartDate}
                  placeholder="Start date"
                />
                <span>to</span>
                <DatePicker
                  date={endDate}
                  setDate={setEndDate}
                  placeholder="End date"
                />
              </div>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={viewType} onValueChange={setViewType}>
            <TabsList className="mb-4">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-8">
              {/* Search and filter */}
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employee..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchQuery(e.target.value)
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport("csv")}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport("pdf")}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              {displayRecords.length > 0 ? (
                <DataTable columns={columns} data={displayRecords} />
              ) : (
                <div className="text-center p-8 border border-dashed rounded-md">
                  <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">
                    No attendance records found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or date range.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="weekly"
              className="p-4 text-center text-muted-foreground"
            >
              <div className="flex flex-col items-center p-8">
                <Calendar className="h-12 w-12 mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Weekly View</h3>
                <p>
                  Weekly attendance view showing aggregate data for each week.
                </p>
              </div>
            </TabsContent>

            <TabsContent
              value="monthly"
              className="p-4 text-center text-muted-foreground"
            >
              <div className="flex flex-col items-center p-8">
                <Calendar className="h-12 w-12 mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Monthly View</h3>
                <p>
                  Monthly attendance view showing aggregate data for each month.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
