import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QRGenerator } from "@/components/attendance/QRGenerator";
import { OTPForm } from "@/components/attendance/OTPForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, QrCode, Settings, Users } from "lucide-react";

export default function SelfLogPage() {
  const [tabValue, setTabValue] = useState("qr");
  const [recentClockEvents, setRecentClockEvents] = useState([
    "James Mwangi clocked in at 08:05 AM",
    "Lucy Njeri clocked in at 08:10 AM",
    "David Ochieng clocked in at 08:15 AM"
  ]);
  
  const addClockEvent = (name: string, eventType: 'in' | 'out') => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newEvent = `${name} clocked ${eventType} at ${timeString}`;
    setRecentClockEvents(prev => [newEvent, ...prev.slice(0, 9)]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Self-Log System</h1>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <Tabs value={tabValue} onValueChange={setTabValue}>
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <CardTitle>Attendance Self-Log</CardTitle>
                  <TabsList>
                    <TabsTrigger value="qr" className="flex items-center">
                      <QrCode className="mr-2 h-4 w-4" />
                      QR Code
                    </TabsTrigger>
                    <TabsTrigger value="otp" className="flex items-center">
                      <i className="ri-key-line mr-2"></i>
                      OTP Code
                    </TabsTrigger>
                  </TabsList>
                </div>
                <CardDescription>
                  Generate QR codes or OTP for employees to clock in and out
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <TabsContent value="qr" className="mt-0">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl bg-white">
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=sampleqrcode123"
                        alt="QR Code for self-log" 
                        className="h-56 w-56"
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        QR code refreshes automatically every 3 seconds
                      </p>
                      <p className="text-sm font-medium">Scan to clock in/out</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Save QR
                      </Button>
                      <Button size="sm">
                        <i className="ri-refresh-line mr-2"></i>
                        Refresh
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="otp" className="mt-0">
                  <OTPForm onSuccess={() => {
                    addClockEvent("Test Employee", "in");
                  }} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure self-log system behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Clock-Out</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically clock out employees at the end of shift
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Geo-Location Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Verify employee location when clocking in/out
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>OTP Expiry Time (minutes)</Label>
                  <p className="text-sm text-muted-foreground">
                    How long OTP codes remain valid
                  </p>
                </div>
                <Input
                  type="number"
                  className="w-20 text-right"
                  defaultValue="15"
                  min="1"
                  max="60"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>QR Code Refresh Interval (seconds)</Label>
                  <p className="text-sm text-muted-foreground">
                    How often the QR code refreshes
                  </p>
                </div>
                <Input
                  type="number"
                  className="w-20 text-right"
                  defaultValue="3"
                  min="1"
                  max="30"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Recent Clock Events</CardTitle>
              <CardDescription>Employee attendance activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-2 max-h-80 overflow-y-auto">
                {recentClockEvents.length > 0 ? (
                  <ul className="space-y-1">
                    {recentClockEvents.map((event, index) => (
                      <li key={index} className="text-sm border-b border-gray-100 dark:border-gray-800 last:border-b-0 py-1">
                        {event}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">No recent clock events</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Scan Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">For QR Code:</h3>
                <ol className="text-sm list-decimal pl-5 space-y-1">
                  <li>Display this QR code on a screen visible to employees</li>
                  <li>Employees scan the QR with their phone camera</li>
                  <li>They enter their employee ID</li>
                  <li>Select "Clock In" or "Clock Out"</li>
                  <li>Attendance is recorded automatically</li>
                </ol>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">For OTP:</h3>
                <ol className="text-sm list-decimal pl-5 space-y-1">
                  <li>Search for an employee</li>
                  <li>Generate OTP and provide it to the employee</li>
                  <li>Verify the OTP</li>
                  <li>Select "Clock In" or "Clock Out"</li>
                  <li>Attendance is recorded</li>
                </ol>
              </div>
              
              <Button variant="outline" className="w-full">
                <Users className="mr-2 h-4 w-4" />
                View All Attendance
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
