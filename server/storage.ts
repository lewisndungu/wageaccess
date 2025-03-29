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
    const startDateString = startDate.toISOString().split("T")[0];
    const endDateString = endDate.toISOString().split("T")[0];

    return Array.from(this.payroll.values()).filter((payroll) => {
      const periodStart = payroll.periodStart.toString().split("T")[0];
      const periodEnd = payroll.periodEnd.toString().split("T")[0];
      return periodStart >= startDateString && periodEnd <= endDateString;
    });
  }

  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const id = faker.string.numeric(8).toString();
    const payroll: Payroll = {
      id,
      status: payrollData.status || "",
      employeeId: payrollData.employeeId || "",
      hoursWorked: Number(payrollData.hoursWorked || 0),
      periodStart: payrollData.periodStart || new Date(),
      periodEnd: payrollData.periodEnd || new Date(),
      grossPay: Number(payrollData.grossPay || 0),
      ewaDeductions: payrollData.ewaDeductions,
      taxDeductions: payrollData.taxDeductions,
      otherDeductions: payrollData.otherDeductions,
      netPay: Number(payrollData.netPay || 0),
      processedAt: new Date(),
      processedBy: payrollData.processedBy || "",
    };
    this.payroll.set(id, payroll);
    return payroll;
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
          hourlyRate: empData.hourlyRate || 0,
          startDate: empData.startDate,
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
