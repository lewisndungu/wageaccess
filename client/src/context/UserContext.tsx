import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { User } from '../../../shared/schema';

type UserRole = "employee" | "supervisor" | "hr" | "admin";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const { data, isLoading, error } = useQuery<User>({
    queryKey: ['/api/users/current'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on error
  });
  
  // Handle errors separately with useEffect
  useEffect(() => {
    if (error) {
      // If we get a 404, we don't need to alert the user - just no current user
      if (error instanceof Error && error.message.includes('404')) {
        console.log('No active user session found');
      } else {
        console.error('Error fetching user:', error);
      }
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data]);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiRequest<{user: User}>('POST', '/api/auth/login', { username, password });
      setUser(response.user);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.username}!`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : 'Invalid username or password',
        variant: "destructive",
      });
      throw new Error(error instanceof Error ? error.message : 'Failed to login');
    }
  };

  const logout = () => {
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  return (
    <UserContext.Provider value={{ user, isLoading, error: error as Error, login, logout, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
