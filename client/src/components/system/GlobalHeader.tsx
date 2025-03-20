import React from 'react';
import { useSystem } from '@/context/SystemContext';
import { useUser } from '@/context/UserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/mock-data';
import { CalendarDays, AlertTriangle, Clock, InfoIcon } from 'lucide-react';

/**
 * Global Header Component
 * 
 * This component displays system-wide context information at the top of relevant pages,
 * giving users a consistent view of the current system state (pay period, system notifications, etc.)
 */
export function GlobalHeader() {
  const { currentPayPeriod, notifications, flags } = useSystem();
  const { user } = useUser();
  
  // Only display if we have the necessary information
  if (!currentPayPeriod || !user) return null;
  
  // Get active alerts that should be shown in the header
  const activeAlerts = notifications
    .filter(n => !n.read)
    .slice(0, 3); // Show max 3 alerts
  
  // Pay period formatted dates
  const startDate = formatDate(currentPayPeriod.start.toISOString());
  const endDate = formatDate(currentPayPeriod.end.toISOString());
  
  return (
    <Card className="mb-4 bg-muted/50 border-muted shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="flex items-center space-x-2 mb-2 md:mb-0">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Current Pay Period: {startDate} – {endDate}
            </span>
            <Badge variant="outline" className="ml-2">
              {currentPayPeriod.type}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* System status indicators */}
            {flags.attendanceProcessed && (
              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                <Clock className="h-3 w-3 mr-1" />
                Attendance Processed
              </Badge>
            )}
            
            {flags.payrollCalculated && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                <InfoIcon className="h-3 w-3 mr-1" />
                Payroll Ready
              </Badge>
            )}
            
            {activeAlerts.length > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {activeAlerts.length} Alert{activeAlerts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Alert section - only show if there are alerts */}
        {activeAlerts.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="space-y-1">
              {activeAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  className="text-xs py-1 px-2 rounded-sm bg-background flex items-start"
                >
                  {alert.type === 'warning' && (
                    <AlertTriangle className="h-3 w-3 text-amber-500 mr-1 mt-0.5 flex-shrink-0" />
                  )}
                  {alert.type === 'info' && (
                    <InfoIcon className="h-3 w-3 text-blue-500 mr-1 mt-0.5 flex-shrink-0" />
                  )}
                  {alert.type === 'error' && (
                    <AlertTriangle className="h-3 w-3 text-red-500 mr-1 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-medium">{alert.title}: </span>
                    <span className="text-muted-foreground">{alert.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}