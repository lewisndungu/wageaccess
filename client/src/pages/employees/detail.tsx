import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format-utils";
import { ChevronLeft, DownloadIcon, User, Phone, Mail, MapPin, Calendar, Banknote, Briefcase, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Employee, Attendance, Payroll, EwaRequest } from '../../../../shared/schema';
import axios from "axios";

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;
  const navigate = useNavigate();
  
  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: [`/api/employees/${employeeId}`],
    enabled: !!employeeId,
    queryFn: async () => {
      const response = await axios.get(`/api/employees/${employeeId}`);
      return response.data;
    }
  });
  
  // Get attendance records for this employee
  const { data: attendanceData = [] } = useQuery<Attendance[]>({
    queryKey: [`/api/attendance/employee/${employeeId}`],
    enabled: !!employeeId,
    queryFn: async () => {
      const response = await axios.get(`/api/attendance/employee/${employeeId}`);
      return response.data;
    }
  });
  
  // Get payroll records for this employee
  const { data: payrollData = [] } = useQuery<Payroll[]>({
    queryKey: [`/api/payroll/employee/${employeeId}`],
    enabled: !!employeeId,
    queryFn: async () => {
      const response = await axios.get(`/api/payroll/employee/${employeeId}`);
      return response.data;
    }
  });
  
  // Get EWA requests for this employee
  const { data: ewaRequestsData = [] } = useQuery<EwaRequest[]>({
    queryKey: [`/api/ewa/requests/employee/${employeeId}`],
    enabled: !!employeeId,
    queryFn: async () => {
      const response = await axios.get(`/api/ewa/requests/employee/${employeeId}`);
      return response.data;
    }
  });
  
  const [activeTab, setActiveTab] = useState("personal");
  
  if (isLoading || !employee) {
    return <div className="p-10 text-center">Loading employee details...</div>;
  }
  
  // Helper function to get full name from MongoDB structure
  const getFullName = (employee: Employee): string => {
    return `${employee.other_names || ''} ${employee.surname || ''}`.trim() || 'N/A';
  };
  
  // Helper function to get employee ID/number
  const getEmployeeId = (employee: Employee): string => {
    return employee.employeeNumber || employee.id || 'N/A';
  };
  
  // Helper function to get phone number
  const getPhoneNumber = (employee: Employee): string => {
    return employee.contact?.phoneNumber || 'N/A';
  };
  
  // Helper function to get employee status
  const getEmployeeStatus = (employee: Employee): string => {
    return employee.status || 'inactive';
  };
  
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
  
  // Helper function to format parsed address or contact objects
  const formatParsedAddressOrContact = (obj: any): string => {
    // If null or undefined, return N/A
    if (!obj) return 'N/A';
    
    try {
      // Check if this is actually the entire employee object being incorrectly passed as address
      // These fields should not be part of an address but appear in the employee object
      if (obj.id_no !== undefined || obj.tax_pin !== undefined || obj.statutory_deductions !== undefined) {
        // This is likely the employee object itself, not a proper address
        // Return just city and country if available
        if (obj.city) {
          return `${obj.city}${obj.country ? `, ${obj.country}` : ''}`;
        }
        if (obj.contact && obj.contact.city) {
          return `${obj.contact.city}${obj.country ? `, ${obj.country}` : ''}`;
        }
        return 'N/A'; // Not a proper address object
      }
      
      // Handle proper address object
      if (obj.street || obj.city || obj.address) {
        let formattedAddress = '';
        
        // Sometimes address is stored as a single field
        if (obj.address) {
          return obj.address;
        }
        
        if (obj.street) {
          formattedAddress = obj.street;
        }
        
        if (obj.city) {
          formattedAddress += formattedAddress ? `, ${obj.city}` : obj.city;
        }
        
        if (obj.postalCode) {
          formattedAddress += formattedAddress ? ` ${obj.postalCode}` : obj.postalCode;
        }
        
        if (obj.state) {
          formattedAddress += formattedAddress ? `, ${obj.state}` : obj.state;
        }
        
        if (obj.country) {
          formattedAddress += formattedAddress ? `, ${obj.country}` : obj.country;
        } else if (formattedAddress) {
          // Add Kenya as default country if not empty and no country specified
          formattedAddress += ', Kenya';
        }
        
        return formattedAddress || 'N/A';
      }
      
      // Handle emergency contact object
      if (obj.name && (obj.phone || obj.phoneNumber || obj.contact)) {
        const phone = obj.phone || obj.phoneNumber || obj.contact || '';
        const relationship = obj.relationship || 'Contact';
        return `${obj.name} (${relationship}) - ${phone}`;
      }
      
      // Handle special case for the data shown in screenshot
      if (obj.id_no || obj.tax_pin) {
        // Just return N/A for these nested objects that should be displayed elsewhere
        return 'N/A';
      }
      
      // Fallback for other objects, safer with try/catch in case of circular references
      try {
        return JSON.stringify(obj).length > 100 ? 'Complex data - see details tabs' : JSON.stringify(obj);
      } catch (e) {
        return 'Object data (too complex to display)';
      }
    } catch (e) {
      return 'Error parsing data';
    }
  };
  
  const formatAddressOrContact = (value: any): string => {
    if (!value) return 'N/A';
    
    try {
      // Handle string that looks like JSON
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          const parsedValue = JSON.parse(value);
          return formatParsedAddressOrContact(parsedValue);
        } catch (e) {
          // If parsing fails, return the original string if it's reasonable length
          return value.length > 100 ? 'Long data - see details' : value.toString();
        }
      }
      
      // If it's already an object
      if (typeof value === 'object' && value !== null) {
        return formatParsedAddressOrContact(value);
      }
      
      // Just return as string if it's not an object or JSON string
      return value.toString();
    } catch (e) {
      return 'Error formatting data';
    }
  };
  
  // Attendance records columns
  const attendanceColumns: ColumnDef<Attendance>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => row.original.date ? formatDate(row.original.date) : '-',
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
        row.original.hoursWorked ? parseFloat(row.original.hoursWorked).toFixed(2) : '-',
    },
  ];
  
  // Payroll records columns
  const payrollColumns: ColumnDef<Payroll>[] = [
    {
      accessorKey: "periodStart",
      header: "Period",
      cell: ({ row }) => `${formatDate(row.original.periodStart)} - ${formatDate(row.original.periodEnd)}`,
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ row }) => row.original.hoursWorked ? row.original.hoursWorked.toString() : '-',
    },
    {
      accessorKey: "grossPay",
      header: "Gross Pay",
      cell: ({ row }) => row.original.grossPay ? formatCurrency(row.original.grossPay) : '-',
    },
    {
      accessorKey: "netPay",
      header: "Net Pay",
      cell: ({ row }) => row.original.netPay ? formatCurrency(row.original.netPay) : '-',
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
  const ewaColumns: ColumnDef<EwaRequest>[] = [
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

  // Helper function to extract fields from potentially nested JSON
  const extractField = (obj: any, field: string, defaultValue: any = 'N/A') => {
    if (!obj) return defaultValue;
    
    try {
      // Direct field access
      if (obj[field] !== undefined && obj[field] !== null) {
        return obj[field];
      }
      
      // Check address field for misplaced data (fix for incorrect nesting)
      if (obj.address && obj.address[field] !== undefined && obj.address[field] !== null) {
        return obj.address[field];
      }
      
      // Try nested statutory_deductions if field is a deduction type
      if (['paye', 'nssf', 'nhif', 'levies'].includes(field)) {
        // Check direct statutory_deductions
        if (obj.statutory_deductions && obj.statutory_deductions[field] !== undefined) {
          return obj.statutory_deductions[field];
        }
        
        // Check address.statutory_deductions (misplaced data)
        if (obj.address && obj.address.statutory_deductions && 
            obj.address.statutory_deductions[field] !== undefined) {
          return obj.address.statutory_deductions[field];
        }
      }
      
      // Handle bank info fields
      if (['bank_name', 'acc_no'].includes(field)) {
        if (obj.bank_info && obj.bank_info[field] !== undefined) {
          return obj.bank_info[field];
        }
      }
      
      // Special case for contact info
      if (field === 'city' && obj.contact && obj.contact.city !== undefined) {
        return obj.contact.city;
      }
      
      if (field === 'phoneNumber' && obj.contact && obj.contact.phoneNumber !== undefined) {
        return obj.contact.phoneNumber;
      }
      
      // Check if it's a JSON string
      if (typeof obj === 'string' && (obj.startsWith('{') || obj.startsWith('['))) {
        try {
          const parsed = JSON.parse(obj);
          if (parsed[field] !== undefined && parsed[field] !== null) {
            return parsed[field];
          }
        } catch (e) {
          // Parsing failed, continue with other methods
        }
      }
    } catch (e) {
      console.error(`Error extracting field ${field}:`, e);
    }
    
    return defaultValue;
  };

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
              <AvatarImage src={employee.avatar_url || undefined} alt={getFullName(employee)} />
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl">{getFullName(employee)}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Badge className="mr-2 bg-primary/10 text-primary hover:bg-primary/20">
                {getEmployeeId(employee)}
              </Badge>
              {getStatusColor(getEmployeeStatus(employee))}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">{employee.position || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">{employee.contact?.phoneNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">Joined: {formatDate(employee.startDate || employee.created_at || '')}</span>
              </div>
              <div className="flex items-center">
                <Banknote className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm">Salary: {formatCurrency(employee.gross_income || 0)}</span>
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
                    <p>{getFullName(employee)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Employee ID</p>
                    <p>{getEmployeeId(employee)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">ID Number</p>
                    <p>{employee.id_no || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Tax PIN</p>
                    <p>{employee.tax_pin || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p>{employee.contact?.phoneNumber || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Gender</p>
                    <p>{employee.sex ? employee.sex.charAt(0).toUpperCase() + employee.sex.slice(1) : 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Position</p>
                    <p>{employee.position || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="capitalize">{employee.role || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p>{getEmployeeStatus(employee).charAt(0).toUpperCase() + getEmployeeStatus(employee).slice(1)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Probation</p>
                    <p>{employee.is_on_probation ? 'Yes' : 'No'}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Financial Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Gross Salary</p>
                    <p>{formatCurrency(employee.gross_income)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Net Salary</p>
                    <p>{formatCurrency(employee.net_income)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Tax (PAYE)</p>
                    <p>{formatCurrency(employee.statutory_deductions.tax)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">NSSF</p>
                    <p>{formatCurrency(employee.statutory_deductions.nssf)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">NHIF</p>
                    <p>{formatCurrency(employee.statutory_deductions.nhif)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Levy</p>
                    <p>{formatCurrency(employee.statutory_deductions.levy)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Loan Deductions</p>
                    <p>{formatCurrency(employee.loan_deductions)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Deductions</p>
                    <p>{formatCurrency(employee.total_deductions)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Banking Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
                    <p>{employee.bank_info.bank_name || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                    <p>{employee.bank_info.acc_no || 'N/A'}</p>
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
                    {employee.documents && employee.documents.length > 0 ? (
                      employee.documents.map((docId: string, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center">
                            <svg className="h-8 w-8 text-gray-500 mr-2" viewBox="0 0 384 512">
                              <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm76.45 211.36l-96.42 95.7c-6.65 6.61-17.39 6.61-24.04 0l-96.42-95.7C73.42 337.29 80.54 320 94.82 320H160v-80c0-8.84 7.16-16 16-16h32c8.84 0 16 7.16 16 16v80h65.18c14.28 0 21.4 17.29 11.27 27.36z" />
                            </svg>
                            <div>
                              <p className="font-medium text-sm">Document {index + 1}</p>
                              <p className="text-xs text-muted-foreground">ID: {docId}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <DownloadIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center">
                          <svg className="h-8 w-8 text-gray-500 mr-2" viewBox="0 0 384 512">
                            <path fill="currentColor" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm76.45 211.36l-96.42 95.7c-6.65 6.61-17.39 6.61-24.04 0l-96.42-95.7C73.42 337.29 80.54 320 94.82 320H160v-80c0-8.84 7.16-16 16-16h32c8.84 0 16 7.16 16 16v80h65.18c14.28 0 21.4 17.29 11.27 27.36z" />
                          </svg>
                          <div>
                            <p className="font-medium text-sm">Employment Contract</p>
                            <p className="text-xs text-muted-foreground">No documents available</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <DownloadIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="default" size="sm">
                      Request EWA
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium">Available Limit</div>
                        <div className="text-2xl font-bold mt-1">
                          {formatCurrency(employee.available_salary_advance_limit || 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium">Max Limit</div>
                        <div className="text-2xl font-bold mt-1">
                          {formatCurrency(employee.max_salary_advance_limit || 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium">Last Withdrawal</div>
                        <div className="text-2xl font-bold mt-1">
                          {employee.last_withdrawal_time ? formatDate(employee.last_withdrawal_time) : 'None'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
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

