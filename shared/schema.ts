import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("employee"), // employee, supervisor, hr, admin
  profileImage: text("profile_image"),
  departmentId: integer("department_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Department model
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

// Employee model
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeNumber: text("employee_number").notNull().unique(),
  userId: integer("user_id").notNull(),
  departmentId: integer("department_id").notNull(),
  position: text("position").notNull(),
  status: text("status").notNull().default("active"), // active, inactive
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  phoneNumber: text("phone_number"),
  startDate: timestamp("start_date").notNull(),
  emergencyContact: text("emergency_contact"),
  address: text("address"),
  active: boolean("active").default(true),
});

// Attendance record model
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  clockInTime: timestamp("clock_in_time"),
  clockOutTime: timestamp("clock_out_time"),
  date: timestamp("date").defaultNow(),
  status: text("status").notNull(), // present, absent, late, leave
  hoursWorked: decimal("hours_worked", { precision: 10, scale: 2 }).default("0"),
  geoLocation: json("geo_location"),
  approvedBy: integer("approved_by"),
  notes: text("notes"),
});

// Payroll model
export const payroll = pgTable("payroll", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 10, scale: 2 }).notNull(),
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(),
  ewaDeductions: decimal("ewa_deductions", { precision: 10, scale: 2 }).default("0"),
  taxDeductions: decimal("tax_deductions", { precision: 10, scale: 2 }).default("0"),
  otherDeductions: decimal("other_deductions", { precision: 10, scale: 2 }).default("0"),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // draft, processed, paid
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
});

// EWA (Earned Wage Access) model
export const ewaRequests = pgTable("ewa_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  requestDate: timestamp("request_date").defaultNow(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, disbursed
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }).default("0"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  disbursedAt: timestamp("disbursed_at"),
  reason: text("reason"),
  rejectionReason: text("rejection_reason"),
});

// Company wallet model
export const wallet = pgTable("wallet", {
  id: serial("id").primaryKey(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet transaction model
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  transactionType: text("transaction_type").notNull(), // topup, withdrawal, ewa_disbursement
  description: text("description"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  referenceId: text("reference_id"),
  status: text("status").notNull().default("completed"), // pending, completed, failed
});

// OTP codes for self-log
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  used: boolean("used").default(false),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true });
export const insertPayrollSchema = createInsertSchema(payroll).omit({ id: true, processedAt: true });
export const insertEwaRequestSchema = createInsertSchema(ewaRequests).omit({ 
  id: true, 
  requestDate: true, 
  approvedAt: true, 
  disbursedAt: true 
});
export const insertWalletSchema = createInsertSchema(wallet).omit({ id: true, updatedAt: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ 
  id: true, 
  transactionDate: true 
});
export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({ 
  id: true, 
  createdAt: true 
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type Payroll = typeof payroll.$inferSelect;
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;

export type EwaRequest = typeof ewaRequests.$inferSelect;
export type InsertEwaRequest = z.infer<typeof insertEwaRequestSchema>;

export type Wallet = typeof wallet.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;

// User with extra info for frontend
export type UserWithRole = User & {
  role: 'employee' | 'supervisor' | 'hr' | 'admin';
};

// Employee with department and user info
export type EmployeeWithDetails = Employee & {
  user: User;
  department: Department;
};
