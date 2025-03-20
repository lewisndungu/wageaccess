import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentPayPeriod } from '@/lib/integration-service';

/**
 * System Context
 * 
 * This context provides system-wide states that need to be shared across
 * different components and modules of the application, enabling tight
 * integration between different areas of the system.
 */

type PayPeriod = {
  start: Date;
  end: Date;
  isActive: boolean;
  type: 'monthly' | 'biweekly' | 'weekly';
};

export type SystemContextType = {
  // Pay period context
  currentPayPeriod: PayPeriod | null;
  setCustomPayPeriod: (start: Date, end: Date) => void;
  resetToDefaultPayPeriod: () => void;
  
  // App-wide loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // System-wide notifications
  notifications: SystemNotification[];
  addNotification: (notification: SystemNotification) => void;
  clearNotification: (id: string) => void;
  
  // Global state flags
  flags: Record<string, boolean>;
  setFlag: (key: string, value: boolean) => void;
  
  // Environment info
  environment: {
    isMobile: boolean;
    isProduction: boolean;
  };
};

export type SystemNotification = {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  module?: 'attendance' | 'payroll' | 'ewa' | 'employees' | 'system';
  autoClose?: boolean;
  duration?: number;
  read?: boolean;
};

// Create the context with a default undefined value
const SystemContext = createContext<SystemContextType | undefined>(undefined);

// Provider component
export const SystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Pay period state
  const [customPayPeriod, setCustomPayPeriod] = useState<PayPeriod | null>(null);
  
  // Get default pay period
  const defaultPayPeriod = getCurrentPayPeriod();
  const currentPayPeriod = customPayPeriod || {
    start: defaultPayPeriod.start,
    end: defaultPayPeriod.end,
    isActive: true,
    type: 'monthly' as const
  };
  
  // System-wide loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // System-wide notifications
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  
  // Global state flags
  const [flags, setFlags] = useState<Record<string, boolean>>({
    attendanceProcessed: false,
    payrollCalculated: false,
    ewaEnabled: true
  });
  
  // Environment detection
  const isMobile = window.innerWidth <= 768;
  const isProduction = window.location.hostname !== 'localhost';
  
  // Set custom pay period
  const handleSetCustomPayPeriod = (start: Date, end: Date) => {
    setCustomPayPeriod({
      start,
      end,
      isActive: true,
      type: 'monthly'
    });
  };
  
  // Reset to default pay period
  const resetToDefaultPayPeriod = () => {
    setCustomPayPeriod(null);
  };
  
  // Add notification
  const addNotification = (notification: SystemNotification) => {
    setNotifications(prev => [notification, ...prev]);
    
    // Auto-close notification if specified
    if (notification.autoClose) {
      setTimeout(() => {
        clearNotification(notification.id);
      }, notification.duration || 5000);
    }
  };
  
  // Clear notification
  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };
  
  // Set flag
  const setFlag = (key: string, value: boolean) => {
    setFlags(prev => ({ ...prev, [key]: value }));
  };
  
  // Create value object
  const value: SystemContextType = {
    currentPayPeriod,
    setCustomPayPeriod: handleSetCustomPayPeriod,
    resetToDefaultPayPeriod,
    isLoading,
    setIsLoading,
    notifications,
    addNotification,
    clearNotification,
    flags,
    setFlag,
    environment: {
      isMobile,
      isProduction
    }
  };
  
  return (
    <SystemContext.Provider value={value}>
      {children}
    </SystemContext.Provider>
  );
};

// Custom hook to use the context
export const useSystem = (): SystemContextType => {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};

// Create a notification generator helper
export function createSystemNotification(
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message: string,
  module?: 'attendance' | 'payroll' | 'ewa' | 'employees' | 'system',
  autoClose: boolean = true
): SystemNotification {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    title,
    message,
    timestamp: new Date(),
    module,
    autoClose,
    duration: 5000,
    read: false
  };
}