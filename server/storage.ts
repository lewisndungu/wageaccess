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
    return Array.from(this.payroll.values()).filter(
      (payroll) => payroll.employeeId === employeeId
    );
  }

  async getPayrollForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<Payroll[]> {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    return Array.from(this.payroll.values()).filter((payroll) => {
      const periodStart = payroll.periodStart.toString().split("T")[0];
      const periodEnd = payroll.periodEnd.toString().split("T")[0];
      return periodStart >= startDateString && periodEnd <= endDateString;
    });
  }

  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const id = payrollData.id && typeof payrollData.id === 'string'
        ? payrollData.id
        : generateId(); // Use helper function for ID

    // Assign default values or transform data if needed
    const newPayroll: Payroll = {
      id: id,
      employeeId: payrollData.employeeId ?? '', // Default to empty string if undefined
      periodStart: payrollData.periodStart ?? new Date(), // Default to now if undefined
      periodEnd: payrollData.periodEnd ?? new Date(), // Default to now if undefined
      hoursWorked: payrollData.hoursWorked ?? 0,
      grossPay: payrollData.grossPay ?? 0,
      netPay: payrollData.netPay ?? 0,
      ewaDeductions: payrollData.ewaDeductions ?? 0,
      taxDeductions: payrollData.taxDeductions ?? 0,
      otherDeductions: payrollData.otherDeductions ?? 0,
      status: payrollData.status ?? '', // Default to empty string if undefined
      processedBy: payrollData.processedBy, // Optional, no default needed if undefined
      processedAt: payrollData.processedAt ?? new Date(),
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
      processingFee: ewaRequestData.processingFee,
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
      perEmployeeCap: Number(walletData.perEmployeeCap || 0),
      updatedAt: new Date(),
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

    const updatedWallet = {
      ...wallet,
      ...walletData,
      modified_at: new Date(),
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
      status: transactionData.status || "",
      description: transactionData.description || "",
      amount: Number(transactionData.amount || 0),
      walletId: transactionData.walletId || "",
      transactionType: transactionData.transactionType || "",
      transactionDate: new Date(),
      referenceId: transactionData.referenceId || "",
      fundingSource: transactionData.fundingSource || "",
    };
    this.walletTransactions.set(id, transaction);
    return transaction;
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
        results.push({
          id: emp.id, // Use employee's main ID
          name,
          position,
          employeeNumber: emp.employeeNumber,
          salary: emp.hourlyRate, // Map salary from hourlyRate
          email: email,
          hireDate: emp.startDate,
          idNumber,
          kraPin,
          nssfNo,
          nhifNo,
          status: emp.status,
          phoneNumber: phoneNumber, // Use extracted phone number
          profileImage: profileImage,
        });
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
        
        console.log(`Processing payroll sub-period: ${currentPeriodStart.toISOString().split('T')[0]} to ${currentPeriodEnd.toISOString().split('T')[0]}`);
        
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
   * Helper function to process payroll for a specific period
   * Extracted to support multi-period payroll generation
   */
  private async processPayrollForPeriod(
    employees: Employee[],
    periodStart: Date,
    periodEnd: Date,
    hourlyRateCalculator: (employee: Employee) => number
  ): Promise<number> {
    let recordsCreated = 0;
    
    for (const employee of employees) {
      try {
        // Get attendance records for this employee in the given period
        const attendanceRecords = await this.getAttendanceByEmployeeAndDateRange(
          employee.id,
          periodStart,
          periodEnd
        );
        
        console.log(`Found ${attendanceRecords.length} attendance records for employee ${employee.id} in period ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`);
        
        // Calculate total hours worked
        const totalHoursWorked = attendanceRecords.reduce(
          (total, record) => total + (record.hoursWorked || 0), 
          0
        );
        
        // Use employee's hourly rate, calculated rate, or fallback to a default
        const hourlyRate = employee.hourlyRate || 
                          hourlyRateCalculator(employee) || 
                          500; // Default to 500 KES/hour
        
        // Calculate gross pay based on hours worked and hourly rate
        const grossPay = totalHoursWorked * hourlyRate;
        
        // Calculate tax deductions (simplified)
        // Progressive tax rates for Kenya
        const calculateTax = (grossAmount: number): number => {
          // Monthly PAYE rates (2023 KRA rates)
          if (grossAmount <= 24000) {
            return 0; // No tax for amounts <= 24,000
          } else if (grossAmount <= 32333) {
            return (grossAmount - 24000) * 0.25; // 25% for amounts between 24,001 and 32,333
          } else if (grossAmount <= 500000) {
            return 2083.25 + (grossAmount - 32333) * 0.3; // 30% for amounts between 32,334 and 500,000
          } else if (grossAmount <= 800000) {
            return 142083.25 + (grossAmount - 500000) * 0.325; // 32.5% for amounts between 500,001 and 800,000
          } else {
            return 239583.25 + (grossAmount - 800000) * 0.35; // 35% for amounts over 800,000
          }
        };
        
        // Calculate NHIF based on gross pay
        const calculateNHIF = (grossAmount: number): number => {
          // 2023 NHIF rates
          if (grossAmount <= 5999) return 150;
          if (grossAmount <= 7999) return 300;
          if (grossAmount <= 11999) return 400;
          if (grossAmount <= 14999) return 500;
          if (grossAmount <= 19999) return 600;
          if (grossAmount <= 24999) return 750;
          if (grossAmount <= 29999) return 850;
          if (grossAmount <= 34999) return 900;
          if (grossAmount <= 39999) return 950;
          if (grossAmount <= 44999) return 1000;
          if (grossAmount <= 49999) return 1100;
          if (grossAmount <= 59999) return 1200;
          if (grossAmount <= 69999) return 1300;
          if (grossAmount <= 79999) return 1400;
          if (grossAmount <= 89999) return 1500;
          if (grossAmount <= 99999) return 1600;
          return 1700; // Maximum NHIF contribution
        };
        
        // Calculate NSSF (1.5% of gross pay, up to 2,160 KES maximum for Tier I + II)
        const calculateNSSF = (grossAmount: number): number => {
          return Math.min(Math.round(grossAmount * 0.015), 2160);
        };
        
        // Calculate housing levy (1.5% of gross pay)
        const calculateHousingLevy = (grossAmount: number): number => {
          return Math.round(grossAmount * 0.015);
        };
        
        // Calculate statutory deductions
        const taxDeductions = calculateTax(grossPay);
        const nhifDeduction = calculateNHIF(grossPay);
        const nssfDeduction = calculateNSSF(grossPay);
        const housingLevy = calculateHousingLevy(grossPay);
        const otherStatutoryDeductions = nhifDeduction + nssfDeduction + housingLevy;
        
        // Update employee's statutory deductions
        await this.updateEmployee(employee.id, {
          statutory_deductions: {
            nhif: nhifDeduction,
            nssf: nssfDeduction,
            tax: taxDeductions,
            levy: housingLevy
          }
        });
        
        // Calculate EWA deductions if any
        const ewaRequests = await this.getEwaRequestsForEmployee(employee.id);
        const ewaDeductions = ewaRequests
          .filter(req => 
            req.status === 'disbursed' && 
            req.disbursedAt && 
            req.disbursedAt >= periodStart && 
            req.disbursedAt <= periodEnd
          )
          .reduce((total, req) => total + (req.amount || 0), 0);
        
        // Calculate net pay
        const totalDeductions = taxDeductions + otherStatutoryDeductions + ewaDeductions;
        const netPay = grossPay - totalDeductions;
        
        // Create payroll record
        const payroll: InsertPayroll = {
          employeeId: employee.id,
          periodStart,
          periodEnd,
          hoursWorked: totalHoursWorked,
          grossPay,
          ewaDeductions,
          taxDeductions,
          otherDeductions: otherStatutoryDeductions,
          netPay,
          status: 'processed',
          processedAt: new Date(),
          processedBy: faker.string.uuid(), // Mock processor ID
        };
        
        await this.createPayroll(payroll);
        recordsCreated++;
        
        // Update employee's income values based on latest payroll
        await this.updateEmployee(employee.id, {
          gross_income: grossPay,
          net_income: netPay,
          total_deductions: totalDeductions,
          hourlyRate: hourlyRate, // Ensure hourly rate is saved
          // Set EWA limits based on net pay
          max_salary_advance_limit: Math.floor(netPay * 0.5),
          available_salary_advance_limit: Math.floor(netPay * 0.5) - ewaDeductions
        });
        
        console.log(`Created payroll record for employee ${employee.id}: ${grossPay.toFixed(2)} KES gross, ${netPay.toFixed(2)} KES net`);
      } catch (error: any) {
        console.error(`Error creating payroll for employee ${employee.id}: ${error.message}`);
      }
    }
    
    return recordsCreated;
  }

  /**
   * Generates mock EWA (Earned Wage Access) requests for employees
   * @param requestsPerEmployee Number of requests to generate per employee (default 0-2)
   * @returns Number of EWA requests created
   */
  async generateMockEwaRequestsForEmployees(requestsPerEmployee: number = 2): Promise<number> {
    const employees = await this.getAllActiveEmployees();
    console.log(`Generating mock EWA requests for ${employees.length} active employees`);
    
    let recordsCreated = 0;
    const today = new Date();
    
    // Reasons for EWA requests
    const ewaReasons = [
      'Medical emergency',
      'School fees payment',
      'Rent payment',
      'Family emergency',
      'Utility bills',
      'Home repair',
      'Transportation costs',
      'Debt repayment',
      'Child care expenses',
      'Unexpected travel'
    ];
    
    // Status options with weighted probabilities
    const statusOptions = [
      { status: 'pending', weight: 0.3 },
      { status: 'approved', weight: 0.4 },
      { status: 'disbursed', weight: 0.2 },
      { status: 'rejected', weight: 0.1 }
    ];
    
    // Helper function for weighted random selection
    const getWeightedRandomStatus = (): string => {
      const totalWeight = statusOptions.reduce((sum, option) => sum + option.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const option of statusOptions) {
        random -= option.weight;
        if (random <= 0) {
          return option.status;
        }
      }
      
      return 'pending'; // Fallback
    };
    
    // Generate random dates for the past 30 days
    const getRandomPastDate = (maxDaysAgo: number = 30): Date => {
      const daysAgo = faker.number.int({ min: 0, max: maxDaysAgo });
      const result = new Date(today);
      result.setDate(result.getDate() - daysAgo);
      return result;
    };
    
    for (const employee of employees) {
      try {
        // Get the latest payroll for this employee
        const payrolls = await this.getPayrollForEmployee(employee.id);
        const latestPayroll = payrolls.sort((a, b) => 
          new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
        )[0];
        
        // Skip if no payroll exists
        if (!latestPayroll) {
          console.log(`No payroll found for employee ${employee.id}, skipping EWA generation`);
          continue;
        }
        
        // Get available EWA limit for this employee
        const availableLimit = employee.available_salary_advance_limit || 
                              (latestPayroll.netPay * 0.5); // Default to 50% of net pay
        
        // Random number of requests for this employee (0 to requestsPerEmployee)
        const numRequests = faker.number.int({ min: 0, max: requestsPerEmployee });
        
        for (let i = 0; i < numRequests; i++) {
          // Generate random amount (10% to 80% of available limit)
          const amount = faker.number.float({ 
            min: Math.min(1000, availableLimit * 0.1), 
            max: availableLimit * 0.8 
          });
          
          // Processing fee (1-3% of amount)
          const processingFee = amount * faker.number.float({ min: 0.01, max: 0.03 });
          
          // Random status with weighted probabilities
          const status = getWeightedRandomStatus();
          
          // Request date (within last 30 days)
          const requestDate = getRandomPastDate();
          
          // Basic EWA request
          const ewaRequest: InsertEwaRequest = {
            employeeId: employee.id,
            amount: parseFloat(amount.toFixed(2)),
            status,
            requestDate,
            processingFee: parseFloat(processingFee.toFixed(2)),
            reason: faker.helpers.arrayElement(ewaReasons)
          };
          
          // Add approval details if approved or disbursed
          if (status === 'approved' || status === 'disbursed') {
            const approvalDate = new Date(requestDate);
            approvalDate.setHours(approvalDate.getHours() + faker.number.int({ min: 1, max: 24 }));
            
            ewaRequest.approvedAt = approvalDate;
            ewaRequest.approvedBy = faker.string.uuid(); // Mock approver ID
          }
          
          // Add disbursement date if disbursed
          if (status === 'disbursed') {
            const disbursedDate = new Date(ewaRequest.approvedAt || requestDate);
            disbursedDate.setHours(disbursedDate.getHours() + faker.number.int({ min: 1, max: 12 }));
            
            ewaRequest.disbursedAt = disbursedDate;
          }
          
          // Add rejection reason if rejected
          if (status === 'rejected') {
            ewaRequest.rejectionReason = faker.helpers.arrayElement([
              'Insufficient salary balance',
              'Previous request pending',
              'Maximum withdrawal limit reached',
              'Account verification required',
              'Company policy restriction'
            ]);
          }
          
          await this.createEwaRequest(ewaRequest);
          recordsCreated++;
          
          console.log(`Created EWA request for employee ${employee.id}: ${amount.toFixed(2)} KES (${status})`);
        }
      } catch (error: any) {
        console.error(`Error creating EWA requests for employee ${employee.id}: ${error.message}`);
      }
    }
    
    console.log(`Successfully created ${recordsCreated} EWA requests`);
    return recordsCreated;
  }

  /**
   * Generate comprehensive mock data for all employees
   * @param days Number of days to generate attendance for (default 30)
   * @returns Summary of records created
   */
  async generateAllMockDataForEmployees(days: number = 30): Promise<{
    attendanceRecords: number;
    payrollRecords: number;
    ewaRequests: number;
    todayRecords: number;
  }> {
    console.log(`Starting comprehensive mock data generation for imported employees...`);
    
    // Generate attendance data first
    const attendanceRecords = await this.generateMockAttendanceForEmployees(days);
    console.log(`Step 1/4 completed: ${attendanceRecords} attendance records generated`);
    
    // Generate today's records with employees not clocked in yet
    const todayRecords = await this.generateTodayAttendanceRecords();
    console.log(`Step 2/4 completed: ${todayRecords} attendance records for today generated`);
    
    // Generate payroll based on the attendance data
    // Use a period from 30 days ago to today for payroll calculation
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    const periodEnd = new Date();
    
    const payrollRecords = await this.generateMockPayrollForEmployees(periodStart, periodEnd);
    console.log(`Step 3/4 completed: ${payrollRecords} payroll records generated`);
    
    // Generate EWA requests
    const ewaRequests = await this.generateMockEwaRequestsForEmployees(2);
    console.log(`Step 4/4 completed: ${ewaRequests} EWA requests generated`);
    
    console.log(`Mock data generation completed successfully!`);
    
    return {
      attendanceRecords,
      payrollRecords,
      ewaRequests,
      todayRecords
    };
  }

  /**
   * Generate attendance records for today with all employees showing as not clocked in yet
   * @returns Number of attendance records created for today
   */
  async generateTodayAttendanceRecords(): Promise<number> {
    const employees = await this.getAllActiveEmployees();
    console.log(`Generating today's attendance records for ${employees.length} employees (not clocked in yet)`);
    
    const today = new Date();
    let recordsCreated = 0;
    
    // First remove any existing attendance records for today to avoid duplicates
    const existingRecords = await this.getAttendanceForDate(today);
    for (const record of existingRecords) {
      try {
        await this.deleteAttendance(record.id);
        console.log(`Deleted existing attendance record for today: ${record.id}`);
      } catch (error) {
        console.error(`Failed to delete existing attendance record: ${error}`);
      }
    }
    
    // Create new records for each active employee
    for (const employee of employees) {
      try {
        const attendance: InsertAttendance = {
          employeeId: employee.id,
          date: new Date(today),
          clockInTime: undefined, // Not clocked in yet
          clockOutTime: undefined, // Not clocked out yet
          status: 'pending', // Status is pending until they clock in
          hoursWorked: 0,
          geoLocation: {},
          notes: undefined
        };
        
        await this.createAttendance(attendance);
        recordsCreated++;
      } catch (error: any) {
        console.error(`Error creating today's attendance for employee ${employee.id}: ${error.message}`);
      }
    }
    
    console.log(`Successfully created ${recordsCreated} attendance records for today (not clocked in yet)`);
    return recordsCreated;
  }

  async getEmployees(employeeIds: string[]): Promise<Employee[]> {
    const result: Employee[] = []; // Store full Employee objects

    for (const id of employeeIds) {
      try {
        const employee = await this.getEmployee(id); // Fetches the full Employee object
        if (!employee) {
          console.warn(`Employee with ID ${id} not found.`);
          continue;
        }

        result.push(employee); // Add the full employee object (potentially with department)
      } catch (error: any) {
        console.error(`Error getting employee ${id}: ${error.message}`, error);
      }
    }

    return result;
  }

  async flushAllData(): Promise<void> {
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
}
export const storage = new MemStorage();

// Helper function to generate IDs
export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export class MemCollection<T extends Record<string, any>> {
  private data: T[] = [];
  private collectionName: string;

  constructor(name: string) {
    this.collectionName = name;
  }

  async find(query: Partial<T> = {}): Promise<T[]> {
    return this.data.filter((item) => {
      for (const [key, value] of Object.entries(query)) {
        if (item[key] !== value) return false;
      }
      return true;
    });
  }

  async findOne(query: Partial<T>): Promise<T | null> {
    const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  async insertOne(document: T): Promise<void> {
    this.data.push(document);
  }

  async updateOne(query: Partial<T>, update: T): Promise<void> {
    const item = await this.findOne(query);
    if (item) {
      const index = this.data.indexOf(item);
      this.data[index] = update;
    }
  }

  async deleteOne(query: Partial<T>): Promise<boolean> {
    const item = await this.findOne(query);
    if (item) {
      const index = this.data.indexOf(item);
      this.data.splice(index, 1);
      return true;
    }
    return false;
  }
}

interface ChatMessage {
  id: string;
  userId: string;
  type: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ChatHistory {
  userId: string;
  messages: ChatMessage[];
  commands: string[];
  searches: string[];
}

// Chat messages collection - use the storage instance instead of direct db reference
const chatMessages = new MemCollection<ChatMessage>("chat_messages");
const chatHistories = new MemCollection<ChatHistory>("chat_history");

// Chat storage functions
export async function saveMessage(message: ChatMessage): Promise<ChatMessage> {
  message.id = message.id || generateId();
  await chatMessages.insertOne(message);
  return message;
}

export async function getMessagesByUser(
  userId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const messages = await chatMessages.find({ userId });
  return messages
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

export async function saveUserChatHistory(
  userId: string,
  history: Partial<ChatHistory>
): Promise<void> {
  const existingHistory = await chatHistories.findOne({ userId });

  if (existingHistory) {
    await chatHistories.updateOne(
      { userId },
      { ...existingHistory, ...history }
    );
  } else {
    await chatHistories.insertOne({
      userId,
      messages: [],
      commands: [],
      searches: [],
      ...history,
    });
  }
}

export async function getUserChatHistory(
  userId: string
): Promise<ChatHistory | null> {
  return await chatHistories.findOne({ userId });
}

export async function saveCommand(
  userId: string,
  command: string
): Promise<void> {
  const history = (await getUserChatHistory(userId)) || {
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

  await saveUserChatHistory(userId, { commands: updatedCommands });
}

export async function saveSearch(
  userId: string,
  search: string
): Promise<void> {
  const history = (await getUserChatHistory(userId)) || {
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
}
