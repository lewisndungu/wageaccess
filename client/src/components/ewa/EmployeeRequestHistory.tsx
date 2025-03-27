import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { DatePicker } from "@/components/ui/date-picker";
import { formatKES } from "@/lib/tax-utils";
import { ewaRequests } from "@/lib/mock-data";
import { CalendarRange, Download, Filter } from "lucide-react";
import { EwaRequest } from "@shared/schema";

interface EWARequestHistoryProps {
  employeeId: string;
}

export function EmployeeRequestHistory({ employeeId }: EWARequestHistoryProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().setMonth(new Date().getMonth() - 3))
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  // Filter requests based on the date range
  const isWithinDateRange = (date: string) => {
    const requestDate = new Date(date);
    if (startDate && requestDate < startDate) return false;
    if (endDate && requestDate > endDate) return false;
    return true;
  };
  
  // Get EWA request history for the employee
  const { data: requestHistory } = useQuery<EwaRequest[]>({
    queryKey: ['/api/ewa/requests/employee', employeeId],
    initialData: ewaRequests
      .filter((req) => req.employeeId === employeeId)
      .map((req) => ({
        id: req.id,
        requestDate: req.requestDate,
        amount: req.amount,
        processingFee: req.processingFee,
        reason: req.reason || 'Emergency expenses',
        status: req.status as 'pending' | 'approved' | 'rejected' | 'disbursed',
        disbursementDate: req.status === 'disbursed' ? 
          new Date(new Date(req.requestDate).getTime() + 1000 * 60 * 60 * 3).toISOString() : null,
        daysWorked: Math.floor(Math.random() * 10) + 10, // Random days between 10-20
        earnedWage: req.amount * 2, // Just for demo purposes
        employeeId: req.employeeId,
      })),
  });
  
  // Filter the request history based on the date range
  const filteredHistory = requestHistory.filter((req) => isWithinDateRange(req.requestDate.toString()));
  
  // Calculate summary statistics
  const totalRequested = filteredHistory.reduce((sum, req) => sum + req.amount, 0);
  const totalFees = filteredHistory.reduce((sum, req) => sum + (req.processingFee || 0), 0);
  const totalAmount = totalRequested + totalFees;
  const approvedCount = filteredHistory.filter((req) => 
    req.status === 'approved' || req.status === 'disbursed'
  ).length;
  const pendingCount = filteredHistory.filter((req) => req.status === 'pending').length;
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Status badge color mapping
  const getStatusColor = (status: EwaRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'disbursed':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };
  
  // Table columns definition
  const columns: ColumnDef<EwaRequest>[] = [
    {
      accessorKey: "requestDate",
      header: "Request Date",
      cell: ({ row }) => formatDate(row.original.requestDate.toString()),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatKES(row.original.amount),
    },
    {
      accessorKey: "processingFee",
      header: "Fee",
      cell: ({ row }) => formatKES(row.original.processingFee),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.reason}>
          {row.original.reason}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      accessorKey: "disbursedAt",
      header: "Disbursed On",
      cell: ({ row }) => (
        row.original.disbursedAt ? formatDate(row.original.disbursedAt.toString()) : '-'
      ),
    },
  ];
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle>EWA Request History</CardTitle>
              <CardDescription>View your past earned wage access requests</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <DatePicker date={startDate} setDate={setStartDate} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
              <div className="flex items-center ml-auto">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
                    setStartDate(threeMonthsAgo);
                    setEndDate(today);
                  }}
                >
                  <CalendarRange className="mr-1 h-4 w-4" />
                  Last 3 Months
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Total Requested</span>
                    <span className="text-2xl font-bold">{formatKES(totalRequested)}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {filteredHistory.length} request{filteredHistory.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Processing Fees</span>
                    <span className="text-2xl font-bold">{formatKES(totalFees)}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Avg. {formatKES(filteredHistory.length ? totalFees / filteredHistory.length : 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Approved</span>
                    <span className="text-2xl font-bold">{approvedCount}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {filteredHistory.length ? (approvedCount / filteredHistory.length * 100).toFixed(0) : 0}% approval rate
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="text-2xl font-bold">{pendingCount}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatKES(filteredHistory.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <DataTable 
              columns={columns} 
              data={filteredHistory} 
            />
            
            {filteredHistory.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No requests found for the selected date range.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}