import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { ChevronLeft, DollarSign, Download, Plus, RefreshCw } from "lucide-react";

interface WalletTransaction {
  id: number;
  date: string;
  amount: number;
  type: string;
  description: string;
  status: string;
}

export default function WalletPage() {
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ['/api/wallet'],
    initialData: { balance: walletData.balance },
  });
  
  const { data: transactions } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/wallet/transactions'],
    initialData: walletData.transactions,
  });
  
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
      await apiRequest('POST', '/api/wallet/topup', { amount: parseFloat(topUpAmount) });
      
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      
      toast({
        title: "Top-up successful",
        description: `Successfully added ${formatCurrency(parseFloat(topUpAmount))} to your wallet.`,
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
      cell: ({ row }) => formatDateTime(row.original.date),
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
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <span className="capitalize">{type && typeof type === 'string' ? type.replace("_", " ") : type}</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span className="capitalize">{status || 'unknown'}</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/ewa">
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
                  Add funds to your employer wallet for EWA disbursements.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (KES)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      className="pl-10"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <select
                    id="method"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="card">Credit/Debit Card</option>
                  </select>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="mb-4 md:mb-0">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-4xl font-bold">{formatCurrency(wallet.balance)}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="shadow-sm bg-muted/40">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Disbursed (MTD)</p>
                          <p className="text-lg font-semibold">{formatCurrency(45000)}</p>
                        </div>
                        <div className="p-2 bg-orange-100 rounded-full">
                          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                          <p className="text-sm text-muted-foreground">Pending Requests</p>
                          <p className="text-lg font-semibold">{formatCurrency(30000)}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-full">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
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
                  <span className="font-medium text-foreground">How it works: </span>
                  EWA transactions are free when your wallet has sufficient funds. When your wallet is empty, Jahazii will advance funds to your employees.
                </p>
                <p>
                  <Link href="/ewa">
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
                  <CardDescription>Recent wallet transactions</CardDescription>
                </div>
                <Button variant="outline" className="flex items-center">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Transactions</TabsTrigger>
                  <TabsTrigger value="topup">Top-ups</TabsTrigger>
                  <TabsTrigger value="ewa">EWA Disbursements</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  <DataTable columns={columns} data={transactions} />
                </TabsContent>
                
                <TabsContent value="topup" className="mt-0">
                  <DataTable 
                    columns={columns} 
                    data={transactions.filter(t => t.type === 'topup')} 
                  />
                </TabsContent>
                
                <TabsContent value="ewa" className="mt-0">
                  <DataTable 
                    columns={columns} 
                    data={transactions.filter(t => t.type === 'ewa_disbursement')} 
                  />
                </TabsContent>
              </Tabs>
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
                <Button variant="outline" onClick={() => setTopUpAmount("10000")}>KES 10,000</Button>
                <Button variant="outline" onClick={() => setTopUpAmount("25000")}>KES 25,000</Button>
                <Button variant="outline" onClick={() => setTopUpAmount("50000")}>KES 50,000</Button>
                <Button variant="outline" onClick={() => setTopUpAmount("100000")}>KES 100,000</Button>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom-amount">Custom Amount</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <Input
                      id="custom-amount"
                      type="number"
                      placeholder="Enter amount"
                      className="pl-10"
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
              <CardTitle>Wallet Information</CardTitle>
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
                <p className="text-sm text-muted-foreground">Created On</p>
                <p className="font-medium">January 15, 2023</p>
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
              <Button variant="outline" className="w-full">View Wallet Settings</Button>
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
