import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar, Download, FileSpreadsheet, Users, Banknote, BarChart2, PieChart, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatKES } from "@/lib/tax-utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#602EEA', '#8F6EFF', '#A090E7', '#D4C6FF'];

interface AnalyticsData {
  disbursementsByDay: {
    date: string;
    amount: number;
    count: number;
  }[];
  departmentBreakdown: {
    name: string;
    value: number;
    count: number;
  }[];
  requestSizes: {
    range: string;
    count: number;
  }[];
  metrics: {
    totalDisbursed: number;
    totalRequests: number;
    avgRequestAmount: number;
    activeUsers: number;
    processingFees: number;
    growthRate: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-md shadow-sm">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-primary">
          Amount: {formatKES(payload[0].value)}
        </p>
        {payload[1] && (
          <p className="text-xs text-muted-foreground">
            Requests: {payload[1].value}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function EWAAnalytics() {
  const [timeRange, setTimeRange] = useState('month');
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Generate mock data based on selected time range
  const generateMockData = (): AnalyticsData => {
    // Mock disbursements by day
    const disbursementsByDay = [];
    const today = new Date();
    let days = 30; // Default to month
    
    if (timeRange === 'week') days = 7;
    if (timeRange === 'quarter') days = 90;
    if (timeRange === 'year') days = 365;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      disbursementsByDay.push({
        date: date.toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 50000) + 10000,
        count: Math.floor(Math.random() * 5) + 1
      });
    }
    
    // Mock department breakdown
    const departmentBreakdown = [
      { name: 'IT', value: 225000, count: 15 },
      { name: 'HR', value: 120000, count: 8 },
      { name: 'Finance', value: 180000, count: 12 },
      { name: 'Marketing', value: 90000, count: 6 }
    ];
    
    // Mock request sizes
    const requestSizes = [
      { range: '0-5,000', count: 10 },
      { range: '5,001-10,000', count: 25 },
      { range: '10,001-15,000', count: 18 },
      { range: '15,001-20,000', count: 8 },
      { range: '20,001+', count: 4 }
    ];
    
    // Mock metrics
    const metrics = {
      totalDisbursed: departmentBreakdown.reduce((sum, dept) => sum + dept.value, 0),
      totalRequests: departmentBreakdown.reduce((sum, dept) => sum + dept.count, 0),
      avgRequestAmount: Math.round(
        departmentBreakdown.reduce((sum, dept) => sum + dept.value, 0) / 
        departmentBreakdown.reduce((sum, dept) => sum + dept.count, 0)
      ),
      activeUsers: Math.round(departmentBreakdown.reduce((sum, dept) => sum + dept.count, 0) * 0.8),
      processingFees: Math.round(departmentBreakdown.reduce((sum, dept) => sum + dept.value, 0) * 0.02),
      growthRate: 12.5
    };
    
    return {
      disbursementsByDay,
      departmentBreakdown,
      requestSizes,
      metrics
    };
  };
  
  const { data: analyticsData, refetch } = useQuery<AnalyticsData>({
    queryKey: ['/api/ewa/analytics', { timeRange, startDate, endDate, departmentFilter }],
    initialData: generateMockData(),
  });
  
  // Update data when filters change
  useEffect(() => {
    refetch();
  }, [timeRange, startDate, endDate, departmentFilter, refetch]);
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">EWA Analytics</h2>
          <p className="text-muted-foreground">
            Analysis and insights of earned wage access usage
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
                <p className="text-2xl font-bold">{formatKES(analyticsData.metrics.totalDisbursed)}</p>
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{analyticsData.metrics.totalRequests}</p>
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
                <p className="text-sm text-muted-foreground">Avg. Request</p>
                <p className="text-2xl font-bold">{formatKES(analyticsData.metrics.avgRequestAmount)}</p>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{analyticsData.metrics.activeUsers}</p>
                <div className="flex items-center text-green-600 text-xs">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {analyticsData.metrics.growthRate}% increase
                </div>
              </div>
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>EWA Disbursements Over Time</CardTitle>
            <CardDescription>
              Total amount disbursed for earned wage access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analyticsData.disbursementsByDay}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#602EEA" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#602EEA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#602EEA"
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
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
                <RechartsPieChart>
                  <Pie
                    data={analyticsData.departmentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {analyticsData.departmentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatKES(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {analyticsData.departmentBreakdown.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-sm">{dept.name}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {dept.count} requests
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>EWA Request Sizes</CardTitle>
            <CardDescription>
              Distribution of EWA request amounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analyticsData.requestSizes}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#602EEA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>EWA Performance</CardTitle>
            <CardDescription>
              Key performance metrics for your EWA program
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Processing Fees Generated</p>
                  <p className="text-2xl font-bold">{formatKES(analyticsData.metrics.processingFees)}</p>
                </div>
                <Button variant="outline">View Details</Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Utilization Rate</p>
                  <p className="text-sm font-medium">
                    {Math.round((analyticsData.metrics.activeUsers / 60) * 100)}%
                  </p>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2"
                    style={{ width: `${Math.round((analyticsData.metrics.activeUsers / 60) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.metrics.activeUsers} out of approximately 60 employees using EWA
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3">
                  <p className="text-sm text-muted-foreground">Same-Day Disbursements</p>
                  <p className="text-lg font-medium">92%</p>
                </div>
                <div className="border rounded-md p-3">
                  <p className="text-sm text-muted-foreground">Average Processing Time</p>
                  <p className="text-lg font-medium">12 minutes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
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