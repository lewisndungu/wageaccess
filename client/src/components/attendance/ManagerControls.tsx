import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Coffee,
  Edit,
  Eye,
  FileText,
  Filter,
  HistoryIcon,
  Info,
  Pencil,
  Search,
  Timer,
  User,
  Users,
  XCircle
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/hooks/use-toast";
import { formatDate } from '@/lib/date-utils';
import { formatTime } from '@/lib/date-utils';

interface Employee {
  id: number;
  employeeNumber: string;
  name: string;
  department: string;
  position: string;
  contact: string;
  email: string;
  status: string;
  profileImage?: string;
}

interface Department {
  id: number;
  name: string;
}

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

interface AttendanceCorrection {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  type: 'clock_in' | 'clock_out';
  originalTime: string | null;
  correctedTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  requestedAt: string;
}

export function ManagerControls() {
  // State for various operations
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>("present");
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [manualReason, setManualReason] = useState<string>("");
  const [bulkReason, setBulkReason] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState('');
  const [showCurrentlyCheckedIn, setShowCurrentlyCheckedIn] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("manual");
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<number | null>(null);
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<number | null>(null);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  
  // Form states for manual entry
  const [manualEmployee, setManualEmployee] = useState<string>("");
  const [manualClockIn, setManualClockIn] = useState<string>("");
  const [manualClockOut, setManualClockOut] = useState<string>("");
  
  // Form states for correction
  const [newClockIn, setNewClockIn] = useState<string>("");
  const [newClockOut, setNewClockOut] = useState<string>("");
  const [correctionReason, setCorrectionReason] = useState('');
  
  // Filter states for shift tracker
  const [shiftDepartmentFilter, setShiftDepartmentFilter] = useState('all');
  const [isLoadingSubmit, setIsLoadingSubmit] = useState<boolean>(false);

  // Query to fetch employees
  const { data: employeeList = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees/active'],
  });

  // Query to fetch departments
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });
  
  // Query to fetch attendance records
  const { data: rawRecords = [], isLoading: isLoadingRecords } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance', selectedDate],
  });
  
  // Enhanced records with employee data
  const records = rawRecords.map(record => {
    // If record already has employeeName and department, use those
    if (record.employeeName && record.department) {
      return record;
    }
    
    // Otherwise, find the employee from the list and add their details
    const employee = employeeList.find(emp => emp.id === record.employeeId);
    return {
      ...record,
      employeeName: employee?.name || 'Unknown Employee',
      department: employee?.department || 'Unknown Department'
    };
  });
  
  // Query to fetch attendance corrections
  const { data: corrections = [] } = useQuery<AttendanceCorrection[]>({
    queryKey: ['/api/attendance/corrections'],
  });
  
  // Query to fetch currently checked in employees
  const { data: checkedInEmployees = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/checked-in'],
    refetchInterval: showCurrentlyCheckedIn ? 30000 : false,
  });

  // Filter employees based on department and search
  const filteredEmployees = employeeList.filter(employee => {
    const matchesDepartment = !selectedDepartment || employee.department === selectedDepartment;
    const matchesSearch = !searchQuery || 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employeeNumber.includes(searchQuery);
    return matchesDepartment && matchesSearch;
  });
  
  // Filter checked-in employees based on department filter
  const filteredCheckedIn = checkedInEmployees.filter(record => {
    return shiftDepartmentFilter === "all" || record.department === shiftDepartmentFilter;
  });
  
  // Filter recent attendance records for correction view
  const recentAttendanceRecords = records.filter(record => {
    return !searchQuery || 
      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employeeId.toString() === searchQuery;
  });

  // Function to extract unique departments from employees
  function extractDepartments(employees: Employee[]): Department[] {
    const uniqueDepartments = new Set<string>();
    employees.forEach(emp => uniqueDepartments.add(emp.department));
    
    return Array.from(uniqueDepartments).map((name, index) => ({
      id: index + 1,
      name
    }));
  }

  // Function to handle toggling employee selection in bulk mode
  const handleSelectEmployee = (employeeId: number) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  // Function to handle selecting all employees in bulk mode
  const handleSelectAllEmployees = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    }
  };

  // Function to handle manual attendance submission
  const handleManualSubmit = async () => {
    if (!manualEmployee || !selectedDate || !selectedStatus || !manualReason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoadingSubmit(true);
    
    try {
      // In a real implementation, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Attendance Recorded",
        description: "Manual attendance entry has been saved successfully.",
      });
      
      // Reset form
      setManualEmployee("");
      setManualClockIn("");
      setManualClockOut("");
      setManualReason("");
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record attendance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  // Function to handle bulk attendance submission
  const handleBulkSubmit = async () => {
    if (selectedEmployees.length === 0 || !selectedDate || !selectedStatus || !bulkReason) {
      toast({
        title: "Missing Information",
        description: "Please select employees and fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoadingSubmit(true);
    
    try {
      // In a real implementation, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Bulk Attendance Recorded",
        description: `Attendance recorded for ${selectedEmployees.length} employees.`,
      });
      
      // Reset form
      setSelectedEmployees([]);
      setBulkReason("");
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record bulk attendance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  // Function to handle attendance correction submission
  const handleCorrectionSubmit = async () => {
    if (!editRecord || !correctionReason) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for the correction",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoadingSubmit(true);
    
    try {
      // In a real implementation, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      toast({
        title: "Correction Submitted",
        description: "Attendance correction has been submitted for approval.",
      });
      
      // Reset form
      setEditRecord(null);
      setNewClockIn("");
      setNewClockOut("");
      setCorrectionReason("");
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit correction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  // Function to handle correction approval/rejection
  const handleCorrectionAction = async (correctionId: number, action: 'approve' | 'reject') => {
    try {
      // In a real implementation, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast({
        title: action === 'approve' ? "Correction Approved" : "Correction Rejected",
        description: `The attendance correction has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      });
      
      // Reset selected correction
      setSelectedCorrectionId(null);
      
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} correction. Please try again.`,
        variant: "destructive"
      });
    }
  };

  // Column definition for the employee selection table in bulk mode
  const bulkEmployeeColumns: ColumnDef<Employee>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={selectedEmployees.length === filteredEmployees.length}
          onCheckedChange={handleSelectAllEmployees}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedEmployees.includes(row.original.id)}
          onCheckedChange={() => handleSelectEmployee(row.original.id)}
          aria-label="Select row"
        />
      ),
    },
    {
      accessorKey: "employeeNumber",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "Employee",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={employee.profileImage} alt={employee.name} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{employee.name}</p>
              <p className="text-xs text-muted-foreground">{employee.position}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "department",
      header: "Department",
    }
  ];

  // Column definition for the attendance records table in correction mode
  const attendanceRecordColumns: ColumnDef<AttendanceRecord>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const record = row.original;
        const employee = employeeList.find(e => e.id === record.employeeId);
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
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => setEditRecord(row.original)}
          >
            <span className="sr-only">Edit record</span>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => setSelectedAttendanceId(row.original.id)}
          >
            <span className="sr-only">View details</span>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Column definition for the correction history table
  const correctionColumns: ColumnDef<AttendanceCorrection>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const correction = row.original;
        const employee = employeeList.find(e => e.id === correction.employeeId);
        return (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={employee?.profileImage} alt={correction.employeeName} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{correction.employeeName}</p>
              <p className="text-xs text-muted-foreground">{formatDate(correction.date)}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "originalClockIn",
      header: "Original In",
      cell: ({ row }) => formatTime(row.original.originalTime || ""),
    },
    {
      accessorKey: "correctedTime",
      header: "Corrected Time",
      cell: ({ row }) => formatTime(row.original.correctedTime || ""),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => {
        const reason = row.original.reason;
        return reason.length > 30 ? reason.substring(0, 30) + "..." : reason;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getCorrectionStatusBadge(row.original.status),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => setSelectedCorrectionId(row.original.id)}
            disabled={row.original.status !== 'pending'}
          >
            <span className="sr-only">Review</span>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Function to get status badge for attendance records
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

  // Function to get status badge for correction records
  function getCorrectionStatusBadge(status: 'pending' | 'approved' | 'rejected') {
    switch (status) {
      case "pending":
        return <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] hover:bg-[#3B82F6]/20">Pending</Badge>;
      case "approved":
        return <Badge className="bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  // Function to calculate expected check-out time
  function calculateExpectedCheckout(clockInTime: string | null): string {
    if (!clockInTime) return "N/A";
    
    const checkIn = new Date(clockInTime);
    const checkOut = new Date(checkIn);
    checkOut.setHours(checkOut.getHours() + 8); // Assuming 8-hour workday
    
    return checkOut.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Function to calculate elapsed time since check-in
  function calculateElapsedTime(clockInTime: string | null): string {
    if (!clockInTime) return "N/A";
    
    const checkIn = new Date(clockInTime);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    
    return `${diffHrs}h ${diffMins}m`;
  }

  // Render the component
  return (
    <div className="space-y-6">
      <Card className="shadow-glass dark:shadow-glass-dark">
        <CardHeader>
          <CardTitle>Attendance Management Controls</CardTitle>
          <CardDescription>Manage employee attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="manual" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Bulk Actions
              </TabsTrigger>
              <TabsTrigger value="correction" className="flex items-center">
                <Edit className="mr-2 h-4 w-4" />
                Corrections
              </TabsTrigger>
              <TabsTrigger value="tracker" className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Shift Tracker
              </TabsTrigger>
            </TabsList>
            
            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Employee</Label>
                    <Select value={manualEmployee} onValueChange={setManualEmployee}>
                      <SelectTrigger id="employee">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employeeList.map(emp => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <div className="flex">
                      <DatePicker 
                        date={selectedDate} 
                        setDate={(date) => date && setSelectedDate(date)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clockIn">Clock In Time</Label>
                      <Input
                        id="clockIn"
                        type="time"
                        value={manualClockIn}
                        onChange={(e) => setManualClockIn(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="clockOut">Clock Out Time</Label>
                      <Input
                        id="clockOut"
                        type="time"
                        value={manualClockOut}
                        onChange={(e) => setManualClockOut(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Attendance Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="left-early">Left Early</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Manual Entry</Label>
                    <Textarea
                      id="reason"
                      placeholder="Provide a reason for this manual entry..."
                      value={manualReason}
                      onChange={(e) => setManualReason(e.target.value)}
                      className="h-[120px]"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleManualSubmit} disabled={isLoadingSubmit}>
                  {isLoadingSubmit ? "Submitting..." : "Submit Entry"}
                </Button>
              </div>
            </TabsContent>
            
            {/* Bulk Actions Tab */}
            <TabsContent value="bulk" className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-2">
                <div className="flex flex-col md:flex-row gap-4">
                  <div>
                    <Label htmlFor="bulk-department" className="mb-2 block">Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger id="bulk-department" className="w-[180px]">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="bulk-date" className="mb-2 block">Date</Label>
                    <DatePicker 
                      date={selectedDate} 
                      setDate={(date) => date && setSelectedDate(date)}
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <Label htmlFor="search-employees" className="mb-2 block">Search Employees</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search-employees"
                      placeholder="Search by name or ID..."
                      className="pl-8 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg">Select Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable 
                    columns={bulkEmployeeColumns} 
                    data={filteredEmployees} 
                  />
                </CardContent>
                <CardFooter className="flex justify-between py-4">
                  <div className="text-sm text-muted-foreground">
                    {selectedEmployees.length} employees selected
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAllEmployees}
                  >
                    {selectedEmployees.length === filteredEmployees.length ? "Deselect All" : "Select All"}
                  </Button>
                </CardFooter>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-status">Set Status For Selected Employees</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger id="bulk-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="left-early">Left Early</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-reason">Reason for Bulk Update</Label>
                    <Textarea
                      id="bulk-reason"
                      placeholder="Provide a reason for this bulk update..."
                      value={bulkReason}
                      onChange={(e) => setBulkReason(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full mt-4" disabled={selectedEmployees.length === 0 || isLoadingSubmit}>
                    {isLoadingSubmit ? "Processing..." : "Apply to Selected Employees"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Attendance Update</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to update attendance for {selectedEmployees.length} employees.
                      This action will mark all selected employees as "{selectedStatus}" for {selectedDate?.toLocaleDateString()}.
                      Are you sure you want to continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkSubmit}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>
            
            {/* Correction Tab */}
            <TabsContent value="correction" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle>Recent Attendance Records</CardTitle>
                        <div className="relative w-64">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search employee..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      <CardDescription>
                        Select a record to make corrections
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataTable 
                        columns={attendanceRecordColumns} 
                        data={recentAttendanceRecords} 
                      />
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Correction History</CardTitle>
                      <CardDescription>
                        Track changes to attendance records
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto">
                      <div className="space-y-4">
                        {corrections.map((correction) => (
                          <div
                            key={correction.id}
                            className={`p-3 rounded-lg border ${
                              correction.status === 'pending' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900' :
                              correction.status === 'approved' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' :
                              'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center">
                                  <Avatar className="h-7 w-7 mr-2">
                                    <AvatarFallback>
                                      {correction.employeeName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <p className="font-medium text-sm">{correction.employeeName}</p>
                                </div>
                                <p className="text-xs mt-1 text-muted-foreground">
                                  {formatDate(correction.date)}
                                </p>
                                <div className="mt-1.5 text-xs">
                                  <p>
                                    <span className="font-semibold">From: </span>
                                    {formatTime(correction.originalTime || "")}
                                  </p>
                                  <p>
                                    <span className="font-semibold">To: </span>
                                    {formatTime(correction.correctedTime || "")}
                                  </p>
                                </div>
                                <p className="mt-1.5 text-xs italic">"{correction.reason}"</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  correction.status === 'pending' ? 'text-blue-600 bg-blue-50' :
                                  correction.status === 'approved' ? 'text-green-600 bg-green-50' :
                                  'text-red-600 bg-red-50'
                                }
                              >
                                {correction.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        View All Changes
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
              
              {/* Edit Attendance Dialog */}
              <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Attendance Record</DialogTitle>
                    <DialogDescription>
                      Make corrections to the attendance record. Changes will be logged for audit purposes.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {editRecord && (
                    <div className="space-y-4 py-4">
                      <div className="flex items-center mb-4">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback>
                            {editRecord.employeeName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{editRecord.employeeName}</h4>
                          <p className="text-sm text-muted-foreground">{formatDate(editRecord.date)}</p>
                        </div>
                        {getStatusBadge(editRecord.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="original-in">Original Clock In</Label>
                          <Input
                            id="original-in"
                            value={formatTime(editRecord.clockInTime || "")}
                            disabled
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="original-out">Original Clock Out</Label>
                          <Input
                            id="original-out"
                            value={formatTime(editRecord.clockOutTime || "")}
                            disabled
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="new-in">New Clock In</Label>
                          <Input
                            id="new-in"
                            type="time"
                            value={newClockIn || formatTime(editRecord.clockInTime || "")}
                            onChange={(e) => setNewClockIn(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="new-out">New Clock Out</Label>
                          <Input
                            id="new-out"
                            type="time"
                            value={newClockOut || formatTime(editRecord.clockOutTime || "")}
                            onChange={(e) => setNewClockOut(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="correction-reason">Reason for Correction</Label>
                        <Textarea
                          id="correction-reason"
                          placeholder="Explain why this correction is needed..."
                          value={correctionReason}
                          onChange={(e) => setCorrectionReason(e.target.value)}
                          className="h-[100px]"
                        />
                      </div>
                    </div>
                  )}
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditRecord(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCorrectionSubmit} disabled={isLoadingSubmit}>
                      {isLoadingSubmit ? "Submitting..." : "Submit Correction"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Record Detail Dialog */}
              <Dialog open={!!selectedAttendanceId} onOpenChange={(open) => !open && setSelectedAttendanceId(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Attendance Record Details</DialogTitle>
                    <DialogDescription>
                      Detailed information about this attendance record
                    </DialogDescription>
                  </DialogHeader>
                  
                  {selectedAttendanceId && (() => {
                    const record = records.find(r => r.id === selectedAttendanceId);
                    if (!record) return null;
                    
                    return (
                      <div className="py-4">
                        <div className="flex items-center mb-6">
                          <Avatar className="h-12 w-12 mr-4">
                            <AvatarImage 
                              src={employeeList.find(e => e.id === record.employeeId)?.profileImage} 
                              alt={record.employeeName} 
                            />
                            <AvatarFallback>
                              {record.employeeName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg">{record.employeeName}</h3>
                            <p className="text-sm text-muted-foreground">{record.department}</p>
                          </div>
                          <div className="ml-auto">
                            {getStatusBadge(record.status)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 border-t border-b py-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Date</p>
                            <p className="font-medium">{formatDate(record.date)}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Hours Worked</p>
                            <p className="font-medium">{Number(record.hoursWorked).toFixed(2)} hours</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Clock In</p>
                            <p className="font-medium">{formatTime(record.clockInTime || "")}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Clock Out</p>
                            <p className="font-medium">{formatTime(record.clockOutTime || "")}</p>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground mb-1">History</p>
                          <div className="bg-muted p-3 rounded-md text-sm">
                            <p className="mb-1">
                              <span className="font-medium">Created: </span>
                              Same day at 5:30 PM
                            </p>
                            <p>
                              <span className="font-medium">Last Modified: </span>
                              None
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>
              
              {/* Correction Approval Dialog */}
              <AlertDialog 
                open={!!selectedCorrectionId} 
                onOpenChange={(open) => !open && setSelectedCorrectionId(null)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Review Attendance Correction</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please review the attendance correction request and approve or reject it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  {selectedCorrectionId && (() => {
                    const correction = corrections.find(c => c.id === selectedCorrectionId);
                    if (!correction) return null;
                    
                    return (
                      <div className="py-2">
                        <div className="mb-4">
                          <p className="text-sm font-medium">{correction.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(correction.date)}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-xs font-medium mb-1">Original Time</p>
                            <p className="text-sm">In: {formatTime(correction.originalTime || "")}</p>
                            <p className="text-sm">Out: {formatTime(correction.correctedTime || "")}</p>
                          </div>
                          
                          <div className="bg-primary/5 border border-primary/20 p-3 rounded-md">
                            <p className="text-xs font-medium mb-1">Requested Change</p>
                            <p className="text-sm">In: {formatTime(correction.correctedTime || "")}</p>
                            <p className="text-sm">Out: {formatTime(correction.correctedTime || "")}</p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-xs font-medium mb-1">Reason</p>
                          <div className="bg-muted p-3 rounded-md text-sm">
                            {correction.reason}
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          <p>Requested by: {correction.requestedBy}</p>
                          <p>Requested on: {new Date(correction.requestedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                    <Button 
                      variant="destructive"
                      onClick={() => selectedCorrectionId && handleCorrectionAction(selectedCorrectionId, 'reject')}
                    >
                      Reject
                    </Button>
                    <Button 
                      variant="default"
                      onClick={() => selectedCorrectionId && handleCorrectionAction(selectedCorrectionId, 'approve')}
                    >
                      Approve
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>
            
            {/* Shift Tracker Tab */}
            <TabsContent value="tracker" className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Currently Checked In Employees</Label>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold">{filteredCheckedIn.length}</p>
                    <p className="text-muted-foreground ml-2 text-sm">employees on shift</p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div>
                    <Label htmlFor="department-filter" className="mb-2 block">Department</Label>
                    <Select value={shiftDepartmentFilter} onValueChange={setShiftDepartmentFilter}>
                      <SelectTrigger id="department-filter" className="w-[180px]">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="self-end">
                    <Button variant="outline" className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Send Alert
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredCheckedIn.length > 0 ? (
                  filteredCheckedIn.map((record) => {
                    const employee = employeeList.find(e => e.id === record.employeeId);
                    
                    return (
                      <Card key={record.id} className={`
                        shadow-glass dark:shadow-glass-dark
                        ${calculateElapsedTime(record.clockInTime).split('h')[0] >= '8' ? 'border-green-200 dark:border-green-900' : ''}
                      `}>
                        <CardContent className="pt-6">
                          <div className="flex items-start">
                            <Avatar className="h-12 w-12 mr-3">
                              <AvatarImage src={employee?.profileImage} alt={record.employeeName} />
                              <AvatarFallback>
                                {record.employeeName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h3 className="font-medium text-base">{record.employeeName}</h3>
                                <Badge variant="outline" className="ml-auto">
                                  {record.department}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{employee?.position}</p>
                              
                              <div className="mt-4 grid grid-cols-2 gap-2">
                                <div className="bg-muted rounded-lg p-2">
                                  <p className="text-xs text-muted-foreground">Clock In</p>
                                  <p className="font-medium">{formatTime(record.clockInTime || "")}</p>
                                </div>
                                
                                <div className="bg-muted rounded-lg p-2">
                                  <p className="text-xs text-muted-foreground">Expected Out</p>
                                  <p className="font-medium">{calculateExpectedCheckout(record.clockInTime)}</p>
                                </div>
                                
                                <div className="bg-muted rounded-lg p-2">
                                  <p className="text-xs text-muted-foreground">Time Elapsed</p>
                                  <p className="font-medium">{calculateElapsedTime(record.clockInTime)}</p>
                                </div>
                                
                                <div className="bg-muted rounded-lg p-2">
                                  <p className="text-xs text-muted-foreground">Break Status</p>
                                  <div className="flex items-center">
                                    <Coffee className="h-3 w-3 mr-1" />
                                    <p className="font-medium">None</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-4 flex justify-between">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      Clock Out
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Manual Clock Out</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        You are about to manually clock out {record.employeeName}.
                                        This action will be logged in the system.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction>Confirm Clock Out</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="md:col-span-3 shadow-glass dark:shadow-glass-dark">
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Employees Currently Checked In</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-md">
                        There are no employees currently on shift. Check back later or adjust your department filter.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}