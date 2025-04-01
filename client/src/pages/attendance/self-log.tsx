import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { QRGenerator } from "@/components/attendance/QRGenerator";
import { OTPForm } from "@/components/attendance/OTPForm";
import { ClockInOut } from "@/components/attendance/ClockInOut";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { QrCode, Users, Clock, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ClockEvent {
  employeeName: string;
  action: "in" | "out";
  timestamp: string;
}

interface AttendanceStats {
  totalClockIns: number;
  totalClockOuts: number;
  averageClockInTime: string;
  uniqueEmployees: number;
  todayCount: number;
  absenceCount: number;
}

export default function SelfLogPage() {
  const [tabValue, setTabValue] = useState("otp");

  // Fetch attendance statistics from API
  const { data: stats } = useQuery<AttendanceStats>({
    queryKey: ["/api/attendance/stats"],
    initialData: {
      totalClockIns: 0,
      totalClockOuts: 0,
      averageClockInTime: "--:--",
      uniqueEmployees: 0,
      todayCount: 0,
      absenceCount: 0,
    },
  });

  // Fetch recent clock events from API
  const { data: recentEvents, refetch: refetchEvents } = useQuery<ClockEvent[]>(
    {
      queryKey: ["/api/attendance/recent-events"],
      initialData: [],
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Handle success callback when attendance is recorded
  const handleAttendanceSuccess = () => {
    // Refetch events to update the list
    refetchEvents();
  };

  // Format timestamp for display
  const formatEventTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date for display
  const formatEventDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Attendance Management
          </h1>
          <p className="text-muted-foreground">
            Manage employee check-ins and attendance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link to="/attendance">
              <Users className="mr-2 h-4 w-4" />
              View Records
            </Link>
          </Button>
          <Button asChild>
            <Link to="/attendance/manual">
              <Clock className="mr-2 h-4 w-4" />
              Manual Entry
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <Tabs value={tabValue} onValueChange={setTabValue}>
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <CardTitle>Attendance Check-in System</CardTitle>
                  <TabsList>
                    <TabsTrigger value="otp" className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      OTP Code
                    </TabsTrigger>
                    <TabsTrigger value="qr" className="flex items-center">
                      <QrCode className="mr-2 h-4 w-4" />
                      QR Code
                    </TabsTrigger>
                  </TabsList>
                </div>
                <CardDescription>
                  Multiple methods for employees to check in and out
                </CardDescription>
              </CardHeader>

              <CardContent>
                <TabsContent value="otp" className="mt-0">
                  <OTPForm onSuccess={handleAttendanceSuccess} />
                </TabsContent>

                <TabsContent value="qr" className="mt-0">
                  <QRGenerator />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
