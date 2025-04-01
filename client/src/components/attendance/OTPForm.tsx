import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Employee } from '@shared/schema';

interface OTPFormProps {
  onSuccess?: () => void;
}

interface VerifyOTPResponse {
  success: boolean;
  message?: string;
  attendance?: any;
}

interface GenerateOTPResponse {
  otp: string;
}

export function OTPForm({ onSuccess }: OTPFormProps) {
  const [otp, setOtp] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [clockAction, setClockAction] = useState<'clockIn' | 'clockOut'>('clockIn');
  const [currentTime, setCurrentTime] = useState('');
  const [otpExpiryTime, setOtpExpiryTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // Fetch employees from server
  const { data: employeeList = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/employees/active'],
    queryFn: () => apiRequest<Employee[]>('GET', '/api/employees/active'),
  });

  // Filter employees based on search query
  const filteredEmployees = searchQuery
    ? employeeList.filter(emp => {
        const employeeName = `${emp.other_names} ${emp.surname}`;
        const employeeNumber = emp.employeeNumber || '';
        const departmentName = typeof emp.department === 'object' ? emp.department.name || '' : (emp.department || '');
        
        return employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          departmentName.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  // Selected employee details
  const selectedEmployee = employeeId 
    ? employeeList.find(emp => emp.id.toString() === employeeId) 
    : null;

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      if (otpExpiryTime) {
        const diffMs = otpExpiryTime.getTime() - now.getTime();
        setRemainingTime(Math.max(0, Math.floor(diffMs / 1000)));
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [otpExpiryTime]);

  // Format remaining time
  const formatRemainingTime = () => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Generate OTP mutation
  const generateOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<GenerateOTPResponse>('POST', '/api/attendance/otp', { 
        employeeId: employeeId
      });
      return response;
    },
    onSuccess: (data) => {
      setGeneratedOtp(data.otp);
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 15);
      setOtpExpiryTime(expiryTime);
      
      toast({
        title: "OTP Generated",
        description: `OTP for ${getEmployeeName(selectedEmployee)} has been generated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate OTP",
        variant: "destructive",
      });
    }
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<VerifyOTPResponse>('POST', '/api/attendance/verify-otp', {
        employeeId: employeeId,
        code: otp,
        action: clockAction
      });
      return response;
    },
    onSuccess: (data) => {
      console.log("OTP verification successful:", data);
      toast({
        title: "Success",
        description: `${getEmployeeName(selectedEmployee)} has been clocked ${clockAction === 'clockIn' ? 'in' : 'out'} successfully at ${currentTime}.`,
      });

      // Reset form
      setOtp('');
      setGeneratedOtp(null);
      setOtpExpiryTime(null);
      setEmployeeId('');  // Reset employee selection too

      // Call success callback if provided
      onSuccess?.();

      // Invalidate queries to refresh attendance data
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/recent-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics/dashboard'] });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to verify OTP";
      console.error("OTP verification error:", errorMessage);
      
      // Check for specific error messages from the API
      if (errorMessage.includes("Already clocked in")) {
        toast({
          title: "Already Clocked In",
          description: `${getEmployeeName(selectedEmployee)} has already clocked in for today.`,
          variant: "destructive",
        });
        
        // Reset the form even on error
        setOtp('');
        setGeneratedOtp(null);
        
        // Invalidate queries to refresh data anyway
        queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/attendance/recent-events'] });
        
        // Call success callback - consider this operation "successful" from a UX perspective
        // as the employee is already clocked in which is the desired state
        onSuccess?.();
      } else if (errorMessage.includes("Already clocked out")) {
        toast({
          title: "Already Clocked Out",
          description: `${getEmployeeName(selectedEmployee)} has already clocked out for today.`,
          variant: "destructive",
        });
        
        // Reset the form even on error
        setOtp('');
        setGeneratedOtp(null);
        
        // Invalidate queries to refresh data anyway
        queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/attendance/recent-events'] });
        
        // Call success callback 
        onSuccess?.();
      } else if (errorMessage.includes("expired")) {
        toast({
          title: "OTP Expired",
          description: "The OTP code has expired. Please generate a new one.",
          variant: "destructive",
        });
        setOtp('');
        setGeneratedOtp(null); 
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  });

  const handleGenerateOtp = async () => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }
    
    generateOtpMutation.mutate();
  };
  
  const handleVerifyOtp = async () => {
    if (!otp || !employeeId) {
      toast({
        title: "Error",
        description: "Please enter OTP and select an employee",
        variant: "destructive",
      });
      return;
    }

    try {
      verifyOtpMutation.mutate();
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during verification",
        variant: "destructive",
      });
    }
  };

  const getEmployeeName = (emp: Employee | null | undefined) => {
    if (!emp) return 'Employee';
    return `${emp.other_names} ${emp.surname}`;
  };

  return (
    <Card className="shadow-glass dark:shadow-glass-dark">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          OTP Attendance System
        </CardTitle>
        <CardDescription>Generate and verify OTP codes for employee check-in</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Find Employee</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or employee number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {searchQuery && filteredEmployees.length > 0 && !employeeId && (
              <div className="border rounded-md mt-1 max-h-48 overflow-y-auto shadow-sm">
                <ul className="py-1 divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredEmployees.map(emp => (
                    <li 
                      key={emp.id} 
                      className="px-3 py-2 hover:bg-primary/5 cursor-pointer"
                      onClick={() => {
                        setEmployeeId(emp.id.toString());
                        setSearchQuery('');
                      }}
                    >
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={emp.avatar_url || undefined} alt={`${emp.other_names} ${emp.surname}`} />
                          <AvatarFallback>{(emp.other_names || emp.surname || '').charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{`${emp.other_names} ${emp.surname}`}</p>
                          <p className="text-xs text-muted-foreground">{emp.position} • #{emp.employeeNumber}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {searchQuery && filteredEmployees.length === 0 && (
              <div className="border rounded-md mt-1 p-3 text-center">
                <p className="text-sm text-muted-foreground">No employees found</p>
              </div>
            )}
          </div>
          
          {selectedEmployee && (
            <div className="border p-4 rounded-md bg-card mt-2">
              <div className="flex items-center">
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarImage src={selectedEmployee.avatar_url || undefined} alt={`${selectedEmployee.other_names} ${selectedEmployee.surname}` || 'Employee'} />
                  <AvatarFallback>{(selectedEmployee.other_names || selectedEmployee.surname || '').charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center">
                    <h3 className="font-medium">{`${selectedEmployee.other_names} ${selectedEmployee.surname}` || 'Unknown'}</h3>
                    <Badge variant="outline" className="ml-2 text-xs">
                      #{selectedEmployee.employeeNumber}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedEmployee?.position}</p>
                  <p className="text-xs mt-1">Current time: {currentTime}</p>
                </div>
              </div>
              
              <div className="flex mt-3 justify-between items-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setEmployeeId('');
                    setGeneratedOtp(null);
                  }}
                >
                  Change Employee
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleGenerateOtp} 
                  disabled={generateOtpMutation.isPending}
                >
                  {generateOtpMutation.isPending ? "Generating..." : "Generate OTP"}
                </Button>
              </div>
            </div>
          )}
          
          {generatedOtp && (
            <div className="p-5 border rounded-md bg-primary/5 text-center">
              <p className="font-medium text-sm mb-2">Generated OTP for {`${selectedEmployee?.other_names} ${selectedEmployee?.surname}` || 'Employee'}:</p>
              <p className="text-3xl font-bold tracking-wider text-primary">{generatedOtp}</p>
              <div className="flex items-center justify-center text-xs mt-2 text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                Expires in: {formatRemainingTime()}
              </div>
              <p className="text-xs mt-2">Provide this code to the employee for check-in verification</p>
            </div>
          )}
        </div>
        
        <div className="border-t pt-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Verify Employee Check-in</Label>
              <Badge variant={clockAction === 'clockIn' ? "default" : "secondary"}>
                {clockAction === 'clockIn' ? "Clock In" : "Clock Out"}
              </Badge>
            </div>
            
            <div className="flex justify-center mb-2">
              <div className="flex space-x-4">
                <Button
                  variant={clockAction === 'clockIn' ? "default" : "outline"}
                  onClick={() => setClockAction('clockIn')}
                  className="w-32"
                >
                  Clock In
                </Button>
                <Button
                  variant={clockAction === 'clockOut' ? "default" : "outline"}
                  onClick={() => setClockAction('clockOut')}
                  className="w-32"
                >
                  Clock Out
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center mb-1">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              Enter the 6-digit OTP provided to the employee
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleVerifyOtp} 
          disabled={!otp || otp.length !== 6 || !employeeId || verifyOtpMutation.isPending}
        >
          {verifyOtpMutation.isPending ? "Verifying..." : `Verify & ${clockAction === 'clockIn' ? 'Clock In' : 'Clock Out'}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
