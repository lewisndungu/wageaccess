export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  profileImage?: string;
  departmentId?: string;
  created_at: Date;
  modified_at: Date;
}

// Department model
export interface Department {
  id: string;
  name: string;
  description?: string;
}

// Employee model
export interface Employee extends User {
  id: string;
  employeeNumber: string;
  userId: string;
  departmentId: string;
  surname: string;
  other_names: string;
  id_no: string;
  tax_pin?: string;
  sex: string;
  position: string;
  status: string;
  is_on_probation: boolean;
  role: string;
  gross_income: number;
  net_income: number;
  total_deductions: number;
  loan_deductions: number;
  employer_advances: number;
  total_loan_deductions: number;
  statutory_deductions: any;
  max_salary_advance_limit: number;
  available_salary_advance_limit: number;
  last_withdrawal_time?: Date;
  contact: {
    email: string;
    phoneNumber: string;
  };
  address?: string;
  bank_info: any;
  id_confirmed: boolean;
  mobile_confirmed: boolean;
  tax_pin_verified: boolean;
  country: string;
  documents: any;
  crb_reports: any;
  avatar_url?: string;
  created_at: Date;
  modified_at: Date;
  hourlyRate?: number;
  phoneNumber?: string;
  startDate?: Date;
  emergencyContact: any;
  active: boolean;
  department?: Department;
}

// Attendance record model
export interface Attendance {
  id: string;
  employeeId: string;
  clockInTime?: Date;
  clockOutTime?: Date;
  date?: Date;
  status: string;
  hoursWorked?: number;
  geoLocation: any;
  approvedBy?: string;
  notes?: string;
  employee?: Employee;
}

// Payroll model
export interface Payroll {
  id: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  hoursWorked: number;
  grossPay: number;
  ewaDeductions?: number;
  taxDeductions?: number;
  otherDeductions?: number;
  netPay: number;
  status: string;
  processedAt?: Date;
  processedBy?: string;
  employee?: Employee;
}

// EWA (Earned Wage Access) model
export interface EwaRequest {
  id: string;
  employeeId: string;
  requestDate: Date;
  amount: number;
  status: string;
  processingFee?: number;
  approvedBy?: string;
  approvedAt?: Date;
  disbursedAt?: Date;
  reason?: string;
  rejectionReason?: string;
  employee?: Employee;
}

// Company wallet model
export interface Wallet {
  id: string;
  employerBalance: number;
  jahaziiBalance: number;
  perEmployeeCap: number;
  updatedAt: Date;
}

// Wallet transaction model
export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  transactionType: string;
  description?: string;
  transactionDate: Date;
  referenceId: string;
  fundingSource: string;
  status: string;
}

// OTP codes for self-log
export interface OtpCode {
  id: string;
  employeeId: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
}

// User with extra info for frontend
export type UserWithRole = User & {
  role: "employee" | "supervisor" | "hr" | "admin";
};

// Employee with department and user info
export type EmployeeWithDetails = Employee & {
  user: User;
  department: Department;
};

// Export types
export type InsertUser = Partial<User>;

export type InsertDepartment = Partial<Department>;

export type InsertEmployee = Partial<Employee>;

export type InsertAttendance = Partial<Attendance>;

export type InsertPayroll = Partial<Payroll>;

export type InsertEwaRequest = Partial<EwaRequest>;

export type InsertWallet = Partial<Wallet>;

export type InsertWalletTransaction = Partial<WalletTransaction>;

export type InsertOtpCode = Partial<OtpCode>;
