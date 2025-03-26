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
const HOURLY_RATE = "500.00"; // Base hourly rate in KES (as string for consistency)
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
    name: "James Mwangi",
    avatar: "https://ui-avatars.com/api/?name=James+Mwangi&background=random",
    department: "IT",
    position: "Software Engineer"
  },
  {
    name: "Lucy Njeri",
    avatar: "https://ui-avatars.com/api/?name=Lucy+Njeri&background=random",
    department: "Marketing",
    position: "Marketing Manager"
  },
  {
    name: "David Ochieng",
    avatar: "https://ui-avatars.com/api/?name=David+Ochieng&background=random",
    department: "Finance",
    position: "Financial Analyst"
  },
  {
    name: "Sarah Kimani",
    avatar: "https://ui-avatars.com/api/?name=Sarah+Kimani&background=random",
    department: "HR",
    position: "HR Manager"
  },
  {
    name: "Peter Ndegwa",
    avatar: "https://ui-avatars.com/api/?name=Peter+Ndegwa&background=random",
    department: "Operations",
    position: "Operations Manager"
  },
  {
    name: "Mary Wangari",
    avatar: "https://ui-avatars.com/api/?name=Mary+Wangari&background=random",
    department: "IT",
    position: "UI/UX Designer"
  },
  {
    name: "John Kamau",
    avatar: "https://ui-avatars.com/api/?name=John+Kamau&background=random",
    department: "Marketing",
    position: "Social Media Specialist"
  },
  {
    name: "Grace Atieno",
    avatar: "https://ui-avatars.com/api/?name=Grace+Atieno&background=random",
    department: "Finance",
    position: "Accountant"
  },
  {
    name: "Samuel Kipchoge",
    avatar: "https://ui-avatars.com/api/?name=Samuel+Kipchoge&background=random",
    department: "HR",
    position: "Recruitment Specialist"
  },
  {
    name: "Esther Wambui",
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
function generateKenyanAddress() {
  return {
    street: KENYAN_STREETS[Math.floor(Math.random() * KENYAN_STREETS.length)],
    city: KENYAN_CITIES[Math.floor(Math.random() * KENYAN_CITIES.length)],
    postalCode: KENYAN_POSTAL_CODES[Math.floor(Math.random() * KENYAN_POSTAL_CODES.length)],
    country: 'Kenya'
  };
}

// Helper function to generate a Kenyan emergency contact
function generateKenyanEmergencyContact() {
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

function calculateHoursWorked(clockIn: Date | null, clockOut: Date | null): string {
  if (!clockIn || !clockOut) return "0.00";
  const diffInHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
  return diffInHours.toFixed(2);
}

function calculateGrossPay(hoursWorked: string): string {
  return (parseFloat(hoursWorked) * parseFloat(HOURLY_RATE)).toFixed(2);
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
    name,
    description: `${name} Department`
  }));
}

