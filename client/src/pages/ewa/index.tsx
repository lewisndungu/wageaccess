import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { EWARequestCard } from "@/components/ewa/EWARequestCard";
import { EWARequestForm } from "@/components/ewa/EWARequestForm";
import { ewaRequests, formatCurrency, formatDateTime } from "@/lib/mock-data";
import { BarChart2, CreditCard, Download, FileText, Plus, User, Wallet } from "lucide-react";

interface EWARequest {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeImage?: string;
  department: string;
  requestDate: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "disbursed";
  reason?: string;
  processingFee: number;
}

export default function EWAPage() {
  const [activeTab, setActiveTab] = useState("pending");
  
  const { data, refetch } = useQuery<EWARequest[]>({
    queryKey: ['/api/ewa/requests', { status: activeTab }],
    initialData: ewaRequests as unknown as EWARequest[],
  });
  
  // Create a typed reference to EWA data
  const requests = data as EWARequest[];
  
  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet'],
    initialData: { balance: 350000 },
  });
  
  // Use type guards for filtering
  const filteredRequests = requests.filter((req): req is EWARequest => {
    if (activeTab === "all") return true;
    return req.status === activeTab;
  });
  
  const handleStatusChange = () => {
    refetch();
  };
  
  const columns: ColumnDef<EWARequest>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const request = row.original;
        return (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={request.employeeImage} alt={request.employeeName} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{request.employeeName}</p>
              <p className="text-xs text-muted-foreground">{request.department}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "requestDate",
      header: "Request Date",
      cell: ({ row }) => formatDateTime(row.original.requestDate),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "processingFee",
      header: "Fee",
      cell: ({ row }) => formatCurrency(row.original.processingFee),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
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
            return <Badge>{status}</Badge>;
        }
      },
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => <span className="text-sm">{row.original.reason || "-"}</span>,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Earned Wage Access</h1>
          <p className="text-muted-foreground mt-1">Manage employee early wage access requests and disbursements</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/ewa/analytics">
            <Button variant="outline" size="sm" className="flex items-center h-9">
              <BarChart2 className="mr-1.5 h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link to="/ewa/management-reporting">
            <Button variant="outline" size="sm" className="flex items-center h-9">
              <FileText className="mr-1.5 h-4 w-4" />
              Reports
            </Button>
          </Link>
          <Link to="/ewa/wallet">
            <Button variant="outline" size="sm" className="flex items-center h-9">
              <Wallet className="mr-1.5 h-4 w-4" />
              <span className="whitespace-nowrap">Wallet: {formatCurrency(walletData.balance)}</span>
            </Button>
          </Link>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center h-9">
                <Plus className="mr-1.5 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New EWA Request</DialogTitle>
                <DialogDescription>
                  Create a new earned wage access request
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <EWARequestForm onSuccess={() => {
                  refetch();
                  setActiveTab('pending');
                }} />
              </div>
              
              <DialogFooter>
                <Button variant="outline" asChild>
                  <DialogClose>Cancel</DialogClose>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Use the filter with explicit type guard */}
            <div className="text-2xl font-bold">
              {requests.filter((r): r is EWARequest => r.status === "pending").length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatCurrency(
                requests
                  .filter((r): r is EWARequest => r.status === "pending")
                  .reduce((sum, r) => sum + r.amount, 0)
              )} pending approval
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Disbursed This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                requests
                  .filter((r): r is EWARequest => r.status === "disbursed")
                  .reduce((sum, r) => sum + r.amount, 0)
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {requests.filter((r): r is EWARequest => r.status === "disbursed").length} transactions
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(walletData.balance)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              <Link to="/ewa/wallet">
                <span className="text-primary hover:underline cursor-pointer">Top up wallet</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>EWA Requests</CardTitle>
              <CardDescription>Manage employee earned wage access requests</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="flex items-center h-9 self-start">
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Requests</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="disbursed">Disbursed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <DataTable columns={columns} data={filteredRequests} searchColumn="employeeName" />
            </TabsContent>
            
            <TabsContent value="pending" className="mt-0">
              {filteredRequests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredRequests.map((request: EWARequest) => (
                    <EWARequestCard 
                      key={request.id} 
                      request={request} 
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <CreditCard className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <h3 className="mt-4 text-lg font-medium">No pending requests</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    There are no pending EWA requests at this time. New requests will appear here for your approval.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="approved" className="mt-0">
              {filteredRequests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredRequests.map((request: EWARequest) => (
                    <EWARequestCard 
                      key={request.id} 
                      request={request}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <CreditCard className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <h3 className="mt-4 text-lg font-medium">No approved requests</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    There are no approved EWA requests waiting for disbursement. Approved requests that haven't been paid yet will appear here.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="disbursed" className="mt-0">
              <DataTable columns={columns} data={filteredRequests} searchColumn="employeeName" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
