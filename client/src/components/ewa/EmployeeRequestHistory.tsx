import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Calendar, Clock, CreditCard, CheckCircle2, AlertCircle, Download, InfoIcon } from "lucide-react";
import { formatKES } from "@/lib/tax-utils";

interface EWARequestHistoryProps {
  employeeId: number;
}

interface EWARequest {
  id: number;
  requestDate: string;
  amount: number;
  processingFee: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  disbursementDate: string | null;
  daysWorked?: number;
  earnedWage?: number;
}

export function EmployeeRequestHistory({ employeeId }: EWARequestHistoryProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<EWARequest | null>(null);
  
  // Fetch EWA requests for the employee
  const { data: requests } = useQuery<EWARequest[]>({
    queryKey: ['/api/ewa/employee-requests', employeeId],
    // Mock data
    initialData: [
      { 
        id: 1, 
        requestDate: '2023-07-05T12:00:00Z', 
        amount: 10000, 
        processingFee: 200, 
        reason: 'Medical emergency', 
        status: 'disbursed', 
        disbursementDate: '2023-07-05T16:30:00Z',
        daysWorked: 8,
        earnedWage: 35000
      },
      { 
        id: 2, 
        requestDate: '2023-07-15T10:15:00Z', 
        amount: 15000, 
        processingFee: 300, 
        reason: 'Rent payment', 
        status: 'disbursed', 
        disbursementDate: '2023-07-15T14:45:00Z',
        daysWorked: 12,
        earnedWage: 53000
      },
      { 
        id: 3, 
        requestDate: '2023-07-25T09:30:00Z', 
        amount: 5000, 
        processingFee: 100, 
        reason: 'Utility bills', 
        status: 'pending', 
        disbursementDate: null,
        daysWorked: 18,
        earnedWage: 78000
      }
    ]
  });
  
  // Filter requests based on the active tab
  const filteredRequests = requests.filter(req => {
    if (activeTab === 'all') return true;
    return req.status === activeTab;
  });
  
  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Format time
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format date and time
  const formatDateTime = (dateString: string): string => {
    return `${formatDate(dateString)} at ${formatTime(dateString)}`;
  };
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case 'disbursed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disbursed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>EWA Request History</CardTitle>
          <CardDescription>
            View all your earned wage access requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Requests</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="disbursed">Disbursed</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              {filteredRequests.length > 0 ? (
                <div className="space-y-4">
                  {filteredRequests.map(request => (
                    <div 
                      key={request.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                          {request.status === 'disbursed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : request.status === 'rejected' ? (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <p className="font-medium">{formatKES(request.amount)}</p>
                            <StatusBadge status={request.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Requested on {formatDate(request.requestDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Processing fee:</span> {formatKES(request.processingFee)}
                        </p>
                        {request.disbursementDate && (
                          <p className="text-xs text-muted-foreground">
                            Disbursed on {formatDate(request.disbursementDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <InfoIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
                  <h3 className="mt-2 text-lg font-medium">No requests found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You haven't made any earned wage access requests yet.
                  </p>
                </div>
              )}
            </TabsContent>
            
            {['pending', 'disbursed', 'rejected'].map(status => (
              <TabsContent key={status} value={status} className="mt-0">
                {filteredRequests.length > 0 ? (
                  <div className="space-y-4">
                    {filteredRequests.map(request => (
                      <div 
                        key={request.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                            {request.status === 'disbursed' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : request.status === 'rejected' ? (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <p className="font-medium">{formatKES(request.amount)}</p>
                              <StatusBadge status={request.status} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Requested on {formatDate(request.requestDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Processing fee:</span> {formatKES(request.processingFee)}
                          </p>
                          {request.disbursementDate && (
                            <p className="text-xs text-muted-foreground">
                              Disbursed on {formatDate(request.disbursementDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <InfoIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
                    <h3 className="mt-2 text-lg font-medium">No {status} requests found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You don't have any {status} earned wage access requests.
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Request details dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>EWA Request Details</DialogTitle>
              <DialogDescription>
                Request made on {formatDateTime(selectedRequest.requestDate)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge status={selectedRequest.status} />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Request Amount:</span>
                  <span className="font-medium">{formatKES(selectedRequest.amount)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing Fee:</span>
                  <span>{formatKES(selectedRequest.processingFee)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Deduction:</span>
                  <span className="font-medium">{formatKES(selectedRequest.amount + selectedRequest.processingFee)}</span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Earned Wage Details</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days Worked:</span>
                    <span>{selectedRequest.daysWorked} days</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Earned So Far:</span>
                    <span>{formatKES(selectedRequest.earnedWage || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Request Percentage:</span>
                    <span>
                      {Math.round((selectedRequest.amount / (selectedRequest.earnedWage || 1)) * 100)}% of earned wage
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Reason for Request</h4>
                <p className="text-sm">{selectedRequest.reason}</p>
              </div>
              
              {selectedRequest.status === 'disbursed' && selectedRequest.disbursementDate && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Disbursement Information</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disbursed on:</span>
                    <span>{formatDateTime(selectedRequest.disbursementDate)}</span>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="sm:justify-between">
              {selectedRequest.status === 'pending' && (
                <Button variant="destructive" size="sm">
                  Cancel Request
                </Button>
              )}
              <Button variant="outline" asChild>
                <DialogClose>Close</DialogClose>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}