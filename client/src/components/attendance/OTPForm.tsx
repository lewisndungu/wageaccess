import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OTPFormProps {
  onSuccess?: () => void;
}

export function OTPForm({ onSuccess }: OTPFormProps) {
  const [otp, setOtp] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [clockAction, setClockAction] = useState<'clockIn' | 'clockOut'>('clockIn');

  const handleGenerateOtp = async () => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Please enter an employee ID",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const response = await apiRequest('POST', '/api/attendance/otp', { 
        employeeId: parseInt(employeeId) 
      });
      const data = await response.json();
      
      setGeneratedOtp(data.otp);
      toast({
        title: "OTP Generated",
        description: `OTP for employee ${employeeId} has been generated.`,
      });
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
    
    setIsVerifying(true);
    
    try {
      const response = await apiRequest('POST', '/api/attendance/verify-otp', {
        code: otp,
        action: clockAction
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Employee has been clocked ${clockAction === 'clockIn' ? 'in' : 'out'} successfully.`,
        });
        setOtp('');
        setGeneratedOtp(null);
        onSuccess?.();
      }
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
        <CardTitle>OTP Attendance System</CardTitle>
        <CardDescription>Generate and verify OTP codes for attendance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <div className="flex space-x-2">
              <Input
                id="employeeId"
                placeholder="Enter employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
              <Button onClick={handleGenerateOtp} disabled={isGenerating}>
                Generate OTP
              </Button>
            </div>
          </div>
          
          {generatedOtp && (
            <div className="p-4 border rounded-md bg-primary/5">
              <p className="font-medium text-sm mb-1">Generated OTP:</p>
              <p className="text-2xl font-bold tracking-wider text-primary">{generatedOtp}</p>
              <p className="text-xs mt-2 text-muted-foreground">This OTP will expire in 15 minutes</p>
            </div>
          )}
        </div>
        
        <div className="border-t pt-4">
          <div className="space-y-2">
            <Label>Verify OTP</Label>
            <div className="flex justify-center mb-4">
              <div className="flex space-x-4">
                <Button
                  variant={clockAction === 'clockIn' ? "default" : "outline"}
                  onClick={() => setClockAction('clockIn')}
                >
                  Clock In
                </Button>
                <Button
                  variant={clockAction === 'clockOut' ? "default" : "outline"}
                  onClick={() => setClockAction('clockOut')}
                >
                  Clock Out
                </Button>
              </div>
            </div>
            <div className="flex justify-center mb-4">
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
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleVerifyOtp} 
          disabled={!otp || otp.length !== 6 || isVerifying}
        >
          Verify & {clockAction === 'clockIn' ? 'Clock In' : 'Clock Out'}
        </Button>
      </CardFooter>
    </Card>
  );
}
