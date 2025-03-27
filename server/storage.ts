import {
  type User, type InsertUser,
  type Department, type InsertDepartment,
  type Employee, type InsertEmployee,
  type Attendance, type InsertAttendance,
  type Payroll, type InsertPayroll,
  type EwaRequest, type InsertEwaRequest,
  type Wallet, type InsertWallet,
  type WalletTransaction, type InsertWalletTransaction,
  type OtpCode, type InsertOtpCode,
  type EmployeeWithDetails
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
  generateOtpCode
} from "./mock-data-generator";

import { faker } from '@faker-js/faker';

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
  updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee | undefined>;
  
  // Attendance operations
  getAttendance(id: string): Promise<Attendance | undefined>;
  getAttendanceForEmployee(employeeId: string): Promise<Attendance[]>;
  getAttendanceForDate(date: Date): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, attendance: Partial<Attendance>): Promise<Attendance>;
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
  updatePayroll(id: string, payroll: Partial<Payroll>): Promise<Payroll | undefined>;
  
  // EWA operations
  getEwaRequest(id: string): Promise<EwaRequest | undefined>;
  getEwaRequestsForEmployee(employeeId: string): Promise<EwaRequest[]>;
  getPendingEwaRequests(): Promise<EwaRequest[]>;
  getApprovedEwaRequests(): Promise<EwaRequest[]>;
  getDisbursedEwaRequests(): Promise<EwaRequest[]>;
  createEwaRequest(ewaRequest: InsertEwaRequest): Promise<EwaRequest>;
  updateEwaRequest(id: string, ewaRequest: Partial<EwaRequest>): Promise<EwaRequest | undefined>;
  
  // Wallet operations
  getWallet(): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: string, wallet: Partial<Wallet>): Promise<Wallet | undefined>;
  
  // Wallet transaction operations
  getWalletTransaction(id: string): Promise<WalletTransaction | undefined>;
  getWalletTransactions(): Promise<WalletTransaction[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  
  // OTP operations
  getOtpCode(code: string): Promise<OtpCode | undefined>;
  getOtpCodeByCode(code: string): Promise<OtpCode | undefined>;
  getOtpCodesForEmployee(employeeId: string): Promise<OtpCode[]>;
  createOtpCode(otpCode: InsertOtpCode): Promise<OtpCode>;
  updateOtpCode(id: string, otpCode: Partial<OtpCode>): Promise<OtpCode | undefined>;
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
      username: insertUser.username || '',
      password: insertUser.password || '',
      role: insertUser.role || 'employee',
      profileImage: insertUser.profileImage,
      departmentId: insertUser.departmentId,
      created_at: insertUser.created_at || new Date(),
      modified_at: insertUser.modified_at || new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: string, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      ...userData
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
  
  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const id = faker.string.numeric(8).toString();
    const department: Department = {
      id,
      name: departmentData.name || '',
      description: departmentData.description
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
    console.log(`Direct map lookup failed for ID: ${id}, trying flexible comparison`);
    
    // Use Array.from to convert the Map entries to an array we can iterate over
    const employeeEntries = Array.from(this.employees.entries());
    
    for (const [key, emp] of employeeEntries) {
      if (
        String(key).trim() === id || 
        String(emp.id).trim() === id ||
        String(emp.employeeNumber).trim() === id
      ) {
        console.log(`Found employee via flexible comparison for ID: ${id}, matched employee with ID: ${emp.id}`);
        return emp;
      }
    }
    
    console.log(`No employee found for ID: ${id} after flexible comparison`);
    return undefined;
  }
  
  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
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
    
    const result: Employee = {
      ...employee,
      department: {
        id: employee.departmentId || '',
        name: employee.role || ''
      }
    };
    
    console.log(`Successfully retrieved employee details for ID: ${id}`);
    return result;
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
    const id = employeeData.id || faker.string.uuid();
    const employee: Employee = {
      id,
      username: (employeeData.username as string) || '',
      password: (employeeData.password as string) || '',
      role: (employeeData.role as string) || 'employee',
      employeeNumber: (employeeData.employeeNumber as string) || '',
      userId: (employeeData.userId as string) || '', 
      departmentId: (employeeData.departmentId as string) || '',
      surname: (employeeData.surname as string) || '',
      other_names: (employeeData.other_names as string) || '',
      id_no: (employeeData.id_no as string) || '',
      tax_pin: employeeData.tax_pin,
      sex: (employeeData.sex as string) || '',
      position: (employeeData.position as string) || '',
      status: (employeeData.status as string) || 'active',
      is_on_probation: employeeData.is_on_probation || false,
      gross_income: Number(employeeData.gross_income || 0),
      net_income: Number(employeeData.net_income || 0),
      total_deductions: Number(employeeData.total_deductions || 0),
      loan_deductions: Number(employeeData.loan_deductions || 0),
      employer_advances: Number(employeeData.employer_advances || 0),
      total_loan_deductions: Number(employeeData.total_loan_deductions || 0),
      statutory_deductions: employeeData.statutory_deductions || {},
      max_salary_advance_limit: Number(employeeData.max_salary_advance_limit || 0),
      available_salary_advance_limit: Number(employeeData.available_salary_advance_limit || 0),
      last_withdrawal_time: employeeData.last_withdrawal_time,
      contact: employeeData.contact || { email: '', phoneNumber: '' },
      address: employeeData.address,
      bank_info: employeeData.bank_info || {},
      id_confirmed: employeeData.id_confirmed || false,
      mobile_confirmed: employeeData.mobile_confirmed || false,
      tax_pin_verified: employeeData.tax_pin_verified || false,
      country: (employeeData.country as string) || 'KE',
      documents: employeeData.documents || {},
      crb_reports: employeeData.crb_reports || {},
      avatar_url: employeeData.avatar_url,
      hourlyRate: Number(employeeData.hourlyRate || 60),
      phoneNumber: employeeData.phoneNumber,
      startDate: employeeData.startDate,
      emergencyContact: employeeData.emergencyContact || {},
      active: employeeData.active ?? true,
      created_at: employeeData.created_at || new Date(),
      modified_at: employeeData.modified_at || new Date(),
      profileImage: employeeData.profileImage
    };
    this.employees.set(id, employee);
    return employee;
  }
  
  async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const employee = await this.getEmployee(id);
    if (!employee) return undefined;
    
    const updatedEmployee = {
      ...employee,
      ...employeeData,
      modified_at: new Date()
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
    const dateString = date.toISOString().split('T')[0];
    return Array.from(this.attendance.values()).filter(
      (attendance) => {
        if (!attendance.date) return false;
        return attendance.date.toString().split('T')[0] === dateString;
      }
    );
  }
  
  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const id = faker.string.numeric(8).toString();
    const attendance: Attendance = {
      id,
      status: attendanceData.status || '',
      employeeId: attendanceData.employeeId || '',
      date: attendanceData.date,
      clockInTime: attendanceData.clockInTime,
      clockOutTime: attendanceData.clockOutTime,
      hoursWorked: attendanceData.hoursWorked,
      geoLocation: attendanceData.geoLocation || {},
      approvedBy: attendanceData.approvedBy,
      notes: attendanceData.notes
    };
    this.attendance.set(id, attendance);
    
    // Clear cache after creating attendance
    this.clearTodayAttendanceCache();
    
    return attendance;
  }
  
  async updateAttendance(id: string, updateData: Partial<Attendance>): Promise<Attendance> {
    const attendance = this.attendance.get(id);
    if (!attendance) {
      throw new Error(`Attendance record with ID ${id} not found`);
    }
    
    const updatedAttendance = {
      ...attendance,
      ...updateData,
      modified_at: new Date().toISOString()
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
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    return Array.from(this.attendance.values()).filter((attendance) => {
      if (!attendance.date) return false;
      const attendanceDate = attendance.date.toString().split('T')[0];
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
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    return Array.from(this.attendance.values()).filter((attendance) => {
      if (!attendance.date) return false;
      const attendanceDate = attendance.date.toString().split('T')[0];
      return (
        attendanceDate >= startDateString &&
        attendanceDate <= endDateString
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
  
  async getPayrollForPeriod(startDate: Date, endDate: Date): Promise<Payroll[]> {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    return Array.from(this.payroll.values()).filter((payroll) => {
      const periodStart = payroll.periodStart.toString().split('T')[0];
      const periodEnd = payroll.periodEnd.toString().split('T')[0];
      return (
        periodStart >= startDateString &&
        periodEnd <= endDateString
      );
    });
  }
  
  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const id = faker.string.numeric(8).toString();
    const payroll: Payroll = {
      id,
      status: payrollData.status || '',
      employeeId: payrollData.employeeId || '',
      hoursWorked: Number(payrollData.hoursWorked || 0),
      periodStart: payrollData.periodStart || new Date(),
      periodEnd: payrollData.periodEnd || new Date(),
      grossPay: Number(payrollData.grossPay || 0),
      ewaDeductions: payrollData.ewaDeductions,
      taxDeductions: payrollData.taxDeductions,
      otherDeductions: payrollData.otherDeductions,
      netPay: Number(payrollData.netPay || 0),
      processedAt: new Date(),
      processedBy: payrollData.processedBy || ''
    };
    this.payroll.set(id, payroll);
    return payroll;
  }
  
  async updatePayroll(id: string, payrollData: Partial<Payroll>): Promise<Payroll | undefined> {
    const payroll = await this.getPayroll(id);
    if (!payroll) return undefined;
    
    const updatedPayroll = {
      ...payroll,
      ...payrollData,
      modified_at: new Date()
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
  
  async createEwaRequest(ewaRequestData: InsertEwaRequest): Promise<EwaRequest> {
    const id = faker.string.numeric(8).toString();
    const ewaRequest: EwaRequest = {
      id,
      status: ewaRequestData.status || '',
      employeeId: ewaRequestData.employeeId || '',
      approvedBy: ewaRequestData.approvedBy,
      requestDate: new Date(),
      amount: Number(ewaRequestData.amount || 0),
      processingFee: ewaRequestData.processingFee,
      approvedAt: new Date(),
      disbursedAt: new Date(),
      reason: ewaRequestData.reason,
      rejectionReason: ewaRequestData.rejectionReason
    };
    this.ewaRequests.set(id, ewaRequest);
    return ewaRequest;
  }
  
  async updateEwaRequest(id: string, ewaRequestData: Partial<EwaRequest>): Promise<EwaRequest | undefined> {
    const ewaRequest = await this.getEwaRequest(id);
    if (!ewaRequest) return undefined;
    
    const updatedEwaRequest = {
      ...ewaRequest,
      ...ewaRequestData,
      modified_at: new Date()
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
      updatedAt: new Date()
    };
    this.wallets.set(id, wallet);
    return wallet;
  }
  
  async updateWallet(id: string, walletData: Partial<Wallet>): Promise<Wallet | undefined> {
    const wallet = await this.getWallet();
    if (!wallet) return undefined;
    
    const updatedWallet = {
      ...wallet,
      ...walletData,
      modified_at: new Date()
    };
    this.wallets.set(id, updatedWallet);
    return updatedWallet;
  }

  // Wallet transaction operations
  async getWalletTransaction(id: string): Promise<WalletTransaction | undefined> {
    return this.walletTransactions.get(id);
  }
  
  async getWalletTransactions(): Promise<WalletTransaction[]> {
    return Array.from(this.walletTransactions.values());
  }
  
  async createWalletTransaction(transactionData: InsertWalletTransaction): Promise<WalletTransaction> {
    const id = faker.string.numeric(8).toString();
    const transaction: WalletTransaction = {
      id,
      status: transactionData.status || '',
      description: transactionData.description || '',
      amount: Number(transactionData.amount || 0),
      walletId: transactionData.walletId || '',
      transactionType: transactionData.transactionType || '',
      transactionDate: new Date(),
      referenceId: transactionData.referenceId || '',
      fundingSource: transactionData.fundingSource || ''
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
      employeeId: otpCodeData.employeeId || '',
      code: otpCodeData.code || '',
      expiresAt: otpCodeData.expiresAt || new Date(),
      used: otpCodeData.used || false,
      createdAt: new Date(),
    };
    this.otpCodes.set(id, otpCode);
    return otpCode;
  }
  
  async updateOtpCode(id: string, otpCodeData: Partial<OtpCode>): Promise<OtpCode | undefined> {
    // First find the OTP code by ID
    const existingOtpCode = Array.from(this.otpCodes.values()).find(otp => otp.id === id);
    if (!existingOtpCode) return undefined;
    
    const updatedOtpCode = {
      ...existingOtpCode,
      ...otpCodeData,
      modified_at: new Date().toISOString()
    };
    this.otpCodes.set(id, updatedOtpCode);
    return updatedOtpCode;
  }

  async deleteTodayAttendance(): Promise<void> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
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
      todayRecordIds.forEach(id => {
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
    
    // Search in the memory storage employees
    const allEmployees = await this.getAllEmployees();
    const results = [];
    
    for (const emp of allEmployees) {
      // Get user data to get name
      const user = await this.getUser(emp.userId.toString());
      if (!user) continue;
      
      // Get department
      const department = await this.getDepartment(emp.departmentId.toString());
      
      const name = user.username;
      const position = emp.position;
      const departmentName = department?.name || 'Unknown';
      
      // Process address and emergency contact fields
      let addressObj: Record<string, any> = {};
      let emergencyContactObj: Record<string, any> = {};
      
      // Parse the address field if it's a JSON string
      if (typeof emp.address === 'string' && 
          (emp.address.startsWith('{') || emp.address.startsWith('['))) {
        try {
          addressObj = JSON.parse(emp.address);
        } catch (e) {
          console.error(`Failed to parse address for employee ${emp.id}: ${e}`);
        }
      } else if (emp.address && typeof emp.address === 'object') {
        addressObj = emp.address as Record<string, any>;
      }
      
      // Parse the emergencyContact field if it's a JSON string
      if (typeof emp.emergencyContact === 'string' && 
          (emp.emergencyContact.startsWith('{') || emp.emergencyContact.startsWith('['))) {
        try {
          emergencyContactObj = JSON.parse(emp.emergencyContact);
        } catch (e) {
          console.error(`Failed to parse emergencyContact for employee ${emp.id}: ${e}`);
        }
      } else if (emp.emergencyContact && typeof emp.emergencyContact === 'object') {
        emergencyContactObj = emp.emergencyContact as Record<string, any>;
      }
      
      // Extract additional details from address object if available
      const idNumber = addressObj.idNumber || '';
      const kraPin = addressObj.kraPin || '';
      const nssfNo = addressObj.nssfNo || '';
      const nhifNo = addressObj.nhifNo || '';
      
      // Check if the query matches any employee field
      if (
        name.toLowerCase().includes(lowerQuery) ||
        position.toLowerCase().includes(lowerQuery) ||
        emp.employeeNumber.includes(query) ||
        departmentName.toLowerCase().includes(lowerQuery) ||
        (idNumber && idNumber.toString().includes(query)) ||
        (kraPin && kraPin.toString().toLowerCase().includes(lowerQuery)) ||
        (nssfNo && nssfNo.toString().includes(query)) ||
        (nhifNo && nhifNo.toString().includes(query))
      ) {
        // Format employee with needed data
        results.push({
          id: emp.id.toString(),
          name,
          position,
          department: departmentName,
          employeeNumber: emp.employeeNumber,
          salary: emp.hourlyRate,
          email: user.username + '@company.com',
          hireDate: emp.startDate,
          idNumber,
          kraPin,
          nssfNo,
          nhifNo,
          status: emp.status,
          phoneNumber: emp.phoneNumber,
          address: addressObj,
          emergencyContact: emergencyContactObj,
          profileImage: user.profileImage || faker.image.avatar()
        });
      }
    }
    
    return results;
  }

  async addEmployees(employees: Employee[]): Promise<number> {
    let addedCount = 0;
    console.log(`addEmployees: Processing ${employees.length} employees for import`);
    
    for (const emp of employees) {
      try {
        const newEmployee = await this.createEmployee(emp);
        const fullName = `${emp.other_names} ${emp.surname}`.trim();
        console.log(`addEmployees: Created new employee ${fullName}, employee number: ${newEmployee.employeeNumber}, employee ID: ${newEmployee.id}, active: ${newEmployee.active}`);
        addedCount++;
      } catch (error) {
        console.error('Error adding employee:', error);
      }
    }
    
    console.log(`addEmployees: Completed adding ${addedCount} new employees`);
    return addedCount;
  }

  async getEmployees(employeeIds: string[]): Promise<any[]> {
    const result = [];
    
    for (const id of employeeIds) {
      try {
        const employee = await this.getEmployee(id);
        if (!employee) continue;
        
        // Get user data - convert numeric ID to string
        const user = await this.getUser(employee.userId.toString());
        if (!user) continue;
        
        // Get department - convert numeric ID to string
        const department = await this.getDepartment(employee.departmentId.toString());
        
        result.push({
          id: employee.id,
          name: user.username,
          position: employee.position,
          department: department?.name || 'Unknown',
          salary: employee.hourlyRate,
          email: user.username + '@company.com',
          hireDate: employee.startDate
        });
      } catch (error) {
        console.error('Error getting employee:', error);
      }
    }
    
    return result;
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
    return this.data.filter(item => {
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
const chatMessages = new MemCollection<ChatMessage>('chat_messages');
const chatHistories = new MemCollection<ChatHistory>('chat_history');

// Chat storage functions
export async function saveMessage(message: ChatMessage): Promise<ChatMessage> {
  message.id = message.id || generateId();
  await chatMessages.insertOne(message);
  return message;
}

export async function getMessagesByUser(userId: string, limit = 50): Promise<ChatMessage[]> {
  const messages = await chatMessages.find({ userId });
  return messages
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

export async function saveUserChatHistory(userId: string, history: Partial<ChatHistory>): Promise<void> {
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
      ...history
    });
  }
}

export async function getUserChatHistory(userId: string): Promise<ChatHistory | null> {
  return await chatHistories.findOne({ userId });
}

export async function saveCommand(userId: string, command: string): Promise<void> {
  const history = await getUserChatHistory(userId) || { userId, messages: [], commands: [], searches: [] };
  
  // Don't add duplicate consecutive commands
  if (history.commands.length > 0 && history.commands[history.commands.length - 1] === command) {
    return;
  }
  
  const updatedCommands = [...history.commands, command].slice(-20); // Keep last 20 commands
  
  await saveUserChatHistory(userId, { commands: updatedCommands });
}

export async function saveSearch(userId: string, search: string): Promise<void> {
  const history = await getUserChatHistory(userId) || { userId, messages: [], commands: [], searches: [] };
  
  // Remove duplicate if exists
  const existingIndex = history.searches.findIndex(s => s.toLowerCase() === search.toLowerCase());
  if (existingIndex !== -1) {
    history.searches.splice(existingIndex, 1);
  }
  
  const updatedSearches = [search, ...history.searches].slice(0, 10); // Keep last 10 searches
  
  await saveUserChatHistory(userId, { searches: updatedSearches });
}

// Employee search and management functions for chat service
export async function findEmployees(options: { query: string }): Promise<any[]> {
  const { query } = options;
  const lowerQuery = query.toLowerCase();
  
  // Search in the memory storage employees
  const allEmployees = await storage.getAllEmployees();
  const results = [];
  
  for (const emp of allEmployees) {
    // Get user data to get name
    const user = await storage.getUser(emp.userId.toString());
    if (!user) continue;
    
    // Get department
    const department = await storage.getDepartment(emp.departmentId.toString());
    
    const name = user.username;
    const position = emp.position;
    const departmentName = department?.name || 'Unknown';
    
    // Process address and emergency contact fields
    let addressObj: Record<string, any> = {};
    let emergencyContactObj: Record<string, any> = {};
    
    // Parse the address field if it's a JSON string
    if (typeof emp.address === 'string' && 
        (emp.address.startsWith('{') || emp.address.startsWith('['))) {
      try {
        addressObj = JSON.parse(emp.address);
      } catch (e) {
        console.error(`Failed to parse address for employee ${emp.id}: ${e}`);
      }
    } else if (emp.address && typeof emp.address === 'object') {
      addressObj = emp.address as Record<string, any>;
    }
    
    // Parse the emergencyContact field if it's a JSON string
    if (typeof emp.emergencyContact === 'string' && 
        (emp.emergencyContact.startsWith('{') || emp.emergencyContact.startsWith('['))) {
      try {
        emergencyContactObj = JSON.parse(emp.emergencyContact);
      } catch (e) {
        console.error(`Failed to parse emergencyContact for employee ${emp.id}: ${e}`);
      }
    } else if (emp.emergencyContact && typeof emp.emergencyContact === 'object') {
      emergencyContactObj = emp.emergencyContact as Record<string, any>;
    }
    
    // Extract additional details from address object if available
    const idNumber = addressObj.idNumber || '';
    const kraPin = addressObj.kraPin || '';
    const nssfNo = addressObj.nssfNo || '';
    const nhifNo = addressObj.nhifNo || '';
    
    // Check if the query matches any employee field
    if (
      name.toLowerCase().includes(lowerQuery) ||
      position.toLowerCase().includes(lowerQuery) ||
      emp.employeeNumber.includes(query) ||
      departmentName.toLowerCase().includes(lowerQuery) ||
      (idNumber && idNumber.toString().includes(query)) ||
      (kraPin && kraPin.toString().toLowerCase().includes(lowerQuery)) ||
      (nssfNo && nssfNo.toString().includes(query)) ||
      (nhifNo && nhifNo.toString().includes(query))
    ) {
      // Format employee with needed data
      results.push({
        id: emp.id.toString(),
        name,
        position,
        department: departmentName,
        employeeNumber: emp.employeeNumber,
        salary: emp.hourlyRate,
        email: user.username + '@company.com',
        hireDate: emp.startDate,
        idNumber,
        kraPin,
        nssfNo,
        nhifNo,
        status: emp.status,
        phoneNumber: emp.phoneNumber,
        address: addressObj,
        emergencyContact: emergencyContactObj,
        profileImage: user.profileImage || faker.image.avatar()
      });
    }
  }
  
  return results;
}

export async function addEmployees(employees: any[]): Promise<number> {
  let addedCount = 0;
  console.log(`addEmployees: Processing ${employees.length} employees for import`);
  
  for (const emp of employees) {
    try {
      // Extract employee identification fields
      const empNo = emp['Emp No'] || emp['employeeNumber'] || '';
      const idNumber = emp['ID Number'] || emp['id_no'] || '';
      
      // Look for existing employee
      let existingEmp = null;
      if (empNo) {
        existingEmp = await storage.getEmployeeByNumber(empNo);
      }
      
      // Get name from MongoDB structure or legacy fields
      const firstName = emp['First Name'] || emp['other_names'] || '';
      const lastName = emp['Last Name'] || emp['surname'] || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      if (!existingEmp) {
        // Create user first
        const username = fullName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        const email = emp['email'] || `${username}@company.com`;
        
        const user = await storage.createUser({
          username,
          password: 'default-password',
          role: emp['role'] || 'employee',
          departmentId: emp['departmentId']?.toString(),
          created_at: new Date(),
          modified_at: new Date()
        });
        
        // Extract fields using MongoDB structure with fallbacks to legacy fields
        const position = emp['position'] || emp['Position'] || 'Employee';
        const grossPay = emp['gross_income'] || emp['Gross Pay'] || 0;
        const status = emp['status'] || 'active';
        
        // Handle statutory deductions
        const statutoryDeductions = emp['statutory_deductions'] || {
          nhif: emp['nhif'] || 0,
          nssf: emp['nssf'] || emp['nssf_no'] || 0,
          paye: emp['paye'] || 0,
          levies: emp['levy'] || 0
        };
        
        // Handle contact details
        const mobile = emp['contact']?.['mobile'] || emp['phoneNumber'] || null;
        const city = emp['contact']?.['city'] || null;
        
        // Generate a new UUID on the server
        const employeeId = faker.string.uuid();
        console.log(`Generated new employee ID: ${employeeId}`);
        
        // Create MongoDB-compatible employee record
        const newEmployee = await storage.createEmployee({
          id: employeeId,
          employeeNumber: empNo || `EMP${Date.now().toString().substring(7)}`,
          userId: user.id,
          departmentId: emp['departmentId'] || '1',
          surname: lastName,
          other_names: firstName,
          id_no: idNumber,
          tax_pin: emp['tax_pin'] || emp['KRA Pin'] || '',
          sex: emp['sex'] || 'unknown',
          position: position,
          gross_income: grossPay.toString(),
          net_income: (emp['net_income'] || 0).toString(),
          total_deductions: (emp['total_deductions'] || 0).toString(),
          loan_deductions: (emp['loan_deductions'] || 0).toString(),
          employer_advances: (emp['employer_advances'] || 0).toString(),
          total_loan_deductions: (emp['total_loan_deductions'] || 0).toString(),
          statutory_deductions: statutoryDeductions,
          max_salary_advance_limit: (emp['max_salary_advance_limit'] || 0).toString(),
          available_salary_advance_limit: (emp['available_salary_advance_limit'] || 0).toString(),
          last_withdrawal_time: emp['last_withdrawal_time'] || null,
          contact: mobile,
          address: city,
          country: emp['country'] || 'KE',
            emergencyContact: "",
          status: status,
          is_on_probation: emp['is_on_probation'] || false,
          role: emp['role'] || 'employee',
          avatar_url: emp['avatar_url'] || '',
          hourlyRate: 60,
          phoneNumber: mobile,
          startDate: new Date(),
          active: true,
          created_at: new Date(),
          modified_at: new Date(),
          bank_info: emp['bank_info'] || null,
          documents: emp['documents'] || [],
          crb_reports: emp['crb_reports'] || [],
        });
        
        console.log(`addEmployees: Created new employee ${fullName}, employee number: ${newEmployee.employeeNumber}, employee ID: ${newEmployee.id}, active: ${newEmployee.active}`);
        addedCount++;
      } else {
        // Update existing employee if needed
        console.log(`Employee ${fullName} already exists, skipping import. Active status: ${existingEmp.active}`);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  }
  
  console.log(`addEmployees: Completed adding ${addedCount} new employees`);
  return addedCount;
}

export async function getEmployees(employeeIds: string[]): Promise<any[]> {
  const result = [];
  
  for (const id of employeeIds) {
    try {
      const employee = await storage.getEmployee(id);
      if (!employee) continue;
      
      // Get user data - convert numeric ID to string
      const user = await storage.getUser(employee.userId.toString());
      if (!user) continue;
      
      // Get department - convert numeric ID to string
      const department = await storage.getDepartment(employee.departmentId.toString());
      
      result.push({
        id: employee.id,
        name: user.username,
        position: employee.position,
        department: department?.name || 'Unknown',
        salary: employee.hourlyRate,
        email: user.username + '@company.com',
        hireDate: employee.startDate
      });
    } catch (error) {
      console.error('Error getting employee:', error);
    }
  }
  
  return result;
}
