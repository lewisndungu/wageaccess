import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions, useQuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { dashboardStats, employees, recentActivities } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Filter, UserPlus } from "lucide-react";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['/api/statistics/dashboard'],
    initialData: dashboardStats
  });
  
  const { data: employeeData } = useQuery({
    queryKey: ['/api/employees/active'],
    initialData: employees
  });
  
  const { data: activities } = useQuery({
    queryKey: ['/api/activities'],
    initialData: recentActivities
  });
  
  const { defaultActions } = useQuickActions();

  return (
    <div className="space-y-6">
      {/* Key Metrics Section */}
      <section className="mb-6 animate-slide-in-left" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Employees"
            value={stats.employeeCount.total.toString()}
            change={stats.employeeCount.change}
            iconName="team-line"
            colorClass="text-primary"
            additionalInfo={
              <div className="mt-3 flex items-center text-xs">
                <span className="bg-[#10B981]/20 text-[#10B981] rounded-full px-2 py-0.5 mr-2">Active: {stats.employeeCount.active}</span>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5">Inactive: {stats.employeeCount.inactive}</span>
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
                  <div className="bg-[#3B82F6] h-2 rounded-full" style={{ width: stats.attendance.rate }}></div>
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
                <span className="font-medium text-[#F59E0B]">{stats.ewa.pending} pending</span> requests to process
              </div>
            }
          />
        </div>
      </section>
      
      {/* Actions and Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <section className="lg:col-span-1 animate-slide-in-left" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <QuickActions actions={defaultActions} />
        </section>
        
        {/* Recent Activity */}
        <section className="lg:col-span-2 animate-slide-in-right" style={{ animationDelay: "0.2s" }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link href="/activities">
              <Button variant="link" className="text-primary hover:text-primary/80">View All</Button>
            </Link>
          </div>
          <RecentActivity />
        </section>
      </div>
      
      {/* Employee Overview */}
      <section className="mt-6 animate-slide-in-left" style={{ animationDelay: "0.3s" }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Employee Overview</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="flex items-center">
              <Filter className="h-4 w-4 mr-1" />
              <span>Filter</span>
            </Button>
            <Link href="/employees/new">
              <Button size="sm" className="flex items-center">
                <UserPlus className="h-4 w-4 mr-1" />
                <span>Add Employee</span>
              </Button>
            </Link>
          </div>
        </div>
        
        <EmployeeTable data={employeeData} />
      </section>
    </div>
  );
}
