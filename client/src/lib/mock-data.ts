// This file contains mock data for the application
// In a real application, this would be fetched from the API

// Dashboard Statistics
export const dashboardStats = {
  employeeCount: {
    total: 248,
    active: 220,
    inactive: 28,
    change: "+3.2%"
  },
  attendance: {
    rate: "93.5%",
    change: "+1.5%"
  },
  payroll: {
    expected: "KES 4.2M",
    change: "+2.8%"
  },
  ewa: {
    total: "KES 890K",
    pending: 38,
    change: "+12.3%"
  }
};

// Activities
export const recentActivities = [
  {
    id: 1,
    type: "employee",
    title: "New Employee Added",
    description: "John Kamau (ID: EMP-1928) has been added to the IT Department",
    time: "10 min ago",
    icon: "user-add-line"
  },
  {
    id: 2,
    type: "ewa",
    title: "New EWA Request",
    description: "Mary Wambui (Sales) requested KES 15,000 early wage access",
    time: "30 min ago",
    icon: "bank-card-line"
  },
  {
    id: 3,
    type: "attendance",
    title: "Attendance Anomaly",
    description: "5 employees in Marketing department haven't clocked in today",
    time: "1 hour ago",
    icon: "time-line"
  },
  {
    id: 4,
    type: "payroll",
    title: "Payroll Processed",
    description: "Payroll for IT Department (24 employees) has been processed",
    time: "2 hours ago",
    icon: "money-dollar-box-line"
  },
  {
    id: 5,
    type: "self-log",
    title: "Self-Log QR Generated",
    description: "Tom Mugo (Supervisor) generated QR code for warehouse team",
    time: "3 hours ago",
    icon: "login-box-line"
  }
];

// Employees
export const employees = [
  {
    id: 1,
    employeeNumber: "EMP-1023",
    name: "James Mwangi",
    email: "james.m@company.com",
    department: "IT Department",
    position: "Senior Developer",
    contact: "+254 723 456789",
    status: "present",
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    active: true,
    hourlyRate: 1200,
    startDate: "2021-03-15",
    address: "123 Nairobi St, Nairobi",
    emergencyContact: "+254 712 345678"
  },
  {
    id: 2,
    employeeNumber: "EMP-1024",
    name: "Lucy Njeri",
    email: "lucy.n@company.com",
    department: "Marketing",
    position: "Social Media Specialist",
    contact: "+254 798 123456",
    status: "late",
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    active: true,
    hourlyRate: 900,
    startDate: "2022-01-10",
    address: "456 Mombasa Rd, Nairobi",
    emergencyContact: "+254 722 987654"
  },
  {
    id: 3,
    employeeNumber: "EMP-1025",
    name: "David Ochieng",
    email: "david.o@company.com",
    department: "Finance",
    position: "Accountant",
    contact: "+254 711 987654",
    status: "present",
    profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    active: true,
    hourlyRate: 1100,
    startDate: "2020-11-05",
    address: "789 Eldoret Way, Eldoret",
    emergencyContact: "+254 733 456789"
  },
  {
    id: 4,
    employeeNumber: "EMP-1026",
    name: "Sarah Kimani",
    email: "sarah.k@company.com",
    department: "HR",
    position: "HR Assistant",
    contact: "+254 733 456123",
    status: "absent",
    profileImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    active: true,
    hourlyRate: 950,
    startDate: "2021-08-20",
    address: "321 Kisumu St, Kisumu",
    emergencyContact: "+254 724 123456"
  },
  {
    id: 5,
    employeeNumber: "EMP-1027",
    name: "Peter Ndegwa",
    email: "peter.n@company.com",
    department: "Operations",
    position: "Logistics Manager",
    contact: "+254 721 789456",
    status: "present",
    profileImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    active: true,
    hourlyRate: 1300,
    startDate: "2019-05-12",
    address: "654 Nakuru Ave, Nakuru",
    emergencyContact: "+254 735 789123"
  }
];

// Attendance records
export const attendanceRecords = [
  {
    id: 1,
    employeeId: 1,
    employeeName: "James Mwangi",
    department: "IT Department",
    date: "2023-07-12",
    clockInTime: "2023-07-12T08:05:00",
    clockOutTime: "2023-07-12T17:10:00",
    status: "present",
    hoursWorked: 9.08
  },
  {
    id: 2,
    employeeId: 2,
    employeeName: "Lucy Njeri",
    department: "Marketing",
    date: "2023-07-12",
    clockInTime: "2023-07-12T08:45:00",
    clockOutTime: "2023-07-12T17:30:00",
    status: "late",
    hoursWorked: 8.75
  },
  {
    id: 3,
    employeeId: 3,
    employeeName: "David Ochieng",
    department: "Finance",
    date: "2023-07-12",
    clockInTime: "2023-07-12T08:02:00",
    clockOutTime: "2023-07-12T17:15:00",
    status: "present",
    hoursWorked: 9.22
  },
  {
    id: 4,
    employeeId: 4,
    employeeName: "Sarah Kimani",
    department: "HR",
    date: "2023-07-12",
    clockInTime: null,
    clockOutTime: null,
    status: "absent",
    hoursWorked: 0
  },
  {
    id: 5,
    employeeId: 5,
    employeeName: "Peter Ndegwa",
    department: "Operations",
    date: "2023-07-12",
    clockInTime: "2023-07-12T07:55:00",
    clockOutTime: "2023-07-12T17:05:00",
    status: "present",
    hoursWorked: 9.17
  }
];

