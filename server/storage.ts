import {
  type User,
  type InsertUser,
  type Department,
  type InsertDepartment,
  type Employee,
  type InsertEmployee,
  type Attendance,
  type InsertAttendance,
  type Payroll,
  type InsertPayroll,
  type EwaRequest,
  type InsertEwaRequest,
  type Wallet,
  type InsertWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  type OtpCode,
  type InsertOtpCode,
} from "@shared/schema";

import {
  generateDepartments,
  generateUsers,
  generateEmployees,
  generateAttendance,
  generatePayroll,
  generateEwaRequests,
  generateWallet,
  generateWalletTransactions,
  generateOtpCode,
} from "./mock-data-generator";

import { faker } from "@faker-js/faker";

// Helper function to generate IDs
export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;

  // Department operations
  getDepartment(id: string): Promise<Department | undefined>;
  getAllDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;

  // Employee operations
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined>;
  getEmployeeWithDetails(id: string): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  getAllActiveEmployees(): Promise<Employee[]>;
  getAllInactiveEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(
    id: string,
    employee: Partial<Employee>
  ): Promise<Employee | undefined>;

  // Attendance operations
  getAttendance(id: string): Promise<Attendance | undefined>;
  getAttendanceForEmployee(employeeId: string): Promise<Attendance[]>;
  getAttendanceForDate(date: Date): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(
    id: string,
    attendance: Partial<Attendance>
  ): Promise<Attendance>;
  getAttendanceByEmployeeAndDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Attendance[]>;
  getAllAttendance(): Promise<Attendance[]>;
  getAllAttendanceByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Attendance[]>;

  // Payroll operations
  getPayroll(id: string): Promise<Payroll | undefined>;
  getPayrollForEmployee(employeeId: string): Promise<Payroll[]>;
  getPayrollForPeriod(startDate: Date, endDate: Date): Promise<Payroll[]>;
  getPayrollByReferenceNumber(referenceNumber: string): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(
    id: string,
    payroll: Partial<Payroll>
  ): Promise<Payroll | undefined>;

  // EWA operations
  getEwaRequest(id: string): Promise<EwaRequest | undefined>;
  getEwaRequestsForEmployee(employeeId: string): Promise<EwaRequest[]>;
  getPendingEwaRequests(): Promise<EwaRequest[]>;
  getApprovedEwaRequests(): Promise<EwaRequest[]>;
  getDisbursedEwaRequests(): Promise<EwaRequest[]>;
  createEwaRequest(ewaRequest: InsertEwaRequest): Promise<EwaRequest>;
  updateEwaRequest(
    id: string,
    ewaRequest: Partial<EwaRequest>
  ): Promise<EwaRequest | undefined>;

  // Wallet operations
  getWallet(): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(
    id: string,
    wallet: Partial<Wallet>
  ): Promise<Wallet | undefined>;

  // Wallet transaction operations
  getWalletTransaction(id: string): Promise<WalletTransaction | undefined>;
  getWalletTransactions(): Promise<WalletTransaction[]>;
  createWalletTransaction(
    transaction: InsertWalletTransaction
  ): Promise<WalletTransaction>;

  // OTP operations
  getOtpCode(code: string): Promise<OtpCode | undefined>;
  getOtpCodeByCode(code: string): Promise<OtpCode | undefined>;
  getOtpCodesForEmployee(employeeId: string): Promise<OtpCode[]>;
  createOtpCode(otpCode: InsertOtpCode): Promise<OtpCode>;
  updateOtpCode(
    id: string,
    otpCode: Partial<OtpCode>
  ): Promise<OtpCode | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private departments: Map<string, Department>;
  private employees: Map<string, Employee>;
  private attendance: Map<string, Attendance>;
  private payroll: Map<string, Payroll>;
  private ewaRequests: Map<string, EwaRequest>;
  private wallets: Map<string, Wallet>;
  private walletTransactions: Map<string, WalletTransaction>;
  private otpCodes: Map<string, OtpCode>;

  // Cache for today's attendance
  private todayAttendanceCache: {
    date: Date;
    records: Attendance[];
  } | null = null;

  // --- Payroll Calculation Logic (mirrors client/src/lib/payroll-calculator.ts) ---
  private readonly AHL_RATE = 0.015;
  private readonly SHIF_RATE = 0.0275;
  private readonly PERSONAL_RELIEF = 2400;
  private readonly NSSF_RATE = 0.06;
  private readonly TAX_BANDS = [
    { limit: 24_000, rate: 0.1 },
    { limit: 8_333, rate: 0.25 },
    { limit: 467_667, rate: 0.3 },
    { limit: 300_000, rate: 0.325 },
    { limit: Infinity, rate: 0.35 },
  ];

  private calculateMockAHL(grossIncome: number): number {
    return grossIncome * this.AHL_RATE;
  }

  private calculateMockSHIF(grossIncome: number): number {
    return grossIncome * this.SHIF_RATE;
  }

  private calculateMockNSSF(grossIncome: number): number {
    if (grossIncome <= 0) return 0;
    if (grossIncome <= 8000) return 480;
    if (grossIncome <= 72000) return this.NSSF_RATE * grossIncome;
    return 4320;
  }

  private calculateMockPAYE(grossIncome: number): number {
    const ahl = this.calculateMockAHL(grossIncome);
    const shif = this.calculateMockSHIF(grossIncome);
    const nssf = this.calculateMockNSSF(grossIncome);
    const taxableIncome = Math.max(0, grossIncome - (ahl + shif + nssf));

    let remainingIncome = taxableIncome;
    let totalTax = 0;

    for (const band of this.TAX_BANDS) {
      if (remainingIncome <= 0) break;
      const bandTaxable = Math.min(remainingIncome, band.limit);
      totalTax += bandTaxable * band.rate;
      remainingIncome -= bandTaxable;
    }

    const finalPAYE = Math.max(totalTax - this.PERSONAL_RELIEF, 0);
    return Math.round(finalPAYE);
  }
  // --- End Payroll Calculation Logic ---


  constructor() {
    this.users = new Map();
    this.departments = new Map();
    this.employees = new Map();
    this.attendance = new Map();
    this.payroll = new Map();
    this.ewaRequests = new Map();
    this.wallets = new Map();
    this.walletTransactions = new Map();
    this.otpCodes = new Map();

    // Initialize with generated data
    this.initializeData();
  }

  private async initializeData() {
    // Generate departments first
    const departments = generateDepartments();
    for (const dept of departments) {
      await this.createDepartment(dept);
    }

    // Generate users (supervisors) with department assignments
    const allDepartments = await this.getAllDepartments();
    const users = generateUsers(allDepartments);
    for (const user of users) {
      await this.createUser(user);
    }

    // Generate employees linked to users
    const allUsers = Array.from(this.users.values());
    const employees = generateEmployees(allUsers, allDepartments);
    for (const emp of employees) {
      await this.createEmployee(emp);
    }

    // Generate initial attendance records
    const allEmployees = await this.getAllEmployees();
    const attendance = generateAttendance(allEmployees, 30); // Last 30 days
    for (const record of attendance) {
      await this.createAttendance(record);
    }

    // Generate payroll records
    const allAttendance = Array.from(this.attendance.values());
    const payroll = generatePayroll(allEmployees, allAttendance);
    for (const record of payroll) {
      await this.createPayroll(record);
    }

    // Generate EWA requests
    const allPayroll = Array.from(this.payroll.values());
    const ewaRequests = generateEwaRequests(allEmployees, allPayroll);
    for (const request of ewaRequests) {
      await this.createEwaRequest(request);
    }

    // Generate wallet and transactions
    const wallet = generateWallet();
    const createdWallet = await this.createWallet(wallet);

    const transactions = generateWalletTransactions(createdWallet);
    for (const transaction of transactions) {
      await this.createWalletTransaction(transaction);
    }

    // Generate OTP codes for each employee
    for (const employee of allEmployees) {
      const otpCode = generateOtpCode(employee.id);
      await this.createOtpCode(otpCode);
    }
  }

  flushAllData() {
    this.users.clear();
    this.departments.clear();
    this.employees.clear();
    this.attendance.clear();
    this.payroll.clear();
    this.ewaRequests.clear();
    this.wallets.clear();
    this.walletTransactions.clear();
    this.otpCodes.clear();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = faker.string.numeric(8).toString();
    // Create with all required fields explicitly set
    const user: User = {
      id,
      username: insertUser.username || "",
      password: insertUser.password || "",
      role: insertUser.role || "employee",
      profileImage: insertUser.profileImage,
      departmentId: insertUser.departmentId,
      created_at: insertUser.created_at || new Date(),
      modified_at: insertUser.modified_at || new Date(),
      surname: insertUser.surname || "",
      other_names: insertUser.other_names || "",
      id_no: insertUser.id_no || "",
      sex: insertUser.sex || "",
      contact: {
        email: insertUser.contact?.email || "",
        phoneNumber: insertUser.contact?.phoneNumber || "",
      },
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(
    id: string,
    userData: Partial<User>
  ): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      ...userData,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Department operations
  async getDepartment(id: string): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async getAllDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }

  async createDepartment(
    departmentData: InsertDepartment
  ): Promise<Department> {
    const id = faker.string.numeric(8).toString();
    const department: Department = {
      id,
      name: departmentData.name || "",
      description: departmentData.description,
    };
    this.departments.set(id, department);
    return department;
  }

  // Employee operations
  async getEmployee(id: string): Promise<Employee | undefined> {
    console.log(`Storage.getEmployee called with ID: ${id}`);

    if (!id) {
      console.log(`Invalid employee ID (empty or undefined)`);
      return undefined;
    }

    // Try direct lookup first with exact ID
    const employee = this.employees.get(id);

    if (employee) {
      console.log(`Found employee via direct map lookup for ID: ${id}`);
      return employee;
    }

    // If direct lookup fails, enumerate through all employees and do a more flexible comparison
    console.log(
      `Direct map lookup failed for ID: ${id}, trying flexible comparison`
    );

    // Use Array.from to convert the Map entries to an array we can iterate over
    const employeeEntries = Array.from(this.employees.entries());

    for (const [key, emp] of employeeEntries) {
      if (
        String(key).trim() === id ||
        String(emp.id).trim() === id ||
        String(emp.employeeNumber).trim() === id
      ) {
        console.log(
          `Found employee via flexible comparison for ID: ${id}, matched employee with ID: ${emp.id}`
        );
        return emp;
      }
    }

    console.log(`No employee found for ID: ${id} after flexible comparison`);
    return undefined;
  }

  async getEmployeeByNumber(
    employeeNumber: string
  ): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(
      (employee) => employee.employeeNumber === employeeNumber
    );
  }

  async getEmployeeWithDetails(id: string): Promise<Employee | undefined> {
    console.log(`Getting employee with details for ID: ${id}`);
    const employee = await this.getEmployee(id);

    if (!employee) {
      console.log(`No employee found with ID: ${id}`);
      return undefined;
    }

    console.log(`Successfully retrieved employee details for ID: ${id}`);
    return employee;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getAllActiveEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values()).filter(
      (employee) => employee.active
    );
  }

  async getAllInactiveEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values()).filter(
      (employee) => !employee.active
    );
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const id = employeeData.id || faker.string.numeric(8).toString();

    // Construct the full Employee object, ensuring type safety
    const employee: Employee = {
      id: id,
      username: employeeData.username || `user_${faker.string.alphanumeric(6)}`,
      password: employeeData.password || "default-password", // Should be hashed
      role: employeeData.role || "employee",
      profileImage: employeeData.profileImage,
      created_at: employeeData.created_at || new Date(),
      modified_at: employeeData.modified_at || new Date(),
      surname: employeeData.surname || "",
      other_names: employeeData.other_names || "",
      id_no: employeeData.id_no || "",
      tax_pin: employeeData.tax_pin, // Optional
      sex: employeeData.sex || "unknown",
      nssf_no: employeeData.nssf_no, // Optional
      nhif_no: employeeData.nhif_no, // Optional
      contact: {
        // Ensure contact is an object with email and phoneNumber
        email: employeeData.contact?.email || "",
        phoneNumber: employeeData.contact?.phoneNumber || "",
      },

      employeeNumber: employeeData.employeeNumber || `${faker.string.numeric(4)}`,
      departmentId: employeeData.departmentId || "", // Required for Employee
      position: employeeData.position || "N/A",
      status: employeeData.status || "active",
      is_on_probation: employeeData.is_on_probation ?? false,
      gross_income: Number(employeeData.gross_income || 0), // Ensure number
      net_income: Number(employeeData.net_income || 0), // Ensure number
      total_deductions: Number(employeeData.total_deductions || 0), // Ensure number
      loan_deductions: Number(employeeData.loan_deductions || 0), // Ensure number
      employer_advances: Number(employeeData.employer_advances || 0), // Ensure number
      total_loan_deductions: Number(employeeData.total_loan_deductions || 0), // Ensure number
      statutory_deductions: employeeData.statutory_deductions || {
        nssf: 0,
        nhif: 0,
        tax: 0,
        levy: 0,
      }, // any type
      max_salary_advance_limit: Number(
        employeeData.max_salary_advance_limit || 0
      ), // Ensure number
      available_salary_advance_limit: Number(
        employeeData.available_salary_advance_limit || 0
      ), // Ensure number
      last_withdrawal_time: employeeData.last_withdrawal_time, // Optional Date
      bank_info: employeeData.bank_info || {}, // any type
      id_confirmed: employeeData.id_confirmed ?? false,
      mobile_confirmed: employeeData.mobile_confirmed ?? false,
      tax_pin_verified: employeeData.tax_pin_verified ?? false,
      country: employeeData.country || "KE",
      documents: employeeData.documents || {}, // any type
      crb_reports: employeeData.crb_reports || {}, // any type
      avatar_url: employeeData.avatar_url, // Optional string
      hoursWorked: Number(employeeData.hoursWorked || 0), // Ensure number
      hourlyRate: Number(employeeData.hourlyRate || 0), // Ensure number
      startDate: employeeData.startDate, // Optional Date
      active: employeeData.active ?? true,
      house_allowance: Number(employeeData.house_allowance || 0), // Ensure number
    };

    this.employees.set(id, employee);
    console.log(
      `Created employee ${employee.id} with number ${employee.employeeNumber}`
    );

    return employee;
  }

  async updateEmployee(
    id: string,
    employeeData: Partial<Employee>
  ): Promise<Employee | undefined> {
    const employee = await this.getEmployee(id);
    if (!employee) return undefined;

    // Ensure nested objects like 'contact' are merged correctly if provided
    const updatedContact = employeeData.contact
      ? { ...employee.contact, ...employeeData.contact }
      : employee.contact;

    const updatedEmployee = {
      ...employee,
      ...employeeData,
      contact: updatedContact, // Use the merged contact object
      modified_at: new Date(),
    };
    this.employees.set(id, updatedEmployee);

    return updatedEmployee;
  }

  // Clear today's attendance cache
  clearTodayAttendanceCache() {
    this.todayAttendanceCache = null;
  }

  // Attendance operations
  async getAttendance(id: string): Promise<Attendance | undefined> {
    return this.attendance.get(id);
  }

  async getAttendanceForEmployee(employeeId: string): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      (attendance) => attendance.employeeId === employeeId
    );
  }

  async getAttendanceForDate(date: Date): Promise<Attendance[]> {
    const dateString = date.toISOString().split("T")[0];
    return Array.from(this.attendance.values()).filter((attendance) => {
      if (!attendance.date) return false;
      return attendance.date.toString().split("T")[0] === dateString;
    });
  }

  async createAttendance(
    attendanceData: InsertAttendance
  ): Promise<Attendance> {
    const id = faker.string.numeric(8).toString();
    const attendance: Attendance = {
      id,
      status: attendanceData.status || "",
      employeeId: attendanceData.employeeId || "",
      date: attendanceData.date,
      clockInTime: attendanceData.clockInTime,
      clockOutTime: attendanceData.clockOutTime,
      hoursWorked: attendanceData.hoursWorked,
      geoLocation: attendanceData.geoLocation || {},
      approvedBy: attendanceData.approvedBy,
      notes: attendanceData.notes,
    };
    this.attendance.set(id, attendance);

    // Clear cache after creating attendance
    this.clearTodayAttendanceCache();

    return attendance;
  }

  async updateAttendance(
    id: string,
    updateData: Partial<Attendance>
  ): Promise<Attendance> {
    const attendance = this.attendance.get(id);
    if (!attendance) {
      throw new Error(`Attendance record with ID ${id} not found`);
    }

    const updatedAttendance = {
      ...attendance,
      ...updateData,
      modified_at: new Date().toISOString(),
    };
    this.attendance.set(id, updatedAttendance);

    // Clear cache after updating attendance
    this.clearTodayAttendanceCache();

    return updatedAttendance;
  }

  async getAttendanceByEmployeeAndDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Attendance[]> {
    const startDateString = startDate.toISOString().split("T")[0];
    const endDateString = endDate.toISOString().split("T")[0];

    return Array.from(this.attendance.values()).filter((attendance) => {
      if (!attendance.date) return false;
      const attendanceDate = attendance.date.toString().split("T")[0];
      return (
        attendance.employeeId === employeeId &&
        attendanceDate >= startDateString &&
        attendanceDate <= endDateString
      );
    });
  }

  async deleteAttendance(id: string): Promise<boolean> {
    if (!this.attendance.has(id)) {
      return false;
    }

    this.attendance.delete(id);

    // Clear cache after deleting attendance
    this.clearTodayAttendanceCache();

    return true;
  }

  // Get all attendance records
  getAllAttendance(): Promise<Attendance[]> {
    return Promise.resolve(Array.from(this.attendance.values()));
  }

  async getAllAttendanceByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Attendance[]> {
    const startDateString = startDate.toISOString().split("T")[0];
    const endDateString = endDate.toISOString().split("T")[0];

    return Array.from(this.attendance.values()).filter((attendance) => {
      if (!attendance.date) return false;
      const attendanceDate = attendance.date.toString().split("T")[0];
      return (
        attendanceDate >= startDateString && attendanceDate <= endDateString
      );
    });
  }

  // Payroll operations
  async getPayroll(id: string): Promise<Payroll | undefined> {
    return this.payroll.get(id);
  }

  async getPayrollForEmployee(employeeId: string): Promise<Payroll[]> {
    const payrolls = Array.from(this.payroll.values()).filter(
      (payroll) => payroll.employeeId === employeeId
    );
    
    // Sort payrolls by most recent period first (descending order)
    payrolls.sort((a, b) => {
      const aEndDate = a.periodEnd instanceof Date 
        ? a.periodEnd 
        : new Date(String(a.periodEnd));
        
      const bEndDate = b.periodEnd instanceof Date 
        ? b.periodEnd 
        : new Date(String(b.periodEnd));
      
      // Sort descending (most recent first)
      return bEndDate.getTime() - aEndDate.getTime();
    });
    
    return payrolls;
  }

  async getPayrollForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<Payroll[]> {
    console.log("DEBUG: getPayrollForPeriod called with:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    // Format the dates as YYYY-MM-DD for consistent string comparison
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];
    
    console.log(`DEBUG: Formatted date strings for comparison:`, {
      startDateString,
      endDateString
    });
    
    // Get all payroll records
    const allPayrolls = Array.from(this.payroll.values());
    console.log(`DEBUG: Found ${allPayrolls.length} total payroll records`);
    
    // If no records, return empty array
    if (allPayrolls.length === 0) {
      console.log("DEBUG: No payroll records in database");
      return [];
    }
    
    // Now properly filter based on date ranges
    const filteredPayrolls = allPayrolls.filter(payroll => {
      // Handle possible toString() vs direct Date objects
      const recordStartDate = payroll.periodStart instanceof Date 
        ? payroll.periodStart 
        : new Date(String(payroll.periodStart));
        
      const recordEndDate = payroll.periodEnd instanceof Date 
        ? payroll.periodEnd 
        : new Date(String(payroll.periodEnd));
      
      // Format the record dates as YYYY-MM-DD strings
      const recordStartString = recordStartDate.toISOString().split('T')[0];
      const recordEndString = recordEndDate.toISOString().split('T')[0];
      
      // For debugging
      if (allPayrolls.length < 10) {
        console.log(`DEBUG: Record ${payroll.id} dates:`, {
          recordStartString,
          recordEndString
        });
      }
      
      // Include records that overlap with the requested date range:
      // - Record starts within the range (recordStart >= startDate && recordStart <= endDate)
      // - Record ends within the range (recordEnd >= startDate && recordEnd <= endDate)
      // - Record spans the entire range (recordStart <= startDate && recordEnd >= endDate)
      
      const startsInRange = recordStartString >= startDateString && recordStartString <= endDateString;
      const endsInRange = recordEndString >= startDateString && recordEndString <= endDateString;
      const spansRange = recordStartString <= startDateString && recordEndString >= endDateString;
      
      return startsInRange || endsInRange || spansRange;
    });
    
    console.log(`DEBUG: Filtered down to ${filteredPayrolls.length} payroll records within date range`);
    
    // Sort payrolls by most recent period first (descending order)
    filteredPayrolls.sort((a, b) => {
      const aEndDate = a.periodEnd instanceof Date 
        ? a.periodEnd 
        : new Date(String(a.periodEnd));
        
      const bEndDate = b.periodEnd instanceof Date 
        ? b.periodEnd 
        : new Date(String(b.periodEnd));
      
      // Sort descending (most recent first)
      return bEndDate.getTime() - aEndDate.getTime();
    });
    
    return filteredPayrolls;
  }

  async getPayrollByReferenceNumber(referenceNumber: string): Promise<Payroll[]> {
    const payrolls = Array.from(this.payroll.values()).filter((payroll) => {
      return payroll.referenceNumber === referenceNumber;
    });
    
    // Sort payrolls by most recent period first (descending order)
    payrolls.sort((a, b) => {
      const aEndDate = a.periodEnd instanceof Date 
        ? a.periodEnd 
        : new Date(String(a.periodEnd));
        
      const bEndDate = b.periodEnd instanceof Date 
        ? b.periodEnd 
        : new Date(String(b.periodEnd));
      
      // Sort descending (most recent first)
      return bEndDate.getTime() - aEndDate.getTime();
    });
    
    return payrolls;
  }

  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const id = payrollData.id && typeof payrollData.id === 'string'
        ? payrollData.id
        : generateId(); // Use generateId directly

    const newPayroll: Payroll = {
        id: id,
        // ... rest of payroll properties
         employeeId: payrollData.employeeId ?? '',
         periodStart: payrollData.periodStart ?? new Date(),
         periodEnd: payrollData.periodEnd ?? new Date(),
         hoursWorked: payrollData.hoursWorked ?? 0,
         grossPay: payrollData.grossPay ?? 0,
         netPay: payrollData.netPay ?? 0,
         ewaDeductions: payrollData.ewaDeductions ?? 0,
         taxDeductions: payrollData.taxDeductions ?? 0,
         otherDeductions: payrollData.otherDeductions ?? 0,
         status: payrollData.status ?? '',
         processedBy: payrollData.processedBy,
         processedAt: payrollData.processedAt ?? new Date(),
         referenceNumber: payrollData.referenceNumber
    };
    this.payroll.set(id, newPayroll);
    return newPayroll;
  }

  async updatePayroll(
    id: string,
    payrollData: Partial<Payroll>
  ): Promise<Payroll | undefined> {
    const payroll = await this.getPayroll(id);
    if (!payroll) return undefined;

    const updatedPayroll = {
      ...payroll,
      ...payrollData,
      modified_at: new Date(),
    };
    this.payroll.set(id, updatedPayroll);
    return updatedPayroll;
  }

  // EWA operations
  async getEwaRequest(id: string): Promise<EwaRequest | undefined> {
    return this.ewaRequests.get(id);
  }

  async getEwaRequestsForEmployee(employeeId: string): Promise<EwaRequest[]> {
    return Array.from(this.ewaRequests.values()).filter(
      (ewaRequest) => ewaRequest.employeeId === employeeId
    );
  }

  async getPendingEwaRequests(): Promise<EwaRequest[]> {
    return Array.from(this.ewaRequests.values()).filter(
      (ewaRequest) => ewaRequest.status === "pending"
    );
  }

  async getApprovedEwaRequests(): Promise<EwaRequest[]> {
    return Array.from(this.ewaRequests.values()).filter(
      (ewaRequest) => ewaRequest.status === "approved"
    );
  }

  async getDisbursedEwaRequests(): Promise<EwaRequest[]> {
    return Array.from(this.ewaRequests.values()).filter(
      (ewaRequest) => ewaRequest.status === "disbursed"
    );
  }

  async createEwaRequest(
    ewaRequestData: InsertEwaRequest
  ): Promise<EwaRequest> {
    const id = faker.string.numeric(8).toString();
    const ewaRequest: EwaRequest = {
      id,
      status: ewaRequestData.status || "",
      employeeId: ewaRequestData.employeeId || "",
      approvedBy: ewaRequestData.approvedBy,
      requestDate: new Date(),
      amount: Number(ewaRequestData.amount || 0),
      processingFee: ewaRequestData.processingFee || 0,
      approvedAt: new Date(),
      disbursedAt: new Date(),
      reason: ewaRequestData.reason,
      rejectionReason: ewaRequestData.rejectionReason,
    };
    this.ewaRequests.set(id, ewaRequest);
    return ewaRequest;
  }

  async updateEwaRequest(
    id: string,
    ewaRequestData: Partial<EwaRequest>
  ): Promise<EwaRequest | undefined> {
    const ewaRequest = await this.getEwaRequest(id);
    if (!ewaRequest) return undefined;

    const updatedEwaRequest = {
      ...ewaRequest,
      ...ewaRequestData,
      modified_at: new Date(),
    };
    this.ewaRequests.set(id, updatedEwaRequest);
    return updatedEwaRequest;
  }

  // Wallet operations
  async getWallet(): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values())[0];
  }

  async createWallet(walletData: InsertWallet): Promise<Wallet> {
    const id = faker.string.numeric(8).toString();
    const wallet: Wallet = {
      id,
      employerBalance: Number(walletData.employerBalance || 0),
      jahaziiBalance: Number(walletData.jahaziiBalance || 0),
      perEmployeeCap: Number(walletData.perEmployeeCap || 3000), // Default 3000 KES
      updatedAt: new Date(),
      employerFundsUtilization: 0,
      activeEmployees: 0,
      pendingRequests: 0,
      pendingAmount: 0,
      employeeAllocations: {}
    };
    this.wallets.set(id, wallet);
    return wallet;
  }

  async updateWallet(
    id: string,
    walletData: Partial<Wallet>
  ): Promise<Wallet | undefined> {
    const wallet = await this.getWallet();
    if (!wallet) return undefined;

    // Handle employee allocations update
    const employeeAllocations = walletData.employeeAllocations 
      ? { ...wallet.employeeAllocations, ...walletData.employeeAllocations }
      : wallet.employeeAllocations;

    // Ensure numeric values
    const employerBalance = typeof walletData.employerBalance === 'number' 
      ? walletData.employerBalance 
      : wallet.employerBalance;
    
    const jahaziiBalance = typeof walletData.jahaziiBalance === 'number'
      ? walletData.jahaziiBalance
      : wallet.jahaziiBalance;
    
    const perEmployeeCap = typeof walletData.perEmployeeCap === 'number'
      ? walletData.perEmployeeCap
      : wallet.perEmployeeCap;

    const updatedWallet = {
      ...wallet,
      ...walletData,
      employerBalance,
      jahaziiBalance,
      perEmployeeCap,
      employeeAllocations,
      updatedAt: new Date()
    };

    this.wallets.set(id, updatedWallet);
    return updatedWallet;
  }

  // Wallet transaction operations
  async getWalletTransaction(
    id: string
  ): Promise<WalletTransaction | undefined> {
    return this.walletTransactions.get(id);
  }

  async getWalletTransactions(): Promise<WalletTransaction[]> {
    return Array.from(this.walletTransactions.values());
  }

  async createWalletTransaction(
    transactionData: InsertWalletTransaction
  ): Promise<WalletTransaction> {
    const id = faker.string.numeric(8).toString();
    const transaction: WalletTransaction = {
      id,
      status: transactionData.status || "pending",
      description: transactionData.description || "",
      amount: Number(transactionData.amount || 0),
      walletId: transactionData.walletId || "",
      transactionType: transactionData.transactionType || "employer_topup",
      transactionDate: new Date(),
      referenceId: transactionData.referenceId || `TXN-${Date.now()}`,
      fundingSource: transactionData.fundingSource || "employer",
      employeeId: transactionData.employeeId,
      ewaRequestId: transactionData.ewaRequestId
    };
    this.walletTransactions.set(id, transaction);
    return transaction;
  }

  async getWalletTransactionsByEmployee(employeeId: string): Promise<WalletTransaction[]> {
    return Array.from(this.walletTransactions.values())
      .filter(txn => txn.employeeId === employeeId);
  }

  async getWalletTransactionsByEwaRequest(ewaRequestId: string): Promise<WalletTransaction[]> {
    return Array.from(this.walletTransactions.values())
      .filter(txn => txn.ewaRequestId === ewaRequestId);
  }

  // OTP operations
  async getOtpCode(code: string): Promise<OtpCode | undefined> {
    return Array.from(this.otpCodes.values()).find(
      (otpCode) => otpCode.code === code
    );
  }

  // Add a method to get OTP code by code string (alias for getOtpCode for clarity)
  async getOtpCodeByCode(code: string): Promise<OtpCode | undefined> {
    return Array.from(this.otpCodes.values()).find(
      (otpCode) => otpCode.code === code
    );
  }

  async getOtpCodesForEmployee(employeeId: string): Promise<OtpCode[]> {
    return Array.from(this.otpCodes.values()).filter(
      (otpCode) => otpCode.employeeId === employeeId
    );
  }

  async createOtpCode(otpCodeData: InsertOtpCode): Promise<OtpCode> {
    const id = faker.string.numeric(8).toString();
    const otpCode: OtpCode = {
      id,
      employeeId: otpCodeData.employeeId || "",
      code: otpCodeData.code || "",
      expiresAt: otpCodeData.expiresAt || new Date(),
      used: otpCodeData.used || false,
      createdAt: new Date(),
    };
    this.otpCodes.set(id, otpCode);
    return otpCode;
  }

  async updateOtpCode(
    id: string,
    otpCodeData: Partial<OtpCode>
  ): Promise<OtpCode | undefined> {
    // First find the OTP code by ID
    const existingOtpCode = Array.from(this.otpCodes.values()).find(
      (otp) => otp.id === id
    );
    if (!existingOtpCode) return undefined;

    const updatedOtpCode = {
      ...existingOtpCode,
      ...otpCodeData,
      modified_at: new Date().toISOString(),
    };
    this.otpCodes.set(id, updatedOtpCode);
    return updatedOtpCode;
  }

  async deleteTodayAttendance(): Promise<void> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    try {
      // Find and remove today's attendance records from in-memory storage
      const todayRecordIds: string[] = [];

      // Identify records from today
      this.attendance.forEach((record, id) => {
        if (!record.date) return;

        const recordDate = new Date(record.date);
        if (
          recordDate.getFullYear() === startOfDay.getFullYear() &&
          recordDate.getMonth() === startOfDay.getMonth() &&
          recordDate.getDate() === startOfDay.getDate()
        ) {
          todayRecordIds.push(id);
        }
      });

      // Delete the identified records
      todayRecordIds.forEach((id) => {
        this.attendance.delete(id);
      });

      // Clear cache
      this.todayAttendanceCache = null;
    } catch (error) {
      console.error("Error deleting today's attendance records:", error);
      throw error;
    }
  }

  async findEmployees(options: { query: string }): Promise<any[]> {
    const { query } = options;
    const lowerQuery = query.toLowerCase();

    const allEmployees = await this.getAllEmployees(); // Gets Employee[]
    const results = [];

    for (const emp of allEmployees) {
      // Employee object now contains User fields directly

      const name = `${emp.other_names} ${emp.surname}`.trim();
      const position = emp.position;

      // Access fields directly from Employee (which includes User fields)
      const idNumber = emp.id_no;
      const kraPin = emp.tax_pin;
      const nssfNo = emp.nssf_no;
      const nhifNo = emp.nhif_no;
      const email = emp.contact?.email;
      const phoneNumber = emp.contact?.phoneNumber;
      const profileImage =
        emp.profileImage || emp.avatar_url || faker.image.avatar(); // Use profileImage or avatar_url

      // Check if the query matches any relevant employee field
      if (
        name.toLowerCase().includes(lowerQuery) ||
        position.toLowerCase().includes(lowerQuery) ||
        emp.employeeNumber.includes(lowerQuery) || // Case-insensitive check might be better for numbers too
        (idNumber && idNumber.toLowerCase().includes(lowerQuery)) ||
        (kraPin && kraPin.toLowerCase().includes(lowerQuery)) ||
        (nssfNo && nssfNo.toLowerCase().includes(lowerQuery)) ||
        (nhifNo && nhifNo.toLowerCase().includes(lowerQuery)) ||
        (email && email.toLowerCase().includes(lowerQuery)) ||
        (phoneNumber && phoneNumber.includes(query)) // Direct number match for phone
      ) {
        // Format employee data for the result
        results.push(emp);
      }
    }

    return results;
  }

  async addEmployees(employeesData: InsertEmployee[]): Promise<number> {
    let addedCount = 0;
    console.log(`Processing ${employeesData.length} employees for import`);

    // Generate a spread of start dates for employees to make data more realistic
    const generateStartDate = (): Date => {
      // Generate start dates mostly within the last 3 years, with some longer tenured employees
      const yearsAgo = faker.helpers.weightedArrayElement([
        { weight: 50, value: faker.number.int({ min: 0, max: 1 }) }, // 0-1 years ago (50% probability)
        { weight: 30, value: faker.number.int({ min: 1, max: 3 }) }, // 1-3 years ago (30% probability)
        { weight: 15, value: faker.number.int({ min: 3, max: 5 }) }, // 3-5 years ago (15% probability)
        { weight: 5, value: faker.number.int({ min: 5, max: 10 }) }  // 5-10 years ago (5% probability)
      ]);
      
      const date = new Date();
      date.setFullYear(date.getFullYear() - yearsAgo);
      
      // Add random offset in days within the selected year
      const daysOffset = faker.number.int({ min: 0, max: 364 });
      date.setDate(date.getDate() - daysOffset);
      
      return date;
    };

    for (const empData of employeesData) {
      try {
        // Create employee directly from the provided data with defaults
        const insertData: InsertEmployee = {
          // User fields
          username: empData.username || `${(empData.other_names || '').toLowerCase()}.${(empData.surname || '').toLowerCase()}${faker.string.numeric(2)}`.replace(/[^a-z0-9.]/g, ""),
          password: empData.password || "default-password",
          role: empData.role || "employee",
          profileImage: empData.profileImage,
          created_at: empData.created_at || new Date(),
          modified_at: empData.modified_at || new Date(),
          surname: empData.surname || '',
          other_names: empData.other_names || '',
          id_no: empData.id_no || '',
          tax_pin: empData.tax_pin,
          sex: empData.sex || "unknown",
          nssf_no: empData.nssf_no,
          nhif_no: empData.nhif_no,
          contact: {
            email: empData.contact?.email || '',
            phoneNumber: empData.contact?.phoneNumber || '',
          },
          departmentId: empData.departmentId || empData.department?.id,

          // Employee specific fields
          employeeNumber: empData.employeeNumber || `NEW-${faker.string.numeric(6)}`,
          position: empData.position || "Employee",
          status: empData.status || "active",
          is_on_probation: empData.is_on_probation ?? false,
          gross_income: empData.gross_income || 0,
          net_income: empData.net_income || 0,
          total_deductions: empData.total_deductions || 0,
          loan_deductions: empData.loan_deductions || 0,
          employer_advances: empData.employer_advances || 0,
          total_loan_deductions: empData.total_loan_deductions || 0,
          statutory_deductions: empData.statutory_deductions || {
            nssf: 0,
            nhif: 0,
            tax: 0,
            levy: 0,
          },
          max_salary_advance_limit: empData.max_salary_advance_limit || 0,
          available_salary_advance_limit: empData.available_salary_advance_limit || 0,
          last_withdrawal_time: empData.last_withdrawal_time,
          bank_info: empData.bank_info || {},
          id_confirmed: empData.id_confirmed ?? false,
          mobile_confirmed: empData.mobile_confirmed ?? false,
          tax_pin_verified: empData.tax_pin_verified ?? false,
          country: empData.country || "KE",
          documents: empData.documents || {},
          crb_reports: empData.crb_reports || {},
          avatar_url: empData.avatar_url,
          hourlyRate: empData.hourlyRate || faker.number.int({ min: 300, max: 1200 }), // Ensure hourly rate is set
          startDate: empData.startDate || generateStartDate(), // Use realistic start date
          active: empData.status ? !["inactive", "terminated", "resigned"].includes(empData.status.toLowerCase()) : true,
          house_allowance: empData.house_allowance || 0,
        };

        const newEmployee = await this.createEmployee(insertData);

        console.log(`Successfully created employee ${insertData.other_names} ${insertData.surname}, ID: ${newEmployee.id}`);
        addedCount++;
      } catch (error: any) {
        console.error(`Error processing employee data: ${error.message}`, error);
      }
    }

    console.log(`Completed processing. Added ${addedCount} new employees.`);
    return addedCount;
  }

  /**
   * Generates mock attendance data for all employees for the specified number of days
   * @param days Number of days to generate attendance for (default 30)
   * @returns Number of attendance records created
   */
  async generateMockAttendanceForEmployees(days: number = 30): Promise<number> {
    const employees = await this.getAllEmployees();
    console.log(`Generating mock attendance for ${employees.length} employees for ${days} days`);
    
    const today = new Date();
    let recordsCreated = 0;
    
    // Constants for attendance generation
    const WORK_START_HOUR = 8;
    const WORK_END_HOUR = 17;
    const LATE_THRESHOLD_MINUTES = 15;
    const ATTENDANCE_RATE = 0.92; // 92% attendance rate
    const LATE_RATE = 0.15; // 15% chance of being late
    const LEAVE_RATE = 0.05; // 5% chance of being on leave
    
    // Generate patterns for each employee to make attendance data more realistic
    const employeePatterns = new Map<string, {
      punctuality: number; // 0-1 where higher means more punctual
      attendanceRate: number; // 0-1 where higher means more likely to attend
      leaveDates: Date[]; // Specific dates for planned leave
    }>();
    
    // Generate patterns for each employee
    employees.forEach(employee => {
      const punctuality = faker.number.float({ min: 0.7, max: 1 }); // Individual punctuality level
      const attendanceRate = faker.number.float({ min: 0.85, max: 0.98 }); // Individual attendance rate
      
      // Generate 0-2 leave periods of 1-3 days each within the time period
      const leaveDates: Date[] = [];
      const leavePeriodsCount = faker.number.int({ min: 0, max: 2 });
      
      for (let i = 0; i < leavePeriodsCount; i++) {
        const leaveStartDay = faker.number.int({ min: 0, max: days - 3 });
        const leaveDuration = faker.number.int({ min: 1, max: 3 });
        
        for (let d = 0; d < leaveDuration; d++) {
          const leaveDate = new Date(today);
          leaveDate.setDate(leaveDate.getDate() - (leaveStartDay + d));
          
          // Skip weekends for leave dates
          if (leaveDate.getDay() !== 0 && leaveDate.getDay() !== 6) {
            leaveDates.push(leaveDate);
          }
        }
      }
      
      employeePatterns.set(employee.id, {
        punctuality,
        attendanceRate,
        leaveDates
      });
    });
    
    console.log(`Generated attendance patterns for ${employeePatterns.size} employees`);
    
    // Helper function to generate random clock in/out times
    const generateWorkingHours = (date: Date, employeeId: string): { clockIn: Date | undefined; clockOut: Date | undefined; status: string } => {
      const pattern = employeePatterns.get(employeeId);
      
      if (!pattern) {
        return { clockIn: undefined, clockOut: undefined, status: 'absent' };
      }
      
      // Check if this is a planned leave date
      const isLeaveDate = pattern.leaveDates.some(leaveDate => 
        leaveDate.getFullYear() === date.getFullYear() &&
        leaveDate.getMonth() === date.getMonth() &&
        leaveDate.getDate() === date.getDate()
      );
      
      if (isLeaveDate) {
        return { clockIn: undefined, clockOut: undefined, status: 'leave' };
      }
      
      // Random chance of absence based on employee's attendance rate
      if (Math.random() > pattern.attendanceRate) {
        return { clockIn: undefined, clockOut: undefined, status: 'absent' };
      }
      
      // Determine if employee is late based on their punctuality
      const isLate = Math.random() > pattern.punctuality;
      
      const clockIn = new Date(date);
      if (isLate) {
        // Late arrival - between 8:15 AM and 9:30 AM
        clockIn.setHours(
          WORK_START_HOUR, 
          LATE_THRESHOLD_MINUTES + faker.number.int({ min: 0, max: 75 }), 
          faker.number.int({ min: 0, max: 59 })
        );
      } else {
        // Punctual arrival - between 7:45 AM and 8:15 AM
        clockIn.setHours(
          WORK_START_HOUR, 
          faker.number.int({ min: -15, max: LATE_THRESHOLD_MINUTES }), 
          faker.number.int({ min: 0, max: 59 })
        );
      }
      
      // Clock out time varies but generally 8-10 hours after clock in
      const workDuration = faker.number.float({ min: 7.75, max: 9.5 });
      const clockOut = new Date(clockIn);
      clockOut.setTime(clockIn.getTime() + workDuration * 60 * 60 * 1000);
      
      return { 
        clockIn, 
        clockOut, 
        status: isLate ? 'late' : 'present' 
      };
    };
    
    // Helper function to calculate hours worked
    const calculateHoursWorked = (clockIn: Date | undefined, clockOut: Date | undefined): number => {
      if (!clockIn || !clockOut) return 0;
      
      const diffMs = clockOut.getTime() - clockIn.getTime();
      return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    };
    
    // Prepare batch of days for processing
    const daysToProcess = Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1) + i);
      return date;
    });
    
    // Log the date range for attendance generation
    const startDate = daysToProcess[0];
    const endDate = daysToProcess[daysToProcess.length - 1];
    console.log(`Generating attendance from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Process each day
    for (const date of daysToProcess) {
      // Skip weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      console.log(`Generating attendance for ${date.toISOString().split('T')[0]}`);
      
      // Process each employee for this day
      for (const employee of employees) {
        // Skip inactive employees
        if (!employee.active) continue;
        
        try {
          const { clockIn, clockOut, status } = generateWorkingHours(date, employee.id);
          const hoursWorked = calculateHoursWorked(clockIn, clockOut);
          
          let notes: string | undefined;
          
          if (status === 'absent') {
            notes = faker.helpers.maybe(() => 
              faker.helpers.arrayElement([
                'Sick leave', 
                'Personal emergency', 
                'Family event', 
                'Appointment',
                'Transportation issues'
              ]), { probability: 0.7 });
          } else if (status === 'leave') {
            notes = faker.helpers.arrayElement([
              'Annual leave',
              'Maternity leave',
              'Paternity leave',
              'Compassionate leave',
              'Study leave'
            ]);
          }
          
          const attendance: InsertAttendance = {
            employeeId: employee.id,
            date: new Date(date),
            clockInTime: clockIn,
            clockOutTime: clockOut,
            status,
            hoursWorked,
            geoLocation: clockIn ? {
              latitude: faker.location.latitude(),
              longitude: faker.location.longitude(),
            } : {},
            notes
          };
          
          await this.createAttendance(attendance);
          recordsCreated++;
        } catch (error: any) {
          console.error(`Error creating attendance for employee ${employee.id} on ${date.toISOString().split('T')[0]}: ${error.message}`);
        }
      }
    }
    
    // Log summary stats
    console.log(`Successfully created ${recordsCreated} attendance records`);
    
    // Calculate attendance percentages
    const allAttendance = await this.getAllAttendance();
    const totalRecords = allAttendance.length;
    const presentCount = allAttendance.filter(a => a.status === 'present').length;
    const lateCount = allAttendance.filter(a => a.status === 'late').length;
    const absentCount = allAttendance.filter(a => a.status === 'absent').length;
    const leaveCount = allAttendance.filter(a => a.status === 'leave').length;
    
    console.log(`Attendance statistics:`);
    console.log(`- Present: ${presentCount} (${(presentCount / totalRecords * 100).toFixed(1)}%)`);
    console.log(`- Late: ${lateCount} (${(lateCount / totalRecords * 100).toFixed(1)}%)`);
    console.log(`- Absent: ${absentCount} (${(absentCount / totalRecords * 100).toFixed(1)}%)`);
    console.log(`- On leave: ${leaveCount} (${(leaveCount / totalRecords * 100).toFixed(1)}%)`);
    
    return recordsCreated;
  }

  /**
   * Generates mock payroll data for all employees based on attendance records
   * @param periodStart Start date for the payroll period
   * @param periodEnd End date for the payroll period
   * @returns Number of payroll records created
   */
  async generateMockPayrollForEmployees(
    periodStart: Date = new Date(new Date().setDate(1)), // Default to first day of current month
    periodEnd: Date = new Date() // Default to today
  ): Promise<number> {
    const employees = await this.getAllActiveEmployees();
    console.log(`Generating mock payroll for ${employees.length} active employees`);
    
    let recordsCreated = 0;
    
    // Format dates for consistent comparison
    const formattedStartDate = periodStart.toISOString().split('T')[0];
    const formattedEndDate = periodEnd.toISOString().split('T')[0];
    
    console.log(`Payroll period: ${formattedStartDate} to ${formattedEndDate}`);
    
    // Check if we're in the current pay period
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Format current period dates for comparison
    const currentPeriodStartString = currentMonthStart.toISOString().split('T')[0];
    const currentPeriodEndString = currentMonthEnd.toISOString().split('T')[0];
    
    console.log(`Current pay period: ${currentPeriodStartString} to ${currentPeriodEndString}`);
    
    // Helper to calculate realistic hourly rate based on position and tenure
    const calculateRealisticHourlyRate = (employee: Employee): number => {
      // Base hourly rates by position category
      const baseRatesByPosition: Record<string, number> = {
        'intern': 200,
        'trainee': 250,
        'assistant': 300,
        'officer': 400,
        'specialist': 500,
        'coordinator': 550,
        'supervisor': 600,
        'manager': 800,
        'senior manager': 1000,
        'director': 1500,
        'executive': 2000,
        'ceo': 3000,
        'default': 400 // Default rate if position doesn't match any category
      };
      
      // Find the closest matching position category
      const position = (employee.position || '').toLowerCase();
      let baseRate = baseRatesByPosition.default;
      
      for (const [key, rate] of Object.entries(baseRatesByPosition)) {
        if (position.includes(key)) {
          baseRate = rate;
          break;
        }
      }
      
      // Calculate tenure in years
      let tenureYears = 0;
      if (employee.startDate) {
        const startDate = new Date(employee.startDate);
        const today = new Date();
        tenureYears = (today.getFullYear() - startDate.getFullYear()) + 
                     (today.getMonth() - startDate.getMonth()) / 12;
      }
      
      // Apply tenure bonus (up to 50% increase for 10+ years)
      const tenureMultiplier = 1 + Math.min(tenureYears, 10) * 0.05; // 5% per year up to 10 years
      
      // Apply some random variation (+/- 10%)
      const variationMultiplier = faker.number.float({ min: 0.9, max: 1.1 });
      
      // Calculate final hourly rate
      return Math.round(baseRate * tenureMultiplier * variationMultiplier);
    };
    
    // Generate multiple payroll periods if needed
    const generateMultiplePeriods = periodStart.getMonth() !== periodEnd.getMonth();
    
    // If spanning multiple months, create separate payroll records for each month
    if (generateMultiplePeriods) {
      const currentPeriodStart = new Date(periodStart);
      
      while (currentPeriodStart < periodEnd) {
        // Calculate period end (last day of current month)
        const currentPeriodEnd = new Date(currentPeriodStart);
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
        currentPeriodEnd.setDate(0); // Set to last day of month
        
        // If current period end exceeds overall end, cap it
        if (currentPeriodEnd > periodEnd) {
          currentPeriodEnd.setTime(periodEnd.getTime());
        }
        
        // Check if this period is the current pay period
        const thisPeriodStartString = currentPeriodStart.toISOString().split('T')[0];
        const thisPeriodEndString = currentPeriodEnd.toISOString().split('T')[0];
        
        // Skip if this is the current pay period
        if (thisPeriodStartString === currentPeriodStartString && 
            thisPeriodEndString === currentPeriodEndString) {
          console.log(`Skipping current pay period (${thisPeriodStartString} to ${thisPeriodEndString})`);
          // Move to next month
          currentPeriodStart.setMonth(currentPeriodStart.getMonth() + 1);
          currentPeriodStart.setDate(1); // First day of next month
          continue;
        }
        
        console.log(`Processing payroll sub-period: ${thisPeriodStartString} to ${thisPeriodEndString}`);
        
        // Process payroll for this period
        const periodRecordsCreated = await this.processPayrollForPeriod(
          employees,
          currentPeriodStart,
          currentPeriodEnd,
          calculateRealisticHourlyRate
        );
        
        recordsCreated += periodRecordsCreated;
        
        // Move to next month
        currentPeriodStart.setMonth(currentPeriodStart.getMonth() + 1);
        currentPeriodStart.setDate(1); // First day of next month
      }
    } else {
      // Check if requested period is the current pay period
      if (formattedStartDate === currentPeriodStartString && 
          formattedEndDate === currentPeriodEndString) {
        console.log(`Skipping current pay period (${formattedStartDate} to ${formattedEndDate})`);
        return 0;
      }
      
      // Single period processing
      recordsCreated = await this.processPayrollForPeriod(
        employees,
        periodStart,
        periodEnd,
        calculateRealisticHourlyRate
      );
    }
    
    console.log(`Successfully created ${recordsCreated} payroll records`);
    return recordsCreated;
  }
  
  /**
   * Helper function to process payroll for a specific period (Optimized)
   * Now uses calculation logic mirroring the client-side PayrollCalculator.
   */
  private async processPayrollForPeriod(
    employees: Employee[],
    periodStart: Date,
    periodEnd: Date,
    // hourlyRateCalculator parameter is kept for signature compatibility but not used
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hourlyRateCalculator: (employee: Employee) => number
  ): Promise<number> {
    let recordsCreated = 0;

    const endDate = new Date(periodEnd);
    endDate.setHours(23, 59, 59, 999); // End at the end of the day
    console.log(`Processing payroll period: ${periodStart.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);


    // --- Process Each Employee ---
    for (const employee of employees) {
      try {
        // --- Fetch Attendance and Calculate Actual Hours Worked ---
        const attendanceRecords = await this.getAttendanceByEmployeeAndDateRange(
          employee.id,
          periodStart,
          periodEnd
        );

        const summedHoursWorked = attendanceRecords.reduce((sum, record) => {
          // Only include hours for 'present' or 'late' status
          if (record.status === 'present' || record.status === 'late') {
            // Ensure hoursWorked is a valid number
            const hours = typeof record.hoursWorked === 'number' ? record.hoursWorked : parseFloat(record.hoursWorked || '0');
            return sum + (isNaN(hours) ? 0 : hours);
          }
          return sum;
        }, 0);

        console.log(`DEBUG: Employee ${employee.id} worked ${summedHoursWorked.toFixed(2)} hours in period.`);

        // --- Get Hourly Rate and Calculate Gross Pay ---
        const hourlyRate = employee.hourlyRate;
        if (!hourlyRate || hourlyRate <= 0) {
          console.warn(`Employee ${employee.id} (${employee.other_names} ${employee.surname}) has no valid hourly rate (${hourlyRate}). Skipping payroll calculation.`);
          continue; // Skip this employee if no rate is available
        }
        const grossPay = summedHoursWorked * hourlyRate;
        // --- End Gross Pay Calculation ---


        // --- Calculate EWA Deductions based on *disbursed* requests in the period ---
        const allEwaRequests = await this.getEwaRequestsForEmployee(employee.id);
        const ewaDeductions = allEwaRequests
          .filter(req => {
            if (req.status !== 'disbursed' || !req.disbursedAt) {
              return false;
            }
            const disbursedDate = new Date(req.disbursedAt);
            // Ensure the disbursed date is valid and falls within the payroll period
            return !isNaN(disbursedDate.getTime()) &&
                   disbursedDate >= periodStart &&
                   disbursedDate <= endDate; // Use adjusted endDate
          })
          .reduce((sum, req) => {
            // Ensure amount is a number before adding
            const amount = typeof req.amount === 'number' ? req.amount : parseFloat(req.amount || '0');
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);
        // --- End EWA Deduction Calculation ---


        // Calculate deductions using the replicated calculator logic based on the calculated grossPay
        const ahlDeduction = this.calculateMockAHL(grossPay); // Fix: Use this.calculateMockAHL
        const shifDeduction = this.calculateMockSHIF(grossPay); // Fix: Use this.calculateMockSHIF
        const nssfDeduction = this.calculateMockNSSF(grossPay); // Fix: Use this.calculateMockNSSF
        const payeDeduction = this.calculateMockPAYE(grossPay); // Fix: Use this.calculateMockPAYE

        // Total deductions and Net Pay
        const totalStatutory = ahlDeduction + shifDeduction + nssfDeduction + payeDeduction;
        // Also include existing loan/advance deductions from the employee record
        const otherNonStatutoryDeductions = (employee.loan_deductions || 0) + (employee.employer_advances || 0);
        const totalDeductions = totalStatutory + ewaDeductions + otherNonStatutoryDeductions;
        const netPay = grossPay - totalDeductions;

        // Create payroll record using calculated values
        const payroll: InsertPayroll = {
          employeeId: employee.id,
          periodStart,
          periodEnd,
          hoursWorked: parseFloat(summedHoursWorked.toFixed(2)), // Use calculated actual hours
          grossPay: parseFloat(grossPay.toFixed(2)), // Use calculated gross pay
          ewaDeductions: parseFloat(ewaDeductions.toFixed(2)), // Store the calculated EWA deduction
          taxDeductions: parseFloat(payeDeduction.toFixed(2)), // PAYE only
          otherDeductions: parseFloat((shifDeduction + nssfDeduction + ahlDeduction + otherNonStatutoryDeductions).toFixed(2)), // Group statutory (non-PAYE) and other deductions
          netPay: parseFloat(netPay.toFixed(2)),
          status: 'processed',
          processedAt: new Date(),
          processedBy: faker.string.uuid(),
          referenceNumber: faker.string.uuid()
        };

        await this.createPayroll(payroll);
        recordsCreated++;

        // Update employee's derived financial values based on calculated results for this period
        const maxAdvanceLimit = Math.max(0, Math.floor(netPay * 0.5));
        const availableAdvanceLimit = Math.max(0, maxAdvanceLimit - ewaDeductions);

        await this.updateEmployee(employee.id, {
          // Update total deductions based on this run
          total_deductions: parseFloat(totalDeductions.toFixed(2)),
          // Update statutory breakdown based on this run
          statutory_deductions: {
            nhif: parseFloat(shifDeduction.toFixed(2)),
            nssf: parseFloat(nssfDeduction.toFixed(2)),
            tax: parseFloat(payeDeduction.toFixed(2)),
            levy: parseFloat(ahlDeduction.toFixed(2))
          },
          // Update EWA limits based on this payroll run's net pay
          max_salary_advance_limit: maxAdvanceLimit,
          available_salary_advance_limit: availableAdvanceLimit,
          // Keep loan_deductions/employer_advances as they are (assuming external management)
        });

      } catch (error: any) {
        console.error(`Error processing payroll for employee ${employee.id}: ${error.message}`);
      }
    }
    // --- End Process Each Employee ---

    console.log(`Finished processing payroll period. Created ${recordsCreated} records.`);
    return recordsCreated;
  }

  /**
   * Generates mock EWA requests for all employees
   * @param maxRequestsPerEmployee Maximum number of requests per employee (default 2)
   * @returns Number of EWA requests created
   */
  async generateMockEwaRequestsForEmployees(maxRequestsPerEmployee: number = 2): Promise<number> {
    const employees = await this.getAllActiveEmployees();
    console.log(`Generating mock EWA requests for ${employees.length} active employees`);

    let requestsCreated = 0;

    for (const employee of employees) {
      // Skip inactive employees
      if (!employee.active) continue;

      // Determine the number of requests for this employee (0-2)
      const numRequests = faker.number.int({ min: 0, max: maxRequestsPerEmployee });

      // Helper to check for pending requests
      const hasPendingRequest = async (empId: string) => {
        const pending = await this.getPendingEwaRequests();
        return pending.some(req => req.employeeId === empId);
      };

      // Helper to get the latest payroll record
      const getLatestPayroll = async (empId: string): Promise<Payroll | null> => {
        const payrolls = await this.getPayrollForEmployee(empId); // Already sorted by date desc
        return payrolls.length > 0 ? payrolls[0] : null;
      };

      for (let i = 0; i < numRequests; i++) {
        // Ensure only one 'pending' request per employee per run
        if (i === 0 && await hasPendingRequest(employee.id)) {
          console.log(`Employee ${employee.id} already has a pending request, skipping additional requests`);
          break;
        }

        // Base request amount on available salary advance limit or fallback to 50% of latest payroll's net pay
        // Fix 2: Use helper function to get latest payroll
        const latestPayroll = await getLatestPayroll(employee.id);
        // Fix 1 (Line 1871): Ensure maxRequestable is explicitly a number
        const availableLimit = employee.available_salary_advance_limit ?? 0;
        const fallbackLimit = latestPayroll ? Number(latestPayroll.netPay) * 0.5 : 0; // Explicit Number()
        const potentialMax = availableLimit > 0 ? availableLimit : fallbackLimit;
        const maxRequestable = Math.max(0, Number(potentialMax)); // Explicit Number()

        if (maxRequestable <= 0) {
            console.log(`Employee ${employee.id} has no available EWA limit (Max: ${maxRequestable}), skipping EWA generation.`);
            continue;
        }

        // Ensure min/max for faker are numbers
        const reqMin = Math.min(500, maxRequestable * 0.1);
        const reqMax = maxRequestable * 0.8;
        // Ensure max >= min before passing to faker
        const finalReqMax = Math.max(reqMin, reqMax);
        // Explicitly cast inputs to Number for faker
        const requestAmount = faker.number.float({ min: Number(reqMin), max: Number(finalReqMax) });

        // Distribute statuses with weights
        const status = faker.helpers.weightedArrayElement([
          { weight: 3, value: 'pending' },
          { weight: 4, value: 'approved' }, // Increased approved/disbursed slightly
          { weight: 2, value: 'disbursed' },
          { weight: 1, value: 'rejected' }
        ]);

        // Add relevant timestamps and reasons based on status
        const requestDate = faker.date.recent({ days: 30 }); // More recent requests
        let approvedAt: Date | undefined = undefined;
        let disbursedAt: Date | undefined = undefined;
        let rejectionReason: string | undefined = undefined;

        if (status === 'approved' || status === 'disbursed') {
          approvedAt = faker.date.soon({ days: 2, refDate: requestDate });
        }
        if (status === 'disbursed') {
          // Ensure approvedAt is set if disbursing
          if (!approvedAt) approvedAt = faker.date.soon({ days: 1, refDate: requestDate });
          disbursedAt = faker.date.soon({ days: 1, refDate: approvedAt });
        }
        if (status === 'rejected') {
           rejectionReason = faker.helpers.arrayElement([
              'Insufficient salary balance',
              'Previous request pending',
              'Maximum withdrawal limit reached',
              'Account verification required',
              'Company policy restriction'
            ]);
        }

        const ewaRequest: InsertEwaRequest = {
          employeeId: employee.id,
          status,
          amount: parseFloat(requestAmount.toFixed(2)),
          processingFee: 0, // Assuming 0 fee for mock data simplicity
          requestDate,
          approvedAt,
          disbursedAt,
          reason: faker.helpers.arrayElement([
            'Medical emergency',
            'School fees payment',
            'Rent payment',
            'Family emergency',
            'Utility bills'
          ]),
          rejectionReason,
        };

        const newEwaRequest = await this.createEwaRequest(ewaRequest);
        requestsCreated++;

        // Update employee's available salary advance limit based on the request amount IF disbursed
        // This reflects the limit decreasing upon successful withdrawal
        if (status === 'disbursed') {
          const currentAvailable = employee.available_salary_advance_limit ?? fallbackLimit; // Use fallback if undefined
          const updatedEmployee: Partial<Employee> = {
            available_salary_advance_limit: Math.max(0, currentAvailable - requestAmount),
            last_withdrawal_time: disbursedAt, // Record last withdrawal time
          };
          await this.updateEmployee(employee.id, updatedEmployee);
          // Update the local employee object to reflect change for subsequent requests in loop
          employee.available_salary_advance_limit = updatedEmployee.available_salary_advance_limit ?? fallbackLimit;
          employee.last_withdrawal_time = updatedEmployee.last_withdrawal_time;
        }
      }
    }

    console.log(`Successfully created ${requestsCreated} EWA requests`);
    return requestsCreated;
  }

  /**
   * Generates all mock data for employees (attendance, payroll, EWA, wallet transactions)
   * @param days Number of days to generate attendance for (default 30)
   * @param periodStart Start date for the payroll period (default first day of current month)
   * @param periodEnd End date for the payroll period (default today)
   * @param maxRequestsPerEmployee Maximum number of EWA requests per employee (default 2)
   * @returns Summary of records created
   */
  async generateAllMockDataForEmployees(days: number = 30): Promise<{
    attendanceRecords: number;
    payrollRecords: number;
    ewaRequests: number;
    todayRecords: number;
    walletTransactions: number;
  }> {
    console.log(`Starting comprehensive mock data generation for imported employees...`);

    // Generate attendance data first
    const attendanceRecords = await this.generateMockAttendanceForEmployees(days);
    console.log(`Step 1/5 completed: ${attendanceRecords} attendance records generated`);

    // Generate today's records with employees not clocked in yet
    // Fix 2 (Line 1899): Remove duplicate call
    // const todayRecords = await this.generateTodayAttendanceRecords();
    // console.log(`Step 2/5 completed: ${todayRecords} attendance records for today generated`);
    // Note: todayRecords is generated later now, adjust step numbering if needed or remove variable if unused.

    // --- REORDERED: Generate EWA requests BEFORE payroll ---
    // This allows payroll to correctly calculate deductions based on EWA disbursed in the period.
    const ewaRequests = await this.generateMockEwaRequestsForEmployees(2);
    console.log(`Step 3/5 completed: ${ewaRequests} EWA requests generated`);

    // --- Generate payroll based on the attendance data ---
    // Payroll period will encompass the generated attendance/EWA dates.
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(); // Use today as end date
    periodEnd.setHours(23, 59, 59, 999);

    const payrollRecords = await this.generateMockPayrollForEmployees(periodStart, periodEnd);
    console.log(`Step 4/5 completed: ${payrollRecords} payroll records generated`);

    // --- Generate wallet and transactions ---
    // Create initial wallet if it doesn't exist
    let wallet = await this.getWallet();
    if (!wallet) {
      console.error("Wallet not found, creating default wallet for transaction generation.");
      wallet = await this.createWallet({
        employerBalance: 1000000, // Default initial balance
        jahaziiBalance: 0,
        perEmployeeCap: 50000,
        updatedAt: new Date()
      });
      if (!wallet) {
        console.error("Failed to create wallet, cannot generate transactions.");
        throw new Error("Failed to create wallet, cannot generate transactions.");
      }
    }

    const transactions: InsertWalletTransaction[] = [];

    // Fetch disbursed EWA requests
    const disbursedEwaRequests = await this.getDisbursedEwaRequests();
    console.log(`Found ${disbursedEwaRequests.length} disbursed EWA requests to create transactions for.`);

    // Create disbursement transactions for each disbursed EWA request
    for (const ewaRequest of disbursedEwaRequests) {
      const employee = await this.getEmployee(ewaRequest.employeeId);
      if (!employee) {
          console.warn(`Employee ${ewaRequest.employeeId} not found for EWA request ${ewaRequest.id}, skipping transaction.`);
          continue;
      }

      // Determine funding source based on request amount and employer balance/cap
      // Using weightedArrayElement correctly: pass an array of objects with weight and value
      const useJahaziiCredit = ewaRequest.amount > wallet.perEmployeeCap ||
        faker.helpers.weightedArrayElement([
          { weight: 70, value: false }, // 70% chance to use employer funds (if available)
          { weight: 30, value: true }   // 30% chance to use Jahazii credit
        ]);

      const fundingSource: 'employer' | 'jahazii' = useJahaziiCredit ? 'jahazii' : 'employer';
      const transactionType = useJahaziiCredit ? 'jahazii_disbursement' : 'employer_disbursement';

      const transaction: InsertWalletTransaction = {
        walletId: wallet.id,
        employeeId: employee.id,
        ewaRequestId: ewaRequest.id,
        transactionType: transactionType, // Use correct type
        description: `EWA Disbursement for ${employee.other_names} ${employee.surname}${useJahaziiCredit ? ' (Jahazii)' : ''}`,
        amount: -ewaRequest.amount, // Negative for disbursement
        fundingSource: fundingSource,
        status: 'completed',
        transactionDate: ewaRequest.disbursedAt || new Date(), // Use disbursement date
        referenceId: `EWA-${ewaRequest.id}`,
      };

      transactions.push(transaction);

      // Add Jahazii fee transaction if applicable
      if (fundingSource === 'jahazii') {
          const processingFee = Math.round(ewaRequest.amount * 0.02); // Example 2% fee
          const feeTransaction: InsertWalletTransaction = {
            walletId: wallet.id,
            employeeId: employee.id,
            ewaRequestId: ewaRequest.id,
            transactionType: 'jahazii_fee',
            description: `Processing Fee for EWA-${ewaRequest.id}`,
            amount: -processingFee, // Negative for fee
            fundingSource: 'jahazii',
            status: 'completed',
            transactionDate: ewaRequest.disbursedAt || new Date(),
            referenceId: `FEE-${ewaRequest.id}`,
          };
          transactions.push(feeTransaction);
      }
    }

    // Add random employer top-ups
    const topUpCount = faker.number.int({ min: 3, max: 8 });
    for (let i = 0; i < topUpCount; i++) {
      const topUpAmount = faker.number.int({ min: 50000, max: 500000 });
      const topUpDate = faker.date.recent({ days: 30});

      const transaction: InsertWalletTransaction = {
        walletId: wallet.id,
        transactionType: 'employer_topup',
        description: `Employer Top-up via ${faker.helpers.arrayElement(['Bank Transfer', 'M-Pesa', 'Card'])}`,
        amount: topUpAmount,
        fundingSource: 'employer',
        status: 'completed',
        transactionDate: topUpDate,
        referenceId: `TOPUP-${faker.string.alphanumeric(6).toUpperCase()}`,
      };

      transactions.push(transaction);
    }

    // Persist all created transactions
    for (const txn of transactions) {
        await this.createWalletTransaction(txn);
    }

    // NOTE: Wallet balance update is now handled in generateAllMockDataForEmployees AFTER all generation steps
    // This ensures the final balance reflects all created transactions.

    console.log(`Step 5/5 completed: ${transactions.length} wallet transactions generated`);
    console.log(`Mock data generation completed successfully!`);

    return {
      attendanceRecords,
      payrollRecords,
      ewaRequests,
      todayRecords: 0, // todayRecords is generated later now, adjust step numbering if needed or remove variable if unused.
      walletTransactions: transactions.length
    };
  }

  /**
   * Generates mock wallet transactions based on EWA requests and random top-ups
   * @returns Number of wallet transactions created
   */
  async generateMockWalletTransactionsForEmployees(): Promise<number> {
    console.log(`Generating mock wallet transactions...`);
    let transactionsCreated = 0;

    // Get the wallet or create if needed (should exist after main generation)
    // Fix 3 (Line 1923): Ensure wallet is declared with let
    let wallet: Wallet | undefined = await this.getWallet(); // Explicitly type

    if (!wallet) {
      console.log("Wallet not found, creating default wallet for transaction generation.");
       // Fix 2 (Line 1929): Use intermediate variable and assign back
       const createdWallet = await this.createWallet({
        employerBalance: 1000000, // Default initial balance
        jahaziiBalance: 0,
        perEmployeeCap: 50000,
        updatedAt: new Date()
      });
       if (createdWallet) {
           wallet = createdWallet; // Assign to outer 'let wallet'
       } else {
           console.error("Failed to create wallet after attempting.");
       }
    }

    // Add null check after attempting to get/create wallet
    if (!wallet) {
        console.error("Failed to get or create wallet, cannot generate transactions.");
        return 0; // Exit if wallet is still not available
    }

    const transactions: InsertWalletTransaction[] = [];

    // Fetch disbursed EWA requests
    const disbursedEwaRequests = await this.getDisbursedEwaRequests();
    console.log(`Found ${disbursedEwaRequests.length} disbursed EWA requests to create transactions for.`);

    // Create disbursement transactions for each disbursed EWA request
    for (const ewaRequest of disbursedEwaRequests) {
      const employee = await this.getEmployee(ewaRequest.employeeId);
      if (!employee) {
          console.warn(`Employee ${ewaRequest.employeeId} not found for EWA request ${ewaRequest.id}, skipping transaction.`);
          continue;
      }

      // Determine funding source based on request amount and employer balance/cap
      // Using weightedArrayElement correctly: pass an array of objects with weight and value
      // Fix 3: Correct usage of weightedArrayElement
      // Fix 4 (Line 2078): Remove incorrect .value access
      const useJahaziiCredit: boolean = ewaRequest.amount > wallet.perEmployeeCap ||
        faker.helpers.weightedArrayElement([
          { weight: 70, value: false }, // 70% chance to use employer funds (if available)
          { weight: 30, value: true }   // 30% chance to use Jahazii credit
        ]); // Remove .value

      // Fix 5: Explicitly type fundingSource
      const fundingSource: 'employer' | 'jahazii' = useJahaziiCredit ? 'jahazii' : 'employer';
      // Determine correct transactionType based on fundingSource
      const transactionType: 'employer_disbursement' | 'jahazii_disbursement' = useJahaziiCredit ? 'jahazii_disbursement' : 'employer_disbursement';

      const transaction: InsertWalletTransaction = {
        walletId: wallet.id,
        employeeId: employee.id,
        ewaRequestId: ewaRequest.id,
        transactionType: transactionType, // Use correct type variable
        description: `EWA Disbursement for ${employee.other_names} ${employee.surname}${useJahaziiCredit ? ' (Jahazii)' : ''}`,
        amount: -ewaRequest.amount, // Negative for disbursement
        fundingSource: fundingSource, // Use correct fundingSource variable
        status: 'completed',
        transactionDate: ewaRequest.disbursedAt || new Date(), // Use disbursement date
        referenceId: `EWA-${ewaRequest.id}`,
      };

      transactions.push(transaction);
      transactionsCreated++;

      // Add Jahazii fee transaction if applicable
      if (fundingSource === 'jahazii') {
          const processingFee = Math.round(ewaRequest.amount * 0.02); // Example 2% fee
          const feeTransaction: InsertWalletTransaction = {
            walletId: wallet.id,
            employeeId: employee.id,
            ewaRequestId: ewaRequest.id,
            transactionType: 'jahazii_fee',
            description: `Processing Fee for EWA-${ewaRequest.id}`,
            amount: -processingFee, // Negative for fee
            fundingSource: 'jahazii',
            status: 'completed',
            transactionDate: ewaRequest.disbursedAt || new Date(),
            referenceId: `FEE-${ewaRequest.id}`,
          };
          transactions.push(feeTransaction);
          transactionsCreated++;
      }
    }

    // Add random employer top-ups
    const topUpCount = faker.number.int({ min: 3, max: 8 });
    for (let i = 0; i < topUpCount; i++) {
      const topUpAmount = faker.number.int({ min: 50000, max: 500000 });
      const topUpDate = faker.date.recent({ days: 30});

      const transaction: InsertWalletTransaction = {
        walletId: wallet.id,
        transactionType: 'employer_topup',
        description: `Employer Top-up via ${faker.helpers.arrayElement(['Bank Transfer', 'M-Pesa', 'Card'])}`,
        amount: topUpAmount,
        fundingSource: 'employer',
        status: 'completed',
        transactionDate: topUpDate,
        referenceId: `TOPUP-${faker.string.alphanumeric(6).toUpperCase()}`,
      };

      transactions.push(transaction);
      transactionsCreated++;
    }

    // Persist all created transactions
    for (const txn of transactions) {
        await this.createWalletTransaction(txn);
    }

    // NOTE: Wallet balance update is now handled in generateAllMockDataForEmployees AFTER all generation steps
    // This ensures the final balance reflects all created transactions.

    console.log(`Generated ${transactionsCreated} wallet transaction records.`);
    return transactionsCreated;
  }
}

