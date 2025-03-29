import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/dashboard/MetricCard";
import {
  QuickActions,
  useQuickActions,
} from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { Button } from "@/components/ui/button";
import { Filter, UserPlus } from "lucide-react";
import type { Employee } from "@shared/schema";

// Define types for dashboard stats
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

// Define Activity type
interface Activity {
  id: number;
  type: "employee" | "ewa" | "attendance" | "payroll" | "self-log";
  title: string;
  description: string;
  time: string;
  icon: string;
}

export default function Dashboard() {
  const {
    data: stats = {
      employeeCount: { total: 0, active: 0, inactive: 0, change: "+0%" },
      attendance: { rate: "0%", change: "+0%" },
      payroll: { expected: "KES 0", change: "+0%" },
      ewa: { total: "0", pending: 0, change: "+0%" },
    },
  } = useQuery<DashboardStats>({
    queryKey: ["/api/statistics/dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/statistics/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard statistics");
      }
      return response.json();
    },
  });

  const { data: employeeData = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees/active"],
    queryFn: async () => {
      const response = await fetch("/api/employees/active");
      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }
      return response.json();
    },
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      const response = await fetch("/api/activities");
      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }
      return response.json();
    },
  });

  const { defaultActions } = useQuickActions();

  return (
    <div className="space-y-8">
      {/* Key Metrics Section */}
      <section
        className="animate-slide-in-left space-y-8"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-1.5">Key Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Overview of your organization's performance
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Employees"
            value={stats.employeeCount.total.toString()}
            change={stats.employeeCount.change}
            iconName="team-line"
            colorClass="text-primary"
            additionalInfo={
              <div className="mt-3 flex items-center text-xs">
                <span className="bg-[#10B981]/20 text-[#10B981] rounded-full px-2 py-0.5 mr-2">
                  Active: {stats.employeeCount.active}
                </span>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5">
                  Inactive: {stats.employeeCount.inactive}
                </span>
              </div>
            }
          />

          <MetricCard
            title="Attendance Rate"
            value={stats.attendance.rate}
            change={stats.attendance.change}
            iconName="time-line"
            colorClass="text-[#3B82F6]"
            additionalInfo={
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-[#3B82F6] h-2 rounded-full"
                    style={{ width: stats.attendance.rate }}
                  ></div>
                </div>
              </div>
            }
          />

          <MetricCard
            title="Expected Payroll"
            value={stats.payroll.expected}
            change={stats.payroll.change}
            iconName="money-dollar-box-line"
            colorClass="text-secondary"
            isPositiveChange={false}
            additionalInfo={
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Month-end projection based on current attendance
              </div>
            }
          />

          <MetricCard
            title="EWA Transactions"
            value={stats.ewa.total}
            change={stats.ewa.change}
            iconName="bank-card-line"
            colorClass="text-[#F59E0B]"
            isPositiveChange={false}
            additionalInfo={
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-[#F59E0B]">
                  {stats.ewa.pending} pending
                </span>{" "}
                requests to process
              </div>
            }
          />
        </div>
      </section>

      <section
        className="animate-slide-in-left"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="mb-5">
          <h2 className="text-xl font-semibold mb-1.5">Quick Actions</h2>
          <p className="text-sm text-muted-foreground">
            Common tasks you can perform
          </p>
        </div>
        <QuickActions actions={defaultActions} />
      </section>

      <section
        className="animate-slide-in-right"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-semibold mb-1.5">Recent Activity</h2>
            <p className="text-sm text-muted-foreground">
              Latest updates from your workspace
            </p>
          </div>
          <Link to="/activities">
            <Button
              variant="link"
              className="text-primary hover:text-primary/80"
            >
              View All
            </Button>
          </Link>
        </div>
        <RecentActivity activities={activities} />
      </section>
    </div>
  );
}
