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
import { attendanceRecords, employees } from "@/lib/mock-data";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { ManagerControls } from "@/components/attendance/ManagerControls";
import { Link } from "react-router-dom";

export default function AttendancePage() {
  const [activeView, setActiveView] = useState<string>("dashboard");
  
  // Query to fetch attendance data
  const { data: records } = useQuery({
    queryKey: ['/api/attendance'],
    initialData: attendanceRecords,
  });
  
  // Query to fetch employee data
  const { data: employeeList } = useQuery({
    queryKey: ['/api/employees/active'],
    initialData: employees,
  });
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground">Track, manage, and analyze employee attendance</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link to="/attendance/self-log">
              <Clock className="mr-2 h-4 w-4" />
              Self Check-in
            </Link>
          </Button>
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* View Selection Tabs */}
      <Card className="shadow-glass dark:shadow-glass-dark">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue={activeView}
            onValueChange={setActiveView}
            className="space-y-4"
          >
            <TabsList className="bg-muted/40">
              <TabsTrigger value="dashboard" className="flex items-center">
                <BarChart className="mr-2 h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="manager-controls" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Manager Controls
              </TabsTrigger>
              <TabsTrigger value="modules" className="flex items-center">
                <Puzzle className="mr-2 h-4 w-4" />
                Advanced Modules
              </TabsTrigger>
            </TabsList>

            {/* Dashboard View */}
            <TabsContent value="dashboard" className="space-y-4 p-1">
              <AttendanceDashboard />
            </TabsContent>

            {/* Manager Controls View */}
            <TabsContent value="manager-controls" className="space-y-4 p-1">
              <ManagerControls />
            </TabsContent>

            {/* Additional Modules View (Placeholder for future modules) */}
            <TabsContent value="modules" className="space-y-4 p-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-3">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Puzzle className="h-16 w-16 text-muted-foreground/50 mb-6" />
                    <h3 className="text-xl font-medium mb-2">Advanced Modules</h3>
                    <p className="text-muted-foreground text-center max-w-lg mb-6">
                      These specialized attendance modules provide additional functionality for specific 
                      business needs. Select a module below to configure and activate it.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
                      <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors cursor-pointer">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <h4 className="font-medium mb-2">Shift Planning</h4>
                          <p className="text-sm text-muted-foreground">
                            Create and manage employee work shifts and rotations
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors cursor-pointer">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
                            <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <h4 className="font-medium mb-2">Leave Management</h4>
                          <p className="text-sm text-muted-foreground">
                            Track and approve time-off requests and leave balances
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors cursor-pointer">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h4 className="font-medium mb-2">Overtime Tracking</h4>
                          <p className="text-sm text-muted-foreground">
                            Monitor and approve overtime hours and compensation
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
