import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { employees } from "@/lib/mock-data";
import { Search, Clock, Users, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface OTPFormProps {
  onSuccess?: () => void;
}

export function OTPForm({ onSuccess }: OTPFormProps) {
  const [otp, setOtp] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [clockAction, setClockAction] = useState<'clockIn' | 'clockOut'>('clockIn');
  const [currentTime, setCurrentTime] = useState('');
  const [otpExpiryTime, setOtpExpiryTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // Fetch employees
  const { data: employeeList } = useQuery({
    queryKey: ['/api/employees/active'],
    initialData: employees,
  });

  // Filter employees based on search query
  const filteredEmployees = searchQuery
    ? employeeList.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
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

  const handleGenerateOtp = async () => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // In a real implementation, we would call the server API
      // Mock successful OTP generation for now
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set mock expiry time - 15 minutes from now
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 15);
      setOtpExpiryTime(expiryTime);
      
      setGeneratedOtp(mockOtp);
      
      toast({
        title: "OTP Generated",
        description: `OTP for ${selectedEmployee?.name} has been generated.`,
      });
      
      // In a real app, we would call this API
      // const response = await apiRequest('POST', '/api/attendance/otp', { 
      //   employeeId: parseInt(employeeId) 
      // });
      // const data = await response.json();
      // setGeneratedOtp(data.otp);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate OTP",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid OTP",
        variant: "destructive",
      });
      return;
    }
    
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }
    
    if (generatedOtp !== otp) {
      toast({
        title: "Invalid OTP",
        description: "The OTP you entered is incorrect",
        variant: "destructive",
      });
      return;
    }
    
    if (remainingTime <= 0) {
      toast({
        title: "OTP Expired",
        description: "This OTP has expired. Please generate a new one",
        variant: "destructive",
      });
      return;
    }
    
    setIsVerifying(true);
    
    try {
      // In a real implementation, we would call the API
      // Mock successful verification for now
      // const response = await apiRequest('POST', '/api/attendance/verify-otp', {
      //   code: otp,
      //   employeeId: parseInt(employeeId),
      //   action: clockAction
      // });
      
      // Add a slight delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast({
        title: "Success",
        description: `${selectedEmployee?.name} has been clocked ${clockAction === 'clockIn' ? 'in' : 'out'} successfully at ${currentTime}.`,
      });
      
      // Reset form
      setOtp('');
      setGeneratedOtp(null);
      setOtpExpiryTime(null);
      
      // Call success callback if provided
      onSuccess?.();
      
      // Invalidate queries to refresh attendance data
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/recent-events'] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
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
                          <AvatarImage src={emp.profileImage} alt={emp.name} />
                          <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.department} • #{emp.employeeNumber}</p>
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
                  <AvatarImage src={selectedEmployee.profileImage} alt={selectedEmployee.name} />
                  <AvatarFallback>{selectedEmployee.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center">
                    <h3 className="font-medium">{selectedEmployee.name}</h3>
                    <Badge variant="outline" className="ml-2 text-xs">
                      #{selectedEmployee.employeeNumber}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.department}</p>
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
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating..." : "Generate OTP"}
                </Button>
              </div>
            </div>
          )}
          
          {generatedOtp && (
            <div className="p-5 border rounded-md bg-primary/5 text-center">
              <p className="font-medium text-sm mb-2">Generated OTP for {selectedEmployee?.name}:</p>
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
          disabled={!otp || otp.length !== 6 || !employeeId || isVerifying}
        >
          {isVerifying ? "Verifying..." : `Verify & ${clockAction === 'clockIn' ? 'Clock In' : 'Clock Out'}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
