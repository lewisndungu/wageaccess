import { useState, useEffect } from "react";
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
  Users,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { ManagerControls } from "@/components/attendance/ManagerControls";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [error, setError] = useState<string | null>(null);
  
  // Query to fetch all attendance data
  const { data: rawRecords = [], isLoading, error: queryError } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance'],
    queryFn: async () => {
      try {
        console.log('Fetching attendance records...');
        const response = await fetch('/api/attendance');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Attendance API error:', response.status, errorText);
          throw new Error(`Failed to fetch attendance records: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Attendance data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        return [];
      }
    },
    staleTime: 5000, // Data stays fresh for 5 seconds
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
  });
  
  // Query to fetch employee data
  const { data: employeeList = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees/active'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/employees/active');
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }
        const data = await response.json();
        console.log('Employee data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching employee data:', error);
        return [];
      }
    },
    staleTime: 15000, // Data stays fresh for 15 seconds
  });
  
  // Let's fetch data from the all-records endpoint as a fallback if the main fetch is empty
  const { data: fallbackRecords = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/all-records'],
    queryFn: async () => {
      try {
        console.log('Fetching fallback attendance records...');
        const response = await fetch('/api/attendance/all-records');
        if (!response.ok) throw new Error('Failed to fetch fallback records');
        const data = await response.json();
        console.log('Fallback data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching fallback data:', error);
        return [];
      }
    },
    enabled: rawRecords.length === 0 && !isLoading, // Only run if main query returns empty
    staleTime: 5000,
  });
  
  // Combine records - use rawRecords if available, otherwise use fallbackRecords
  const combinedRecords = rawRecords.length > 0 ? rawRecords : fallbackRecords;
  
  // Enhance attendance records with employee data
  const records = combinedRecords.map(record => {
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

  // Debug information
  useEffect(() => {
    console.log('Current attendance records:', records);
    console.log('Raw records count:', rawRecords.length);
    console.log('Fallback records count:', fallbackRecords.length);
    console.log('Combined records count:', combinedRecords.length);
    console.log('Employee count:', employeeList.length);
  }, [records, rawRecords, fallbackRecords, employeeList]);

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
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isLoading && (
        <div className="p-4 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p>Loading attendance records...</p>
        </div>
      )}
      
      {!isLoading && records.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Records Found</AlertTitle>
          <AlertDescription>
            There are no attendance records available. This could be because: 
            <ul className="list-disc ml-6 mt-2">
              <li>No attendance has been recorded yet</li>
              <li>The API endpoint isn't returning data correctly</li>
              <li>The database is empty</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
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
      
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto max-h-[300px]">
          <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
          <pre className="text-xs whitespace-pre-wrap">
            Raw Records Count: {rawRecords.length}
            Fallback Records Count: {fallbackRecords.length}
            Combined Records Count: {combinedRecords.length}
            Employee Count: {employeeList.length}
          </pre>
        </div>
      )}
    </div>
  );
}
