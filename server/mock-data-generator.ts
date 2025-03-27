import { faker } from '@faker-js/faker';
import { addDays, addHours, addMinutes, format, isWeekend, startOfDay, subDays } from 'date-fns';
import type {
  User, InsertUser,
  Department, InsertDepartment,
  Employee, InsertEmployee,
  Attendance, InsertAttendance,
  Payroll, InsertPayroll,
  EwaRequest, InsertEwaRequest,
  Wallet, InsertWallet,
  WalletTransaction, InsertWalletTransaction,
  OtpCode, InsertOtpCode
} from "@shared/schema";

// Constants
const HOURLY_RATE = 500; // Base hourly rate in KES
const WORK_HOURS_PER_DAY = 8;
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 17;
const LATE_THRESHOLD_MINUTES = 15;
const EWA_PERCENTAGE_LIMIT = 0.5; // 50% of earned wages

// Kenyan cities
const KENYAN_CITIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", 
  "Nyeri", "Thika", "Malindi", "Kitale", "Machakos"
];

// Kenyan postal codes
const KENYAN_POSTAL_CODES = [
  "00100", "00200", "00300", "20100", "30100", 
  "40100", "50100", "10100", "80100", "90100"
];

// Kenyan streets
const KENYAN_STREETS = [
  "Moi Avenue", "Kenyatta Avenue", "Kimathi Street", "Tom Mboya Street", "Haile Selassie Avenue",
  "Mombasa Road", "Waiyaki Way", "Thika Road", "Ngong Road", "Langata Road"
];

