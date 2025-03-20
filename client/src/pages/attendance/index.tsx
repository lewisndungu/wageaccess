import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Download, Filter, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { attendanceRecords, employees, formatDate, formatTime } from "@/lib/mock-data";

interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  status: string;
  hoursWorked: number;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewType, setViewType] = useState("daily");
  
  const { data: records } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance', selectedDate],
    initialData: attendanceRecords,
  });
  
  const { data: employeeList } = useQuery({
    queryKey: ['/api/employees/active'],
    initialData: employees,
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20">Present</Badge>;
      case "late":
        return <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/20">Late</Badge>;
      case "absent":
        return <Badge className="bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20">Absent</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const columns: ColumnDef<AttendanceRecord>[] = [
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
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ row }) => row.original.hoursWorked.toFixed(2),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <i className="ri-more-2-fill"></i>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit Record</DropdownMenuItem>
            <DropdownMenuItem>View Details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manual Attendance Entry</DialogTitle>
                <DialogDescription>
                  Record attendance manually for an employee.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Employee</label>
                  <Select>
                    <SelectTrigger className="col-span-3">
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Date</label>
                  <Input
                    type="date"
                    className="col-span-3"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Clock In</label>
                  <Input type="time" className="col-span-3" defaultValue="08:00" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Clock Out</label>
                  <Input type="time" className="col-span-3" defaultValue="17:00" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Status</label>
                  <Select defaultValue="present">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Notes</label>
                  <Input className="col-span-3" placeholder="Optional notes" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Entry</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 shadow-glass dark:shadow-glass-dark">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Attendance Summary</span>
              <div className="flex space-x-2">
                <Select
                  value={selectedDate}
                  onValueChange={setSelectedDate}
                >
                  <SelectTrigger className="w-auto">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023-07-12">July 12, 2023</SelectItem>
                    <SelectItem value="2023-07-11">July 11, 2023</SelectItem>
                    <SelectItem value="2023-07-10">July 10, 2023</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col items-center p-3 bg-[#10B981]/10 rounded-lg">
                <span className="text-2xl font-bold text-[#10B981]">3</span>
                <span className="text-sm text-muted-foreground">Present</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-[#F59E0B]/10 rounded-lg">
                <span className="text-2xl font-bold text-[#F59E0B]">1</span>
                <span className="text-sm text-muted-foreground">Late</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-[#EF4444]/10 rounded-lg">
                <span className="text-2xl font-bold text-[#EF4444]">1</span>
                <span className="text-sm text-muted-foreground">Absent</span>
              </div>
            </div>
            
            <Tabs defaultValue={viewType} onValueChange={setViewType}>
              <TabsList className="mb-4">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
              
              <TabsContent value="daily" className="space-y-4">
                <div className="flex justify-between mb-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search employee..." className="pl-8" />
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
                
                <DataTable columns={columns} data={records} />
              </TabsContent>
              
              <TabsContent value="weekly">
                <div className="text-center p-10 text-muted-foreground">
                  Weekly view will be available in the next update.
                </div>
              </TabsContent>
              
              <TabsContent value="monthly">
                <div className="text-center p-10 text-muted-foreground">
                  Monthly view will be available in the next update.
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Attendance Rate</span>
                <span className="font-medium">93.5%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#3B82F6] h-2 rounded-full" style={{ width: '93.5%' }}></div>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">On Time Rate</span>
                <span className="font-medium">85.2%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#10B981] h-2 rounded-full" style={{ width: '85.2%' }}></div>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Average Work Hours</span>
                <span className="font-medium">8.5 hrs</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#6C2BD9] h-2 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle className="text-lg">Anomalies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-[#EF4444]/5 rounded-lg border border-[#EF4444]/20">
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-[#EF4444]/10 mr-3">
                    <i className="ri-time-line text-[#EF4444]"></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium">5 Employees Absent</p>
                    <p className="text-xs text-muted-foreground">Marketing Department</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-[#F59E0B]/5 rounded-lg border border-[#F59E0B]/20">
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-[#F59E0B]/10 mr-3">
                    <i className="ri-time-line text-[#F59E0B]"></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium">3 Employees Late</p>
                    <p className="text-xs text-muted-foreground">IT Department</p>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" size="sm">View All Anomalies</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