export function generateUsers(departments: Department[]): InsertUser[] {
  const users: InsertUser[] = [];
  
  // Generate one supervisor per department
  departments.forEach((dept, index) => {
    const employeeData = EMPLOYEE_DATA[index];
    users.push({
      username: employeeData.name.toLowerCase().replace(/\s+/g, '.'),
      password: "password123", // In a real app, this would be hashed
      name: employeeData.name,
      email: `${employeeData.name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      role: "supervisor",
      departmentId: dept.id,
      profileImage: employeeData.avatar
    });
  });
  
  return users;
}

export function generateEmployees(users: User[], departments: Department[]): InsertEmployee[] {
  return users.map((user, index) => {
    const employeeData = EMPLOYEE_DATA[index % EMPLOYEE_DATA.length];
    return {
      employeeNumber: `EMP${(index + 1).toString().padStart(4, '0')}`,
      userId: user.id,
      departmentId: user.departmentId!,
      position: employeeData.position,
      status: "active",
      hourlyRate: HOURLY_RATE,
      startDate: subDays(new Date(), faker.number.int({ min: 30, max: 365 })),
      active: true,
      phoneNumber: generateKenyanPhoneNumber(),
      emergencyContact: JSON.stringify(generateKenyanEmergencyContact()),
      address: JSON.stringify(generateKenyanAddress())
    };
  });
}

export function generateAttendance(employees: Employee[], days: number = 30): InsertAttendance[] {
  const attendance: InsertAttendance[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = subDays(today, i);
    
    // Skip weekends
    if (isWeekend(date)) continue;
    
    for (const employee of employees) {
      if (!employee.active) continue;
      
      // Randomly mark some employees as absent
      if (faker.number.float() < 0.1) { // 10% chance of absence
        attendance.push({
          employeeId: employee.id,
          date: startOfDay(date),
          clockInTime: null,
          clockOutTime: null,
          status: 'absent',
          hoursWorked: "0.00",
          geoLocation: null,
          approvedBy: null,
          notes: 'Marked as absent'
        });
        continue;
      }
      
      const { clockIn, clockOut } = generateWorkingHours(date);
      const hoursWorked = calculateHoursWorked(clockIn, clockOut);
      const status = generateAttendanceStatus(clockIn);
      
      attendance.push({
        employeeId: employee.id,
        date: startOfDay(date),
        clockInTime: clockIn,
        clockOutTime: clockOut,
        status,
        hoursWorked,
        geoLocation: {
          lat: faker.location.latitude(),
          lng: faker.location.longitude()
        },
        approvedBy: null,
        notes: status === 'late' ? 'Arrived late to work' : null
      });
    }
  }
  
  return attendance;
}

export function generatePayroll(employees: Employee[], attendance: Attendance[]): InsertPayroll[] {
  const payroll: InsertPayroll[] = [];
  const today = new Date();
  
  // Generate payrolls for the last 3 months
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const periodStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() - monthOffset + 1, 0);
    
    // Group attendance by employee for this period
    const employeeAttendance = new Map<number, Attendance[]>();
    for (const record of attendance) {
      if (!record.date) continue;
      const recordDate = new Date(record.date);
      if (recordDate >= periodStart && recordDate <= periodEnd) {
        if (!employeeAttendance.has(record.employeeId)) {
          employeeAttendance.set(record.employeeId, []);
        }
        employeeAttendance.get(record.employeeId)?.push(record);
      }
    }
    
    // Generate payroll for each employee
    for (const employee of employees) {
      if (!employee.active) continue;
      
      const employeeRecords = employeeAttendance.get(employee.id) || [];
      const totalHours = employeeRecords.reduce((sum, record) => {
        return sum + parseFloat(record.hoursWorked || "0");
      }, 0);
      
      const grossPay = calculateGrossPay(totalHours.toString());
      
      // Calculate deductions
      const ewaDeductions = employeeRecords.reduce((sum, record) => {
        const hoursWorked = parseFloat(record.hoursWorked || "0");
        const dailyEarnings = hoursWorked * parseFloat(employee.hourlyRate);
        return sum + (dailyEarnings * EWA_PERCENTAGE_LIMIT);
      }, 0);
      
      const taxDeductions = parseFloat(grossPay) * 0.3; // 30% tax
      const netPay = (parseFloat(grossPay) - ewaDeductions - taxDeductions).toFixed(2);
      
      // For past months, mark as processed
      const isProcessed = monthOffset > 0;
      
      payroll.push({
        employeeId: employee.id,
        status: isProcessed ? "processed" : "draft",
        periodStart,
        periodEnd,
        hoursWorked: totalHours.toFixed(2),
        grossPay,
        netPay,
        ewaDeductions: ewaDeductions.toFixed(2),
        taxDeductions: taxDeductions.toFixed(2),
        otherDeductions: "0.00",
        processedBy: isProcessed ? 1 : null // Default admin user ID for processed payrolls
      });
    }
  }
  
  return payroll;
}

export function generateEwaRequests(employees: Employee[], payroll: Payroll[]): InsertEwaRequest[] {
  const requests: InsertEwaRequest[] = [];
  
  for (const employee of employees) {
    if (!employee.active) continue;
    
    const employeePayroll = payroll.find(p => p.employeeId === employee.id);
    if (!employeePayroll) continue;
    
    // Generate 1-3 requests per employee
    const requestCount = faker.number.int({ min: 1, max: 3 });
    
    for (let i = 0; i < requestCount; i++) {
      const availableBalance = parseFloat(employeePayroll.grossPay) * EWA_PERCENTAGE_LIMIT;
      const amount = faker.number.float({ min: 1000, max: availableBalance }).toFixed(2);
      
      requests.push({
        employeeId: employee.id,
        amount,
        status: "pending",
        processingFee: (parseFloat(amount) * 0.01).toFixed(2), // 1% processing fee
        approvedBy: null,
        reason: faker.helpers.arrayElement([
          "Emergency medical expenses",
          "School fees payment",
          "Rent payment",
          "Family emergency"
        ]),
        rejectionReason: null
      });
    }
  }
  
  return requests;
}

export function generateWallet(): InsertWallet {
  return {
    employerBalance: "250000.00",
    jahaziiBalance: "100000.00",
    perEmployeeCap: "3000.00"
  };
}

export function generateWalletTransactions(wallet: Wallet): InsertWalletTransaction[] {
  const transactions: InsertWalletTransaction[] = [
    {
      walletId: wallet.id,
      amount: "250000.00",
      transactionType: "employer_topup",
      description: "Initial employer fund deposit",
      referenceId: `INI-EMP-${Date.now()}`,
      fundingSource: "employer",
      status: "completed"
    },
    {
      walletId: wallet.id,
      amount: "100000.00",
      transactionType: "jahazii_topup",
      description: "Initial Jahazii fund deposit",
      referenceId: `INI-JAH-${Date.now()}`,
      fundingSource: "jahazii",
      status: "completed"
    }
  ];
  
  // Generate additional transactions
  const transactionCount = faker.number.int({ min: 5, max: 10 });
  
  for (let i = 0; i < transactionCount; i++) {
    const amount = faker.number.int({ min: 5000, max: 50000 }).toFixed(2);
    const type = faker.helpers.arrayElement(['employer_topup', 'jahazii_topup', 'ewa_disbursement']);
    const source = type === 'ewa_disbursement' ? 'employer' : type.split('_')[0] as 'employer' | 'jahazii';
    
    transactions.push({
      walletId: wallet.id,
      amount,
      transactionType: type,
      description: faker.lorem.sentence(),
      referenceId: `TXN-${Date.now()}-${i}`,
      fundingSource: source,
      status: "completed"
    });
  }
  
  return transactions;
}

export function generateOtpCodes(employees: Employee[]): InsertOtpCode[] {
  const otpCodes: InsertOtpCode[] = [];
  
  for (const employee of employees) {
    if (!employee.active) continue;
    
    // Generate 1-3 OTP codes per employee
    const codeCount = faker.number.int({ min: 1, max: 3 });
    
    for (let i = 0; i < codeCount; i++) {
      otpCodes.push({
        employeeId: employee.id,
        code: faker.string.numeric(6),
        expiresAt: addMinutes(new Date(), 5),
        used: false
      });
    }
  }
  
  return otpCodes;
}

// Additional export for resetting attendance state
export function generateEmptyAttendance(employees: Employee[]): InsertAttendance[] {
  const attendanceRecords: InsertAttendance[] = [];
  const today = new Date();
  
  // Create attendance records for today with no clock in/out
  employees.forEach(employee => {
    if (employee.active) {
      attendanceRecords.push({
        employeeId: employee.id,
        date: startOfDay(today),
        clockInTime: null,
        clockOutTime: null,
        status: 'absent',
        hoursWorked: "0.00",
        geoLocation: null,
        approvedBy: null,
        notes: "Auto-generated reset record"
      });
    }
  });
  
  return attendanceRecords;
}