import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions, useQuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { dashboardStats, employees, recentActivities } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Filter, UserPlus } from "lucide-react";

// Define the Employee type to match what EmployeeTable expects
interface Employee {
  id: number;
  employeeNumber: string;
  name: string;
  department: string;
  position: string;
  contact: string;
  email: string;
  status: "present" | "absent" | "late";
  profileImage?: string;
}

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['/api/statistics/dashboard'],
    initialData: dashboardStats
  });
  
  // Map the employees data to ensure all fields match the expected Employee type
  const { data: employeeData } = useQuery<Employee[]>({
    queryKey: ['/api/employees/active'],
    initialData: employees.map(emp => ({
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      contact: emp.contact,
      email: emp.email,
      status: emp.status as "present" | "absent" | "late",
      profileImage: emp.profileImage
    }))
  });
  
  const { data: activities } = useQuery({
    queryKey: ['/api/activities'],
    initialData: recentActivities
  });
  
  const { defaultActions } = useQuickActions();

  return (
    <div className="space-y-16">
      {/* Key Metrics Section */}
      <section className="animate-slide-in-left space-y-8" style={{ animationDelay: "0.1s" }}>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-1.5">Key Metrics</h2>
          <p className="text-sm text-muted-foreground">Overview of your organization's performance</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <section className="lg:col-span-1 animate-slide-in-left" style={{ animationDelay: "0.2s" }}>
          <div className="mb-5">
            <h2 className="text-xl font-semibold mb-1.5">Quick Actions</h2>
            <p className="text-sm text-muted-foreground">Common tasks you can perform</p>
          </div>
          <QuickActions actions={defaultActions} />
        </section>
        
        {/* Recent Activity */}
        <section className="lg:col-span-2 animate-slide-in-right" style={{ animationDelay: "0.2s" }}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-xl font-semibold mb-1.5">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">Latest updates from your workspace</p>
            </div>
            <Link to="/activities">
              <Button variant="link" className="text-primary hover:text-primary/80">View All</Button>
            </Link>
          </div>
          <RecentActivity />
        </section>
      </div>
      
      {/* Employee Overview */}
      <section className="animate-slide-in-left mt-24 mb-16 pt-8" style={{ animationDelay: "0.3s" }}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-1.5">Employee Overview</h2>
            <p className="text-sm text-muted-foreground">Complete list of active employees</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="flex items-center">
              <Filter className="h-4 w-4 mr-1.5" />
              <span>Filter</span>
            </Button>
            <Link to="/employees/new">
              <Button size="sm" className="flex items-center">
                <UserPlus className="h-4 w-4 mr-1.5" />
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
