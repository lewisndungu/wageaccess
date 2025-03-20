import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

type UserRole = "employee" | "supervisor" | "hr" | "admin";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  profileImage?: string;
  departmentId?: number;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/users/current'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data]);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to login');
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, isLoading, error: error as Error, login, logout }}>
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
