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
import axios from "axios";

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
        try {
          const response = await axios.get("/api/attendance");

          if (response.status !== 200) {
            console.error("Attendance API error:", response.status, response.data);
            throw new Error(
              `Failed to fetch attendance records: ${response.status} ${response.data}`
            );
          }

          const data = response.data;
          console.log("Attendance data received:", data);
          return data;
        } catch (error: any) {
          console.error("Error fetching attendance data:", error);
          setError(
            error instanceof Error ? error.message : "Unknown error occurred"
          );
          return [];
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred"
        );
        return [];
      }
    },
    staleTime: 60000, // Data stays fresh for 1 minute
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