// Kenyan Phone Numbers
function generateKenyanPhoneNumber(): string {
  const prefixes = ["0700", "0710", "0722", "0733", "0740", "0750", "0762", "0772", "0790", "0110", "0111", "0112"];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${randomPrefix}${randomDigits}`;
}

// Consistent employee data - updated with more Kenyan names
const EMPLOYEE_DATA = [
  {
    firstName: "James",
    lastName: "Mwangi",
    avatar: "https://ui-avatars.com/api/?name=James+Mwangi&background=random",
    department: "IT",
    position: "Software Engineer"
  },
  {
    firstName: "Lucy",
    lastName: "Njeri",
    avatar: "https://ui-avatars.com/api/?name=Lucy+Njeri&background=random",
    department: "Marketing",
    position: "Marketing Manager"
  },
  {
    firstName: "David",
    lastName: "Ochieng",
    avatar: "https://ui-avatars.com/api/?name=David+Ochieng&background=random",
    department: "Finance",
    position: "Financial Analyst"
  },
  {
    firstName: "Sarah",
    lastName: "Kimani",
    avatar: "https://ui-avatars.com/api/?name=Sarah+Kimani&background=random",
    department: "HR",
    position: "HR Manager"
  },
  {
    firstName: "Peter",
    lastName: "Ndegwa",
    avatar: "https://ui-avatars.com/api/?name=Peter+Ndegwa&background=random",
    department: "Operations",
    position: "Operations Manager"
  },
  {
    firstName: "Mary",
    lastName: "Wangari",
    avatar: "https://ui-avatars.com/api/?name=Mary+Wangari&background=random",
    department: "IT",
    position: "UI/UX Designer"
  },
  {
    firstName: "John",
    lastName: "Kamau",
    avatar: "https://ui-avatars.com/api/?name=John+Kamau&background=random",
    department: "Marketing",
    position: "Social Media Specialist"
  },
  {
    firstName: "Grace",
    lastName: "Atieno",
    avatar: "https://ui-avatars.com/api/?name=Grace+Atieno&background=random",
    department: "Finance",
    position: "Accountant"
  },
  {
    firstName: "Samuel",
    lastName: "Kipchoge",
    avatar: "https://ui-avatars.com/api/?name=Samuel+Kipchoge&background=random",
    department: "HR",
    position: "Recruitment Specialist"
  },
  {
    firstName: "Esther",
    lastName: "Wambui",
    avatar: "https://ui-avatars.com/api/?name=Esther+Wambui&background=random",
    department: "Operations",
    position: "Logistics Coordinator"
  }
];

// Kenyan family/relationship names for emergency contacts
const KENYAN_NAMES = [
  "Wafula", "Kamau", "Otieno", "Wanjiku", "Achieng", "Kipchoge", "Njoroge", "Odhiambo", 
  "Muthoni", "Omondi", "Mutuku", "Chepkoech", "Kiprop", "Nyambura", "Korir"
];

// Kenyan relationships
const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Uncle", "Aunt", "Cousin", "Friend"];

// Helper function to generate a Kenyan address
function generateKenyanAddress(): string {
  return `${KENYAN_STREETS[Math.floor(Math.random() * KENYAN_STREETS.length)]}, ${KENYAN_CITIES[Math.floor(Math.random() * KENYAN_CITIES.length)]}, ${KENYAN_POSTAL_CODES[Math.floor(Math.random() * KENYAN_POSTAL_CODES.length)]}, Kenya`;
}

// Helper function to generate a Kenyan emergency contact
function generateKenyanEmergencyContact(): any {
  const firstName = KENYAN_NAMES[Math.floor(Math.random() * KENYAN_NAMES.length)];
  const lastName = KENYAN_NAMES[Math.floor(Math.random() * KENYAN_NAMES.length)];
  return {
    name: `${firstName} ${lastName}`,
    relationship: RELATIONSHIPS[Math.floor(Math.random() * RELATIONSHIPS.length)],
    phone: generateKenyanPhoneNumber()
  };
}

// Helper functions
function generateWorkingHours(date: Date): { clockIn: Date; clockOut: Date } {
  const clockIn = new Date(date);
  clockIn.setHours(WORK_START_HOUR, faker.number.int({ min: 0, max: LATE_THRESHOLD_MINUTES }), 0);
  
  const clockOut = new Date(date);
  clockOut.setHours(WORK_END_HOUR, faker.number.int({ min: 0, max: 30 }), 0);
  
  return { clockIn, clockOut };
}

function calculateHoursWorked(clockIn: Date | null, clockOut: Date | null): number {
  if (!clockIn || !clockOut) return 0;
  const diffInHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
  return parseFloat(diffInHours.toFixed(2));
}

function calculateGrossPay(hoursWorked: string): string {
  return (parseFloat(hoursWorked) * parseFloat(HOURLY_RATE.toString())).toFixed(2);
}

function generateAttendanceStatus(clockIn: Date | null): 'present' | 'late' | 'absent' | 'leave' {
  if (!clockIn) return 'absent';
  const clockInMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
  const expectedClockInMinutes = WORK_START_HOUR * 60;
  
  if (clockInMinutes > expectedClockInMinutes + LATE_THRESHOLD_MINUTES) {
    return 'late';
  }
  return 'present';
}

// Data generators
export function generateDepartments(): InsertDepartment[] {
  return ["IT", "Marketing", "Finance", "HR", "Operations"].map(name => ({
    id: faker.string.uuid(),
    name,
    description: `${name} Department`
  }));
}

export function generateUsers(departments: Department[]): InsertUser[] {
  const users: InsertUser[] = [];
  
  // Generate one supervisor per department
  departments.forEach((dept, index) => {
    if (index >= EMPLOYEE_DATA.length) return;
    
    const employeeData = EMPLOYEE_DATA[index];
    const username = `${employeeData.firstName.toLowerCase()}.${employeeData.lastName.toLowerCase()}`;
    
    users.push({
      id: faker.string.uuid(),
      username,
      password: "password123", // In a real app, this would be hashed
      role: "supervisor",
      profileImage: employeeData.avatar,
      departmentId: dept.id,
      created_at: new Date(),
      modified_at: new Date()
    });
  });
  
  return users;
}

export function generateEmployees(users: User[], departments: Department[]): InsertEmployee[] {
  const employees: InsertEmployee[] = [];
  
  // Create one employee per user
  users.forEach((user, index) => {
    if (index >= EMPLOYEE_DATA.length) return;
    
    const employeeData = EMPLOYEE_DATA[index];
    const department = departments.find(d => d.id === user.departmentId) || departments[0];
    
    employees.push({
      id: faker.string.uuid(),
      employeeNumber: `EMP-${faker.string.numeric(5)}`,
      userId: user.id,
      departmentId: department.id,
      surname: employeeData.lastName,
      other_names: employeeData.firstName,
      id_no: faker.string.numeric(8),
      tax_pin: faker.string.alphanumeric(9),
      sex: faker.helpers.arrayElement(['M', 'F']),
      position: employeeData.position,
      status: "active",
      is_on_probation: faker.datatype.boolean(0.3),
      role: "employee",
      gross_income: HOURLY_RATE * WORK_HOURS_PER_DAY * 22, // 22 working days per month
      net_income: HOURLY_RATE * WORK_HOURS_PER_DAY * 22 * 0.8, // 80% after taxes
      total_deductions: HOURLY_RATE * WORK_HOURS_PER_DAY * 22 * 0.2, // 20% deductions
      loan_deductions: faker.number.int({ min: 0, max: 5000 }),
      employer_advances: faker.number.int({ min: 0, max: 5000 }),
      total_loan_deductions: faker.number.int({ min: 0, max: 5000 }),
      statutory_deductions: {
        nhif: faker.number.int({ min: 500, max: 1000 }),
        nssf: faker.number.int({ min: 200, max: 500 }),
        paye: faker.number.int({ min: 1000, max: 3000 }),
        levies: faker.number.int({ min: 100, max: 300 })
      },
      max_salary_advance_limit: HOURLY_RATE * WORK_HOURS_PER_DAY * 22 * 0.5, // 50% of gross salary
      available_salary_advance_limit: HOURLY_RATE * WORK_HOURS_PER_DAY * 22 * 0.3, // 30% of gross salary
      contact: {
        email: `${employeeData.firstName.toLowerCase()}.${employeeData.lastName.toLowerCase()}@company.com`,
        phoneNumber: generateKenyanPhoneNumber()
      },
      address: generateKenyanAddress(),
      bank_info: {
        acc_no: faker.string.numeric(10),
        bank_name: faker.helpers.arrayElement(['KCB', 'Equity', 'Standard Chartered', 'Coop Bank', 'Absa'])
      },
      id_confirmed: true,
      mobile_confirmed: true,
      tax_pin_verified: true,
      country: "KE",
      documents: [],
      crb_reports: [],
      avatar_url: employeeData.avatar,
      hourlyRate: HOURLY_RATE,
      phoneNumber: generateKenyanPhoneNumber(),
      startDate: subDays(new Date(), faker.number.int({ min: 30, max: 365 })),
      emergencyContact: generateKenyanEmergencyContact(),
      active: true,
      created_at: new Date(),
      modified_at: new Date()
    });
  });
  
  return employees;
}

export function generateAttendance(employees: Employee[], days: number): InsertAttendance[] {
  const attendance: InsertAttendance[] = [];
  const today = new Date();
  
  for (let day = days - 1; day >= 0; day--) {
    const date = subDays(today, day);
    if (isWeekend(date)) continue;
    
    for (const employee of employees) {
      const { clockIn, clockOut } = generateWorkingHours(date);
      const hoursWorked = calculateHoursWorked(clockIn, clockOut);
      const status = generateAttendanceStatus(clockIn);
      
      attendance.push({
        id: faker.string.uuid(),
        employeeId: employee.id,
        status,
        date: date,
        clockInTime: clockIn,
        clockOutTime: clockOut,
        hoursWorked: hoursWorked,
        geoLocation: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude()
        },
        approvedBy: faker.string.uuid(),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 })
      });
    }
  }
  
  return attendance;
}

export function generatePayroll(employees: Employee[], attendance: Attendance[]): InsertPayroll[] {
  const payroll: InsertPayroll[] = [];
  const today = new Date();
  
  for (const employee of employees) {
    const employeeAttendance = attendance.filter(a => a.employeeId === employee.id);
    const totalHoursWorked = employeeAttendance.reduce((total, record) => 
      total + (record.hoursWorked || 0), 0);
    const grossPay = totalHoursWorked * (employee.hourlyRate || HOURLY_RATE);
    const taxDeductions = grossPay * 0.15; // Assuming 15% tax deduction
    const netPay = grossPay - taxDeductions;
    
    payroll.push({
      id: faker.string.uuid(),
      employeeId: employee.id,
      status: "pending",
      periodStart: subDays(today, 30),
      periodEnd: today,
      hoursWorked: totalHoursWorked,
      grossPay: grossPay,
      netPay: netPay,
      ewaDeductions: 0,
      taxDeductions: taxDeductions,
      otherDeductions: 0,
      processedBy: faker.string.uuid(),
      processedAt: new Date()
    });
  }
  
  return payroll;
}

export function generateEwaRequests(employees: Employee[], payroll: Payroll[]): InsertEwaRequest[] {
  const ewaRequests: InsertEwaRequest[] = [];
  
  for (const employee of employees) {
    const employeePayroll = payroll.find(p => p.employeeId === employee.id);
    if (!employeePayroll) continue;
    
    const maxEwaAmount = employeePayroll.netPay * EWA_PERCENTAGE_LIMIT;
    const requestAmount = faker.number.float({ min: 1000, max: maxEwaAmount });
    const status = faker.helpers.arrayElement(['pending', 'approved', 'disbursed']);
    
    // Create basic request properties
    const request: InsertEwaRequest = {
      id: faker.string.uuid(),
      employeeId: employee.id,
      requestDate: new Date(),
      amount: requestAmount,
      status: status,
      processingFee: requestAmount * 0.01, // 1% processing fee
      reason: faker.helpers.arrayElement([
        'Emergency medical expenses',
        'School fees payment',
        'Rent payment',
        'Family emergency',
        'Utility bills'
      ])
    };
    
    // Add approval info if approved or disbursed
    if (status === 'approved' || status === 'disbursed') {
      request.approvedBy = faker.string.uuid();
      request.approvedAt = new Date(new Date().getTime() - 24 * 60 * 60 * 1000); // Yesterday
    }
    
    // Add disbursed info if disbursed
    if (status === 'disbursed') {
      request.disbursedAt = new Date();
    }
    
    ewaRequests.push(request);
  }
  
  return ewaRequests;
}

export function generateWallet(): InsertWallet {
  return {
    id: faker.string.uuid(),
    employerBalance: 1000000,
    jahaziiBalance: 500000,
    perEmployeeCap: 50000,
    updatedAt: new Date()
  };
}

export function generateWalletTransactions(wallet: Wallet): InsertWalletTransaction[] {
  const transactions: InsertWalletTransaction[] = [];
  
  for (let i = 0; i < 10; i++) {
    const amount = faker.number.float({ min: 1000, max: 100000 });
    const transactionType = faker.helpers.arrayElement(['deposit', 'withdrawal', 'transfer']);
    
    transactions.push({
      id: faker.string.uuid(),
      walletId: wallet.id,
      amount,
      transactionType,
      fundingSource: faker.helpers.arrayElement(['bank', 'mpesa', 'card']),
      status: 'completed',
      description: `${transactionType} via ${faker.helpers.arrayElement(['bank', 'mpesa', 'card'])}`,
      referenceId: faker.string.uuid(),
      transactionDate: new Date()
    });
  }
  
  return transactions;
}

export function generateOtpCode(employeeId: string): InsertOtpCode {
  return {
    id: faker.string.uuid(),
    employeeId,
    code: faker.number.int({ min: 100000, max: 999999 }).toString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date(),
    used: false
  };
}

// Additional export for resetting attendance state
export function generateEmptyAttendance(employees: Employee[]): InsertAttendance[] {
  const attendanceRecords: InsertAttendance[] = [];
  const today = startOfDay(new Date());
  
  // Create attendance records for today with no clock in/out
  employees.forEach(employee => {
    if (employee.active) {
      attendanceRecords.push({
        id: faker.string.uuid(),
        employeeId: employee.id,
        date: today,
        clockInTime: undefined,
        clockOutTime: undefined,
        status: 'absent',
        hoursWorked: 0,
        geoLocation: null,
        approvedBy: undefined,
        notes: "Auto-generated reset record"
      });
    }
  });
  
  return attendanceRecords;
}