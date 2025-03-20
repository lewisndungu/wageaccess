import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { formatKES } from "@/lib/tax-utils";
import { Calendar, Download, FileSpreadsheet, FileText, PieChart as PieChartIcon, TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLORS = ['#602EEA', '#8F6EFF', '#A090E7', '#D4C6FF', '#18A0FB', '#009688', '#FF6B6B'];

interface ManagementReportingDashboardProps {
  companyId?: number;
}

interface ReportingData {
  timeRange: string;
  summary: {
    totalDisbursed: number;
    totalRequests: number;
    avgRequestAmount: number;
    activeUsers: number;
    processingFees: number;
    walletBalance: number;
    requestApprovalRate: number;
    growthRate: number;
  };
  disbursementTrend: {
    date: string;
    amount: number;
    count: number;
  }[];
  departmentBreakdown: {
    name: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  employeeUtilization: {
    department: string;
    total: number;
    active: number;
    utilization: number;
  }[];
  topEmployees: {
    id: number;
    name: string;
    department: string;
    totalRequests: number;
    totalAmount: number;
    lastRequestDate: string;
  }[];
}

export function ManagementReportingDashboard({ companyId }: ManagementReportingDashboardProps) {
  const [timeRange, setTimeRange] = useState('month');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  // Fetch reporting data
  const { data: reportingData } = useQuery<ReportingData>({
    queryKey: ['/api/ewa/management-report', { timeRange, departmentFilter, startDate, endDate }],
    // Mock data
    initialData: {
      timeRange: 'month',
      summary: {
        totalDisbursed: 1250000,
        totalRequests: 45,
        avgRequestAmount: 27778,
        activeUsers: 30,
        processingFees: 25000,
        walletBalance: 450000,
        requestApprovalRate: 85,
        growthRate: 12.5
      },
      disbursementTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(new Date().setDate(new Date().getDate() - 30 + i)).toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 100000) + 10000,
        count: Math.floor(Math.random() * 5) + 1
      })),
      departmentBreakdown: [
        { name: 'IT', amount: 450000, count: 15, percentage: 36 },
        { name: 'HR', amount: 210000, count: 8, percentage: 16.8 },
        { name: 'Finance', amount: 320000, count: 12, percentage: 25.6 },
        { name: 'Marketing', amount: 180000, count: 6, percentage: 14.4 },
        { name: 'Operations', amount: 90000, count: 4, percentage: 7.2 }
      ],
      employeeUtilization: [
        { department: 'IT', total: 15, active: 12, utilization: 80 },
        { department: 'HR', total: 8, active: 5, utilization: 62.5 },
        { department: 'Finance', total: 12, active: 6, utilization: 50 },
        { department: 'Marketing', total: 10, active: 4, utilization: 40 },
        { department: 'Operations', total: 15, active: 3, utilization: 20 }
      ],
      topEmployees: [
        { id: 1, name: 'John Doe', department: 'IT', totalRequests: 5, totalAmount: 125000, lastRequestDate: '2023-07-28' },
        { id: 2, name: 'Jane Smith', department: 'Finance', totalRequests: 4, totalAmount: 98000, lastRequestDate: '2023-07-25' },
        { id: 3, name: 'Robert Johnson', department: 'IT', totalRequests: 3, totalAmount: 86000, lastRequestDate: '2023-07-26' },
        { id: 4, name: 'Emily Davis', department: 'HR', totalRequests: 3, totalAmount: 75000, lastRequestDate: '2023-07-27' },
        { id: 5, name: 'Michael Brown', department: 'Marketing', totalRequests: 2, totalAmount: 65000, lastRequestDate: '2023-07-20' }
      ]
    }
  });
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Employee table columns
  const employeeColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Employee',
    },
    {
      accessorKey: 'department',
      header: 'Department',
    },
    {
      accessorKey: 'totalRequests',
      header: 'Requests',
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => formatKES(row.original.totalAmount),
    },
    {
      accessorKey: 'lastRequestDate',
      header: 'Last Request',
      cell: ({ row }) => formatDate(row.original.lastRequestDate),
    },
  ];
  
  // Department utilization columns
  const departmentColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'department',
      header: 'Department',
    },
    {
      accessorKey: 'total',
      header: 'Total Employees',
    },
    {
      accessorKey: 'active',
      header: 'Active Users',
    },
    {
      accessorKey: 'utilization',
      header: 'Utilization Rate',
      cell: ({ row }) => `${row.original.utilization}%`,
    },
  ];
  
  // Custom tooltip component for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-sm">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Amount') ? formatKES(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">EWA Management Reports</h2>
          <p className="text-muted-foreground">
            Key metrics and performance indicators for EWA program
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          {timeRange === 'custom' && (
            <div className="flex gap-2">
              <div className="flex items-center">
                <div className="mr-2 text-sm">From</div>
                <DatePicker date={startDate} setDate={setStartDate} />
              </div>
              <div className="flex items-center">
                <div className="mr-2 text-sm">To</div>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
            </div>
          )}
          
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="it">IT</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Disbursed</p>
                <p className="text-2xl font-bold">{formatKES(reportingData.summary.totalDisbursed)}</p>
                <div className="flex items-center text-green-600 text-xs">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {reportingData.summary.growthRate}% increase
                </div>
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold">{formatKES(reportingData.summary.walletBalance)}</p>
                <div className="flex items-center text-muted-foreground text-xs">
                  Available for disbursements
                </div>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{reportingData.summary.activeUsers}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  {reportingData.summary.requestApprovalRate}% approval rate
                </div>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Request</p>
                <p className="text-2xl font-bold">{formatKES(reportingData.summary.avgRequestAmount)}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  {reportingData.summary.totalRequests} total requests
                </div>
              </div>
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="employees">Top Employees</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Disbursement Trend</CardTitle>
              <CardDescription>
                Total EWA amount disbursed over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={reportingData.disbursementTrend}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={formatDate}
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      name="Amount" 
                      stroke="#602EEA" 
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      name="Requests" 
                      stroke="#18A0FB" 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Breakdown</CardTitle>
                <CardDescription>
                  EWA usage by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportingData.departmentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="amount"
                        nameKey="name"
                      >
                        {reportingData.departmentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatKES(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {reportingData.departmentBreakdown.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm">{dept.name}</span>
                      </div>
                      <div className="text-sm font-medium">
                        {dept.percentage}% ({dept.count} requests)
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Financial Impact</CardTitle>
                <CardDescription>
                  Financial metrics and processing fees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Processing Fees', value: reportingData.summary.processingFees },
                        { name: 'Avg. Per Request', value: reportingData.summary.avgRequestAmount },
                        { name: 'Wallet Balance', value: reportingData.summary.walletBalance }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => 
                        value >= 1000000 
                          ? `${(value / 1000000).toFixed(1)}M` 
                          : value >= 1000 
                            ? `${(value / 1000).toFixed(0)}K` 
                            : value.toString()
                      } />
                      <Tooltip formatter={(value) => formatKES(value as number)} />
                      <Bar dataKey="value" name="Amount" fill="#602EEA" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Net Benefit to Employees</p>
                    <p className="text-sm font-medium">
                      {formatKES(reportingData.summary.totalDisbursed - reportingData.summary.processingFees)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Profit Margin</p>
                    <p className="text-sm font-medium">
                      {Math.round((reportingData.summary.processingFees / reportingData.summary.totalDisbursed) * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle>Department Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of EWA usage by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reportingData.departmentBreakdown.map((dept, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <CardTitle className="text-base">{dept.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Amount:</span>
                            <span className="font-medium">{formatKES(dept.amount)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Requests:</span>
                            <span>{dept.count}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Percentage:</span>
                            <span>{dept.percentage}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Average:</span>
                            <span>{formatKES(dept.amount / dept.count)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportingData.departmentBreakdown}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(value) => formatKES(value)} />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => formatKES(value as number)} />
                      <Legend />
                      <Bar dataKey="amount" name="Total Amount" fill="#602EEA" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Top Employees by EWA Usage</CardTitle>
              <CardDescription>
                Employees with the highest EWA utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={employeeColumns}
                data={reportingData.topEmployees}
                searchColumn="name"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="utilization">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Utilization by Department</CardTitle>
                <CardDescription>
                  Percentage of employees using EWA by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportingData.employeeUtilization}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="department" />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value, name) => [
                        name === 'utilization' ? `${value}%` : value, 
                        name === 'utilization' ? 'Utilization Rate' : name
                      ]} />
                      <Legend />
                      <Bar dataKey="utilization" name="Utilization Rate" fill="#602EEA" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Department Utilization Details</CardTitle>
                <CardDescription>
                  Detailed breakdown of EWA utilization by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  columns={departmentColumns}
                  data={reportingData.employeeUtilization}
                  searchColumn="department"
                />
              </CardContent>
              <CardFooter>
                <div className="text-sm text-muted-foreground">
                  Overall utilization rate: {Math.round(
                    reportingData.employeeUtilization.reduce((sum, dept) => sum + dept.active, 0) / 
                    reportingData.employeeUtilization.reduce((sum, dept) => sum + dept.total, 0) * 100
                  )}%
                </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" className="flex items-center">
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Reports
        </Button>
        <Button className="flex items-center">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Generate Full Report
        </Button>
      </div>
    </div>
  );
}