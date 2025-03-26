import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Define mock data state
interface MockState {
  attendance: Record<string, any[]>;
  employees: any[];
  clockedInEmployees: number[];
  isMockingEnabled: boolean;
}

// Initialize mock state
const mockState: MockState = {
  attendance: {},
  employees: [],
  clockedInEmployees: [],
  isMockingEnabled: false
};

// Toggle mock functionality
export function toggleMocking(enable?: boolean) {
  mockState.isMockingEnabled = enable !== undefined ? enable : !mockState.isMockingEnabled;
  console.log(`Client mocking ${mockState.isMockingEnabled ? 'enabled' : 'disabled'}`);
  
  // Invalidate queries to refresh data
  queryClient.invalidateQueries();
  
  return mockState.isMockingEnabled;
}

// Reset mock state (for testing)
export function resetMockState() {
  mockState.attendance = {};
  mockState.employees = [];
  mockState.clockedInEmployees = [];
  
  // Invalidate queries to refresh data
  queryClient.invalidateQueries();
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Make an API request with proper typing
 * @param method HTTP method (GET, POST, PATCH, DELETE)
 * @param url API endpoint
 * @param data Optional data to send
 * @returns Parsed response of the specified type
 */
export async function apiRequest<T>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  try {
    // If mocking is disabled, proceed with normal API request
    if (!mockState.isMockingEnabled) {
      const res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });

      await throwIfResNotOk(res);
      return await res.json() as T;
    }
    
    // Handle specific mock endpoints
    if (url === '/api/attendance/clock' && method === 'POST') {
      // Handle clock in/out requests
      const payload = data as { employeeId: number, action: 'clockIn' | 'clockOut' };
      
      if (payload.action === 'clockIn') {
        mockState.clockedInEmployees.push(payload.employeeId);
      } else {
        mockState.clockedInEmployees = mockState.clockedInEmployees.filter(id => id !== payload.employeeId);
      }
      
      return { success: true, message: `Employee ${payload.action === 'clockIn' ? 'clocked in' : 'clocked out'} successfully` } as T;
    }
    
    // For other requests, pass through to the server
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return await res.json() as T;
  } catch (error) {
    console.error(`API Request Error (${method} ${url}):`, error);
    throw error;
  }
}

type ErrorBehavior = "returnNull" | "throw";

export const getQueryFn = 
  ({ on401 = "throw", on404 = "throw" }: { on401?: ErrorBehavior, on404?: ErrorBehavior }) =>
  async ({ queryKey }: any) => {
    try {
      const url = queryKey[0] as string;
      
      const res = await fetch(url, {
        credentials: "include",
      });

      if ((on401 === "returnNull" && res.status === 401) || 
          (on404 === "returnNull" && res.status === 404)) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Query Error (${queryKey[0]}):`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ 
        on401: "throw",
        on404: "returnNull" // Return null for 404 errors instead of throwing
      }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enabled refetching when window regains focus
      staleTime: 30000, // Data stays fresh for 30 seconds instead of Infinity
      retry: (failureCount, error) => {
        // Don't retry on 404 errors
        if (error instanceof Error && error.message.includes('404')) {
          return false;
        }
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Expose queryClient globally for debugging purposes
if (typeof window !== 'undefined') {
  (window as any)._queryClient = queryClient;
  console.log('QueryClient exposed globally for debugging as window._queryClient');
}
