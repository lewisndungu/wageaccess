import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";

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
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/employees" component={EmployeesPage} />
      <Route path="/employees/:id" component={EmployeeDetailPage} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/attendance/self-log" component={SelfLogPage} />
      <Route path="/payroll" component={PayrollPage} />
      <Route path="/payroll/:id" component={PayrollDetailPage} />
      <Route path="/ewa" component={EWAPage} />
      <Route path="/ewa/wallet" component={WalletPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <MainLayout>
          <Router />
        </MainLayout>
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
