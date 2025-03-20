import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { useJahaziiTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  SearchIcon, MenuIcon, BellIcon, User, LayoutDashboard, 
  Users, Clock, DollarSign, CreditCard, LogIn, UserCog, 
  HelpCircle, BadgeDollarSign, ArrowRight
} from "lucide-react";

interface SidebarLinkProps {
  to: string;
  icon: string;
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
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-2">
            <div className="bg-primary rounded-md h-8 w-8 flex items-center justify-center text-white">
              <i className="ri-money-dollar-circle-line text-xl"></i>
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
                  alt={user?.name || "User"} 
                />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.name || "User"}</p>
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
                icon="dashboard-line" 
                label="Dashboard" 
                active={location.pathname === '/' || location.pathname === '/dashboard'} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/employees" 
                icon="team-line" 
                label="Employees" 
                active={location.pathname.startsWith('/employees')} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/attendance" 
                icon="time-line" 
                label="Attendance" 
                active={location.pathname.startsWith('/attendance')} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/payroll" 
                icon="money-dollar-box-line" 
                label="Payroll" 
                active={location.pathname.startsWith('/payroll')} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/ewa" 
                icon="bank-card-line" 
                label="Earned Wage Access" 
                active={location.pathname.startsWith('/ewa')} 
              />
            </li>
            <li>
              <SidebarLink 
                to="/attendance/self-log" 
                icon="login-box-line" 
                label="Self-Log" 
                active={location.pathname === '/attendance/self-log'} 
              />
            </li>
            <li className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
              <SidebarLink 
                to="/profile" 
                icon="user-settings-line" 
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
                  <i className="ri-arrow-right-s-line mx-1"></i>
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
                    alt={user?.name || "User"} 
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
          {children}
        </main>
        
        {/* Footer */}
        <footer className="mt-auto py-6 px-4 lg:px-6 border-t border-gray-200 dark:border-gray-800">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="bg-primary rounded-md h-8 w-8 flex items-center justify-center text-white mr-2">
                <i className="ri-money-dollar-circle-line text-xl"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">© 2023 Jahazii. All rights reserved.</p>
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
