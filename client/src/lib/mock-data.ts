import { faker } from '@faker-js/faker';
import { 
  Payroll, 
  EwaRequest, 
  Wallet, 
  WalletTransaction,
  Department,
  UserWithRole, 
  User
} from '@shared/schema';

// This file contains mock data for the application
// In a real application, this would be fetched from the API

// Dashboard Statistics
export const dashboardStats = {
  employeeCount: {
    total: faker.number.int({ min: 200, max: 300 }),
    active: faker.number.int({ min: 180, max: 250 }),
    inactive: faker.number.int({ min: 20, max: 50 }),
    change: `+${faker.number.float({ min: 2, max: 5, fractionDigits: 1 })}%`
  },
  attendance: {
    rate: `${faker.number.float({ min: 90, max: 95, fractionDigits: 1 })}%`,
    change: `+${faker.number.float({ min: 1, max: 3, fractionDigits: 1 })}%`
  },
  payroll: {
    expected: `KES ${faker.number.int({ min: 4000000, max: 5000000 })}`,
    change: `+${faker.number.float({ min: 2, max: 4, fractionDigits: 1 })}%`
  },
  ewa: {
    total: `KES ${faker.number.int({ min: 800000, max: 1000000 })}`,
    pending: faker.number.int({ min: 30, max: 50 }),
    change: `+${faker.number.float({ min: 10, max: 15, fractionDigits: 1 })}%`
  }
};

// Activities
export const recentActivities = Array.from({ length: 5 }).map(() => ({
  id: faker.string.uuid(),
  type: faker.helpers.arrayElement(["employee", "ewa", "attendance", "payroll", "self-log"]),
  title: faker.lorem.sentence(),
  description: faker.lorem.sentence(),
  time: faker.date.recent().toLocaleTimeString(),
  icon: faker.helpers.arrayElement([
    "user-add-line",
    "bank-card-line",
    "time-line",
    "money-dollar-box-line",
    "login-box-line",
  ]),
}));

// Employees
export const employees = Array.from({ length: 5 }).map(() => ({
  id: faker.string.uuid(),
  employeeNumber: `EMP-${faker.string.numeric(4)}`,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  department: faker.commerce.department(),
  position: faker.person.jobTitle(),
  contact: faker.phone.number(),
  status: faker.helpers.arrayElement(["present", "late", "absent"]),
  profileImage: faker.image.avatar(),
  active: faker.datatype.boolean(),
  hourlyRate: faker.number.int({ min: 800, max: 1500 }),
  startDate: faker.date.past().toISOString().split('T')[0],
  address: faker.location.streetAddress(),
  emergencyContact: faker.phone.number(),
}));

// Helper functions
function generateRandomTime(baseHour: number, variance: number = 30): string {
  const date = new Date();
  const minutes = Math.floor(Math.random() * variance);
  date.setHours(baseHour, minutes, 0, 0);
  return date.toISOString();
}

function generateAttendanceStatus(clockInTime: string | null): 'present' | 'late' | 'absent' {
  if (!clockInTime) return 'absent';
  const clockIn = new Date(clockInTime);
  const expectedStart = new Date(clockIn);
  expectedStart.setHours(8, 30, 0, 0);
  
  return clockIn > expectedStart ? 'late' : 'present';
}

function calculateHoursWorked(clockIn: string | null, clockOut: string | null): number {
  if (!clockIn || !clockOut) return 0;
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  return Number(((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2));
}

// Generate dynamic attendance records for the last 7 days
export const attendanceRecords = (() => {
  const records: any[] = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    employees.forEach((emp) => {
      // 10% chance of being absent
      const isAbsent = Math.random() < 0.1;
      
      const clockInTime = isAbsent ? null : generateRandomTime(8);
      const clockOutTime = clockInTime ? generateRandomTime(17) : null;
      const status = generateAttendanceStatus(clockInTime);
      const hoursWorked = calculateHoursWorked(clockInTime, clockOutTime);
      
      records.push({
        id: faker.string.uuid(),
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        date: date.toISOString().split('T')[0],
        clockInTime,
        clockOutTime,
        status,
        hoursWorked
      });
    });
  }
  
  return records;
})();

