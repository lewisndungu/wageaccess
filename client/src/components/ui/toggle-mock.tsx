import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, toggleMocking } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Beaker, RefreshCw } from "lucide-react";

export function ToggleMock() {
  const [isMockingEnabled, setIsMockingEnabled] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const handleToggleMock = async () => {
    try {
      // Toggle mocking state in client
      const newState = toggleMocking();
      setIsMockingEnabled(newState);
      
      // Inform the server about the mocking state change
      await apiRequest('POST', '/api/dev/mock-control', {
        action: 'toggle-mocking',
        enabled: newState
      });
      
      toast({
        title: "Mocking State Changed",
        description: `Mocking is now ${newState ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle mocking state",
        variant: "destructive",
      });
    }
  };
  
  const handleResetAttendance = async () => {
    setIsResetting(true);
    
    try {
      await apiRequest('POST', '/api/dev/mock-control', {
        action: 'reset-attendance'
      });
      
      toast({
        title: "Attendance Reset",
        description: "All employees' attendance has been reset.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset attendance data",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Beaker className="mr-2 h-5 w-5" />
          Developer Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="mock-toggle">Mock API Data</Label>
            <p className="text-sm text-muted-foreground">
              Toggle between real and mock data
            </p>
          </div>
          <Switch
            id="mock-toggle"
            checked={isMockingEnabled}
            onCheckedChange={handleToggleMock}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleResetAttendance}
          disabled={isResetting}
        >
          {isResetting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset Attendance Data"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 