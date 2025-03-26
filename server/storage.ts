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
  generateOtpCodes
} from "./mock-data-generator";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Department operations
  getDepartment(id: number): Promise<Department | undefined>;
  getAllDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  
  // Employee operations
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined>;
  getEmployeeWithDetails(id: number): Promise<EmployeeWithDetails | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  getAllActiveEmployees(): Promise<Employee[]>;
  getAllInactiveEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<Employee>): Promise<Employee | undefined>;
  
  // Attendance operations
  getAttendance(id: number): Promise<Attendance | undefined>;
  getAttendanceForEmployee(employeeId: number): Promise<Attendance[]>;
  getAttendanceForDate(date: Date): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<Attendance>): Promise<Attendance>;
  getAttendanceByEmployeeAndDateRange(
    employeeId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Attendance[]>;
  
  // Payroll operations
  getPayroll(id: number): Promise<Payroll | undefined>;
  getPayrollForEmployee(employeeId: number): Promise<Payroll[]>;
  getPayrollForPeriod(startDate: Date, endDate: Date): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: number, payroll: Partial<Payroll>): Promise<Payroll | undefined>;
  
  // EWA operations
  getEwaRequest(id: number): Promise<EwaRequest | undefined>;
  getEwaRequestsForEmployee(employeeId: number): Promise<EwaRequest[]>;
  getPendingEwaRequests(): Promise<EwaRequest[]>;
  getApprovedEwaRequests(): Promise<EwaRequest[]>;
  getDisbursedEwaRequests(): Promise<EwaRequest[]>;
  createEwaRequest(ewaRequest: InsertEwaRequest): Promise<EwaRequest>;
  updateEwaRequest(id: number, ewaRequest: Partial<EwaRequest>): Promise<EwaRequest | undefined>;
  
  // Wallet operations
  getWallet(): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: number, wallet: Partial<Wallet>): Promise<Wallet | undefined>;
  
  // Wallet transaction operations
  getWalletTransaction(id: number): Promise<WalletTransaction | undefined>;
  getWalletTransactions(): Promise<WalletTransaction[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  
  // OTP operations
  getOtpCode(code: string): Promise<OtpCode | undefined>;
  getOtpCodeByCode(code: string): Promise<OtpCode | undefined>;
  getOtpCodesForEmployee(employeeId: number): Promise<OtpCode[]>;
  createOtpCode(otpCode: InsertOtpCode): Promise<OtpCode>;
  updateOtpCode(id: number, otpCode: Partial<OtpCode>): Promise<OtpCode | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private departments: Map<number, Department>;
  private employees: Map<number, Employee>;
  private attendance: Map<number, Attendance>;
  private payroll: Map<number, Payroll>;
  private ewaRequests: Map<number, EwaRequest>;
  private wallets: Map<number, Wallet>;
  private walletTransactions: Map<number, WalletTransaction>;
  private otpCodes: Map<number, OtpCode>;
  
  private currentUserId: number;
  private currentDepartmentId: number;
  private currentEmployeeId: number;
  private currentAttendanceId: number;
  private currentPayrollId: number;
  private currentEwaRequestId: number;
  private currentWalletId: number;
  private currentWalletTransactionId: number;
  private currentOtpCodeId: number;
  
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
    
    this.currentUserId = 1;
    this.currentDepartmentId = 1;
    this.currentEmployeeId = 1;
    this.currentAttendanceId = 1;
    this.currentPayrollId = 1;
    this.currentEwaRequestId = 1;
    this.currentWalletId = 1;
    this.currentWalletTransactionId = 1;
    this.currentOtpCodeId = 1;
    
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
    
    // Generate OTP codes
    const otpCodes = generateOtpCodes(allEmployees);
    for (const code of otpCodes) {
      await this.createOtpCode(code);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      role: insertUser.role || "employee",
      profileImage: insertUser.profileImage || null,
      departmentId: insertUser.departmentId || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Department operations
  async getDepartment(id: number): Promise<Department | undefined> {
    return this.departments.get(id);
  }
  
  async getAllDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }
  
  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const id = this.currentDepartmentId++;
    const department: Department = {
      id,
      name: departmentData.name,
      description: departmentData.description ?? null
    };
    this.departments.set(id, department);
    return department;
  }

  // Employee operations
  async getEmployee(id: number): Promise<Employee | undefined> {
    return this.employees.get(id);
  }
  
  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(
      (employee) => employee.employeeNumber === employeeNumber
    );
  }
  
  async getEmployeeWithDetails(id: number): Promise<EmployeeWithDetails | undefined> {
    const employee = await this.getEmployee(id);
    if (!employee) return undefined;
    
    const user = await this.getUser(employee.userId);
    const department = await this.getDepartment(employee.departmentId);
    
    if (!user || !department) return undefined;
    
    return {
      ...employee,
      user,
      department
    };
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
    const id = this.currentEmployeeId++;
    const employee: Employee = {
      id,
      employeeNumber: employeeData.employeeNumber,
      userId: employeeData.userId,
      departmentId: employeeData.departmentId,
      position: employeeData.position,
      status: employeeData.status ?? "active",
      hourlyRate: employeeData.hourlyRate,
      startDate: employeeData.startDate,
      active: employeeData.active ?? null,
      phoneNumber: employeeData.phoneNumber ?? null,
      emergencyContact: employeeData.emergencyContact ?? null,
      address: employeeData.address ?? null
    };
    this.employees.set(id, employee);
    return employee;
  }
  
  async updateEmployee(id: number, employeeData: Partial<Employee>): Promise<Employee | undefined> {
    const employee = await this.getEmployee(id);
    if (!employee) return undefined;
    
    const updatedEmployee = { ...employee, ...employeeData };
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }

  // Clear today's attendance cache
  clearTodayAttendanceCache() {
    this.todayAttendanceCache = null;
  }

  // Attendance operations
  async getAttendance(id: number): Promise<Attendance | undefined> {
    return this.attendance.get(id);
  }
  
  async getAttendanceForEmployee(employeeId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      (attendance) => attendance.employeeId === employeeId
    );
  }
  
  async getAttendanceForDate(date: Date): Promise<Attendance[]> {
    const normalizedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const today = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    );

    // If requesting today's attendance and we have cached data, return it
    if (normalizedDate.getTime() === today.getTime() && this.todayAttendanceCache) {
      return this.todayAttendanceCache.records;
    }

    // Get base records
    const records = Array.from(this.attendance.values()).filter(
      (attendance) => {
        if (!attendance.date) return false;
        const attendanceDate = attendance.date;
        return (
          attendanceDate.getFullYear() === date.getFullYear() &&
          attendanceDate.getMonth() === date.getMonth() &&
          attendanceDate.getDate() === date.getDate()
        );
      }
    );

    // If it's today, cache the results
    if (normalizedDate.getTime() === today.getTime()) {
      this.todayAttendanceCache = {
        date: normalizedDate,
        records
      };
    }

    return records;
  }
  
  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const id = this.currentAttendanceId++;
    const attendance: Attendance = {
      id,
      employeeId: attendanceData.employeeId,
      status: attendanceData.status,
      date: attendanceData.date ?? null,
      clockInTime: attendanceData.clockInTime ?? null,
      clockOutTime: attendanceData.clockOutTime ?? null,
      hoursWorked: attendanceData.hoursWorked ?? null,
      geoLocation: attendanceData.geoLocation ?? null,
      approvedBy: attendanceData.approvedBy ?? null,
      notes: attendanceData.notes ?? null
    };
    this.attendance.set(id, attendance);
    
    // Clear cache after creating attendance
    this.clearTodayAttendanceCache();
    
    return attendance;
  }
  
  async updateAttendance(id: number, updateData: Partial<Attendance>): Promise<Attendance> {
    const attendance = this.attendance.get(id);
    if (!attendance) {
      throw new Error(`Attendance record with ID ${id} not found`);
    }
    
    const updatedAttendance = { ...attendance, ...updateData };
    this.attendance.set(id, updatedAttendance);
    
    // Clear cache after updating attendance
    this.clearTodayAttendanceCache();
    
    return updatedAttendance;
  }

  async getAttendanceByEmployeeAndDateRange(
    employeeId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Attendance[]> {
    // Get all attendance records for the employee
    const allRecords = await this.getAttendanceForEmployee(employeeId);
    
    // Filter by date range
    return allRecords.filter(record => {
      const recordDate = record.date ? new Date(record.date) : null;
      if (!recordDate) return false;
      
      return recordDate >= startDate && recordDate <= endDate;
    });
  }

  async deleteAttendance(id: number): Promise<boolean> {
    if (!this.attendance.has(id)) {
      return false;
    }
    
    this.attendance.delete(id);
    
    // Clear cache after deleting attendance
    this.clearTodayAttendanceCache();
    
    return true;
  }

  // Get all attendance records
  getAllAttendance(): Map<number, Attendance> {
    return this.attendance;
  }

  // Payroll operations
  async getPayroll(id: number): Promise<Payroll | undefined> {
    return this.payroll.get(id);
  }
  
  async getPayrollForEmployee(employeeId: number): Promise<Payroll[]> {
    return Array.from(this.payroll.values()).filter(
      (payroll) => payroll.employeeId === employeeId
    );
  }
  
  async getPayrollForPeriod(startDate: Date, endDate: Date): Promise<Payroll[]> {
    return Array.from(this.payroll.values()).filter(
      (payroll) => {
        const periodStart = new Date(payroll.periodStart);
        const periodEnd = new Date(payroll.periodEnd);
        // Check if the payroll period overlaps with the requested period
        return (
          // Either the payroll period starts within our requested range
          (periodStart >= startDate && periodStart <= endDate) ||
          // Or the payroll period ends within our requested range
          (periodEnd >= startDate && periodEnd <= endDate) ||
          // Or the payroll period completely encompasses our requested range
          (periodStart <= startDate && periodEnd >= endDate)
        );
      }
    );
  }
  
  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const id = this.currentPayrollId++;
    const payroll: Payroll = {
      id,
      employeeId: payrollData.employeeId,
      status: payrollData.status,
      periodStart: payrollData.periodStart,
      periodEnd: payrollData.periodEnd,
      hoursWorked: payrollData.hoursWorked,
      grossPay: payrollData.grossPay,
      netPay: payrollData.netPay,
      ewaDeductions: payrollData.ewaDeductions ?? null,
      taxDeductions: payrollData.taxDeductions ?? null,
      otherDeductions: payrollData.otherDeductions ?? null,
      processedAt: null,
      processedBy: null
    };
    this.payroll.set(id, payroll);
    return payroll;
  }
  
  async updatePayroll(id: number, payrollData: Partial<Payroll>): Promise<Payroll | undefined> {
    const payroll = await this.getPayroll(id);
    if (!payroll) return undefined;
    
    const updatedPayroll = { ...payroll, ...payrollData };
    this.payroll.set(id, updatedPayroll);
    return updatedPayroll;
  }

  // EWA operations
  async getEwaRequest(id: number): Promise<EwaRequest | undefined> {
    return this.ewaRequests.get(id);
  }
  
  async getEwaRequestsForEmployee(employeeId: number): Promise<EwaRequest[]> {
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
    const id = this.currentEwaRequestId++;
    const ewaRequest: EwaRequest = { 
      id, 
      employeeId: ewaRequestData.employeeId,
      amount: ewaRequestData.amount,
      status: ewaRequestData.status ?? "pending",
      requestDate: new Date(),
      approvedAt: null,
      disbursedAt: null,
      approvedBy: ewaRequestData.approvedBy ?? null,
      processingFee: ewaRequestData.processingFee ?? null,
      reason: ewaRequestData.reason ?? null,
      rejectionReason: ewaRequestData.rejectionReason ?? null
    };
    this.ewaRequests.set(id, ewaRequest);
    return ewaRequest;
  }
  
  async updateEwaRequest(id: number, ewaRequestData: Partial<EwaRequest>): Promise<EwaRequest | undefined> {
    const ewaRequest = await this.getEwaRequest(id);
    if (!ewaRequest) return undefined;
    
    const updatedEwaRequest = { ...ewaRequest, ...ewaRequestData };
    this.ewaRequests.set(id, updatedEwaRequest);
    return updatedEwaRequest;
  }

  // Wallet operations
  async getWallet(): Promise<Wallet | undefined> {
    // Return the first wallet (we only have one for the company)
    return this.wallets.get(1);
  }
  
  async createWallet(walletData: InsertWallet): Promise<Wallet> {
    const id = this.currentWalletId++;
    const wallet: Wallet = {
      id,
      employerBalance: walletData.employerBalance ?? "0",
      jahaziiBalance: walletData.jahaziiBalance ?? "0",
      perEmployeeCap: walletData.perEmployeeCap ?? "3000",
      updatedAt: new Date()
    };
    this.wallets.set(id, wallet);
    return wallet;
  }
  
  async updateWallet(id: number, walletData: Partial<Wallet>): Promise<Wallet | undefined> {
    const wallet = await this.getWallet();
    if (!wallet) return undefined;
    
    const updatedWallet = { 
      ...wallet, 
      ...walletData,
      updatedAt: new Date()
    };
    this.wallets.set(id, updatedWallet);
    return updatedWallet;
  }

  // Wallet transaction operations
  async getWalletTransaction(id: number): Promise<WalletTransaction | undefined> {
    return this.walletTransactions.get(id);
  }
  
  async getWalletTransactions(): Promise<WalletTransaction[]> {
    return Array.from(this.walletTransactions.values());
  }
  
  async createWalletTransaction(transactionData: InsertWalletTransaction): Promise<WalletTransaction> {
    const id = this.currentWalletTransactionId++;
    const transaction: WalletTransaction = { 
      id,
      walletId: transactionData.walletId,
      amount: transactionData.amount,
      transactionType: transactionData.transactionType,
      fundingSource: transactionData.fundingSource,
      status: transactionData.status ?? "completed",
      description: transactionData.description ?? null,
      transactionDate: new Date(),
      referenceId: transactionData.referenceId ?? null
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
    return this.getOtpCode(code);
  }
  
  async getOtpCodesForEmployee(employeeId: number): Promise<OtpCode[]> {
    return Array.from(this.otpCodes.values()).filter(
      (otpCode) => otpCode.employeeId === employeeId
    );
  }
  
  async createOtpCode(otpCodeData: InsertOtpCode): Promise<OtpCode> {
    const id = this.currentOtpCodeId++;
    const otpCode: OtpCode = { 
      id,
      employeeId: otpCodeData.employeeId,
      code: otpCodeData.code,
      expiresAt: otpCodeData.expiresAt,
      createdAt: new Date(),
      used: otpCodeData.used ?? false
    };
    this.otpCodes.set(id, otpCode);
    return otpCode;
  }
  
  async updateOtpCode(id: number, otpCodeData: Partial<OtpCode>): Promise<OtpCode | undefined> {
    // First find the OTP code by ID
    const existingOtpCode = Array.from(this.otpCodes.values()).find(otp => otp.id === id);
    if (!existingOtpCode) return undefined;
    
    const updatedOtpCode = { ...existingOtpCode, ...otpCodeData };
    this.otpCodes.set(id, updatedOtpCode);
    return updatedOtpCode;
  }

  async deleteTodayAttendance(): Promise<void> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    try {
      // Find and remove today's attendance records from in-memory storage
      const todayRecordIds: number[] = [];
      
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
}

export const storage = new MemStorage();
