import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { EwaRequest } from '../../../../shared/schema';
import { formatCurrency } from "@/lib/mock-data"; // Corrected import path
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface RequestActionsProps {
  request: EwaRequest;
  onActionComplete: () => void;
}

interface OutstandingAdvanceSummary {
  totalOutstanding: number;
  count: number;
}

export function RequestActions({ request, onActionComplete }: RequestActionsProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDisburseConfirmOpen, setIsDisburseConfirmOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await apiRequest('PATCH', `/api/ewa/requests/${request.id}`, {
        status: 'approved',
        approvedBy: 1, // Placeholder: Replace with actual current user ID
        approvedAt: new Date().toISOString()
      });
      setIsApproveDialogOpen(false);
      onActionComplete(); // Notify parent to refetch data
      toast({
        title: "Request Approved",
        description: `EWA request for ${formatCurrency(request.amount)} has been approved.`,
      });
    } catch (error) {
      toast({
        title: "Error Approving",
        description: error instanceof Error ? error.message : "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await apiRequest('PATCH', `/api/ewa/requests/${request.id}`, {
        status: 'rejected',
        rejectionReason,
        approvedBy: 1, // Placeholder: Replace with actual current user ID
        approvedAt: new Date().toISOString() // Or perhaps `rejectedAt`?
      });
      setIsRejectDialogOpen(false);
      onActionComplete(); // Notify parent to refetch data
      toast({
        title: "Request Rejected",
        description: `EWA request for ${formatCurrency(request.amount)} has been rejected.`,
      });
    } catch (error) {
      toast({
        title: "Error Rejecting",
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
      setIsDisburseConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/ewa/requests'] });
      onActionComplete();
      toast({
        title: "Request Disbursed",
        description: `EWA request for ${formatCurrency(request.amount)} has been disbursed.`,
      });
    } catch (error) {
      toast({
        title: "Error Disbursing",
        description: error instanceof Error ? error.message : "Failed to disburse request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Ensure employee data exists before rendering dialogs
  const employee = request.employee;

  return (
    <>
      <div className="flex space-x-2">
        {request.status === 'pending' && (
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
        {request.status === 'approved' && (
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
              onClick={() => setIsDisburseConfirmOpen(true)}
              disabled={isProcessing}
            >
              Disburse
            </Button>
          </>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve EWA Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request for {formatCurrency(request.amount)}?
            </DialogDescription>
          </DialogHeader>
          {employee && (
             <div className="py-4">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={employee.profileImage} alt={employee.other_names} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{employee.other_names} {employee.surname}</p>
                  <p className="text-sm text-muted-foreground">{employee.department?.name}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
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
              Please provide a reason for rejecting this EWA request for {formatCurrency(request.amount)}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (required)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Disburse Confirmation Dialog */}
      <Dialog open={isDisburseConfirmOpen} onOpenChange={setIsDisburseConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Disbursement</DialogTitle>
            <DialogDescription>
              Are you sure you want to disburse {formatCurrency(request.amount)} for this approved EWA request?
            </DialogDescription>
          </DialogHeader>
          {employee && (
             <div className="py-4">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={employee.profileImage} alt={employee.other_names} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{employee.other_names} {employee.surname}</p>
                  <p className="text-sm text-muted-foreground">{employee.department?.name}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDisburseConfirmOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleDisburse} disabled={isProcessing}>Confirm Disburse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 