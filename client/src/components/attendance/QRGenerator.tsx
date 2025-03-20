import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function QRGenerator() {
  const [qrCode, setQrCode] = useState('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=sampleqrcode123');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [recentClockEvents, setRecentClockEvents] = useState<string[]>([
    "James Mwangi clocked in at 08:05 AM",
    "Lucy Njeri clocked in at 08:10 AM",
    "David Ochieng clocked in at 08:15 AM"
  ]);
  
  // Generate QR code that refreshes every 3 seconds
  useEffect(() => {
    // In a real implementation, we would fetch a new QR code from the server
    // For now, just update the URL to trigger a refresh
    const intervalId = setInterval(() => {
      const timestamp = new Date().getTime();
      setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=sampleqrcode123_${timestamp}`);
      setRefreshCounter(prev => (prev + 1) % 100);
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const addClockEvent = (name: string, eventType: 'in' | 'out') => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newEvent = `${name} clocked ${eventType} at ${timeString}`;
    setRecentClockEvents(prev => [newEvent, ...prev.slice(0, 9)]);
  };
  
  return (
    <Card className="shadow-glass dark:shadow-glass-dark">
      <CardHeader>
        <CardTitle>Self-Log System</CardTitle>
        <CardDescription>Generate QR code for employees to clock in and out</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="qr">
          <TabsList className="mb-4">
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="otp">OTP Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl bg-white">
                <img 
                  src={qrCode} 
                  alt="QR Code for self-log" 
                  className="h-56 w-56"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  QR code refreshes automatically every 3 seconds: {refreshCounter}
                </p>
                <p className="text-sm font-medium">Scan to clock in/out</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium mb-2">Recent Clock Events</h3>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
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
            </div>
          </TabsContent>
          
          <TabsContent value="otp">
            <div className="space-y-4">
              <p className="text-sm">
                Generate a one-time password for specific employees to clock in or out.
              </p>
              
              <div className="flex space-x-2">
                <input 
                  type="text"
                  placeholder="Search employee..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button>Generate OTP</Button>
              </div>
              
              <div className="border rounded-md p-4 mt-4 text-center">
                <p className="text-sm text-muted-foreground">Generated OTP will appear here</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
