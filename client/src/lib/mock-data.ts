import { faker } from '@faker-js/faker';
import { 
  Payroll, 
  EwaRequest, 
  Wallet, 
  WalletTransaction,
  Department,
  User,
  Employee,
  Attendance
} from '@shared/schema';
import { subDays } from 'date-fns';

// This file contains mock data for the application
// In a real application, this would be fetched from the API

// --- Constants (Mimic server-side if needed) ---
const HOURLY_RATE_MOCK = faker.number.int({ min: 800, max: 1500 }); // Example hourly rate for client mocks
const WORK_HOURS_PER_DAY_MOCK = 8;
const WORK_START_HOUR_MOCK = 8;
const WORK_END_HOUR_MOCK = 17;
const LATE_THRESHOLD_MINUTES_MOCK = 15;

// --- Helper Functions (Kenyan specific, similar to server-side) ---
const KENYAN_CITIES_MOCK = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"];
const KENYAN_POSTAL_CODES_MOCK = ["00100", "00200", "20100", "30100", "40100"];
const KENYAN_STREETS_MOCK = ["Moi Avenue", "Kenyatta Avenue", "Ngong Road", "Waiyaki Way"];
const KENYAN_NAMES_MOCK = ["Wafula", "Kamau", "Otieno", "Wanjiku", "Achieng", "Kipchoge"];
const RELATIONSHIPS_MOCK = ["Spouse", "Parent", "Sibling", "Friend"];

