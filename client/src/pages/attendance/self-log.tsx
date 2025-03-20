import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { QRGenerator } from "@/components/attendance/QRGenerator";
import { OTPForm } from "@/components/attendance/OTPForm";
import { ClockInOut } from "@/components/attendance/ClockInOut";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Download, QrCode, Settings, Users, Clock, Calendar, RotateCw, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ClockEvent {
  employeeName: string;
  action: 'in' | 'out';
  timestamp: string;
}

export default function SelfLogPage() {
  const [tabValue, setTabValue] = useState("qr");
  const [autoClockOut, setAutoClockOut] = useState(true);
  const [geoVerification, setGeoVerification] = useState(false);
  const [otpExpiryTime, setOtpExpiryTime] = useState(15);
  const [qrRefreshInterval, setQrRefreshInterval] = useState(10);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  
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
  
  // Handle save settings
  const handleSaveSettings = async () => {
    setIsUpdatingSettings(true);
    
    try {
      // In a real implementation, we would call the API to update settings
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
      
      toast({
        title: "Settings Updated",
        description: "Attendance settings have been updated successfully."
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingSettings(false);
    }
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        
        <div className="lg:col-span-2 space-y-6">
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
        
        <div className="space-y-6">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-2 max-h-[380px] overflow-y-auto">
                {recentEvents && recentEvents.length > 0 ? (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentEvents.map((event, index) => (
                      <li key={index} className="py-3 px-1">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <div className="bg-primary/10 h-9 w-9 rounded-full flex items-center justify-center mr-3 text-primary">
                              {event.employeeName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{event.employeeName}</p>
                              <div className="flex items-center">
                                <Badge 
                                  variant="outline" 
                                  className={event.action === 'in' ? 
                                    "text-green-600 bg-green-50 border-green-100" : 
                                    "text-blue-600 bg-blue-50 border-blue-100"
                                  }
                                >
                                  {event.action === 'in' ? 'Clocked In' : 'Clocked Out'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-right text-muted-foreground">
                            <div>{formatEventTime(event.timestamp)}</div>
                            <div>{formatEventDate(event.timestamp)}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6">
                    <RotateCw className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      No recent clock events
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/attendance">
                  View All Records
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Settings</CardTitle>
                <Badge variant="outline">System</Badge>
              </div>
              <CardDescription>Configure attendance system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-clock">Auto-Clock Out</Label>
                  <p className="text-sm text-muted-foreground">
                    Clock out employees at shift end
                  </p>
                </div>
                <Switch 
                  id="auto-clock"
                  checked={autoClockOut}
                  onCheckedChange={setAutoClockOut}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="geo-verification">Location Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    <MapPin className="inline-block h-3 w-3 mr-1" />
                    Verify location on check-in
                  </p>
                </div>
                <Switch 
                  id="geo-verification" 
                  checked={geoVerification}
                  onCheckedChange={setGeoVerification}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="otp-expiry">OTP Expiry (minutes)</Label>
                  <p className="text-sm text-muted-foreground">
                    OTP code validity period
                  </p>
                </div>
                <Input
                  id="otp-expiry"
                  type="number"
                  className="w-20 text-right"
                  value={otpExpiryTime}
                  onChange={(e) => setOtpExpiryTime(parseInt(e.target.value) || 15)}
                  min="1"
                  max="60"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="qr-refresh">QR Refresh (seconds)</Label>
                  <p className="text-sm text-muted-foreground">
                    How often QR code refreshes
                  </p>
                </div>
                <Input
                  id="qr-refresh"
                  type="number"
                  className="w-20 text-right"
                  value={qrRefreshInterval}
                  onChange={(e) => setQrRefreshInterval(parseInt(e.target.value) || 10)}
                  min="5"
                  max="60"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleSaveSettings}
                disabled={isUpdatingSettings}
              >
                {isUpdatingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
