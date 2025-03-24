import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import { SystemProvider, useSystem, SystemNotification } from "@/context/SystemContext";
import { ThemeProvider } from "@/components/ui/theme-provider";

import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/dashboard";
import EmployeesPage from "@/pages/employees/index";
import EmployeeDetailPage from "@/pages/employees/detail";
import AttendancePage from "@/pages/attendance/index";
import SelfLogPage from "@/pages/attendance/self-log";
import PayrollPage from "@/pages/payroll/index";
import PayrollDetailPage from "@/pages/payroll/detail";
import ProcessPayrollPage from "@/pages/payroll/process";
import EWAPage from "@/pages/ewa/index";
import WalletPage from "@/pages/ewa/wallet";
import EWAAnalyticsPage from "@/pages/ewa/analytics";
import EmployeeEWADashboardPage from "@/pages/ewa/employee-dashboard";
import ManagementReportingPage from "@/pages/ewa/management-reporting";
import SelfServicePage from "@/pages/ewa/self-service";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

// System-wide notifications component
function SystemNotifications() {
  const { notifications, clearNotification } = useSystem();
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification: SystemNotification) => (
        <div 
          key={notification.id} 
          className={`
            p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-y-0
            ${notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500 text-green-700' : ''}
            ${notification.type === 'error' ? 'bg-red-50 border-l-4 border-red-500 text-red-700' : ''}
            ${notification.type === 'warning' ? 'bg-amber-50 border-l-4 border-amber-500 text-amber-700' : ''}
            ${notification.type === 'info' ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : ''}
          `}
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{notification.title}</h4>
              <p className="text-sm mt-1">{notification.message}</p>
            </div>
            <button 
              onClick={() => clearNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// System-wide loading overlay
function LoadingOverlay() {
  const { isLoading } = useSystem();
  
  if (!isLoading) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col items-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/employees/:id" element={<EmployeeDetailPage />} />
      <Route path="/attendance" element={<AttendancePage />} />
      <Route path="/attendance/self-log" element={<SelfLogPage />} />
      <Route path="/payroll" element={<PayrollPage />} />
      <Route path="/payroll/process" element={<ProcessPayrollPage />} />
      <Route path="/payroll/:id" element={<PayrollDetailPage />} />
      <Route path="/ewa" element={<EWAPage />} />
      <Route path="/ewa/wallet" element={<WalletPage />} />
      <Route path="/ewa/analytics" element={<EWAAnalyticsPage />} />
      <Route path="/ewa/employee-dashboard" element={<EmployeeEWADashboardPage />} />
      <Route path="/ewa/employee-dashboard/:id" element={<EmployeeEWADashboardPage />} />
      <Route path="/ewa/management-reporting" element={<ManagementReportingPage />} />
      <Route path="/ewa/self-service" element={<SelfServicePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="jahazii-theme">
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <SystemProvider>
              <MainLayout>
                <AppRoutes />
              </MainLayout>
              <SystemNotifications />
              <LoadingOverlay />
              <Toaster />
            </SystemProvider>
          </UserProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