// Payroll records
export const payrollRecords = [
  {
    id: 1,
    employeeId: 1,
    employeeName: "James Mwangi",
    department: "IT Department",
    periodStart: "2023-07-01",
    periodEnd: "2023-07-31",
    hoursWorked: 184,
    hourlyRate: 1200,
    grossPay: 220800,
    ewaDeductions: 15000,
    taxDeductions: 22080,
    otherDeductions: 5000,
    netPay: 178720,
    status: "processed"
  },
  {
    id: 2,
    employeeId: 2,
    employeeName: "Lucy Njeri",
    department: "Marketing",
    periodStart: "2023-07-01",
    periodEnd: "2023-07-31",
    hoursWorked: 176,
    hourlyRate: 900,
    grossPay: 158400,
    ewaDeductions: 10000,
    taxDeductions: 15840,
    otherDeductions: 3500,
    netPay: 129060,
    status: "processed"
  },
  {
    id: 3,
    employeeId: 3,
    employeeName: "David Ochieng",
    department: "Finance",
    periodStart: "2023-07-01",
    periodEnd: "2023-07-31",
    hoursWorked: 180,
    hourlyRate: 1100,
    grossPay: 198000,
    ewaDeductions: 20000,
    taxDeductions: 19800,
    otherDeductions: 4500,
    netPay: 153700,
    status: "processed"
  },
  {
    id: 4,
    employeeId: 4,
    employeeName: "Sarah Kimani",
    department: "HR",
    periodStart: "2023-07-01",
    periodEnd: "2023-07-31",
    hoursWorked: 168,
    hourlyRate: 950,
    grossPay: 159600,
    ewaDeductions: 0,
    taxDeductions: 15960,
    otherDeductions: 3800,
    netPay: 139840,
    status: "draft"
  },
  {
    id: 5,
    employeeId: 5,
    employeeName: "Peter Ndegwa",
    department: "Operations",
    periodStart: "2023-07-01",
    periodEnd: "2023-07-31",
    hoursWorked: 190,
    hourlyRate: 1300,
    grossPay: 247000,
    ewaDeductions: 25000,
    taxDeductions: 24700,
    otherDeductions: 6000,
    netPay: 191300,
    status: "processed"
  }
];

// EWA Requests
export const ewaRequests = [
  {
    id: 1,
    employeeId: 2,
    employeeName: "Lucy Njeri",
    employeeImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    department: "Marketing",
    requestDate: "2023-07-10T09:30:00",
    amount: 10000,
    status: "approved",
    reason: "Medical emergency",
    processingFee: 200
  },
  {
    id: 2,
    employeeId: 3,
    employeeName: "David Ochieng",
    employeeImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    department: "Finance",
    requestDate: "2023-07-11T14:15:00",
    amount: 20000,
    status: "pending",
    reason: "Rent payment",
    processingFee: 400
  },
  {
    id: 3,
    employeeId: 5,
    employeeName: "Peter Ndegwa",
    employeeImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    department: "Operations",
    requestDate: "2023-07-09T11:05:00",
    amount: 25000,
    status: "disbursed",
    reason: "School fees",
    processingFee: 500
  },
  {
    id: 4,
    employeeId: 1,
    employeeName: "James Mwangi",
    employeeImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    department: "IT Department",
    requestDate: "2023-07-12T10:20:00",
    amount: 15000,
    status: "pending",
    reason: "Car repair",
    processingFee: 300
  }
];

// Wallet data
export const walletData = {
  balance: 350000,
  pendingBalance: 25000,
  transactions: [
    {
      id: 1,
      date: "2023-07-01T09:15:00",
      amount: 100000,
      type: "deposit",
      description: "Monthly wallet top-up",
      status: "completed"
    },
    {
      id: 2,
      date: "2023-07-05T14:30:00",
      amount: 25000,
      type: "withdrawal",
      description: "EWA disbursement - Peter Ndegwa",
      status: "completed"
    },
    {
      id: 3,
      date: "2023-07-08T11:45:00",
      amount: 50000,
      type: "deposit",
      description: "Additional funds for EWA requests",
      status: "completed"
    },
    {
      id: 4,
      date: "2023-07-10T16:20:00",
      amount: 10000,
      type: "ewa",
      description: "EWA disbursement - Lucy Njeri",
      status: "completed"
    },
    {
      id: 5,
      date: "2023-07-15T13:45:00",
      amount: 5000,
      type: "transfer",
      description: "Transfer to James Mwangi",
      status: "pending"
    }
  ]
};

// Departments
export const departments = [
  { id: 1, name: "IT Department", description: "Information Technology Department" },
  { id: 2, name: "HR", description: "Human Resources Department" },
  { id: 3, name: "Finance", description: "Finance and Accounting Department" },
  { id: 4, name: "Marketing", description: "Marketing and Sales Department" },
  { id: 5, name: "Operations", description: "Operations Department" }
];

// User profile
export const userProfile = {
  id: 1,
  username: "hrmanager",
  name: "Sophia Wanjiku",
  email: "sophia.w@jahazii.io",
  role: "hr",
  profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  departmentId: 2,
  position: "HR Manager",
  contact: "+254 712 345678",
  joinDate: "2020-05-15",
  emergencyContact: "+254 723 456789",
  address: "123 Nairobi Way, Nairobi"
};

// Format functions
export const formatCurrency = (amount: number) => {
  return `KES ${amount.toLocaleString('en-US')}`;
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};
