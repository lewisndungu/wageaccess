import { useState, useEffect, ReactNode } from "react";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { useSystem } from "@/context/SystemContext";
import { useJahaziiTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlobalHeader } from "@/components/system/GlobalHeader";
import { 
  SearchIcon, MenuIcon, BellIcon, User, LayoutDashboard, 
  Users, Clock, DollarSign, CreditCard, LogIn, UserCog, 
  HelpCircle, BadgeDollarSign, ArrowRight,
  MessageCircle,
  Upload
} from "lucide-react";
import JahaziiIcon from "@/assets/JahaziiIcon.svg";

// Error boundary component
export class AppErrorBoundary extends React.Component<{ children: ReactNode, fallback?: ReactNode }> {
  state = { hasError: false, error: null as Error | null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
          <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h1 className="text-xl font-bold text-center text-red-600 dark:text-red-400">
              Something went wrong
            </h1>
            <p className="text-gray-700 dark:text-gray-300">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button className="w-full" onClick={() => window.location.reload()}>
              Refresh the page
            </Button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const SidebarLink = ({ to, icon, label, active }: SidebarLinkProps) => (
  <Link 
    to={to}
    className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg 
      ${active 
        ? "text-white bg-primary hover:bg-primary/90" 
        : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
  >
    <span className="text-xl mr-3">{icon}</span>
    <span>{label}</span>
  </Link>
);

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user } = useUser();
  const { theme, toggleTheme } = useJahaziiTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Dashboard");
  
  useEffect(() => {
    // Update page title based on current location
    const path = location.pathname.split('/')[1] || 'dashboard';
    setPageTitle(path.charAt(0).toUpperCase() + path.slice(1));
  }, [location.pathname]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 z-40 h-screen transition-transform 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 
          dark:border-gray-800 shadow-glass dark:shadow-glass-dark lg:animate-fade-in`}
      >
        {/* Logo section */}
        <div className="h-16 flex items-center justify-start pl-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 flex items-center justify-center text-white">
              <img src={JahaziiIcon} alt="Jahazii" className="h-8 w-8" />
            </div>
            <span className="text-xl font-semibold text-primary">Jahazii</span>
          </div>
        </div>
        
        {/* User info section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="relative">
              <Avatar>
                <AvatarImage 
                  src={user?.profileImage || "https://ui-avatars.com/api/?name=User"} 
                  alt={user?.username || "User"} 
                />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.username || "User"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role === 'hr' ? 'HR Manager' : user?.role || 'User'}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            <li>
              <SidebarLink 
                to="/dashboard" 
                icon={<LayoutDashboard size={18} />} 
                label="Dashboard" 
                active={location.pathname === '/' || location.pathname === '/dashboard'} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/chat" 
                icon={<Upload size={18} />} 
                label="Upload" 
                active={location.pathname === '/chat'} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/employees" 
                icon={<Users size={18} />} 
                label="Employees" 
                active={location.pathname.startsWith('/employees')} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/attendance" 
                icon={<Clock size={18} />} 
                label="Attendance" 
                active={location.pathname.startsWith('/attendance')} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/payroll" 
                icon={<DollarSign size={18} />} 
                label="Payroll" 
                active={location.pathname.startsWith('/payroll')} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/ewa" 
                icon={<CreditCard size={18} />} 
                label="Earned Wage Access" 
                active={location.pathname.startsWith('/ewa')} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/attendance/self-log" 
                icon={<LogIn size={18} />} 
                label="Self-Log" 
                active={location.pathname === '/attendance/self-log'} 
              />
            </li>
            <li className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
              <SidebarLink 
                to="/profile" 
                icon={<UserCog size={18} />} 
                label="My Profile" 
                active={location.pathname === '/profile'} 
              />
            </li>
          </ul>
        </nav>
        
        {/* Bottom section with version and support */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col space-y-2">
            <a href="#" className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-secondary">Help & Support</a>
            <p className="text-xs text-gray-500 dark:text-gray-400">Version 1.0.0</p>
          </div>
        </div>
      </aside>
      
      {/* Mobile sidebar toggle */}
      <div className="fixed bottom-4 right-4 z-50 lg:hidden">
        <Button 
          onClick={toggleSidebar} 
          size="icon"
          className="rounded-full"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-center px-4 py-3 lg:px-6">
            {/* Left side: Breadcrumb & Page title */}
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                className="mr-2 lg:hidden"
                onClick={toggleSidebar}
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{pageTitle}</h1>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Home</span>
                  <ArrowRight className="mx-1 h-3 w-3" />
                  <span>{pageTitle}</span>
                </div>
              </div>
            </div>
            
            {/* Right side: Search, notifications, theme toggle, and profile */}
            <div className="flex items-center space-x-3">
              {/* Search button */}
              <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
                <SearchIcon className="h-5 w-5" />
              </Button>
              
              {/* Notifications */}
              <div className="relative">
                <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
                  <BellIcon className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
                </Button>
              </div>
              
              {/* Dark mode toggle */}
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  id="themeToggle" 
                  checked={theme === 'dark'}
                  onChange={toggleTheme}
                  className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-2 border-gray-300 appearance-none cursor-pointer transition-transform duration-200 ease-in-out right-0"
                  style={{ 
                    transform: theme === 'dark' ? 'translateX(100%)' : 'translateX(0)',
                    borderColor: theme === 'dark' ? 'hsl(var(--primary))' : undefined
                  }}
                />
                <label 
                  htmlFor="themeToggle" 
                  className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
                  style={{ 
                    backgroundColor: theme === 'dark' ? 'hsl(var(--primary))' : undefined
                  }}
                ></label>
              </div>
              
              {/* Profile  */}
              <div className="relative hidden sm:block">
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage 
                    src={user?.profileImage || "https://ui-avatars.com/api/?name=User"} 
                    alt={user?.username || "User"} 
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="p-4 lg:p-6 animate-fade-in">
          {/* Global system context header - only shown on certain pages */}
          {(location.pathname.startsWith('/attendance') || 
            location.pathname.startsWith('/payroll') || 
            location.pathname.startsWith('/ewa')) && (
            <GlobalHeader />
          )}
          <AppErrorBoundary>
            {children}
          </AppErrorBoundary>
        </main>
        
        {/* Footer */}
        <footer className="mt-auto py-6 px-4 lg:px-6 border-t border-gray-200 dark:border-gray-800">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">© 20235Jahazii. All rights reserved.</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-secondary">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-secondary">Terms of Service</a>
              <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-secondary">Help Center</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