function generateKenyanPhoneNumberMock(): string {
    const prefixes = ["070", "071", "072", "073", "074", "079", "011"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomDigits = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `${randomPrefix}${randomDigits}`;
}

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

// Departments
export const departments: Department[] = [
    { id: faker.string.uuid(), name: "Technology", description: "Handles all tech things" },
    { id: faker.string.uuid(), name: "Sales & Marketing", description: "Brings in the customers" },
    { id: faker.string.uuid(), name: "Finance & Admin", description: "Manages money and operations" },
    { id: faker.string.uuid(), name: "Human Resources", description: "Manages people" },
    { id: faker.string.uuid(), name: "Customer Support", description: "Helps the customers" },
];

// Updated Employees mock data generation
export const employees: Employee[] = Array.from({ length: 15 }).map(() => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${faker.string.numeric(2)}`;
  const email = faker.internet.email({ firstName, lastName });
  const department = faker.helpers.arrayElement(departments);
  const startDate = subDays(new Date(), faker.number.int({ min: 30, max: 1095 })); // Hired in last 3 years
  const grossIncome = faker.number.int({ min: 40000, max: 150000 }); // Monthly gross

  return {
    // User fields
    id: faker.string.uuid(),
    username: username,
    password: 'mockPassword', // Not typically needed on client
    role: faker.helpers.arrayElement(['employee', 'employee', 'supervisor']), // Weighted towards employee
    profileImage: faker.image.avatar(),
    created_at: faker.date.past({ years: 3 }),
    modified_at: faker.date.recent(),
    surname: lastName,
    other_names: firstName,
    id_no: faker.string.numeric(8),
    tax_pin: `A${faker.string.numeric(9)}X`,
    sex: faker.person.sex(),
    nssf_no: faker.string.numeric(10),
    nhif_no: faker.string.numeric(9),
    contact: {
      email: email,
      phoneNumber: generateKenyanPhoneNumberMock()
    },

    // Employee specific fields
    employeeNumber: `EMP-${faker.string.numeric(4)}`,
    departmentId: department.id,
    position: faker.person.jobTitle(),
    status: faker.helpers.arrayElement(["active", "active", "active", "on-leave", "terminated"]), // Weighted towards active
    is_on_probation: faker.datatype.boolean(0.1),
    gross_income: grossIncome,
    net_income: grossIncome * faker.number.float({ min: 0.7, max: 0.85 }), // Approx net
    total_deductions: grossIncome * faker.number.float({ min: 0.15, max: 0.3 }), // Approx deductions
    loan_deductions: faker.number.int({ min: 0, max: grossIncome * 0.1 }),
    employer_advances: faker.number.int({ min: 0, max: grossIncome * 0.05 }),
    total_loan_deductions: faker.number.int({ min: 0, max: grossIncome * 0.15 }),
    statutory_deductions: {
      nhif: faker.number.int({ min: 500, max: 1700 }),
      nssf: faker.number.int({ min: 200, max: 1080 }),
      tax: faker.number.int({ min: 1000, max: grossIncome * 0.2 }),
      levy: faker.number.int({ min: 100, max: 300 })
    },
    max_salary_advance_limit: grossIncome * 0.5, // 50% of gross
    available_salary_advance_limit: grossIncome * 0.5 * faker.number.float({min: 0, max: 1}),
    last_withdrawal_time: faker.helpers.maybe(() => faker.date.recent({ days: 30 })),
    bank_info: {
        accountNumber: faker.finance.accountNumber(10),
        bankName: faker.helpers.arrayElement(['KCB', 'Equity Bank', 'Coop Bank', 'Absa Bank', 'NCBA Bank']),
        branchCode: faker.string.numeric(5)
    },
    id_confirmed: faker.datatype.boolean(0.8),
    mobile_confirmed: faker.datatype.boolean(0.9),
    tax_pin_verified: faker.datatype.boolean(0.7),
    country: "KE",
    documents: {}, // Keep simple for client mock
    crb_reports: {}, // Keep simple for client mock
    avatar_url: faker.image.avatar(), // Can differ from profileImage
    hourlyRate: Number((grossIncome / (WORK_HOURS_PER_DAY_MOCK * 22)).toFixed(2)) || HOURLY_RATE_MOCK, // Approx hourly
    startDate: startDate,
    active: faker.datatype.boolean(0.9), // 90% active
    department: department, // Attach the department object directly
  };
});

// Helper functions for Attendance (slight adjustments if needed)
function generateRandomTime(baseHour: number, variance: number = 30): Date { // Return Date object
  const date = new Date();
  const minutes = baseHour === WORK_END_HOUR_MOCK
                  ? faker.number.int({ min: -15, max: variance }) // Allow clocking out slightly early/late
                  : faker.number.int({ min: -5, max: variance }); // Allow clocking in slightly early/late
  date.setHours(baseHour, minutes, faker.number.int({min: 0, max: 59}), 0);
  return date;
}

function generateAttendanceStatus(clockInTime: Date | null | undefined): 'present' | 'late' | 'absent' {
  if (!clockInTime) return 'absent';
  const clockIn = new Date(clockInTime);
  const expectedStart = new Date(clockIn);
  // Set expected start time (e.g., 8:15 AM allowing for threshold)
  expectedStart.setHours(WORK_START_HOUR_MOCK, LATE_THRESHOLD_MINUTES_MOCK, 0, 0);

  return clockIn > expectedStart ? 'late' : 'present';
}

function calculateHoursWorked(clockIn: Date | null | undefined, clockOut: Date | null | undefined): number {
  if (!clockIn || !clockOut || clockOut <= clockIn) return 0;
  return Number(((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)).toFixed(2));
}

// Generate dynamic attendance records for the last 7 days
export const attendanceRecords: Attendance[] = (() => {
  const records: Attendance[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    
    employees.forEach((emp) => {
      // 10% chance of being absent
      const isAbsent = Math.random() < 0.1;
      
      const clockInTime = isAbsent ? undefined : generateRandomTime(8);
      const clockOutTime = clockInTime ? generateRandomTime(17) : undefined;
      const status = generateAttendanceStatus(clockInTime);
      const hoursWorked = calculateHoursWorked(clockInTime, clockOutTime);
      
      records.push({
        id: faker.string.uuid(),
        employeeId: emp.id,
        date: date,
        clockInTime,
        clockOutTime,
        status,
        hoursWorked,
        geoLocation: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude()
        }
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
  employerBalance: faker.number.int({ min: 100000, max: 1000000 }),
  jahaziiBalance: faker.number.int({ min: 50000, max: 500000 }), // Used credit amount
  perEmployeeCap: 50000,
  updatedAt: faker.date.recent(),
  totalBalance: 0, // Will be calculated
  activeEmployees: faker.number.int({ min: 10, max: 50 }),
  pendingRequests: faker.number.int({ min: 0, max: 10 }),
  pendingAmount: 0, // Will be calculated
  employerFundsUtilization: faker.number.int({ min: 30, max: 90 }),
  employeeAllocations: {},
  transactions: Array.from({ length: 10 }).map(() => {
    const transactionType = faker.helpers.arrayElement([
      "employer_topup",
      "employer_disbursement",
      "jahazii_disbursement",
      "jahazii_fee"
    ]) as WalletTransaction["transactionType"];
    
    let amount: number;
    if (transactionType === "jahazii_fee") {
      amount = -faker.number.int({ min: 100, max: 1000 }); // Processing fees
    } else if (transactionType.includes("disbursement")) {
      amount = -faker.number.int({ min: 1000, max: 10000 }); // Disbursements are negative
    } else {
      amount = faker.number.int({ min: 10000, max: 100000 }); // Top-ups are positive
    }

    const description = (() => {
      switch (transactionType) {
        case "employer_topup":
          return `Employer wallet top-up via ${faker.helpers.arrayElement(["bank transfer", "M-Pesa", "card"])}`;
        case "jahazii_fee":
          return `Processing fee for EWA disbursement (${faker.person.fullName()})`;
        default:
          return `EWA disbursement for ${faker.person.fullName()}`;
      }
    })();

    return {
      id: faker.string.uuid(),
      walletId: faker.string.uuid(),
      amount,
      transactionType,
      description,
      transactionDate: faker.date.recent(),
      referenceId: `TXN-${faker.string.alphanumeric(8).toUpperCase()}`,
      fundingSource: transactionType.includes("employer") ? "employer" : "jahazii",
      status: faker.helpers.arrayElement(["pending", "completed", "failed"]),
      employeeId: transactionType.includes("disbursement") || transactionType === "jahazii_fee" ? faker.string.uuid() : undefined,
      ewaRequestId: transactionType.includes("disbursement") || transactionType === "jahazii_fee" ? faker.string.uuid() : undefined
    };
  })
};

// Calculate derived values
walletData.pendingAmount = walletData.transactions
  .filter(t => t.status === "pending" && t.amount < 0)
  .reduce((sum, t) => sum + Math.abs(t.amount), 0);

walletData.totalBalance = walletData.employerBalance;

// User profile
export const userProfile: User = {
  id: faker.string.uuid(),
  username: faker.internet.username(),
  password: faker.internet.password(),
  role: faker.helpers.arrayElement(["hr", "admin", "employee", "supervisor"]),
  profileImage: faker.image.avatar(),
  departmentId: faker.string.uuid(),  
  created_at: faker.date.recent(),
  modified_at: faker.date.recent(),
  surname: faker.person.lastName(),
  other_names: faker.person.firstName(),
  id_no: faker.string.numeric(8),
  sex: faker.person.sex(),
  contact: {
    email: faker.internet.email(),
    phoneNumber: generateKenyanPhoneNumberMock()
  }
};

// Initial HR user for /current endpoint
export const initialHrUser: User = {
  id: 'hr-admin-001',
  username: 'hr.admin',
  password: 'hashedPassword123', // In real app, this would be properly hashed
  role: 'hr',
  profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hr-admin',
  departmentId: departments[3].id, // HR department ID
  created_at: new Date('2024-01-01'),
  modified_at: new Date('2024-01-01'),
  surname: 'Admin',
  other_names: 'HR',
  id_no: 'A123456789',
  sex: 'other',
  contact: {
    email: 'hr.admin@company.com',
    phoneNumber: '0700000000'
  }
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

export const formatDateTime = (dateString: string | Date) => {
  if (!dateString) return '-';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
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
