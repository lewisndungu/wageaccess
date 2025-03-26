import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format-utils";
import { ChevronLeft, DownloadIcon, User, Phone, Mail, MapPin, Calendar, DollarSign, Briefcase, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

// Define Employee interface with all required properties
interface EmployeeDetails {
  id: number;
  employeeNumber: string;
  userId: number;
  departmentId: number;
  position: string;
  status: string; 
  hourlyRate: string | number;
  startDate: string;
  active: boolean | null;
  phoneNumber: string | null;
  emergencyContact: string | null;
  address: string | null;
  user: {
    id: number;
    name: string;
    username: string;
    email?: string;
    profileImage: string | null;
    role: string;
  };
  department: {
    id: number;
    name: string;
    description: string | null;
  };
}

interface AttendanceRecord {
  id: number;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  status: string;
  hoursWorked: number;
}

interface PayrollRecord {
  id: number;
  periodStart: string;
  periodEnd: string;
  hoursWorked: number;
  grossPay: number;
  netPay: number;
  status: string;
}

interface EWARequest {
  id: number;
  requestDate: string;
  amount: number;
  status: string;
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = parseInt(params.id || "0");
  const navigate = useNavigate();
  
  const { data: employee, isLoading } = useQuery<EmployeeDetails>({
    queryKey: [`/api/employees/${employeeId}`],
    enabled: !isNaN(employeeId)
  });
  
  // Get attendance records for this employee
  const { data: attendanceData = [] } = useQuery<AttendanceRecord[]>({
    queryKey: [`/api/attendance/employee/${employeeId}`],
    enabled: !isNaN(employeeId) && !!employee
  });
  
  // Get payroll records for this employee
  const { data: payrollData = [] } = useQuery<PayrollRecord[]>({
    queryKey: [`/api/payroll/employee/${employeeId}`],
    enabled: !isNaN(employeeId) && !!employee
  });
  
  // Get EWA requests for this employee
  const { data: ewaRequestsData = [] } = useQuery<EWARequest[]>({
    queryKey: [`/api/ewa/requests/employee/${employeeId}`],
    enabled: !isNaN(employeeId) && !!employee
  });
  
  const [activeTab, setActiveTab] = useState("personal");
  
  if (isLoading || !employee) {
    return <div className="p-10 text-center">Loading employee details...</div>;
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20">Present</Badge>;
      case "late":
        return <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/20">Late</Badge>;
      case "absent":
        return <Badge className="bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20">Absent</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const formatAddressOrContact = (value: any): string => {
    if (!value) return 'N/A';
    
    // If the value is a string that looks like JSON, try to parse it
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        const parsedValue = JSON.parse(value);
        
        // Handle address object
        if (parsedValue.street && parsedValue.city) {
          let formattedAddress = parsedValue.street;
          
          if (parsedValue.city) {
            formattedAddress += `, ${parsedValue.city}`;
          }
          
          if (parsedValue.postalCode) {
            formattedAddress += ` ${parsedValue.postalCode}`;
          }
          
          if (parsedValue.country) {
            formattedAddress += `, ${parsedValue.country}`;
          } else {
            formattedAddress += ', Kenya';
          }
          
          return formattedAddress;
        }
        // Handle emergency contact object
        else if (parsedValue.name && (parsedValue.phone || parsedValue.phoneNumber)) {
          return `${parsedValue.name} (${parsedValue.relationship || 'Contact'}) - ${parsedValue.phone || parsedValue.phoneNumber}`;
        }
        // Fallback for other objects
        return JSON.stringify(parsedValue);
      } catch (e) {
        console.error("Error parsing JSON:", e);
        return value.toString();
      }
    }
    
    // If it's already an object (not a string)
    if (typeof value === 'object' && value !== null) {
      try {
        // Handle address object
        if (value.street && value.city) {
          let formattedAddress = value.street;
          
          if (value.city) {
            formattedAddress += `, ${value.city}`;
          }
          
          if (value.postalCode) {
            formattedAddress += ` ${value.postalCode}`;
          }
          
          if (value.country) {
            formattedAddress += `, ${value.country}`;
          } else {
            formattedAddress += ', Kenya';
          }
          
          return formattedAddress;
        }
        // Handle emergency contact object
        else if (value.name && (value.phone || value.phoneNumber)) {
          return `${value.name} (${value.relationship || 'Contact'}) - ${value.phone || value.phoneNumber}`;
        }
        // Fallback for other objects
        return JSON.stringify(value);
      } catch (e) {
        console.error("Error processing object:", e);
        return 'Invalid format';
      }
    }
    
    return value.toString();
  };
  
  // Attendance records columns
  const attendanceColumns: ColumnDef<AttendanceRecord>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "clockInTime",
      header: "Clock In",
      cell: ({ row }) => row.original.clockInTime ? new Date(row.original.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    },
    {
      accessorKey: "clockOutTime",
      header: "Clock Out",
      cell: ({ row }) => row.original.clockOutTime ? new Date(row.original.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusColor(row.original.status),
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ row }) => typeof row.original.hoursWorked === 'number' ? 
        row.original.hoursWorked.toFixed(2) : 
        parseFloat(row.original.hoursWorked).toFixed(2),
    },
  ];
  
  // Payroll records columns
  const payrollColumns: ColumnDef<PayrollRecord>[] = [
    {
      accessorKey: "periodStart",
      header: "Period",
      cell: ({ row }) => `${formatDate(row.original.periodStart)} - ${formatDate(row.original.periodEnd)}`,
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ row }) => row.original.hoursWorked.toString(),
    },
    {
      accessorKey: "grossPay",
      header: "Gross Pay",
      cell: ({ row }) => formatCurrency(row.original.grossPay),
    },
    {
      accessorKey: "netPay",
      header: "Net Pay",
      cell: ({ row }) => formatCurrency(row.original.netPay),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={row.original.status === "processed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <DownloadIcon className="h-4 w-4" />
        </Button>
      ),
    },
  ];
  
  // EWA requests columns
  const ewaColumns: ColumnDef<EWARequest>[] = [
    {
      accessorKey: "requestDate",
      header: "Request Date",
      cell: ({ row }) => formatDate(row.original.requestDate),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
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
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" className="mr-2" onClick={() => navigate("/employees")}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Employee Details</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Employee Profile Card */}
        <Card className="lg:col-span-1 shadow-glass dark:shadow-glass-dark">
          <CardHeader className="pb-0 flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-2">
              <AvatarImage src={employee.user.profileImage || undefined} alt={employee.user.name} />
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl">{employee.user.name}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Badge className="mr-2 bg-primary/10 text-primary hover:bg-primary/20">
                {employee.employeeNumber}
              </Badge>
              {getStatusColor(employee.status)}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">{employee.position}</span>
              </div>
              <div className="flex items-center">
                <BadgeCheck className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">{employee.department.name}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">{employee.phoneNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">{employee.user.email || employee.user.username}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">Joined: {formatDate(employee.startDate)}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">Rate: {formatCurrency(typeof employee.hourlyRate === 'string' ? parseFloat(employee.hourlyRate) : employee.hourlyRate)}/hr</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">{formatAddressOrContact(employee.address)}</span>
              </div>
            </div>
            
            <div className="flex justify-between mt-6 space-x-2">
              <Button variant="outline" size="sm" className="flex-1">Edit</Button>
              <Button variant="outline" size="sm" className="flex-1">Manage</Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Details Tabs */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
              <TabsTrigger value="ewa">EWA Requests</TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p>{employee.user.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Employee ID</p>
                    <p>{employee.employeeNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{employee.user.email || employee.user.username}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p>{employee.phoneNumber || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p>{formatAddressOrContact(employee.address)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                    <p>{formatAddressOrContact(employee.emergencyContact)}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Department</p>
                    <p>{employee.department.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Position</p>
                    <p>{employee.position}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                    <p>{formatDate(employee.startDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p>{employee.active ? "Active" : "Inactive"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Employment Type</p>
                    <p>Full-time</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Manager</p>
                    <p>Sophia Wanjiku</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Employee documents and contracts</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        <svg className="h-8 w-8 text-gray-500 mr-2" viewBox="0 0 384 512">
                          <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm76.45 211.36l-96.42 95.7c-6.65 6.61-17.39 6.61-24.04 0l-96.42-95.7C73.42 337.29 80.54 320 94.82 320H160v-80c0-8.84 7.16-16 16-16h32c8.84 0 16 7.16 16 16v80h65.18c14.28 0 21.4 17.29 11.27 27.36z" />
                        </svg>
                        <div>
                          <p className="font-medium text-sm">Employment Contract</p>
                          <p className="text-xs text-muted-foreground">Added on {formatDate("2021-03-15")}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        <svg className="h-8 w-8 text-gray-500 mr-2" viewBox="0 0 384 512">
                          <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm76.45 211.36l-96.42 95.7c-6.65 6.61-17.39 6.61-24.04 0l-96.42-95.7C73.42 337.29 80.54 320 94.82 320H160v-80c0-8.84 7.16-16 16-16h32c8.84 0 16 7.16 16 16v80h65.18c14.28 0 21.4 17.29 11.27 27.36z" />
                        </svg>
                        <div>
                          <p className="font-medium text-sm">ID Documents</p>
                          <p className="text-xs text-muted-foreground">Added on {formatDate("2021-03-15")}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4">
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m-7-7h14" />
                    </svg>
                    Add Document
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="attendance">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Attendance History</CardTitle>
                    <CardDescription>View recent attendance records for this employee</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <DataTable columns={attendanceColumns} data={attendanceData} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="payroll">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Payroll Records</CardTitle>
                    <CardDescription>View payroll history for this employee</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <DataTable columns={payrollColumns} data={payrollData} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="ewa">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Earned Wage Access Requests</CardTitle>
                    <CardDescription>View EWA transaction history</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <DataTable columns={ewaColumns} data={ewaRequestsData} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
