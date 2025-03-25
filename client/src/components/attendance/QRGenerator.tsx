import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { RotateCw, RefreshCw } from "lucide-react";

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
    
    return () => {
      clearInterval(timerInterval);
    };
  }, [refreshInterval]);
  
  
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
            
          </div>
          
          <div className="flex space-x-2 mt-2">
            <Button className="w-full" onClick={generateQrCode} disabled={qrLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Now
            </Button>
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
