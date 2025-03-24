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
  updateAttendance(id: number, attendance: Partial<Attendance>): Promise<Attendance | undefined>;
  
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
    
    // Initialize with some data
    this.initializeData();
  }
  
  private initializeData() {
    // Add some departments
    const departments = [
      { name: "IT", description: "Information Technology Department" },
      { name: "HR", description: "Human Resources Department" },
      { name: "Finance", description: "Finance and Accounting Department" },
      { name: "Marketing", description: "Marketing and Sales Department" },
      { name: "Operations", description: "Operations Department" }
    ];
    
    departments.forEach(dept => this.createDepartment(dept));
    
    // Create an admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      email: "admin@jahazii.io",
      name: "Admin User",
      role: "admin",
      profileImage: "https://ui-avatars.com/api/?name=Admin+User",
      departmentId: 1
    });
    
    // Create HR manager
    this.createUser({
      username: "hrmanager",
      password: "hr123",
      email: "hr@jahazii.io",
      name: "Sophia Wanjiku",
      role: "hr",
      profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      departmentId: 2
    });
    
    // Create a wallet with dual funding sources
    this.createWallet({
      employerBalance: 250000,
      jahaziiBalance: 100000,
      perEmployeeCap: 3000
    });
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
    const user: User = { ...insertUser, id, createdAt: new Date() };
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
    const department: Department = { ...departmentData, id };
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
    const employee: Employee = { ...employeeData, id };
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
    return Array.from(this.attendance.values()).filter(
      (attendance) => {
        const attendanceDate = new Date(attendance.date);
        return (
          attendanceDate.getFullYear() === date.getFullYear() &&
          attendanceDate.getMonth() === date.getMonth() &&
          attendanceDate.getDate() === date.getDate()
        );
      }
    );
  }
  
  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const id = this.currentAttendanceId++;
    const attendance: Attendance = { ...attendanceData, id };
    this.attendance.set(id, attendance);
    return attendance;
  }
  
  async updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> {
    const attendance = await this.getAttendance(id);
    if (!attendance) return undefined;
    
    const updatedAttendance = { ...attendance, ...attendanceData };
    this.attendance.set(id, updatedAttendance);
    return updatedAttendance;
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
        return periodStart >= startDate && periodStart <= endDate;
      }
    );
  }
  
  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const id = this.currentPayrollId++;
    const payroll: Payroll = { ...payrollData, id, processedAt: null };
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
      ...ewaRequestData, 
      id, 
      requestDate: new Date(),
      approvedAt: null,
      disbursedAt: null
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
    const wallet: Wallet = { ...walletData, id, updatedAt: new Date() };
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
      ...transactionData, 
      id, 
      transactionDate: new Date()
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
  
  async getOtpCodesForEmployee(employeeId: number): Promise<OtpCode[]> {
    return Array.from(this.otpCodes.values()).filter(
      (otpCode) => otpCode.employeeId === employeeId
    );
  }
  
  async createOtpCode(otpCodeData: InsertOtpCode): Promise<OtpCode> {
    const id = this.currentOtpCodeId++;
    const otpCode: OtpCode = { 
      ...otpCodeData, 
      id, 
      createdAt: new Date()
    };
    this.otpCodes.set(id, otpCode);
    return otpCode;
  }
  
  async updateOtpCode(id: number, otpCodeData: Partial<OtpCode>): Promise<OtpCode | undefined> {
    const otpCode = await this.getOtpCode(id.toString());
    if (!otpCode) return undefined;
    
    const updatedOtpCode = { ...otpCode, ...otpCodeData };
    this.otpCodes.set(id, updatedOtpCode);
    return updatedOtpCode;
  }
}

export const storage = new MemStorage();
