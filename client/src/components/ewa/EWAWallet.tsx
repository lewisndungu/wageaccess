import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { formatKES } from "@/lib/tax-utils";
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, DollarSign, AlertCircle, History, CreditCard, Users } from "lucide-react";
import { walletData } from "@/lib/mock-data";

interface WalletTransaction {
  id: number;
  date: string;
  amount: number;
  type: string;
  description: string;
  status: string;
}

interface WalletData {
  balance: number;
  pendingBalance: number;
  transactions: WalletTransaction[];
}

interface EWAWalletProps {
  employeeId?: number;
  isEmployer?: boolean;
}

export function EWAWallet({ employeeId, isEmployer = false }: EWAWalletProps) {
  const [transferAmount, setTransferAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [receiverName, setReceiverName] = useState('');
  
  // Fetch wallet data
  const { data, isLoading, refetch } = useQuery<WalletData>({
    queryKey: ['/api/wallet', employeeId],
    initialData: walletData as WalletData,
  });
  
  // Create a typed reference to wallet data
  const wallet = data as WalletData;
  
  // Handle transfer
  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    
    if (amount > wallet.balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough funds to complete this transfer",
        variant: "destructive",
      });
      return;
    }
    
    if (!accountNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid account number",
        variant: "destructive",
      });
      return;
    }
    
    if (!receiverName.trim()) {
      toast({
        title: "Error",
        description: "Please enter the receiver's name",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // In a real app, we would call the API
      // Mock successful transfer
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Transfer Successful",
        description: `${formatKES(amount)} has been transferred to ${receiverName}.`,
      });
      
      // Reset form
      setTransferAmount('');
      setAccountNumber('');
      setReceiverName('');
      
      // Refresh wallet data
      refetch();
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete transfer",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
      case 'ewa':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  return (
    <Card className="shadow-glass dark:shadow-glass-dark">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="mr-2 h-5 w-5" />
          {isEmployer ? "Company EWA Wallet" : "Your EWA Wallet"}
        </CardTitle>
        <CardDescription>
          {isEmployer 
            ? "Manage EWA funds for employees" 
            : "Access and manage your earned wages"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4">
                <p className="text-primary-foreground/70 text-sm">Available Balance</p>
                <p className="text-3xl font-bold">{formatKES(wallet.balance)}</p>
                {wallet.pendingBalance > 0 && (
                  <p className="text-xs text-primary-foreground/70">
                    + {formatKES(wallet.pendingBalance)} pending
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {isEmployer ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Disbursed</p>
                      <p className="text-2xl font-bold">{formatKES(758450)}</p>
                    </div>
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>42 employees have used EWA this month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm text-muted-foreground">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="h-12 flex flex-col items-center justify-center text-xs">
                      <DollarSign className="h-4 w-4 mb-1" />
                      Add Funds
                    </Button>
                    <Button variant="outline" size="sm" className="h-12 flex flex-col items-center justify-center text-xs">
                      <History className="h-4 w-4 mb-1" />
                      History
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <Tabs defaultValue="transactions">
          <TabsList className="w-full">
            <TabsTrigger value="transactions" className="flex-1">Transaction History</TabsTrigger>
            <TabsTrigger value="transfer" className="flex-1">Transfer Funds</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="p-0 pt-4">
            {wallet.transactions && wallet.transactions.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {wallet.transactions.map(transaction => (
                  <div 
                    key={transaction.id} 
                    className="border rounded-md p-3 flex justify-between items-center"
                  >
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${transaction.type === 'deposit' || transaction.type === 'ewa' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'deposit' || transaction.type === 'ewa' ? '+' : '-'} {formatKES(transaction.amount)}
                      </p>
                      <p className="text-xs">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : transaction.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>No transactions found</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="transfer" className="p-0 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Transfer Amount (KES)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account">Account Number</Label>
                <Input
                  id="account"
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="receiver">Receiver Name</Label>
                <Input
                  id="receiver"
                  placeholder="Enter receiver name"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                />
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100 flex items-start text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                <p>
                  Transfers may take up to 24 hours to process. A transaction fee of 1% applies to all transfers.
                </p>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleTransfer} 
                disabled={
                  isProcessing || 
                  !transferAmount || 
                  parseFloat(transferAmount) <= 0 || 
                  parseFloat(transferAmount) > wallet.balance ||
                  !accountNumber ||
                  !receiverName
                }
              >
                {isProcessing ? "Processing..." : "Transfer Funds"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
        </p>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}