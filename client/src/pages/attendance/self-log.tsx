import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { QRGenerator } from "@/components/attendance/QRGenerator";
import { OTPForm } from "@/components/attendance/OTPForm";
import { ClockInOut } from "@/components/attendance/ClockInOut";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { QrCode, Users, Clock, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ClockEvent {
  employeeName: string;
  action: 'in' | 'out';
  timestamp: string;
}

export default function SelfLogPage() {
  const [tabValue, setTabValue] = useState("qr");
  
  // Mock usage statistics from API
  const stats = {
    totalClockIns: 42,
    totalClockOuts: 38,
    averageClockInTime: "08:32 AM",
    uniqueEmployees: 12,
    todayCount: 7,
  };
  
  // Fetch recent clock events - in real app would come from API
  const { data: recentEvents, refetch: refetchEvents } = useQuery<ClockEvent[]>({
    queryKey: ['/api/attendance/recent-events'],
    // Mock data
    initialData: [
      { employeeName: "James Mwangi", action: 'in', timestamp: new Date(Date.now() - 20 * 60000).toISOString() },
      { employeeName: "Lucy Njeri", action: 'in', timestamp: new Date(Date.now() - 35 * 60000).toISOString() },
      { employeeName: "David Ochieng", action: 'in', timestamp: new Date(Date.now() - 55 * 60000).toISOString() },
    ],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Handle success callback when attendance is recorded
  const handleAttendanceSuccess = () => {
    // Refetch events to update the list
    refetchEvents();
  };
  
  // Format timestamp for display
  const formatEventTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Format date for display
  const formatEventDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString([], { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground">Manage employee check-ins and attendance</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link to="/attendance">
              <Users className="mr-2 h-4 w-4" />
              View Records
            </Link>
          </Button>
          <Button>
            <Clock className="mr-2 h-4 w-4" />
            Manual Entry
          </Button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Status Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Today's Check-ins</p>
                  <p className="text-2xl font-bold">{stats.todayCount}</p>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Average Clock-in</p>
                  <p className="text-2xl font-bold">{stats.averageClockInTime}</p>
                </div>
                <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Employees</p>
                  <p className="text-2xl font-bold">{stats.uniqueEmployees}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Today's Absence</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <Tabs value={tabValue} onValueChange={setTabValue}>
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <CardTitle>Attendance Check-in System</CardTitle>
                  <TabsList>
                    <TabsTrigger value="qr" className="flex items-center">
                      <QrCode className="mr-2 h-4 w-4" />
                      QR Code
                    </TabsTrigger>
                    <TabsTrigger value="otp" className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      OTP Code
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      Manual
                    </TabsTrigger>
                  </TabsList>
                </div>
                <CardDescription>
                  Multiple methods for employees to check in and out
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <TabsContent value="qr" className="mt-0">
                  <QRGenerator />
                </TabsContent>
                
                <TabsContent value="otp" className="mt-0">
                  <OTPForm onSuccess={handleAttendanceSuccess} />
                </TabsContent>
                
                <TabsContent value="manual" className="mt-0">
                  <ClockInOut onSuccess={handleAttendanceSuccess} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
        
      </div>
    </div>
  );
}
