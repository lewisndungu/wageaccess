import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
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
  SelectValue 
} from "@/components/ui/select";
import {
  Chart,
  AreaChart,
  BarChart,
  PieChart,
  ChartArea,
  ChartBar,
  ChartPie,
  ChartCell,
  ChartTooltip,
  ChartXAxis,
  ChartYAxis,
  ChartLegend,
  CartesianGrid,
  ResponsiveContainer,
} from "@/components/ui/chart";
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
  Users
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

// Helper functions for date/time formatting
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatTime = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Constants
const WORK_START_HOUR = 8; // Work day starts at 8 AM

// Define the interface for attendance records
interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  status: string;
  hoursWorked: string;
}

// Define the interface for department attendance data
interface DepartmentAttendance {
  name: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
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
  records: AttendanceRecord[];
  employees: {
    id: number;
    name: string;
    department: string;
    position: string;
    profileImage?: string;
  }[];
}

export function AttendanceDashboard({ records, employees }: AttendanceDashboardProps) {
  // State for date range and view type
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [viewType, setViewType] = useState("daily");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Query to fetch attendance records
  const { data: recordsData, isLoading: isLoadingRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance', startDate, endDate, viewType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('date', startDate.toISOString());
      const response = await fetch(`/api/attendance?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch attendance records');
      const data = await response.json();
      
      // Enhance attendance records with employee data if needed
      return data.map((record: any) => {
        // If record already has employeeName and department, use those
        if (record.employeeName && record.department) {
          return record;
        }
        
        // Otherwise, find the employee from the list and add their details
        const employee = employees.find(emp => emp.id === record.employeeId);
        return {
          ...record,
          employeeName: employee?.name || 'Unknown Employee',
          department: employee?.department || 'Unknown Department'
        };
      });
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Data stays fresh for 5 seconds
    placeholderData: records.length > 0 ? records : [], // Use props data as placeholder if available
    enabled: !!employees.length // Only run query when employees are available
  });
  
  // Query to fetch employee list  
  const { data: employeeList, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['/api/employees/active'],
    queryFn: async () => {
      const response = await fetch('/api/employees/active');
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Data stays fresh for 15 seconds
    placeholderData: employees // Use props data as placeholder
  });

  // Query to fetch recent attendance events
  const { data: recentEvents } = useQuery({
    queryKey: ['/api/attendance/recent-events'],
    queryFn: async () => {
      const response = await fetch('/api/attendance/recent-events');
      if (!response.ok) throw new Error('Failed to fetch recent events');
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000, // Data stays fresh for 2 seconds
    initialData: []
  });

  // Query to fetch dashboard statistics
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/statistics/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/statistics/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard statistics');
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Data stays fresh for 30 seconds
    initialData: {
      employeeCount: { total: 0, active: 0, inactive: 0, change: "0%" },
      attendance: { rate: "0%", change: "0%" },
      payroll: { expected: "KES 0", change: "0%" },
      ewa: { total: "KES 0", pending: 0, change: "0%" }
    }
  });

  // Use provided records data during initial load
  const displayRecords = (isLoadingRecords && records.length > 0 ? records : recordsData) || [];
  
  // Fallback to the passed employees prop if query hasn't loaded yet
  const employeesData = employeeList && employeeList.length > 0 ? employeeList : (employees || []);

  // Map employee data to a format that works with the component
  const mappedEmployees = employeesData.map((emp: any) => {
    // Handle different employee data structures
    return {
      id: emp.id,
      name: emp.user?.name || emp.name || 'Unknown',
      department: typeof emp.department === 'object' ? emp.department.name : (emp.department || 'Unknown'),
      position: emp.position || 'Unknown',
      profileImage: emp.user?.profileImage || emp.profileImage || null
    };
  });

  // Function to calculate rate change (needs to be defined before metrics)
  function calculateRateChange(currentRate: number, previousRate: number): number {
    return currentRate - previousRate;
  }
  
  // Calculate lateness statistics
  const latenessStats = calculateLatenessStats(displayRecords);
  
  // Calculate attendance percentage
  const attendancePercentage = calculateAttendanceRate(displayRecords);
  const previousRate = calculatePreviousAttendanceRate();
  
  // Calculate metrics based on the records
  const metrics = {
    totalEmployees: dashboardStats.employeeCount.active,
    present: displayRecords.filter(r => r.status === 'present').length,
    late: displayRecords.filter(r => r.status === 'late').length,
    absent: displayRecords.filter(r => r.status === 'absent').length,
    avgCheckIn: calculateAverageCheckInTime(displayRecords),
    attendanceRate: parseInt(dashboardStats.attendance.rate),
    previousRate: calculatePreviousAttendanceRate(),
    rateChange: parseFloat(dashboardStats.attendance.change),
    avgLateness: latenessStats.avgLateness,
    maxLateness: latenessStats.maxLateness,
    latenessRate: latenessStats.latenessRate,
    totalHours: displayRecords.reduce((acc, record) => acc + parseFloat(record.hoursWorked || "0"), 0).toFixed(2)
  };

  // Generate department attendance data
  const departmentData = generateDepartmentData(displayRecords, employeesData);
  
  // Generate time distribution data
  const timeDistributionData = generateTimeDistributionData(displayRecords);
  
  // Generate trend data
  const trendData = generateTrendData(7); // Last 7 days

  // Filter records based on search query and department
  const filteredRecords = displayRecords.filter(record => {
    const matchesSearch = searchQuery === "" || 
      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employeeId.toString().includes(searchQuery);
    
    const matchesDepartment = selectedDepartment === "all" || 
      record.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  // Define columns for the attendance table
  const columns: ColumnDef<AttendanceRecord>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const record = row.original;
        const employee = mappedEmployees.find((e: { id: number; }) => e.id === record.employeeId);
          
        return (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={employee?.profileImage} alt={record.employeeName} />
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
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "clockInTime",
      header: "Clock In",
      cell: ({ row }) => formatTime(row.original.clockInTime || ""),
    },
    {
      accessorKey: "clockOutTime",
      header: "Clock Out",
      cell: ({ row }) => formatTime(row.original.clockOutTime || ""),
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
        const hours = parseFloat(row.original.hoursWorked || "0");
        return hours.toFixed(2);
      },
    },
  ];

  // Function to get status badge
  function getStatusBadge(status: string) {
    switch (status) {
      case "present":
        return <Badge className="bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20">Present</Badge>;
      case "late":
        return <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/20">Late</Badge>;
      case "absent":
        return <Badge className="bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20">Absent</Badge>;
      case "left-early":
        return <Badge className="bg-[#6C2BD9]/20 text-[#6C2BD9] hover:bg-[#6C2BD9]/20">Left Early</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  // Function to calculate average check-in time
  function calculateAverageCheckInTime(records: AttendanceRecord[]): string {
    const validRecords = records.filter(r => r.clockInTime !== null);
    if (validRecords.length === 0) return "N/A";

    const totalMinutes = validRecords.reduce((acc, record) => {
      const date = new Date(record.clockInTime as string);
      return acc + (date.getHours() * 60 + date.getMinutes());
    }, 0);

    const avgMinutes = Math.floor(totalMinutes / validRecords.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Function to calculate attendance rate with more detailed breakdown
  function calculateAttendanceRate(records: AttendanceRecord[]): number {
    if (records.length === 0) return 0;
    
    const presentCount = records.filter(r => r.status === 'present').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    
    // Consider both present and late as "in attendance" but possibly weight them differently
    // Late employees are still present, just not on time
    const effectivePresent = presentCount + (lateCount * 0.8); // Late counts as 80% of present
    
    return Math.round((effectivePresent / records.length) * 100);
  }

  // Function to calculate previous attendance rate (mock)
  function calculatePreviousAttendanceRate(): number {
    return 87; // Mock previous rate
  }

  // Function to generate department data
  function generateDepartmentData(records: AttendanceRecord[], employees: any[]): DepartmentAttendance[] {
    const departments: { [key: string]: DepartmentAttendance } = {};
    
    if (!employees || employees.length === 0) {
      return [];
    }
    
    // Group employees by department first
    employees.forEach(emp => {
      let departmentName = typeof emp.department === 'object' ? emp.department.name : emp.department;
      if (!departmentName) return; // Skip employees without department
      
      if (!departments[departmentName]) {
        departments[departmentName] = {
          name: departmentName,
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
          percentage: 0
        };
      }
      departments[departmentName].total++;
    });
    
    // Count attendance status by department
    records.forEach(record => {
      if (record.department && departments[record.department]) {
        if (record.status === 'present') {
          departments[record.department].present++;
        } else if (record.status === 'late') {
          departments[record.department].late++;
        } else if (record.status === 'absent') {
          departments[record.department].absent++;
        }
      }
    });
    
    // Calculate percentages
    Object.keys(departments).forEach(dept => {
      const { present, late, total } = departments[dept];
      departments[dept].percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    });
    
    return Object.values(departments);
  }

  // Function to generate time distribution data
  function generateTimeDistributionData(records: AttendanceRecord[]): TimeDistribution[] {
    const hourCounts: { [key: string]: number } = {};
    
    // Initialize hours from 6 AM to 6 PM
    for (let i = 6; i <= 18; i++) {
      const hour = i < 10 ? `0${i}:00` : `${i}:00`;
      hourCounts[hour] = 0;
    }
    
    // Count check-ins by hour
    records.forEach(record => {
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
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present,
        late,
        absent,
        total,
        rate
      });
    }
    
    return data;
  }

  // Function to handle export
  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log(`Exporting in ${format} format...`);
    // Implementation would go here in a real application
  };

  // Function to calculate lateness statistics
  function calculateLatenessStats(records: AttendanceRecord[]): LatenessStats {
    const lateRecords = records.filter(r => r.status === 'late' && r.clockInTime);
    
    if (lateRecords.length === 0) {
      return {
        avgLateness: '0 min',
        maxLateness: '0 min',
        latenessRate: 0
      };
    }

    const expectedStartTime = WORK_START_HOUR * 60; // Convert to minutes
    const latenessDurations = lateRecords.map(record => {
      const clockIn = new Date(record.clockInTime as string);
      const clockInMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
      return clockInMinutes - expectedStartTime;
    });

    const avgLateness = Math.round(latenessDurations.reduce((a, b) => a + b, 0) / latenessDurations.length);
    const maxLateness = Math.max(...latenessDurations);
    const latenessRate = Math.round((lateRecords.length / records.length) * 100);

    return {
      avgLateness: `${avgLateness} min`,
      maxLateness: `${maxLateness} min`,
      latenessRate
    };
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
                <p className="text-xs text-muted-foreground">out of {metrics.totalEmployees} employees</p>
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
                <h3 className="text-2xl font-bold">{metrics.present} / {metrics.late}</h3>
                <p className="text-xs text-muted-foreground">{Math.round((metrics.present / (metrics.present + metrics.late || 1)) * 100)}% on time</p>
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
                <p className="text-muted-foreground text-sm">Avg. Check-in Time</p>
                <h3 className="text-2xl font-bold">{metrics.avgCheckIn}</h3>
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
                <h3 className="text-2xl font-bold">{metrics.avgLateness}</h3>
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
                <h3 className="text-2xl font-bold">{metrics.attendanceRate}%</h3>
                <div className="flex items-center text-xs">
                  {metrics.rateChange > 0 ? (
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{metrics.rateChange}% vs last period
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
                <DatePicker date={startDate} setDate={setStartDate} placeholder="Start date" />
                <span>to</span>
                <DatePicker date={endDate} setDate={setEndDate} placeholder="End date" />
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departmentData.map((dept) => (
                        <SelectItem key={dept.name} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                      <FileText className="h-4 w-4 mr-1" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                      <FileText className="h-4 w-4 mr-1" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Data Table */}
              <DataTable columns={columns} data={filteredRecords} />
              
              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Department Attendance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Department Attendance</CardTitle>
                    <CardDescription>Attendance rates by department</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <Chart
                        config={{
                          present: {
                            label: "Present",
                            color: "#10B981"
                          },
                          late: {
                            label: "Late",
                            color: "#F59E0B"
                          },
                          absent: {
                            label: "Absent", 
                            color: "#EF4444"
                          }
                        }}
                      >
                        <BarChart
                          data={departmentData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <ChartXAxis dataKey="name" />
                          <ChartYAxis />
                          <ChartTooltip />
                          <ChartLegend />
                          <ChartBar dataKey="present" fill="#10B981" name="Present" />
                          <ChartBar dataKey="late" fill="#F59E0B" name="Late" />
                          <ChartBar dataKey="absent" fill="#EF4444" name="Absent" />
                        </BarChart>
                      </Chart>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Attendance Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Attendance Trend</CardTitle>
                    <CardDescription>Attendance rate over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <Chart
                        config={{
                          rate: {
                            label: "Attendance Rate (%)",
                            color: "#3B82F6"
                          }
                        }}
                      >
                        <AreaChart
                          data={trendData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <ChartXAxis dataKey="date" />
                          <ChartYAxis />
                          <ChartTooltip />
                          <ChartLegend />
                          <ChartArea
                            type="monotone"
                            dataKey="rate"
                            stroke="#3B82F6"
                            fill="#3B82F6"
                            fillOpacity={0.2}
                            name="Attendance Rate (%)"
                          />
                        </AreaChart>
                      </Chart>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Check-in Hours Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Peak Check-in Hours</CardTitle>
                    <CardDescription>Distribution of check-in times</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <Chart
                        config={{
                          count: {
                            label: "Check-ins",
                            color: "#3B82F6"
                          }
                        }}
                      >
                        <BarChart
                          data={timeDistributionData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <ChartXAxis dataKey="hour" />
                          <ChartYAxis />
                          <ChartTooltip />
                          <ChartLegend />
                          <ChartBar dataKey="count" fill="#3B82F6" name="Check-ins" />
                        </BarChart>
                      </Chart>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Status Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Attendance Status</CardTitle>
                    <CardDescription>Distribution of attendance statuses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 flex items-center justify-center">
                      <Chart
                        config={{
                          present: {
                            label: "Present",
                            color: "#10B981"
                          },
                          late: {
                            label: "Late",
                            color: "#F59E0B"
                          },
                          absent: {
                            label: "Absent", 
                            color: "#EF4444"
                          }
                        }}
                      >
                        <PieChart>
                          <ChartPie
                            data={[
                              { name: 'Present', value: metrics.present, key: "present" },
                              { name: 'Late', value: metrics.late, key: "late" },
                              { name: 'Absent', value: metrics.absent, key: "absent" },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }: {name: string, percent: number}) => 
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          />
                          <ChartTooltip />
                          <ChartLegend />
                        </PieChart>
                      </Chart>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="p-4 text-center text-muted-foreground">
              <div className="flex flex-col items-center p-8">
                <Calendar className="h-12 w-12 mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Weekly View</h3>
                <p>Weekly attendance view showing aggregate data for each week.</p>
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="p-4 text-center text-muted-foreground">
              <div className="flex flex-col items-center p-8">
                <Calendar className="h-12 w-12 mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Monthly View</h3>
                <p>Monthly attendance view showing aggregate data for each month.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}