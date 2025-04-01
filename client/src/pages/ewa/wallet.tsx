import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import axios from 'axios';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { walletData, formatCurrency, formatDateTime } from "@/lib/mock-data";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, Banknote, Download, Info, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletTransaction, WalletApiResponse } from "@shared/schema";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function WalletPage() {
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  
  const { data: wallet, isLoading: isWalletLoading, refetch: refetchWallet } = useQuery<WalletApiResponse>({
    queryKey: ['/api/wallet'],
    queryFn: async () => {
      const response = await axios.get('/api/wallet');
      return response.data;
    },
  });
  
  const { data: transactions, isLoading: isTransactionsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/wallet/transactions'],
    queryFn: async () => {
      const response = await axios.get('/api/wallet/transactions');
      return response.data;
    },
  });
  
  const [fundingSource, setFundingSource] = useState<'employer' | 'jahazii'>('employer');
  
  const handleTopUp = async () => {
    if (!topUpAmount || isNaN(parseFloat(topUpAmount)) || parseFloat(topUpAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await apiRequest('POST', '/api/wallet/topup', { 
        amount: parseFloat(topUpAmount),
        fundingSource,
        paymentMethod
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      
      toast({
        title: "Top-up successful",
        description: `Successfully added ${formatCurrency(parseFloat(topUpAmount))} to ${fundingSource === 'employer' ? 'employer' : 'Jahazii'} balance.`,
      });
      
      setIsTopUpDialogOpen(false);
      setTopUpAmount("");
      refetchWallet();
    } catch (error) {
      toast({
        title: "Top-up failed",
        description: error instanceof Error ? error.message : "Failed to top up wallet",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const columns: ColumnDef<WalletTransaction>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDateTime(new Date(row.original.transactionDate)),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.original.amount;
        return (
          <span className={amount < 0 ? "text-red-500" : "text-green-500"}>
            {amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(amount))}
          </span>
        );
      },
    },
    {
      accessorKey: "fundingSource",
      header: "Source",
      cell: ({ row }) => {
        const source = row.original.fundingSource;
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            source === 'employer' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'
          }`}>
            {source === 'employer' ? 'Employer' : 'Jahazii'}
          </span>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.transactionType;
        return (
          <span className="capitalize">{type && typeof type === 'string' ? type.replace(/_/g, " ") : type}</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const getStatusClass = (status: string) => {
          switch (status.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
          }
        };
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(status)}`}>
            {status || 'unknown'}
          </span>
        );
      },
    },
  ];

  // Default values for wallet data
  const walletData = {
    employerBalance: wallet?.employerBalance ?? 0,
    jahaziiBalance: wallet?.jahaziiBalance ?? 0,
    totalBalance: wallet?.totalBalance ?? 0,
    perEmployeeCap: wallet?.perEmployeeCap ?? 0,
    activeEmployees: wallet?.activeEmployees ?? 0,
    pendingRequests: wallet?.pendingRequests ?? 0,
    pendingAmount: wallet?.pendingAmount ?? 0,
    employerFundsUtilization: wallet?.employerFundsUtilization ?? 0,
    updatedAt: wallet?.updatedAt ?? new Date().toISOString(),
    employeeAllocations: wallet?.employeeAllocations ?? {},
    id: wallet?.id ?? '',
  };

  if (isWalletLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Loading Wallet...</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-glass dark:shadow-glass-dark">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-12 w-1/2" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-red-600">Wallet Not Found</h1>
        </div>
        <Card className="shadow-glass dark:shadow-glass-dark">
          <CardContent className="p-8">
            <p className="text-muted-foreground">Unable to load wallet data. Please try again later.</p>
            <Button onClick={() => refetchWallet()} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/ewa">
            <Button variant="ghost" className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to EWA
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Employer Wallet</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetchWallet()} className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={isTopUpDialogOpen} onOpenChange={setIsTopUpDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Top Up Wallet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Top Up Wallet</DialogTitle>
                <DialogDescription>
                  Add funds to your {fundingSource === 'employer' ? 'employer' : 'Jahazii'} wallet for EWA disbursements.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Top-up Amount (KES)</Label>
                  <div className="relative">
                    <span className="text-muted-foreground font-semibold text-sm absolute left-3 top-1/2 transform -translate-y-1/2">KES</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="pl-12"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTopUpDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTopUp} disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Top Up"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Wallet Overview</CardTitle>
              <CardDescription>Manage your employer wallet for earned wage access</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <p className="text-sm text-muted-foreground">Total Balance</p>
                    <p className="text-4xl font-bold">{formatCurrency(walletData.totalBalance)}</p>
                    <div className="mt-2 flex items-center">
                      <span className="text-sm text-muted-foreground">
                        Per Employee Cap: {formatCurrency(walletData.perEmployeeCap)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="shadow-sm bg-muted/40">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Employer Funds</p>
                            <p className="text-lg font-semibold">{formatCurrency(walletData.employerBalance)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Utilization: {walletData.employerFundsUtilization}%</p>
                          </div>
                          <div className="p-2 bg-blue-100 rounded-full">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="shadow-sm bg-muted/40">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Used Jahazii Credit</p>
                            <p className="text-lg font-semibold">{formatCurrency(walletData.jahaziiBalance)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Total credit used for EWA</p>
                          </div>
                          <div className="p-2 bg-teal-100 rounded-full">
                            <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                            </svg>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="shadow-sm bg-muted/40">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Pending Requests</p>
                          <p className="text-lg font-semibold">{walletData.pendingRequests}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(walletData.pendingAmount)}</p>
                        </div>
                        <div className="p-2 bg-yellow-100 rounded-full">
                          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm bg-muted/40">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Funding Source</p>
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden flex">
                              <div 
                                className="bg-blue-600 h-2.5" 
                                style={{ width: `${Math.min(100, walletData.employerFundsUtilization)}%` }}
                              ></div>
                              <div 
                                className="bg-teal-600 h-2.5" 
                                style={{ width: `${Math.max(0, 100 - Math.min(100, walletData.employerFundsUtilization))}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-blue-700 font-medium">{walletData.employerFundsUtilization}% Employer</span>
                              <span className="text-xs text-teal-700 font-medium">{100 - Math.min(100, walletData.employerFundsUtilization)}% Jahazii</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Current ratio of employer to Jahazii funding
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                <p className="mb-1">
                  <span className="font-medium text-foreground">Dual Funding System: </span>
                  Each employee can access up to {formatCurrency(walletData.perEmployeeCap)} from employer funds. When employer funds are 
                  depleted or exceed the cap, Jahazii provides additional credit with a 2% processing fee. Employers can only top up
                  their own wallet balance.
                </p>
                <p className="mb-1">
                  <span className="font-medium text-foreground">Cap Management: </span>
                  The per-employee cap applies to employer funds only. Jahazii credit is unlimited and available when needed, subject to credit terms.
                </p>
                <p>
                  <Link to="/ewa">
                    <span className="text-primary hover:underline">View pending EWA requests →</span>
                  </Link>
                </p>
              </div>
            </CardFooter>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    {isTransactionsLoading ? 'Loading transactions...' : 'Recent wallet transactions'}
                  </CardDescription>
                </div>
                <Button variant="outline" className="flex items-center">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isTransactionsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <Tabs defaultValue="all">
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All Transactions</TabsTrigger>
                    <TabsTrigger value="employer">Employer Funds</TabsTrigger>
                    <TabsTrigger value="jahazii">Jahazii Credit</TabsTrigger>
                    <TabsTrigger value="topup">Top-ups</TabsTrigger>
                    <TabsTrigger value="ewa">EWA Disbursements</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-0">
                    <DataTable columns={columns} data={transactions || []} />
                  </TabsContent>
                  
                  <TabsContent value="employer" className="mt-0">
                    <DataTable 
                      columns={columns} 
                      data={(transactions || []).filter((t: WalletTransaction) => 
                        t.fundingSource === 'employer'
                      )} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="jahazii" className="mt-0">
                    <DataTable 
                      columns={columns} 
                      data={(transactions || []).filter((t: WalletTransaction) => 
                        t.fundingSource === 'jahazii'
                      )} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="topup" className="mt-0">
                    <DataTable 
                      columns={columns} 
                      data={(transactions || []).filter((t: WalletTransaction) => 
                        t.transactionType === "employer_topup" || t.transactionType === "jahazii_topup"
                      )} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="ewa" className="mt-0">
                    <DataTable 
                      columns={columns} 
                      data={(transactions || []).filter((t: WalletTransaction) => 
                        t.transactionType === "employer_disbursement" || t.transactionType === "jahazii_disbursement"
                      )} 
                    />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Quick Top-up</CardTitle>
              <CardDescription>Add funds to your wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setTopUpAmount("10000");
                    setIsTopUpDialogOpen(true);
                  }}
                  className={fundingSource === 'employer' ? 'border-blue-200 hover:border-blue-300' : 'border-teal-200 hover:border-teal-300'}
                >
                  KES 10,000
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setTopUpAmount("25000");
                    setIsTopUpDialogOpen(true);
                  }}
                  className={fundingSource === 'employer' ? 'border-blue-200 hover:border-blue-300' : 'border-teal-200 hover:border-teal-300'}
                >
                  KES 25,000
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setTopUpAmount("50000");
                    setIsTopUpDialogOpen(true);
                  }}
                  className={fundingSource === 'employer' ? 'border-blue-200 hover:border-blue-300' : 'border-teal-200 hover:border-teal-300'}
                >
                  KES 50,000
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setTopUpAmount("100000");
                    setIsTopUpDialogOpen(true);
                  }}
                  className={fundingSource === 'employer' ? 'border-blue-200 hover:border-blue-300' : 'border-teal-200 hover:border-teal-300'}
                >
                  KES 100,000
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom-amount">Custom Amount</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute text-sm font-semibold left-3 top-1/2 transform -translate-y-1/2 text-gray-500 ">KES</span>
                    <Input
                      id="custom-amount"
                      type="number"
                      placeholder="Enter amount"
                      className="pl-12"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      min="0"
                    />
                  </div>
                  <Button onClick={() => setIsTopUpDialogOpen(true)}>Top Up</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Wallet Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Account Name</p>
                <p className="font-medium">Jahazii Corporate Wallet</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Wallet ID</p>
                <p className="font-medium">WALLET-12345</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Per-Employee Cap</p>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{formatCurrency(walletData.perEmployeeCap)}</p>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    <span className="mr-1">Edit</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Funding Priority</p>
                <div className="flex items-center">
                  <span className="font-medium">Employer First, Jahazii Backup</span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-sm bg-blue-500"></div>
                    <span className="text-xs">Employer funds (used first, max {formatCurrency(walletData.perEmployeeCap)} per employee)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-teal-500"></div>
                    <span className="text-xs">Jahazii credit (unlimited, 2% fee applies)</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                  <span>Active</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="outline" className="w-full">Manage Wallet Settings</Button>
            </CardFooter>
          </Card>
          
          <Card className="shadow-glass dark:shadow-glass-dark">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you have any questions about wallet management or EWA transactions, our support team is here to help.
              </p>
              <Button variant="outline" className="w-full">Contact Support</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
