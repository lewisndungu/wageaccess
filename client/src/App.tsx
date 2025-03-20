import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import { SystemProvider } from "@/context/SystemContext";
import { ThemeProvider } from "@/components/ui/theme-provider";

import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/dashboard";
import EmployeesPage from "@/pages/employees/index";
import EmployeeDetailPage from "@/pages/employees/detail";
import AttendancePage from "@/pages/attendance/index";
import SelfLogPage from "@/pages/attendance/self-log";
import PayrollPage from "@/pages/payroll/index";
import PayrollDetailPage from "@/pages/payroll/detail";
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
  // This would utilize the notifications from SystemContext
  // to show floating alerts for cross-module events 
  return null; // Placeholder - will be implemented later
}

// System-wide loading overlay
function LoadingOverlay() {
  // This would show a full-screen loading overlay when system-wide loading is active
  return null; // Placeholder - will be implemented later
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
