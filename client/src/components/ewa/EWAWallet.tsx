import { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES } from "@/lib/tax-utils";
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, DollarSign, AlertCircle, History, CreditCard, Users } from "lucide-react";
import { 
  Wallet as SharedWallet, 
  WalletTransaction as SharedWalletTransaction,
  WalletApiResponse
} from '../../../../shared/schema';

interface EWAWalletProps {
  employeeId?: string;
  isEmployer?: boolean;
}

export function EWAWallet({ employeeId, isEmployer = false }: EWAWalletProps) {
  const [transferAmount, setTransferAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [receiverName, setReceiverName] = useState('');
  
  // Get QueryClient instance
  const queryClient = useQueryClient();

  // Fetch wallet data using axios
  const { 
    data: walletData,
    isLoading: isLoadingWallet,
    error: walletError,
    refetch: refetchWallet
  } = useQuery<WalletApiResponse>({
    queryKey: ['/api/wallet', employeeId],
    queryFn: async () => {
      const response = await axios.get(`/api/wallet${employeeId ? `?employeeId=${employeeId}` : ''}`);
      return response.data;
    },
  });
  
  // Fetch wallet transactions separately using axios
  const { 
    data: transactions, 
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: refetchTransactions 
  } = useQuery<SharedWalletTransaction[]>({
    queryKey: ['/api/wallet/transactions', employeeId],
    queryFn: async () => {
      const response = await axios.get(`/api/wallet/transactions${employeeId ? `?employeeId=${employeeId}` : ''}`);
      return response.data;
    },
    initialData: [],
  });

  // --- Transfer Mutation ---
  const transferMutation = useMutation({
    mutationFn: async (transferData: { amount: number; accountNumber: string; receiverName: string; employeeId?: string }) => {
      const response = await axios.post('/api/wallet/transfer', transferData);
      // Throw an error if the API indicates failure
      if (!response.data.success) {
        throw new Error(response.data.message || "Transfer failed on the server.");
      }
      return response.data; // Return data on success
    },
    onSuccess: (data) => {
      toast({
        title: "Transfer Successful",
        description: data.message || `Transfer processed successfully.`,
      });
      // Reset form
      setTransferAmount('');
      setAccountNumber('');
      setReceiverName('');
      // Invalidate queries to refetch data after successful transfer
      queryClient.invalidateQueries({ queryKey: ['/api/wallet', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions', employeeId] });
    },
    onError: (error) => {
      toast({
        title: "Transfer Error",
        description: error instanceof Error ? error.message : "Failed to complete transfer",
        variant: "destructive",
      });
    },
  });
  // --- End Transfer Mutation ---

  // Create a typed reference to wallet data, handling potential undefined state
  const wallet = walletData;
  
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
    
    if (!wallet || amount > wallet.employerBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough funds or wallet data is unavailable",
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
    
    // Call the mutation
    transferMutation.mutate({
      amount: amount,
      accountNumber,
      receiverName,
      employeeId // Pass employeeId if available/needed
    });
  };
  
  // Get transaction icon based on type
  const getTransactionIcon = (type: SharedWalletTransaction['transactionType']) => {
    switch (type) {
      case 'employer_topup':
      case 'jahazii_topup':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case 'employer_disbursement':
      case 'jahazii_disbursement':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'jahazii_fee':
        return <DollarSign className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format date
  const formatDate = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle loading state
  if (isLoadingWallet || isLoadingTransactions) {
    return <div>Loading wallet data...</div>;
  }

  // Handle error state
  if (walletError || transactionsError || !wallet) {
    return <div>Error loading wallet data: { (walletError || transactionsError)?.message || "Wallet data unavailable." }</div>;
  }
  
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
                <p className="text-3xl font-bold">{formatKES(wallet.employerBalance)}</p>
                {wallet.pendingAmount > 0 && (
                  <p className="text-xs text-primary-foreground/70">
                    + {formatKES(wallet.pendingAmount)} pending requests
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
                    <Button variant="outline" className="w-full" onClick={() => setTransferAmount(wallet.employerBalance.toString())}>
                      Max
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setTransferAmount((wallet.employerBalance / 2).toString())}>
                      Half
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
            {transactions && transactions.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {transactions.map((transaction: SharedWalletTransaction) => (
                  <div 
                    key={transaction.id} 
                    className="border rounded-md p-3 flex justify-between items-center"
                  >
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        {getTransactionIcon(transaction.transactionType)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{transaction.description || transaction.transactionType.replace('_', ' ').toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(transaction.transactionDate)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''} {formatKES(transaction.amount)}
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
                disabled={ // Disable button based on mutation status and validation
                  transferMutation.isPending || // Use isPending from mutation
                  !transferAmount || 
                  parseFloat(transferAmount) <= 0 || 
                  !wallet || // Ensure wallet data is loaded
                  parseFloat(transferAmount) > wallet.employerBalance ||
                  !accountNumber ||
                  !receiverName
                }
              >
                {transferMutation.isPending ? "Processing..." : "Transfer Funds"} {/* Show pending state */}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Last updated: {wallet.updatedAt ? formatDate(wallet.updatedAt) : 'N/A'}
        </p>
        <Button variant="ghost" size="sm" onClick={() => { refetchWallet(); refetchTransactions(); }}>
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}