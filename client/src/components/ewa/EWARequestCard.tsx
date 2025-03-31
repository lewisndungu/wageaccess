import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EwaRequest } from '../../../../shared/schema';
import { formatCurrency, formatDateTime } from "@/lib/mock-data";

interface EWARequestCardProps {
  request: EwaRequest;
  onStatusChange?: (id: string, status: string) => void;
}

export function EWARequestCard({ request, onStatusChange }: EWARequestCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case "disbursed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disbursed</Badge>;
      default:
        return null;
    }
  };

  const employee = request.employee;

  return (
    <>
      <Card className="overflow-hidden shadow-glass dark:shadow-glass-dark h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{formatCurrency(request.amount)}</CardTitle>
              <div className="mt-1">{getStatusBadge(request.status)}</div>
            </div>
            {employee && (
              <Avatar>
                <AvatarImage src={employee.profileImage} alt={employee.other_names} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-3">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              {employee && (
                <>
                 <span className="text-sm">{employee.other_names} {employee.surname}</span>
                 <span className="text-xs text-muted-foreground ml-2">({employee.department?.name})</span>
                </>
              )}
              {!employee && <span className="text-sm text-muted-foreground">Employee details unavailable</span>}
            </div>
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{formatDateTime(new Date(request.requestDate).toISOString())}</span>
            </div>
            {request.reason && (
              <div className="pt-2 text-sm border-t">
                <p className="text-muted-foreground text-xs mb-1">Reason:</p>
                <p>{request.reason}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          {(request.status === "rejected" || request.status === "disbursed") && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              disabled
            >
              {request.status === "rejected" ? "Rejected" : "Disbursed"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
}
