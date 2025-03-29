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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { ManagerControls } from "@/components/attendance/ManagerControls";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Employee as SchemaEmployee, Attendance } from "@shared/schema";
import { convertServerEmployee } from "@/lib/store";

export default function AttendancePage() {
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [error, setError] = useState<string | null>(null);

  // Query to fetch all attendance data
  const {
    data: records,
    isLoading,
    error: queryError,
  } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance"],
    queryFn: async () => {
      try {
        console.log("Fetching attendance records...");
        const response = await fetch("/api/attendance");

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Attendance API error:", response.status, errorText);
          throw new Error(
            `Failed to fetch attendance records: ${response.status} ${errorText}`
          );
        }

        const data = await response.json();
        console.log("Attendance data received:", data);
        return data;
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred"
        );
        return [];
      }
    },
    staleTime: 5000, // Data stays fresh for 5 seconds
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
  });

  return (
    <>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <div className="flex items-center gap-2">
          <Link to="/attendance/test-stats">
            <Button variant="outline" size="sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              Test Stats
            </Button>
          </Link>
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

      {!isLoading && records?.length === 0 && (
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
        <TabsList className="mt-4">
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
          <AttendanceDashboard records={records || []} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="manager">
          <ManagerControls />
        </TabsContent>
      </Tabs>
    </>
  );
}