// Export the main storage instance
export const storage = new MemStorage();

// --- Chat History Related Code ---

// MemCollection now requires T to have a string id
export class MemCollection<T extends { id: string }> {
  private data: T[] = [];
  private collectionName: string;

  constructor(name: string) {
    this.collectionName = name;
  }

  async find(query: Partial<T> = {}): Promise<T[]> {
     return this.data.filter((item) => {
      for (const [key, value] of Object.entries(query)) {
        // Use type assertion since query keys might not be in T initially
        if (item[key as keyof T] !== value) return false;
      }
      return true;
    });
  }

  async findOne(query: Partial<T>): Promise<T | null> {
     const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  // Accept a document that might be missing an ID initially
  async insertOne(document: Omit<T, 'id'> & { id?: string }): Promise<T> {
    const docToInsert = {
        ...document,
        id: document.id || generateId(), // Generate ID if missing
    } as T; // Assert back to type T after adding id
    this.data.push(docToInsert);
    return docToInsert; // Return the full document with ID
  }

  async updateOne(query: Partial<T>, update: Partial<Omit<T, 'id'>>): Promise<boolean> { // Update excludes 'id'
    const item = await this.findOne(query);
    if (item) {
        const index = this.data.findIndex(d => d === item);
        if (index !== -1) {
            // Ensure ID is not overwritten by the partial update
            const currentId = this.data[index].id;
            this.data[index] = { ...this.data[index], ...update, id: currentId };
            return true;
        }
    }
    return false;
  }

  async deleteOne(query: Partial<T>): Promise<boolean> {
    const item = await this.findOne(query);
    if (item) {
        const index = this.data.findIndex(d => d === item);
        if (index !== -1) {
            this.data.splice(index, 1);
            return true;
        }
    }
    return false;
  }
}

// Chat interfaces require id
interface ChatMessage {
  id: string; // Required now
  userId: string;
  type: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ChatHistory {
  id: string; // Required now
  userId: string;
  messages: ChatMessage[];
  commands: string[];
  searches: string[];
}

// Chat messages collection
const chatMessages = new MemCollection<ChatMessage>("chat_messages");
const chatHistories = new MemCollection<ChatHistory>("chat_history");

// Chat storage functions
// Input message type allows id to be optional
export const saveMessage = async (message: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string, timestamp?: Date }): Promise<ChatMessage> => {
  // MemCollection will add ID if missing, ensure timestamp
  // id: message.id removed as insertOne handles it
  const fullMessage: Omit<ChatMessage, 'id'> & { id?: string } = {
      ...message,
      timestamp: message.timestamp || new Date(),
  };
  const insertedMessage = await chatMessages.insertOne(fullMessage); // insertOne returns the object with the ID

  // Provide a default history structure that matches ChatHistory (without id initially)
  const defaultHistory: Omit<ChatHistory, 'id'> = { userId: message.userId, messages: [], commands: [], searches: [] };
  const history = await getUserChatHistory(message.userId) || defaultHistory;

  // Ensure history.messages is treated as ChatMessage[]
  const messages = (history.messages || []) as ChatMessage[];
  messages.push(insertedMessage); // Push the message with the definite ID
  history.messages = messages.slice(-100); // Assign back the sliced array

  await saveUserChatHistory(message.userId, history);
  return insertedMessage; // Return the message with potentially generated ID
};

export const getMessagesByUser = async (
  userId: string,
  limit = 50
): Promise<ChatMessage[]> => {
  // Get messages directly from the user's history for efficiency
  const history = await getUserChatHistory(userId);
  if (history && history.messages) {
      return history.messages.slice(-limit); // Return last N messages
  }
  // Fallback to querying collection if history is missing (should ideally not happen)
  const messages = await chatMessages.find({ userId });
  return messages
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
};

export const saveUserChatHistory = async (
  userId: string,
  historyData: Partial<ChatHistory> 
): Promise<void> => {
  const existingHistory = await chatHistories.findOne({ userId });

  if (existingHistory) {
    const updatedHistory: ChatHistory = {
        // Ensure id is preserved if it exists
        id: existingHistory.id,
        userId: existingHistory.userId,
        messages: historyData.messages || existingHistory.messages,
        commands: historyData.commands || existingHistory.commands,
        searches: historyData.searches || existingHistory.searches,
        // Merge other potential partial updates
        ...(historyData as Omit<Partial<ChatHistory>, 'messages' | 'commands' | 'searches'>)
    };
    await chatHistories.updateOne({ userId }, updatedHistory);
  } else {
    const newHistory: Omit<ChatHistory, 'id'> = { // Ensure ID is not required here
        userId,
        messages: historyData.messages || [],
        commands: historyData.commands || [],
        searches: historyData.searches || [],
        // Merge other potential partial updates, excluding id
        ...(historyData as Omit<Partial<ChatHistory>, 'id' | 'messages' | 'commands' | 'searches'>)
    };
    // insertOne will generate ID if needed
    await chatHistories.insertOne(newHistory); 
  }
};

export const getUserChatHistory = async (
  userId: string
): Promise<ChatHistory | null> => {
  return await chatHistories.findOne({ userId });
};

export const saveCommand = async (
  userId: string,
  command: string
): Promise<void> => {
  const history = await getUserChatHistory(userId) || {
    userId,
    messages: [],
    commands: [],
    searches: [],
  };

  // Don't add duplicate consecutive commands
  if (
    history.commands.length > 0 &&
    history.commands[history.commands.length - 1] === command
  ) {
    return;
  }

  const updatedCommands = [...history.commands, command].slice(-20); // Keep last 20 commands

  await saveUserChatHistory(userId, { commands: updatedCommands }); // Corrected function call
};

export const saveSearch = async (
  userId: string,
  search: string
): Promise<void> => {
  const history = await getUserChatHistory(userId) || {
    userId,
    messages: [],
    commands: [],
    searches: [],
  };

  // Remove duplicate if exists
  const existingIndex = history.searches.findIndex(
    (s) => s.toLowerCase() === search.toLowerCase()
  );
  if (existingIndex !== -1) {
    history.searches.splice(existingIndex, 1);
  }

  const updatedSearches = [search, ...history.searches].slice(0, 10); // Keep last 10 searches

  await saveUserChatHistory(userId, { searches: updatedSearches });
};
