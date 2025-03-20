import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Download, RotateCw, RefreshCw } from "lucide-react";

interface QRCodePayload {
  companyId: string;
  timestamp: number;
  location?: { lat: number; lng: number };
  expiresIn: number; // seconds
}

interface ClockEvent {
  employeeName: string;
  action: 'in' | 'out';
  timestamp: string;
}

export function QRGenerator() {
  const [qrCode, setQrCode] = useState('');
  const [useLocation, setUseLocation] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10); // seconds
  const [qrLoading, setQrLoading] = useState(false);
  const [timer, setTimer] = useState(refreshInterval);
  const [recentClockEvents, setRecentClockEvents] = useState<ClockEvent[]>([]);

  // For WebSocket connection to get real-time clock events
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch recent clock events
  const { data: clockEvents } = useQuery({
    queryKey: ['/api/attendance/recent-events'],
    initialData: [],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Generate new QR code
  const generateQrCode = async () => {
    setQrLoading(true);
    
    try {
      // Create QR code payload
      const payload: QRCodePayload = {
        companyId: "JAHAZII_COMPANY",
        timestamp: Date.now(),
        expiresIn: refreshInterval
      };
      
      // Add location if enabled
      if (useLocation && navigator.geolocation) {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              payload.location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              resolve();
            },
            (error) => {
              toast({
                title: "Location Error",
                description: `Failed to get location: ${error.message}`,
                variant: "destructive",
              });
              resolve(); // Continue without location
            }
          );
        });
      }
      
      // In a real implementation, we would fetch from the server
      // For now, create a QR code using an external service
      const dataString = encodeURIComponent(JSON.stringify(payload));
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${dataString}`;
      setQrCode(qrUrl);
      
      // Reset timer
      setTimer(refreshInterval);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setQrLoading(false);
    }
  };
  
  // QR code timer countdown
  useEffect(() => {
    // Generate initial QR code
    generateQrCode();
    
    // Set up timer countdown
    const timerInterval = setInterval(() => {
      setTimer(prevTimer => {
        if (prevTimer <= 1) {
          // Generate new QR code when timer reaches 0
          generateQrCode();
          return refreshInterval;
        }
        return prevTimer - 1;
      });
    }, 1000);
    
    // Connect to WebSocket for real-time updates
    const connectWebSocket = () => {
      try {
        // In a real implementation, we would connect to a WebSocket server
        // Mock connection success
        setWsConnected(true);
        
        // Mock clock events coming through WebSocket
        const mockWsInterval = setInterval(() => {
          const random = Math.random();
          if (random > 0.7) {
            const names = ["James Mwangi", "Lucy Njeri", "David Ochieng", "Alice Kamau", "Bob Wanjiku"];
            const randomName = names[Math.floor(Math.random() * names.length)];
            const action: 'in' | 'out' = Math.random() > 0.5 ? 'in' : 'out';
            
            addClockEvent({
              employeeName: randomName,
              action,
              timestamp: new Date().toISOString()
            });
          }
        }, 8000);
        
        return () => clearInterval(mockWsInterval);
      } catch (error) {
        console.error("WebSocket connection failed:", error);
        setWsConnected(false);
        return () => {};
      }
    };
    
    const cleanup = connectWebSocket();
    
    return () => {
      clearInterval(timerInterval);
      cleanup();
    };
  }, [refreshInterval]);
  
  // Update recent events when clockEvents changes
  useEffect(() => {
    if (clockEvents && clockEvents.length > 0) {
      setRecentClockEvents(prev => {
        // Merge and remove duplicates
        const combined = [...clockEvents, ...prev];
        const uniqueEvents = Array.from(new Map(combined.map(event => 
          [event.timestamp, event]
        )).values());
        
        // Sort by timestamp (newest first) and limit to 10
        return uniqueEvents
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);
      });
    }
  }, [clockEvents]);
  
  const addClockEvent = (event: ClockEvent) => {
    setRecentClockEvents(prev => [event, ...prev.slice(0, 9)]);
  };
  
  // Format timestamp for display
  const formatEventTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Handle save QR code
  const saveQrCode = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `jahazii-attendance-qr-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handle refresh interval change
  const handleRefreshIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 5 && value <= 60) {
      setRefreshInterval(value);
    }
  };
  
  return (
    <Card className="shadow-glass dark:shadow-glass-dark">
      <CardHeader>
        <CardTitle>Self-Log QR Scanner</CardTitle>
        <CardDescription>
          Generate QR code for employees to clock in and out using their smartphones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-white relative">
            {qrLoading ? (
              <div className="h-[250px] w-[250px] flex items-center justify-center">
                <RotateCw className="h-10 w-10 text-primary animate-spin" />
              </div>
            ) : (
              <img 
                src={qrCode} 
                alt="QR Code for self-log" 
                className="h-[250px] w-[250px]"
              />
            )}
            
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
              Refreshes in {timer}s
            </div>
          </div>
          
          <div className="text-center space-y-2 mt-4">
            <p className="text-sm font-medium">Scan with your smartphone camera to clock in/out</p>
            <Badge variant="outline" className={wsConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {wsConnected ? "Live Updates On" : "Live Updates Off"}
            </Badge>
          </div>
          
          <div className="flex space-x-2 mt-2">
            <Button variant="outline" onClick={saveQrCode}>
              <Download className="mr-2 h-4 w-4" />
              Save QR
            </Button>
            <Button onClick={generateQrCode} disabled={qrLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Now
            </Button>
          </div>
        </div>
        
        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="use-location" className="cursor-pointer flex items-center">
              <input
                type="checkbox"
                id="use-location"
                checked={useLocation}
                onChange={(e) => setUseLocation(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Use office location in QR code
            </Label>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="refresh-interval" className="text-sm whitespace-nowrap">
                Refresh every:
              </Label>
              <div className="flex items-center space-x-1">
                <Input
                  id="refresh-interval"
                  type="number"
                  value={refreshInterval}
                  onChange={handleRefreshIntervalChange}
                  className="w-16 text-right"
                  min="5"
                  max="60"
                />
                <span className="text-sm">sec</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <h3 className="font-medium text-sm">Recent Clock Events</h3>
          <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
            {recentClockEvents.length > 0 ? (
              <ul className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
                {recentClockEvents.map((event, index) => (
                  <li key={index} className="text-sm py-2 flex items-center justify-between">
                    <span>
                      <span className="font-medium">{event.employeeName}</span> clocked {event.action}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatEventTime(event.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No recent clock events
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 border-t px-6 py-4">
        <div className="text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">How it works: </span>
            Employees scan this QR code with their smartphone camera, confirm their ID, 
            and select whether they're clocking in or out.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
