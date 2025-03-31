import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Employee } from '@shared/schema';


interface ClockInOutProps {
  onSuccess?: () => void;
}

export function ClockInOut({ onSuccess }: ClockInOutProps) {
  const [employeeId, setEmployeeId] = useState<string>("");
  const [isClockingIn, setIsClockingIn] = useState(true);
  const [useGeoLocation, setUseGeoLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  const { data: employeeList = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees/active'],
  });

  // Get selected employee
  const selectedEmployee = employeeId 
    ? employeeList.find(emp => emp.id.toString() === employeeId) 
    : null;

  // Get employee name and department safely
  const getEmployeeName = (employee: any) => {
    if (!employee) return '';
    return employee.user?.name || employee.other_names || employee.surname || 'Unknown';
  };

  const getEmployeeDepartment = (employee: any) => {
    if (!employee) return '';
    return typeof employee.department === 'object' 
      ? employee.department.name 
      : (employee.department || 'Unknown');
  };

  // Store offline clock events
  const [offlineEvents, setOfflineEvents] = useState<Array<{
    employeeId: number;
    action: 'clockIn' | 'clockOut';
    timestamp: string;
    location: {lat: number, lng: number} | null;
    retryCount: number;
  }>>([]);

  // Flag to show if we're in offline sync mode
  const [isSyncing, setIsSyncing] = useState(false);

  // Process any stored offline events
  const syncOfflineEvents = async () => {
    if (offlineEvents.length === 0) return;
    
    setIsSyncing(true);
    
    const updatedEvents = [...offlineEvents];
    const successfulEventIndexes: number[] = [];
    
    for (let i = 0; i < updatedEvents.length; i++) {
      const event = updatedEvents[i];
      
      try {
        // Attempt to submit the stored event
        await apiRequest('POST', '/api/attendance/clock', {
          employeeId: event.employeeId,
          action: event.action,
          timestamp: event.timestamp,
          location: event.location
        });
        
        // Mark this event as successfully processed
        successfulEventIndexes.push(i);
        
        toast({
          title: "Sync Success",
          description: `Successfully processed offline ${event.action === 'clockIn' ? 'clock in' : 'clock out'} event.`,
        });
      } catch (error) {
        // Update retry count
        updatedEvents[i].retryCount += 1;
        
        // If we've tried too many times, notify the user but keep it in the queue
        if (updatedEvents[i].retryCount >= 3) {
          toast({
            title: "Sync Warning",
            description: `Having trouble syncing an attendance record. Will retry later.`,
          });
        }
      }
    }
    
    // Remove successfully processed events
    const filteredEvents = updatedEvents.filter((_, index) => !successfulEventIndexes.includes(index));
    setOfflineEvents(filteredEvents);
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    
    setIsSyncing(false);
  };

  // Clock attendance mutation
  const clockMutation = useMutation({
    mutationFn: async (payload: {
      employeeId: number;
      action: 'clockIn' | 'clockOut';
      timestamp: string;
      location: {lat: number, lng: number} | null;
    }) => {
      return apiRequest('POST', '/api/attendance/clock', payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${getEmployeeName(selectedEmployee)} has been clocked ${isClockingIn ? 'in' : 'out'} successfully.`,
      });

      // Invalidate attendance queries to refresh data with the correct parameters
      const today = new Date();
      const employeeIdParam = employeeId ? parseInt(employeeId) : undefined;
      
      // Only invalidate with specific parameters to avoid 400 errors
      if (employeeIdParam) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/attendance', employeeIdParam.toString(), today.toISOString(), today.toISOString()] 
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/recent-events'] });
      
      // Call success callback if provided
      onSuccess?.();
      
      // Reset state
      setEmployeeId("");
      setCurrentLocation(null);
    },
    onError: (error) => {
      console.error("API error:", error);
      
      // Format the timestamp properly
      const now = new Date();
      const timestamp = now.toISOString();
      
      // Store the event for later processing
      setOfflineEvents(prev => [...prev, {
        employeeId: parseInt(employeeId),
        action: isClockingIn ? 'clockIn' : 'clockOut' as const,
        timestamp: timestamp,
        location: currentLocation,
        retryCount: 0
      }]);
      
      toast({
        title: "Temporary Offline Mode",
        description: `Your ${isClockingIn ? 'clock in' : 'clock out'} has been saved locally and will be synchronized when connection is restored.`,
      });
    }
  });

  // Clock in/out handler with offline support
  const handleClockAction = async () => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    let locationData: {lat: number, lng: number} | null = null;

    try {
      // Get current location if enabled
      if (useGeoLocation && navigator.geolocation) {
        try {
          locationData = await new Promise<{lat: number, lng: number} | null>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const locationData = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                setCurrentLocation(locationData);
                resolve(locationData);
              },
              (error) => {
                toast({
                  title: "Location Warning",
                  description: `Failed to get location: ${error.message}. Proceeding without location data.`,
                });
                resolve(null);
              },
              { timeout: 5000 } // 5 second timeout
            );
          });
        } catch (locationError) {
          console.error("Location error:", locationError);
          toast({
            title: "Location Warning",
            description: "Unable to get location. Proceeding without location data.",
          });
        }
      }

      // Format the timestamp properly
      const now = new Date();
      const timestamp = now.toISOString();

      // Construct payload with type safety for location data
      const payload = {
        employeeId: parseInt(employeeId),
        action: isClockingIn ? 'clockIn' as const : 'clockOut' as const,
        timestamp: timestamp,
        location: locationData
      };

      // Call mutation to clock in/out
      clockMutation.mutate(payload);
      
      // If we have offline events, try to sync them
      if (offlineEvents.length > 0 && !isSyncing) {
        syncOfflineEvents();
      }
    } catch (error) {
      console.error("Clock action error:", error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Failed to process attendance: ${error.message}` 
          : "Failed to process attendance: Unknown error",
        variant: "destructive",
      });
    }
  };

  // Get the current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <Card className="shadow-glass dark:shadow-glass-dark">
      <CardHeader>
        <CardTitle>Clock {isClockingIn ? 'In' : 'Out'}</CardTitle>
        <CardDescription>Record employee attendance manually</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="employee">Employee</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger id="employee">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employeeList.map(emp => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.other_names} {emp.surname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <div className="border p-3 rounded-md bg-primary/5">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                {selectedEmployee.avatar_url ? (
                  <img 
                    src={selectedEmployee.avatar_url} 
                    alt={getEmployeeName(selectedEmployee)} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary font-medium">
                    {getEmployeeName(selectedEmployee).charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium">{getEmployeeName(selectedEmployee)}</p>
                <p className="text-sm text-muted-foreground">{getEmployeeDepartment(selectedEmployee)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Clock className="text-muted-foreground" />
          <span className="text-lg font-medium">{getCurrentTime()}</span>
          <Badge className={isClockingIn ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
            {isClockingIn ? "Clock In" : "Clock Out"}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="use-location"
            checked={useGeoLocation}
            onChange={(e) => setUseGeoLocation(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="use-location" className="flex items-center cursor-pointer">
            <MapPin className="h-4 w-4 mr-1" />
            Use current location
          </Label>
        </div>

        <div className="flex items-center justify-center space-x-4 pt-2">
          <Button 
            variant={isClockingIn ? "default" : "outline"}
            onClick={() => setIsClockingIn(true)}
            className="flex-1"
          >
            Clock In
          </Button>
          <Button 
            variant={!isClockingIn ? "default" : "outline"}
            onClick={() => setIsClockingIn(false)}
            className="flex-1"
          >
            Clock Out
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleClockAction} 
          disabled={!employeeId || clockMutation.isPending}
        >
          {clockMutation.isPending ? "Processing..." : `Confirm ${isClockingIn ? 'Clock In' : 'Clock Out'}`}
        </Button>
      </CardFooter>
    </Card>
  );
}