// Payroll records
export const payrollRecords: Payroll[] = Array.from({ length: 5 }).map(() => ({
  id: faker.string.uuid(),
  employeeId: faker.string.uuid(),
  periodStart: faker.date.past(),
  periodEnd: faker.date.recent(),
  hoursWorked: faker.number.int({ min: 160, max: 200 }),
  hourlyRate: faker.number.int({ min: 800, max: 1500 }),
  grossPay: faker.number.int({ min: 150000, max: 250000 }),
  ewaDeductions: faker.number.int({ min: 0, max: 20000 }),
  taxDeductions: faker.number.int({ min: 10000, max: 30000 }),
  otherDeductions: faker.number.int({ min: 0, max: 5000 }),
  netPay: faker.number.int({ min: 120000, max: 220000 }),
  status: faker.helpers.arrayElement(["processed", "draft", "paid"]),
}));

// EWA Requests
export const ewaRequests: Omit<EwaRequest, 'employee'>[] = Array.from({ length: 4 }).map(() => ({
  id: faker.string.uuid(),
  employeeId: faker.string.uuid(),
  requestDate: faker.date.recent(),
  amount: faker.number.int({ min: 5000, max: 25000 }),
  status: faker.helpers.arrayElement(["approved", "pending", "disbursed"]),
  reason: faker.lorem.sentence(),
  processingFee: faker.number.int({ min: 100, max: 500 }),
}));

// Wallet data
export const walletData: Wallet & { 
  totalBalance: number;
  activeEmployees: number;
  pendingRequests: number;
  pendingAmount: number;
  employerFundsUtilization: number;
  transactions: WalletTransaction[] 
} = {
  id: faker.string.uuid(),
  employerBalance: faker.number.int({ min: 200000, max: 300000 }),
  jahaziiBalance: faker.number.int({ min: 80000, max: 120000 }),
  perEmployeeCap: faker.number.int({ min: 2000, max: 4000 }),
  updatedAt: new Date(),
  // Additional frontend-specific fields
  totalBalance: faker.number.int({ min: 280000, max: 420000 }),
  activeEmployees: faker.number.int({ min: 40, max: 50 }),
  pendingRequests: faker.number.int({ min: 2, max: 6 }),
  pendingAmount: faker.number.int({ min: 10000, max: 30000 }),
  employerFundsUtilization: faker.number.int({ min: 60, max: 80 }),
  transactions: Array.from({ length: 5 }).map(() => ({
    id: faker.string.uuid(),
    walletId: faker.string.uuid(),
    amount: faker.number.int({ min: 1000, max: 100000 }),
    transactionType: faker.helpers.arrayElement([
      "employer_topup",
      "employer_disbursement",
      "jahazii_topup",
      "jahazii_disbursement",
    ]),
    fundingSource: faker.helpers.arrayElement(["employer", "jahazii"]),
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(["completed", "pending"]),
    transactionDate: faker.date.recent(),
    referenceId: faker.string.uuid(),
  })),
};

// Departments
export const departments: Department[] = Array.from({ length: 5 }).map(() => ({
  id: faker.string.uuid(),
  name: faker.commerce.department(),
  description: faker.lorem.sentence(),
}));

// User profile
export const userProfile: User = {
  id: faker.string.uuid(),
  username: faker.internet.userName(),
  password: faker.internet.password(),
  role: faker.helpers.arrayElement(["hr", "admin", "employee", "supervisor"]),
  profileImage: faker.image.avatar(),
  departmentId: faker.string.uuid(),  
  created_at: faker.date.recent(),
  modified_at: faker.date.recent(),
};

// Format functions
export const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) {
    return 'KES 0';
  }
  return `KES ${Number(amount).toLocaleString('en-US')}`;
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
