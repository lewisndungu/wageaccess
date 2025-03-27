import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AttendanceStats {
  totalClockIns: number;
  totalClockOuts: number;
  averageClockInTime: string;
  uniqueEmployees: number;
  todayCount: number;
  absenceCount: number;
}

interface DashboardStats {
  employeeCount: {
    total: number;
    active: number;
    inactive: number;
    change: string;
  };
  attendance: {
    rate: string;
    change: string;
  };
  payroll: {
    expected: string;
    change: string;
  };
  ewa: {
    total: string;
    pending: number;
    change: string;
  };
}

export default function TestStats() {
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendanceStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/attendance/stats");
      if (!response.ok) {
        throw new Error(`Failed to fetch attendance stats: ${response.status}`);
      }
      const data = await response.json();
      setAttendanceStats(data);
      console.log("Attendance stats:", data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching attendance stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/statistics/dashboard");
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
      }
      const data = await response.json();
      setDashboardStats(data);
      console.log("Dashboard stats:", data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch both on mount
    fetchAttendanceStats();
    fetchDashboardStats();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">API Endpoint Test</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="flex gap-4">
        <Button onClick={fetchAttendanceStats} disabled={loading}>
          Fetch Attendance Stats
        </Button>
        <Button onClick={fetchDashboardStats} disabled={loading}>
          Fetch Dashboard Stats
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !attendanceStats ? (
              <p>Loading...</p>
            ) : attendanceStats ? (
              <div className="space-y-2">
                <p><strong>Total Clock-ins:</strong> {attendanceStats.totalClockIns}</p>
                <p><strong>Total Clock-outs:</strong> {attendanceStats.totalClockOuts}</p>
                <p><strong>Average Clock-in Time:</strong> {attendanceStats.averageClockInTime}</p>
                <p><strong>Unique Employees:</strong> {attendanceStats.uniqueEmployees}</p>
                <p><strong>Today's Count:</strong> {attendanceStats.todayCount}</p>
                <p><strong>Absence Count:</strong> {attendanceStats.absenceCount}</p>
              </div>
            ) : (
              <p>No data available</p>
            )}
          </CardContent>
        </Card>
        
        {/* Dashboard Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !dashboardStats ? (
              <p>Loading...</p>
            ) : dashboardStats ? (
              <div className="space-y-2">
                <h3 className="font-semibold">Employee Count</h3>
                <p><strong>Total:</strong> {dashboardStats.employeeCount.total}</p>
                <p><strong>Active:</strong> {dashboardStats.employeeCount.active}</p>
                <p><strong>Inactive:</strong> {dashboardStats.employeeCount.inactive}</p>
                <p><strong>Change:</strong> {dashboardStats.employeeCount.change}</p>
                
                <h3 className="font-semibold mt-4">Attendance</h3>
                <p><strong>Rate:</strong> {dashboardStats.attendance.rate}</p>
                <p><strong>Change:</strong> {dashboardStats.attendance.change}</p>
                
                <h3 className="font-semibold mt-4">Payroll</h3>
                <p><strong>Expected:</strong> {dashboardStats.payroll.expected}</p>
                <p><strong>Change:</strong> {dashboardStats.payroll.change}</p>
                
                <h3 className="font-semibold mt-4">EWA</h3>
                <p><strong>Total:</strong> {dashboardStats.ewa.total}</p>
                <p><strong>Pending:</strong> {dashboardStats.ewa.pending}</p>
                <p><strong>Change:</strong> {dashboardStats.ewa.change}</p>
              </div>
            ) : (
              <p>No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 