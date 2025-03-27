import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EwaRequest } from '../../../../shared/schema';

interface EWARequestCardProps {
  request: EwaRequest;
  onStatusChange?: (id: string, status: string) => void;
}

export function EWARequestCard({ request, onStatusChange }: EWARequestCardProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
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
  
  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-US')}`;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleApprove = async () => {
    setIsProcessing(true);
    
    try {
      await apiRequest('PATCH', `/api/ewa/requests/${request.id}`, {
        status: 'approved',
        approvedBy: 1, // Current user ID
        approvedAt: new Date().toISOString()
      });
      
      setIsApproveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/ewa/requests'] });
      
      toast({
        title: "Request Approved",
        description: `EWA request for ${formatCurrency(request.amount)} has been approved.`,
      });
      
      onStatusChange?.(request.id.toString(), 'approved');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleReject = async () => {
    if (!rejectionReason) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await apiRequest('PATCH', `/api/ewa/requests/${request.id}`, {
        status: 'rejected',
        rejectionReason,
        approvedBy: 1, // Current user ID
        approvedAt: new Date().toISOString()
      });
      
      setIsRejectDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/ewa/requests'] });
      
      toast({
        title: "Request Rejected",
        description: `EWA request for ${formatCurrency(request.amount)} has been rejected.`,
      });
      
      onStatusChange?.(request.id.toString(), 'rejected');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setRejectionReason("");
    }
  };
  
  const handleDisburse = async () => {
    setIsProcessing(true);
    
    try {
      await apiRequest('PATCH', `/api/ewa/requests/${request.id}`, {
        status: 'disbursed',
        disbursedAt: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/ewa/requests'] });
      
      toast({
        title: "Request Disbursed",
        description: `EWA request for ${formatCurrency(request.amount)} has been disbursed.`,
      });
      
      onStatusChange?.(request.id.toString(), 'disbursed');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disburse request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden shadow-glass dark:shadow-glass-dark h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{formatCurrency(request.amount)}</CardTitle>
              <div className="mt-1">{getStatusBadge(request.status)}</div>
            </div>
            <Avatar>
              <AvatarImage src={request.employee?.profileImage} alt={request.employee?.other_names} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-3">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">{request.employee?.other_names} {request.employee?.surname}</span>
              <span className="text-xs text-muted-foreground ml-2">({request.employee?.department?.name})</span>
            </div>
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{formatDate(request.requestDate.toISOString())}</span>
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
          {request.status === "pending" && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsRejectDialogOpen(true)}
                disabled={isProcessing}
              >
                Reject
              </Button>
              <Button 
                size="sm" 
                onClick={() => setIsApproveDialogOpen(true)}
                disabled={isProcessing}
              >
                Approve
              </Button>
            </>
          )}
          
          {request.status === "approved" && (
            <Button 
              className="w-full" 
              size="sm" 
              onClick={handleDisburse}
              disabled={isProcessing}
            >
              Disburse Funds
            </Button>
          )}
          
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
      
      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve EWA Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request for {formatCurrency(request.amount)}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={request.employee?.profileImage} alt={request.employee?.other_names} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{request.employee?.other_names} {request.employee?.surname}</p>
                <p className="text-sm text-muted-foreground">{request.employee?.department?.name}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={isProcessing}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject EWA Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Reason for rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
