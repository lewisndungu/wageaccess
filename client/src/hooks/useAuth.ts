import { useUser } from "@/context/UserContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth(requiredRole?: string | string[]) {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login if user is not logged in
      setLocation("/");
      return;
    }

    if (!isLoading && user && requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      
      if (!roles.includes(user.role)) {
        // Redirect to dashboard if user doesn't have required role
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, requiredRole, setLocation]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole: (role: string | string[]) => {
      if (!user) return false;
      
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(user.role);
    }
  };
}
