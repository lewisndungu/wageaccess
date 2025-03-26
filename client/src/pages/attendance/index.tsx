import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Calendar, 
  BarChart, 
  Clock, 
  Download, 
  Filter, 
  Plus, 
  Puzzle, 
  RefreshCw, 
  Search, 
  Settings,
  Users 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { ManagerControls } from "@/components/attendance/ManagerControls";
import { Link } from "react-router-dom";

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

interface Employee {
  id: number;
  name: string;
  department: string;
  position: string;
  profileImage?: string;
}

export default function AttendancePage() {
  const [activeView, setActiveView] = useState<string>("dashboard");
  
  // Get today's date for parameters
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Query to fetch attendance data
  const { data: rawRecords = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance', '1', startOfDay.toISOString(), endOfDay.toISOString()], // Using a default employeeId of 1
    queryFn: async () => {
      // Include all required parameters
      const params = new URLSearchParams();
      params.append('employeeId', '1'); // Default employee ID
      params.append('startDate', startOfDay.toISOString());
      params.append('endDate', endOfDay.toISOString());
      
      const response = await fetch(`/api/attendance?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch attendance records');
      return await response.json();
    },
    staleTime: 5000, // Data stays fresh for 5 seconds
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
  });
  
  // Query to fetch employee data
  const { data: employeeList = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees/active'],
    staleTime: 15000, // Data stays fresh for 15 seconds
  });
  
  // Enhance attendance records with employee data
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <div className="flex items-center gap-2">
          <Link to="/attendance/settings">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Manual Entry
          </Button>
        </div>
      </div>
      
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="manager">
            <Users className="h-4 w-4 mr-2" />
            Manager Controls
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <AttendanceDashboard records={records} employees={employeeList} />
        </TabsContent>
        
        <TabsContent value="manager">
          <ManagerControls />
        </TabsContent>
      </Tabs>
    </div>
  );
}
