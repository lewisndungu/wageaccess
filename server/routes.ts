import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, saveCommand, saveSearch } from "./storage";
import { z } from "zod";
import { 
  User, 
  Employee, 
  Department, 
  EmployeeWithDetails,
  Payroll,
  EwaRequest,
  Wallet,
  WalletTransaction,
  InsertWalletTransaction,
  OtpCode,
  Attendance,
  InsertAttendance,
  InsertEmployee,
  InsertPayroll,
  InsertEwaRequest,
  InsertUser
} from "@shared/schema";
import { faker } from '@faker-js/faker';
import { generateEmptyAttendance } from './mock-data-generator';
import { subDays, addDays, formatISO, startOfMonth, endOfMonth, parseISO, startOfDay, getTime, addSeconds, isSameDay, differenceInHours, differenceInMinutes } from 'date-fns';
import { chatService } from './index';
import multer from 'multer';
import * as XLSX from 'xlsx';

// Create validation schemas using zod
const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  role: z.string(),
  profileImage: z.string().optional(),
  departmentId: z.string().optional()
});

const insertEmployeeSchema = z.object({
  userId: z.string(),
  employeeNumber: z.string(),
  departmentId: z.string(),
  surname: z.string(),
  other_names: z.string(),
  id_no: z.string(),
  sex: z.string(),
  position: z.string(),
  status: z.string().default("active"),
  is_on_probation: z.boolean().default(false),
  role: z.string().default("employee"),
  gross_income: z.number().or(z.string()),
  net_income: z.number().or(z.string()),
  active: z.boolean().default(true)
});

const insertAttendanceSchema = z.object({
  employeeId: z.string(),
  date: z.date().optional(),
  clockInTime: z.date().optional(),
  clockOutTime: z.date().optional(),
  status: z.string(),
  hoursWorked: z.number().or(z.string()).optional(),
  notes: z.string().optional()
});

const insertPayrollSchema = z.object({
  employeeId: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  hoursWorked: z.number().or(z.string()),
  grossPay: z.number().or(z.string()),
  netPay: z.number().or(z.string()),
  status: z.string().default("pending")
});

const insertEwaRequestSchema = z.object({
  employeeId: z.string(),
  amount: z.number().or(z.string()),
  reason: z.string().optional(),
  status: z.string().default("pending")
});

// Configure multer for file uploads
const multerStorage = multer.memoryStorage();
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Increased to 50MB limit
  }
});

// Helper to validate request body
function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: Function) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

// Determine attendance status based on clock-in time (reusable helper function)
function determineAttendanceStatus(clockInTime: Date, scheduledStartTimeMinutes: number, lateWindowMinutes: number): string {
  const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
  
  if (clockInMinutes <= scheduledStartTimeMinutes + lateWindowMinutes) {
    return 'present'; // Within grace period (e.g., 9:00 AM - 9:15 AM)
  } else {
    return 'late'; // After grace period (e.g., after 9:15 AM)
  }
}

// Utility functions to get data that might not be directly in the interface
function getEmployeeName(employee: any): string {
  // Try to get the name in various ways to handle different data structures
  if (employee?.name) return employee.name;
  if (employee?.user?.name) return employee.user.name;
  if (employee?.surname && employee?.other_names) {
    return `${employee.other_names} ${employee.surname}`;
  }
  return 'Unknown Employee';
}

function getDepartmentName(employee: any): string {
  // Try to get the department name in various ways
  if (employee?.department?.name) return employee.department.name;
  return 'Unknown Department';
}

// Helper function to transform employee data
async function transformEmployeeData(employee: any): Promise<Employee> {
  // Get user details
  const user = await storage.getUser(ensureStringId(employee.userId));
  
  // Get department details
  const department = await storage.getDepartment(ensureStringId(employee.departmentId));
  
  // Helper function to ensure string type for IDs
  const ensureString = (value: any): string => {
    if (typeof value === 'number') {
      return value.toString();
    }
    return value || '';
  };
  
  // Helper function to convert string or number to number
  const toNumber = (value: any): number => {
    if (typeof value === 'string') {
      return parseFloat(value) || 0;
    }
    return typeof value === 'number' ? value : 0;
  };
  
  // Create department data that matches the Department interface
  const departmentData: Department = {
    id: ensureString(department?.id || ''),
    name: department?.name || 'Unknown Department',
    description: department?.description
  };
  
  // Create a complete enhanced employee object
  const transformedEmployee: Employee = {
    // User properties (Employee extends User)
    id: ensureString(employee.id),
    username: user?.username || employee.username || '',
    password: user?.password || employee.password || '',
    role: employee.role || 'employee',
    profileImage: employee.profileImage || user?.profileImage,
    departmentId: ensureString(employee.departmentId),
    created_at: employee.created_at || new Date(),
    modified_at: employee.modified_at || new Date(),
    
    // Employee specific properties
    employeeNumber: ensureString(employee.employeeNumber),
    surname: employee.surname || '',
    other_names: employee.other_names || '',
    id_no: employee.id_no || '',
    tax_pin: employee.tax_pin,
    sex: employee.sex || '',
    position: employee.position || '',
    status: employee.status || 'active',
    is_on_probation: employee.is_on_probation === true,
    gross_income: toNumber(employee.gross_income),
    net_income: toNumber(employee.net_income),
    total_deductions: toNumber(employee.total_deductions),
    loan_deductions: toNumber(employee.loan_deductions),
    employer_advances: toNumber(employee.employer_advances), 
    total_loan_deductions: toNumber(employee.total_loan_deductions),
    statutory_deductions: employee.statutory_deductions || {
      nhif: 0,
      nssf: 0,
      paye: 0,
      levies: 0
    },
    max_salary_advance_limit: toNumber(employee.max_salary_advance_limit),
    available_salary_advance_limit: toNumber(employee.available_salary_advance_limit),
    last_withdrawal_time: employee.last_withdrawal_time,
    contact: {
      email: employee.contact?.email || '',
      phoneNumber: employee.contact?.phoneNumber || ''
    },
    address: employee.address,
    bank_info: employee.bank_info || {},
    id_confirmed: employee.id_confirmed === true,
    mobile_confirmed: employee.mobile_confirmed === true,
    tax_pin_verified: employee.tax_pin_verified === true,
    country: employee.country || 'KE',
    documents: employee.documents || [],
    crb_reports: employee.crb_reports || [],
    avatar_url: employee.avatar_url,
    hourlyRate: toNumber(employee.hourlyRate),
    startDate: employee.startDate,
    emergencyContact: employee.emergencyContact || {},
    active: employee.active === true,
    department: departmentData
  };
  
  return transformedEmployee;
}

// Helper function to transform attendance records to match the schema
function transformAttendanceRecord(record: any, employee?: any): Attendance {
  // Convert hoursWorked to number if it's a string
  const hoursWorked = typeof record.hoursWorked === 'string' 
    ? parseFloat(record.hoursWorked) 
    : record.hoursWorked;
  
  return {
    id: record.id,
    employeeId: record.employeeId,
    clockInTime: record.clockInTime || undefined,
    clockOutTime: record.clockOutTime || undefined,
    date: record.date || undefined,
    status: record.status || 'absent',
    hoursWorked: hoursWorked !== undefined ? hoursWorked : undefined,
    geoLocation: record.geoLocation || null,
    approvedBy: record.approvedBy || undefined,
    notes: record.notes || undefined,
    employee: employee || undefined
  };
}

// Helper function to transform EWA requests to match the schema
function transformEwaRequest(request: any, employee?: any): EwaRequest {
  // Convert amount to number if it's a string
  const amount = typeof request.amount === 'string' 
    ? parseFloat(request.amount) 
    : request.amount;
  
  // Convert processingFee to number if it's a string
  const processingFee = typeof request.processingFee === 'string' 
    ? parseFloat(request.processingFee) 
    : request.processingFee;
  
  return {
    id: request.id,
    employeeId: request.employeeId,
    requestDate: request.requestDate || new Date(),
    amount: amount || 0,
    status: request.status || 'pending',
    processingFee: processingFee,
    approvedBy: request.approvedBy || undefined,
    approvedAt: request.approvedAt || undefined,
    disbursedAt: request.disbursedAt || undefined,
    reason: request.reason || undefined,
    rejectionReason: request.rejectionReason || undefined,
    employee: employee || undefined
  };
}

// Helper function to transform payroll records to match the schema
function transformPayrollRecord(record: any, employee?: any): Payroll {
  // Convert numeric fields to numbers if they're strings
  const hoursWorked = typeof record.hoursWorked === 'string' 
    ? parseFloat(record.hoursWorked) 
    : record.hoursWorked || 0;
  
  const grossPay = typeof record.grossPay === 'string' 
    ? parseFloat(record.grossPay) 
    : record.grossPay || 0;
  
  const netPay = typeof record.netPay === 'string' 
    ? parseFloat(record.netPay) 
    : record.netPay || 0;
  
  const ewaDeductions = typeof record.ewaDeductions === 'string' 
    ? parseFloat(record.ewaDeductions) 
    : record.ewaDeductions;
  
  const taxDeductions = typeof record.taxDeductions === 'string' 
    ? parseFloat(record.taxDeductions) 
    : record.taxDeductions;
  
  const otherDeductions = typeof record.otherDeductions === 'string' 
    ? parseFloat(record.otherDeductions) 
    : record.otherDeductions;
  
  return {
    id: record.id,
    employeeId: record.employeeId,
    periodStart: record.periodStart || new Date(),
    periodEnd: record.periodEnd || new Date(),
    hoursWorked: hoursWorked,
    grossPay: grossPay,
    netPay: netPay,
    ewaDeductions: ewaDeductions,
    taxDeductions: taxDeductions,
    otherDeductions: otherDeductions,
    status: record.status || 'pending',
    processedAt: record.processedAt || undefined,
    processedBy: record.processedBy || undefined,
    employee: employee || undefined
  };
}

// Helper function to format currency values
function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return numValue.toFixed(2);
}

// Helper function to format date values
function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString();
}

// Helper to ensure ID is string
function ensureStringId(id: string | number): string {
  return typeof id === 'number' ? id.toString() : id;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    const user = await storage.getUserByUsername(username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ user: userWithoutPassword });
  });
  
  // User routes
  app.get("/api/users/current", async (req, res) => {
    // In a real app, get user from session
    const user = await storage.getUserByUsername("hrmanager");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  });
  
  // Department routes
  app.get("/api/departments", async (_req, res) => {
    const departments = await storage.getAllDepartments();
    return res.status(200).json(departments);
  });
  
  // Employee routes
  app.get("/api/employees", async (_req, res) => {
    const employees = await storage.getAllEmployees();
    
    // Transform the employee data using our helper function
    const transformedEmployees = await Promise.all(employees.map(transformEmployeeData));
    
    return res.status(200).json(transformedEmployees);
  });
  
  app.get("/api/employees/active", async (_req, res) => {
    console.log("GET /api/employees/active endpoint called");
    const employees = await storage.getAllActiveEmployees();
    console.log(`/api/employees/active: Got ${employees.length} active employees from storage`);
    
    // Transform the employee data using our helper function
    const transformedEmployees = await Promise.all(employees.map(transformEmployeeData));
    console.log(`/api/employees/active: Transformed ${transformedEmployees.length} employees`);
    
    // Log some examples of employees to debug
    if (transformedEmployees.length > 0) {
      console.log(`First active employee example:`, {
        id: transformedEmployees[0].id,
        name: transformedEmployees[0].other_names + ' ' + transformedEmployees[0].surname,
        employeeNumber: transformedEmployees[0].employeeNumber,
        active: transformedEmployees[0].active
      });
    }
    
    return res.status(200).json(transformedEmployees);
  });
  
  app.get("/api/employees/inactive", async (_req, res) => {
    const employees = await storage.getAllInactiveEmployees();
    
    // Transform the employee data using our helper function
    const transformedEmployees = await Promise.all(employees.map(transformEmployeeData));
    
    return res.status(200).json(transformedEmployees);
  });
  
  app.get("/api/employees/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      console.log(`GET /api/employees/${id} - Looking up employee with ID: ${id}`);
      
      // First try to get the employee directly
      const employee = await storage.getEmployee(id);
      
      if (!employee) {
        console.log(`Employee with ID ${id} not found in direct lookup`);
        
        // If direct lookup fails, try to get with employee details (which also calls getEmployee)
        const employeeWithDetails = await storage.getEmployeeWithDetails(id);
        
        if (!employeeWithDetails) {
          console.log(`Employee with ID ${id} also not found with getEmployeeWithDetails`);
          
          // Log all employee IDs to help debug
          const allEmployees = await storage.getAllEmployees();
          console.log(`Available employee IDs: ${allEmployees.slice(0, 5).map(e => e.id).join(', ')}... (total: ${allEmployees.length})`);
          
          return res.status(404).json({ message: "Employee not found" });
        }
        
        const Employee = await transformEmployeeData(employeeWithDetails);
        console.log(`Employee found with getEmployeeWithDetails: ${Employee.id}`);
        return res.status(200).json(Employee);
      }
      
      // If direct lookup succeeded, continue as before
      const employeeWithDetails = await storage.getEmployeeWithDetails(id);
      
      if (!employeeWithDetails) {
        console.log(`Found employee directly but couldn't get details for ID ${id}`);
        return res.status(500).json({ message: "Failed to fetch employee details" });
      }
      
      const Employee = await transformEmployeeData(employeeWithDetails);
      console.log(`Employee found and returned: ${Employee.id}`);
      return res.status(200).json(Employee);
    } catch (error) {
      console.error('Error fetching employee:', error);
      return res.status(500).json({ 
        message: "Failed to fetch employee", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/employees", validateBody(insertEmployeeSchema), async (req, res) => {
    try {
      const employee = await storage.createEmployee(req.body);
      return res.status(201).json(employee);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create employee" });
    }
  });
  
  app.put("/api/employees/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      const employee = await storage.updateEmployee(id, req.body);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      return res.status(200).json(employee);
    } catch (error) {
      console.error('Error updating employee:', error);
      return res.status(500).json({ 
        message: "Failed to update employee", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Attendance routes
  app.get("/api/attendance", async (req, res) => {
    const { startDate, endDate } = req.query;
    
    console.log("GET /api/attendance called with query params:", req.query);
    
    try {
      let attendance: Attendance[];
      
      // If date range is provided, filter by date range
      if (startDate && endDate) {
        console.log(`Fetching all attendance from ${startDate} to ${endDate}`);
        
        // Validate dates
        const parsedStartDate = parseISO(startDate as string);
        const parsedEndDate = parseISO(endDate as string);
        
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          throw new Error(`Invalid date format: startDate=${startDate}, endDate=${endDate}`);
        }
        
        attendance = await storage.getAllAttendanceByDateRange(parsedStartDate, parsedEndDate);
      } else {
        // Get all attendance records
        console.log("Fetching all attendance records without date filtering");
        attendance = await storage.getAllAttendance();
        console.log(`Retrieved ${attendance.length} raw attendance records from storage`);
      }
      
      // Transform the records to ensure they match the schema
      console.log("Transforming records to match schema...");
      const transformedRecords = await Promise.all(
        attendance.map(async (record: Attendance) => {
          const employee = await storage.getEmployeeWithDetails(record.employeeId);
          return transformAttendanceRecord(record, employee);
        })
      );
      
      console.log(`Transformed ${transformedRecords.length} attendance records`);
      
      return res.status(200).json(transformedRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return res.status(500).json({ 
        message: "Internal server error", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/employees/:id/attendance", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      let attendanceRecords;
      
      const { startDate, endDate } = req.query;
      
      if (startDate && endDate) {
        const parsedStartDate = new Date(startDate as string);
        const parsedEndDate = new Date(endDate as string);
        
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
        
        attendanceRecords = await storage.getAttendanceByEmployeeAndDateRange(
          id,
          parsedStartDate,
          parsedEndDate
        );
      } else {
        attendanceRecords = await storage.getAttendanceForEmployee(id);
      }
      
      const employee = await storage.getEmployeeWithDetails(id);
      
      // Transform attendance records
      const transformedRecords = attendanceRecords.map(record => 
        transformAttendanceRecord(record, employee)
      );
      
      // Return attendance records with schema-compliant structure
      return res.status(200).json(transformedRecords);
    } catch (error) {
      console.error(`Error fetching attendance:`, error);
      return res.status(500).json({ 
        message: "Failed to fetch attendance records", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Automatic absence detection - mark employees who haven't clocked in as absent
  app.post("/api/attendance/process-absences", async (req, res) => {
    try {
      const { date } = req.body;
      const targetDate = date ? new Date(date) : new Date();
      
      // Normalize the date to start of day
      const normalizedDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      );
      
      // 1. Get all active employees
      const activeEmployees = await storage.getAllActiveEmployees();
      
      // 2. Get all attendance records for the specified date
      const attendanceRecords = await storage.getAttendanceForDate(normalizedDate);
      
      // 3. Find employees without attendance records for today
      const presentEmployeeIds = new Set(attendanceRecords.map(record => record.employeeId));
      const absentEmployees = activeEmployees.filter(emp => !presentEmployeeIds.has(emp.id));
      
      // 4. Create absence records for these employees
      const cutoffTime = new Date(
        normalizedDate.getFullYear(),
        normalizedDate.getMonth(),
        normalizedDate.getDate(),
        17, 0, 0 // 5:00 PM - End of workday
      );
      
      const absenceRecords = [];
      
      for (const employee of absentEmployees) {
        // Create attendance record with 'absent' status
        const absenceRecord = await storage.createAttendance({
          employeeId: employee.id,
          date: normalizedDate,
          clockInTime: undefined, // Changed from null to undefined
          clockOutTime: undefined, // Changed from null to undefined
          status: 'absent',
          hoursWorked: 0, // Changed from string "0" to number 0
          geoLocation: null,
          approvedBy: undefined, // Changed from null to undefined
          notes: 'Automatically marked as absent'
        });
        
        absenceRecords.push(absenceRecord);
      }
      
      return res.status(200).json({ 
        processed: absentEmployees.length,
        message: `Processed ${absentEmployees.length} absences for ${normalizedDate.toDateString()}`,
        absenceRecords
      });
    } catch (error) {
      console.error("Error processing absences:", error);
      return res.status(500).json({ 
        message: "Failed to process absences",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Recent attendance events for real-time updates
  app.get("/api/attendance/recent-events", async (_req, res) => {
    const date = new Date();
    const attendanceRecords = await storage.getAttendanceForDate(date);
    
    // Format into a more user-friendly structure
    const events = await Promise.all(
      attendanceRecords.map(async (record) => {
        const employeeWithDetails = await storage.getEmployeeWithDetails(record.employeeId);
        if (!employeeWithDetails) {
          return null;
        }

        // Determine the most recent event (clock in or out)
        let event = 'Clock In';
        let time = record.clockInTime;
        
        if (record.clockOutTime) {
          const clockInTime = record.clockInTime ? new Date(record.clockInTime).getTime() : 0;
          const clockOutTime = new Date(record.clockOutTime).getTime();
          
          if (clockOutTime > clockInTime) {
            event = 'Clock Out';
            time = record.clockOutTime;
          }
        }

        return {
          id: record.id,
          employeeId: record.employeeId,
          employeeName: employeeWithDetails.other_names + ' ' + employeeWithDetails.surname,
          employeeAvatar: employeeWithDetails?.profileImage,
          department: employeeWithDetails?.department?.name || employeeWithDetails?.role || 'Unknown Department',
          event,
          time,
          status: record.status,
          clockInTime: record.clockInTime,
          clockOutTime: record.clockOutTime,
          hoursWorked: record.hoursWorked
        };
      })
    );

    // Filter out null values and sort by most recent
    const validEvents = events
      .filter((event): event is NonNullable<typeof event> => event !== null)
      .sort((a, b) => {
        const timeA = new Date(a.time || 0).getTime();
        const timeB = new Date(b.time || 0).getTime();
        return timeB - timeA;
      });
    
    return res.status(200).json(validEvents);
  });
  
  // QR Code generation endpoint for attendance
  app.post("/api/attendance/generate-qr", async (req, res) => {
    try {
      const { companyId, timestamp, location, expiresIn } = req.body;
      
      if (!companyId || !timestamp || !expiresIn) {
        return res.status(400).json({
          message: "Missing required fields: companyId, timestamp, and expiresIn are required"
        });
      }
      
      // Generate QR code data
      const qrData = {
        companyId,
        timestamp,
        location: location || null,
        exp: formatISO(addSeconds(new Date(timestamp), expiresIn))
      };
      
      // Calculate expiration time
      const expiresAt = formatISO(addSeconds(new Date(timestamp), expiresIn));
      
      return res.status(200).json({
        data: qrData,
        expiresAt,
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      return res.status(500).json({
        message: "Failed to generate QR code",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Placeholder endpoint to serve a dummy QR code image
  app.get("/api/qr-placeholder", (req, res) => {
    // Create a simple SVG QR code placeholder
    const svgQrCode = `
      <svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">
        <rect width="250" height="250" fill="white" />
        <rect x="50" y="50" width="150" height="150" fill="black" />
        <rect x="70" y="70" width="110" height="110" fill="white" />
        <rect x="90" y="90" width="70" height="70" fill="black" />
        <text x="125" y="135" font-family="Arial" font-size="12" text-anchor="middle" fill="white">QR CODE</text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgQrCode);
  });
  
  app.post("/api/attendance", validateBody(insertAttendanceSchema), async (req, res) => {
    try {
      // Handle the hoursWorked conversion (string to number)
      let attendanceData = { ...req.body };
      if (typeof attendanceData.hoursWorked === 'string') {
        attendanceData.hoursWorked = parseFloat(attendanceData.hoursWorked);
      }
      
      const attendance = await storage.createAttendance(attendanceData);
      
      // Transform to ensure schema compliance
      const transformedAttendance = transformAttendanceRecord(attendance);
      
      return res.status(201).json(transformedAttendance);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create attendance record" });
    }
  });
  
  // Update an attendance record
  app.put("/api/attendance/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      
      // Handle the hoursWorked conversion (string to number)
      let attendanceData = { ...req.body };
      if (typeof attendanceData.hoursWorked === 'string') {
        attendanceData.hoursWorked = parseFloat(attendanceData.hoursWorked);
      }
      
      const attendance = await storage.updateAttendance(id, attendanceData);
      
      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      // Transform to ensure schema compliance
      const transformedAttendance = transformAttendanceRecord(attendance);
      
      return res.status(200).json(transformedAttendance);
    } catch (error) {
      console.error('Error updating attendance:', error);
      return res.status(500).json({ message: "Failed to update attendance", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  
  // Delete an attendance record
  app.delete("/api/attendance/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      const deleted = await storage.deleteAttendance(id);
      
      if (deleted) {
        return res.status(200).json({ message: "Attendance record deleted successfully" });
      } else {
        return res.status(404).json({ message: "Attendance record not found" });
      }
    } catch (error) {
      console.error('Error deleting attendance:', error);
      return res.status(500).json({ 
        message: "Failed to delete attendance", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get all attendance records
  app.get("/api/attendance/all-records", async (req, res) => {
    try {
      // Get all attendance records
      const allRecords = await storage.getAllAttendance();
      
      // Return all records
      return res.status(200).json(allRecords);
    } catch (error) {
      console.error("Error fetching all attendance records:", error);
      return res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });
  
  // Attendance statistics endpoint
  app.get("/api/attendance/stats", async (req, res) => {
    try {
      // Get query parameters with defaults
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      
      // Set default dates if not provided (last 30 days)
      const endDate = endDateParam ? new Date(endDateParam) : new Date();
      const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate);
      if (!startDateParam) {
        startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
      }
      
      // Get all attendance records within date range
      const attendanceRecords = await storage.getAllAttendanceByDateRange(startDate, endDate);
      
      // Get all active employees
      const activeEmployees = await storage.getAllActiveEmployees();
      
      // Calculate statistics
      const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const workdaysCount = countWorkdays(startDate, endDate);
      
      // Count clockIns and clockOuts
      let totalClockIns = 0;
      let totalClockOuts = 0;
      let clockInTimes: Date[] = [];
      
      for (const record of attendanceRecords) {
        if (record.clockInTime) {
          totalClockIns++;
          clockInTimes.push(new Date(record.clockInTime));
        }
        if (record.clockOutTime) {
          totalClockOuts++;
        }
      }
      
      // Calculate average clock-in time
      let averageClockInTime = "--:--";
      if (clockInTimes.length > 0) {
        let totalMinutes = 0;
        for (const time of clockInTimes) {
          totalMinutes += time.getHours() * 60 + time.getMinutes();
        }
        const avgMinutes = Math.round(totalMinutes / clockInTimes.length);
        const hours = Math.floor(avgMinutes / 60);
        const minutes = avgMinutes % 60;
        averageClockInTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      // Count unique employees who clocked in
      const uniqueEmployees = new Set(attendanceRecords.map(record => record.employeeId)).size;
      
      // Count today's attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = attendanceRecords.filter(record => {
        const recordDate = record.date ? new Date(record.date) : undefined;
        if (!recordDate) return false;
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      }).length;
      
      // Calculate absence count
      // This is an approximation: total expected attendance minus actual attendance
      const expectedAttendance = activeEmployees.length * workdaysCount;
      const actualAttendance = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const absenceCount = Math.max(0, expectedAttendance - actualAttendance);
      
      // Create response matching TestStats interface
      const response = {
        totalClockIns,
        totalClockOuts,
        averageClockInTime,
        uniqueEmployees,
        todayCount,
        absenceCount
      };
      
      // Also include the original dashboard stats for the AttendanceDashboard component
      const statusCounts: { 
        present: number; 
        late: number; 
        absent: number; 
        leave: number; 
        total: number;
        [key: string]: number; 
      } = {
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        total: 0
      };
      
      // Calculate attendance by status
      for (const record of attendanceRecords) {
        if (record.status) {
          statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
          statusCounts.total += 1;
        }
      }
      
      // Calculate daily averages
      const averageDailyAttendance = activeEmployees.length > 0 
        ? Math.round((statusCounts.present + statusCounts.late) / workdaysCount)
        : 0;
      
      const averageAttendanceRate = activeEmployees.length > 0 && workdaysCount > 0
        ? ((statusCounts.present + statusCounts.late) / (activeEmployees.length * workdaysCount) * 100).toFixed(1)
        : '0';
      
      // Calculate punctuality rate
      const punctualityRate = (statusCounts.present && (statusCounts.present + statusCounts.late) > 0)
        ? ((statusCounts.present / (statusCounts.present + statusCounts.late)) * 100).toFixed(1)
        : '100.0';
      
      // Calculate average hours worked
      let totalHoursWorked = 0;
      let recordsWithHours = 0;
      
      for (const record of attendanceRecords) {
        if (record.hoursWorked) {
          totalHoursWorked += parseFloat(record.hoursWorked.toString());
          recordsWithHours++;
        }
      }
      
      const averageHoursWorked = recordsWithHours > 0
        ? (totalHoursWorked / recordsWithHours).toFixed(1)
        : '0.0';
      
      // Get data for attendance trend (last 7 days)
      const recordsByDate = new Map();
      for (const record of attendanceRecords) {
        if (!record.date) continue;
        
        const dateStr = new Date(record.date).toISOString().split('T')[0];
        if (!recordsByDate.has(dateStr)) {
          recordsByDate.set(dateStr, []);
        }
        recordsByDate.get(dateStr).push(record);
      }
      
      const trendDates = getLast7Days(endDate);
      const attendanceTrend = trendDates.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayRecords = recordsByDate.get(dateStr) || [];
        const presentCount = dayRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
        const totalEmployees = activeEmployees.length;
        const rate = totalEmployees > 0 ? (presentCount / totalEmployees) * 100 : 0;
        
        return {
          date: dateStr,
          rate: parseFloat(rate.toFixed(1)),
          count: presentCount
        };
      });
      
      // Include dashboard stats in a nested object for backward compatibility
      const responseWithStats = {
        ...response,
        _dashboardStats: {
          summary: {
            attendanceRate: `${averageAttendanceRate}%`,
            punctualityRate: `${punctualityRate}%`,
            averageHoursWorked,
            averageDailyAttendance,
            totalEmployees: activeEmployees.length,
          },
          statusCounts,
          trend: attendanceTrend
        }
      };
      
      return res.status(200).json(responseWithStats);
    } catch (error) {
      console.error("Error generating attendance statistics:", error);
      return res.status(500).json({ 
        message: "Failed to generate attendance statistics", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Helper function to count workdays between two dates
  function countWorkdays(startDate: Date, endDate: Date): number {
    let count = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }
  
  // Helper function to get last 7 days
  function getLast7Days(endDate: Date): Date[] {
    const dates: Date[] = [];
    const end = new Date(endDate);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(end);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    
    return dates;
  }
  
  app.get("/api/attendance/employee/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      let attendanceRecords;
      
      const { startDate, endDate } = req.query;
      
      if (startDate && endDate) {
        const parsedStartDate = new Date(startDate as string);
        const parsedEndDate = new Date(endDate as string);
        
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
        
        attendanceRecords = await storage.getAttendanceByEmployeeAndDateRange(
          id,
          parsedStartDate,
          parsedEndDate
        );
      } else {
        attendanceRecords = await storage.getAttendanceForEmployee(id);
      }
      
      const employee = await storage.getEmployeeWithDetails(id);
      
      // Transform attendance records
      const transformedRecords = attendanceRecords.map(record => 
        transformAttendanceRecord(record, employee)
      );
      
      // Return attendance records with schema-compliant structure
      return res.status(200).json(transformedRecords);
    } catch (error) {
      console.error(`Error fetching attendance:`, error);
      return res.status(500).json({ 
        message: "Failed to fetch attendance records", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/attendance/otp", async (req, res) => {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID is required" });
    }
    
    const employee = await storage.getEmployee(employeeId);
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Expires in 15 minutes
    
    await storage.createOtpCode({
      employeeId,
      code: otp,
      expiresAt,
      used: false
    });
    
    return res.status(200).json({ otp });
  });
  
  app.post("/api/attendance/verify-otp", async (req, res) => {
    try {
      const { employeeId, code, action } = req.body;
      
      if (!employeeId || !code || !action) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Get the employee record
      const employee = await storage.getEmployee(ensureStringId(employeeId));
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Find the OTP code
      const otpCode = await storage.getOtpCodeByCode(code);
      
      if (!otpCode) {
        return res.status(400).json({ message: "Invalid OTP code" });
      }
      
      // Check if OTP is expired
      const now = new Date();
      if (now > new Date(otpCode.expiresAt)) {
        return res.status(400).json({ message: "OTP code has expired" });
      }
      
      // Check if OTP has been used
      if (otpCode.used) {
        return res.status(400).json({ message: "OTP code has already been used" });
      }
      
      // Get today's date (reset to start of day)
      const today = startOfDay(now);
      
      // Check for existing attendance record for today
      const existingRecords = await storage.getAttendanceForEmployee(otpCode.employeeId);
      const todayRecord = existingRecords.find(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date);
        return isSameDay(recordDate, today);
      });

      console.log("todayRecord", todayRecord);
      
      // Define standard work schedule (configurable in a real app)
      const scheduledStartTimeMinutes = 9 * 60; // 9:00 AM in minutes since midnight
      const lateWindowMinutes = 15; // 15 minute grace period
      
      let attendance;
      
      if (action === 'clockIn') {
        // Check if the employee has already clocked in today
        // Only consider a valid clock-in if there's an actual clockInTime value
        if (todayRecord && todayRecord.clockInTime) {
          return res.status(400).json({ message: "Already clocked in for today" });
        }
        
        const status = determineAttendanceStatus(now, scheduledStartTimeMinutes, lateWindowMinutes);
        
        if (todayRecord) {
          // Update existing record with clock in
          attendance = await storage.updateAttendance(ensureStringId(todayRecord.id), {
            clockInTime: now,
            status: status,
            hoursWorked: 0,
            notes: `Self-logged via OTP: ${action}`
          });
        } else {
          // Create new attendance record
          attendance = await storage.createAttendance({
            employeeId: otpCode.employeeId,
            date: today,
            clockInTime: now,
            clockOutTime: undefined,
            status: status,
            hoursWorked: 0,
            geoLocation: undefined,
            approvedBy: undefined,
            notes: `Self-logged via OTP: ${action}`
          });
        }
      } else if (action === 'clockOut') {
        if (!todayRecord) {
          return res.status(400).json({ message: "No clock-in record found for today" });
        }
        
        if (!todayRecord.clockInTime) {
          return res.status(400).json({ message: "Cannot clock out without clocking in first" });
        }
        
        if (todayRecord.clockOutTime) {
          return res.status(400).json({ message: "Already clocked out for today" });
        }
        
        // Calculate hours worked
        const clockIn = new Date(todayRecord.clockInTime);
        const hoursWorked = differenceInHours(now, clockIn) + (differenceInMinutes(now, clockIn) % 60) / 60;
        
        attendance = await storage.updateAttendance(ensureStringId(todayRecord.id), {
          clockOutTime: now,
          hoursWorked: hoursWorked,
          notes: `Self-logged via OTP: ${action}`
        });
      }
      
      // Mark OTP as used
      await storage.updateOtpCode(ensureStringId(otpCode.id), { used: true });
      
      // Return success with employee details included
      const employeeWithDetails = await storage.getEmployeeWithDetails(ensureStringId(employee.id));
      
      return res.status(200).json({ 
        success: true, 
        attendance,
        // Use a simplified employee data object with just the necessary fields
        // This is not returning a full Employee interface, but a simplified representation
        employee: {
          id: employee.id,
          fullName: employeeWithDetails ? `${employeeWithDetails.other_names} ${employeeWithDetails.surname}` : 'Unknown',
          department: employeeWithDetails?.department?.name || 'Unknown',
          profileImage: employeeWithDetails?.profileImage || null
        }
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return res.status(500).json({ 
        message: "Failed to verify OTP", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Payroll routes
  app.get("/api/payroll", async (req, res) => {
    try {
      let startDate: Date, endDate: Date;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
      } else {
        // Return current month's payroll by default
        const now = new Date();
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      }
      
      // Create a cache key based on the query parameters
      const cacheKey = `payroll:${formatISO(startDate)}:${formatISO(endDate)}`;
      
      // Simple in-memory cache
      const cache: Record<string, { data: any; timestamp: number }> = (global as any).payrollCache 
        || ((global as any).payrollCache = {});
      
      // Check if we have a recent cached response (valid for 1 minute)
      const cachedResponse = cache[cacheKey];
      if (cachedResponse && getTime(new Date()) - cachedResponse.timestamp < 60000) {
        console.log(`Using cached payroll data for ${formatISO(startDate)} to ${formatISO(endDate)}`);
        return res.status(200).json(cachedResponse.data);
      }
      
      console.log(`Fetching payroll from ${formatISO(startDate)} to ${formatISO(endDate)}`);
      
      const payrollRecords = await storage.getPayrollForPeriod(startDate, endDate);
      
      // Transform the payroll data to include employee names and departments
      const transformedRecords = await Promise.all(payrollRecords.map(async record => {
        const employee = await storage.getEmployeeWithDetails(record.employeeId);
        
        return {
          id: record.id,
          employeeId: record.employeeId,
          employeeName: employee ? `${employee.other_names} ${employee.surname}` : 'Unknown Employee', // Changed from employee.user.name
          department: employee ? employee?.department?.name || employee?.role : 'Unknown Department',
          periodStart: record.periodStart,
          periodEnd: record.periodEnd,
          hoursWorked: Number(record.hoursWorked) || 0,
          hourlyRate: employee ? Number(employee.hourlyRate) || 0 : 0,
          grossPay: Number(record.grossPay) || 0,
          ewaDeductions: Number(record.ewaDeductions) || 0,
          taxDeductions: Number(record.taxDeductions) || 0,
          otherDeductions: Number(record.otherDeductions) || 0,
          netPay: Number(record.netPay) || 0,
          status: record.status
        };
      }));
      
      // Cache the result
      cache[cacheKey] = {
        data: transformedRecords,
        timestamp: getTime(new Date())
      };
      
      return res.status(200).json(transformedRecords);
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      return res.status(500).json({ message: "Failed to fetch payroll records" });
    }
  });
  
  app.get("/api/payroll/employee/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      const payrollRecords = await storage.getPayrollForEmployee(id);
      return res.status(200).json(payrollRecords);
    } catch (error) {
      console.error('Error fetching payroll:', error);
      return res.status(500).json({ 
        message: "Failed to fetch payroll records", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/payroll", validateBody(insertPayrollSchema), async (req, res) => {
    try {
      // Handle numeric fields conversion (string to number)
      let payrollData = { ...req.body };
      if (typeof payrollData.hoursWorked === 'string') {
        payrollData.hoursWorked = parseFloat(payrollData.hoursWorked);
      }
      if (typeof payrollData.grossPay === 'string') {
        payrollData.grossPay = parseFloat(payrollData.grossPay);
      }
      if (typeof payrollData.netPay === 'string') {
        payrollData.netPay = parseFloat(payrollData.netPay);
      }
      
      const payroll = await storage.createPayroll(payrollData);
      
      // Transform to ensure schema compliance
      const transformedPayroll = transformPayrollRecord(payroll);
      
      return res.status(201).json(transformedPayroll);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create payroll record" });
    }
  });
  
  app.put("/api/payroll/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      
      // Handle numeric fields conversion (string to number)
      let payrollData = { ...req.body };
      if (typeof payrollData.hoursWorked === 'string') {
        payrollData.hoursWorked = parseFloat(payrollData.hoursWorked);
      }
      if (typeof payrollData.grossPay === 'string') {
        payrollData.grossPay = parseFloat(payrollData.grossPay);
      }
      if (typeof payrollData.netPay === 'string') {
        payrollData.netPay = parseFloat(payrollData.netPay);
      }
      
      const payroll = await storage.updatePayroll(id, payrollData);
      
      if (!payroll) {
        return res.status(404).json({ message: "Payroll record not found" });
      }
      
      // Transform to ensure schema compliance
      const transformedPayroll = transformPayrollRecord(payroll);
      
      return res.status(200).json(transformedPayroll);
    } catch (error) {
      console.error('Error updating payroll:', error);
      return res.status(500).json({ message: "Failed to update payroll", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  
  // Process payroll endpoint
  app.post("/api/payroll/process", async (req, res) => {
    try {
      const payrollData = req.body;
      
      if (!payrollData || !payrollData.employeePayrolls || !Array.isArray(payrollData.employeePayrolls)) {
        return res.status(400).json({ error: "Invalid payroll data format" });
      }
      
      // Generate a unique reference number for this payroll run
      const referenceNumber = `PR-${getTime(new Date())}-${Math.floor(Math.random() * 1000)}`;
      
      // Process each employee's payroll and store in database
      const createdPayrolls = [];
      for (const employeePayroll of payrollData.employeePayrolls) {
        console.log(`Processing payroll for employee: ${employeePayroll.name}`);
        
        // Create a payroll record for this employee
        const payroll = await storage.createPayroll({
          employeeId: employeePayroll.employeeId,
          periodStart: new Date(payrollData.payPeriodStart),
          periodEnd: new Date(payrollData.payPeriodEnd),
          hoursWorked: employeePayroll.hoursWorked.toString(),
          grossPay: employeePayroll.grossPay.toString(),
          netPay: employeePayroll.netPay.toString(),
          ewaDeductions: employeePayroll.ewaDeductions.toString(),
          taxDeductions: (employeePayroll.paye + employeePayroll.nhif + employeePayroll.nssf + employeePayroll.housingLevy).toString(),
          otherDeductions: (employeePayroll.loanDeductions + employeePayroll.otherDeductions).toString(),
          status: "processed",
          processedBy: "1" // Default admin user ID
        });
        
        createdPayrolls.push(payroll);
      }
      
      // Return the processed payroll with the reference number
      res.status(200).json({
        ...payrollData,
        id: referenceNumber,
        status: "processed",
        processedAt: formatISO(new Date()),
        payrolls: createdPayrolls
      });
    } catch (error) {
      console.error("Error processing payroll:", error);
      res.status(500).json({ error: "Failed to process payroll" });
    }
  });
  
  // EWA routes
  app.get("/api/ewa/requests", async (req, res) => {
    const status = req.query.status as string;
    
    let ewaRequests;
    switch (status) {
      case 'pending':
        ewaRequests = await storage.getPendingEwaRequests();
        break;
      case 'approved':
        ewaRequests = await storage.getApprovedEwaRequests();
        break;
      case 'disbursed':
        ewaRequests = await storage.getDisbursedEwaRequests();
        break;
      default:
        // Return all EWA requests
        ewaRequests = [
          ...(await storage.getPendingEwaRequests()),
          ...(await storage.getApprovedEwaRequests()),
          ...(await storage.getDisbursedEwaRequests())
        ];
    }
    
    // Transform the records to ensure they match the schema
    const transformedRequests = await Promise.all(
      ewaRequests.map(async (request: EwaRequest) => {
        const employee = await storage.getEmployeeWithDetails(request.employeeId);
        return transformEwaRequest(request, employee);
      })
    );
    
    return res.status(200).json(transformedRequests);
  });
  
  app.get("/api/ewa/employee/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      const ewaRequests = await storage.getEwaRequestsForEmployee(id);
      return res.status(200).json(ewaRequests);
    } catch (error) {
      console.error('Error fetching EWA requests:', error);
      return res.status(500).json({ 
        message: "Failed to fetch EWA requests", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/ewa/requests", validateBody(insertEwaRequestSchema), async (req, res) => {
    try {
      // Handle numeric fields conversion (string to number)
      let ewaData = { ...req.body };
      if (typeof ewaData.amount === 'string') {
        ewaData.amount = parseFloat(ewaData.amount);
      }
      
      // Set requestDate to current date if not provided
      if (!ewaData.requestDate) {
        ewaData.requestDate = new Date();
      }
      
      const ewaRequest = await storage.createEwaRequest(ewaData);
      
      // Transform to ensure schema compliance
      const transformedRequest = transformEwaRequest(ewaRequest);
      
      return res.status(201).json(transformedRequest);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create EWA request" });
    }
  });
  
  // Integrated endpoint: Create EWA request based on attendance and update system flags
  app.post("/api/ewa/integrated-request", async (req, res) => {
    const { employeeId, amount, reason } = req.body;
    
    if (!employeeId || !amount) {
      return res.status(400).json({ message: "Employee ID and amount are required" });
    }
    
    try {
      // Get employee details with user information
      const employeeWithDetails = await storage.getEmployeeWithDetails(employeeId);
      if (!employeeWithDetails) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // 1. Validate attendance records exist for this employee
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const attendanceRecords = await storage.getAttendanceForEmployee(employeeId);
      
      // Filter for this month's records
      const thisMonthAttendance = attendanceRecords.filter(record => {
        // Safely handle date - ensure it's not null
        if (record.date) {
          const recordDate = new Date(record.date);
          return recordDate >= startOfCurrentMonth && recordDate <= now;
        }
        return false;
      });
      
      if (thisMonthAttendance.length === 0) {
        return res.status(400).json({ 
          message: "No attendance records found for this month. Cannot process EWA request without attendance data."
        });
      }
      
      // 2. Calculate earned wage based on attendance (simplified calculation)
      const daysWorked = thisMonthAttendance.length;
      const totalWorkingDays = 22; // Average working days in a month
      
      // Calculate monthly salary from hourly rate (assuming 8-hour workday)
      const hourlyRate = employeeWithDetails.hourlyRate || 0;
      const monthlySalary = hourlyRate * 8 * totalWorkingDays; // 8 hours/day, 22 days/month
      
      const calculatedEarnedWage = monthlySalary * (daysWorked / totalWorkingDays);
      
      // 3. Validate that requested amount doesn't exceed the allowed percentage
      const maxAllowedPercentage = 0.5; // 50% of earned wage
      const maxAllowedAmount = calculatedEarnedWage * maxAllowedPercentage;
      
      const requestAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      if (requestAmount > maxAllowedAmount) {
        return res.status(400).json({ 
          message: `Requested amount exceeds maximum allowed EWA (${maxAllowedAmount.toFixed(2)})`
        });
      }
      
      // 4. Create the EWA request
      const processingFee = requestAmount * 0.05; // 5% processing fee
      const ewaRequest = await storage.createEwaRequest({
        employeeId,
        requestDate: new Date(),
        amount: requestAmount,
        processingFee: processingFee,
        reason: reason || "Emergency funds needed",
        status: "pending"
      });
      
      // 5. Transform to ensure schema compliance
      const transformedRequest = transformEwaRequest(ewaRequest, employeeWithDetails);
      
      // 6. Return comprehensive response with all related data
      return res.status(201).json({
        success: true,
        ewaRequest: transformedRequest,
        maxAllowedAmount,
        calculatedEarnedWage,
        daysWorked,
        totalWorkingDays
      });
    } catch (error) {
      console.error("Error in integrated EWA request:", error);
      return res.status(500).json({ message: "Failed to process integrated EWA request" });
    }
  });
  
  app.put("/api/ewa/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      
      // Handle numeric fields conversion (string to number)
      let ewaData = { ...req.body };
      if (typeof ewaData.amount === 'string') {
        ewaData.amount = parseFloat(ewaData.amount);
      }
      if (typeof ewaData.processingFee === 'string') {
        ewaData.processingFee = parseFloat(ewaData.processingFee);
      }
      
      // Special handling for status changes
      if (ewaData.status === 'approved' && !ewaData.approvedAt) {
        ewaData.approvedAt = new Date();
      }
      if (ewaData.status === 'disbursed' && !ewaData.disbursedAt) {
        ewaData.disbursedAt = new Date();
      }
      
      const ewaRequest = await storage.updateEwaRequest(id, ewaData);
      
      if (!ewaRequest) {
        return res.status(404).json({ message: "EWA request not found" });
      }
      
      // Transform to ensure schema compliance
      const transformedRequest = transformEwaRequest(ewaRequest);
      
      return res.status(200).json(transformedRequest);
    } catch (error) {
      console.error('Error updating EWA request:', error);
      return res.status(500).json({ message: "Failed to update EWA request", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  
  // Wallet routes
  app.get("/api/wallet", async (_req, res) => {
    const wallet = await storage.getWallet();
    
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    
    // Calculate total balance for response
    const totalBalance = (
      parseFloat(wallet.employerBalance.toString() || "0") + 
      parseFloat(wallet.jahaziiBalance.toString() || "0")
    ).toString();
    
    return res.status(200).json({
      ...wallet,
      totalBalance
    });
  });
  
  app.get("/api/wallet/transactions", async (_req, res) => {
    const transactions = await storage.getWalletTransactions();
    return res.status(200).json(transactions);
  });
  
  app.post("/api/wallet/topup", async (req, res) => {
    // We only allow employer funding - ignore any other funding source that might be sent
    const { amount } = req.body;
    const fundingSource = 'employer'; // Force employer funding source
    
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ message: "Valid amount is required" });
    }
    
    // Get the wallet
    const wallet = await storage.getWallet();
    
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    
    const parsedAmount = parseFloat(amount);
    
    // Always update employer balance
    const currentEmployerBalance = parseFloat(wallet.employerBalance.toString() || "0");
    const updatedWallet = await storage.updateWallet(ensureStringId(wallet.id), {
      employerBalance: (currentEmployerBalance + parsedAmount) // Removed .toString()
    });
    
    await storage.createWalletTransaction({
      amount: parsedAmount,
      walletId: wallet.id,
      transactionType: 'employer_topup',
      description: 'Employer wallet top-up',
      referenceId: `TOP-${Date.now()}`,
      fundingSource,
      status: 'completed'
    });
    
    // Calculate total balance for response only (not stored in DB)
    const totalBalance = updatedWallet ? (
      parseFloat(updatedWallet.employerBalance.toString() || "0") + 
      parseFloat(updatedWallet.jahaziiBalance.toString() || "0")
    ).toString() : "0";
    
    // Add totalBalance to the response
    return res.status(200).json({
      ...updatedWallet,
      totalBalance
    });
  });
  
  app.put("/api/wallet/:id", async (req, res) => {
    try {
      const id = ensureStringId(req.params.id);
      const wallet = await storage.getWallet();
      
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      const { amount } = req.body;
      const parsedAmount = parseFloat(amount);
      
      if (isNaN(parsedAmount)) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      // Always update employer balance
      const currentEmployerBalance = parseFloat(wallet.employerBalance?.toString() || "0");
      const updatedWallet = await storage.updateWallet(ensureStringId(wallet.id), {
        employerBalance: (currentEmployerBalance + parsedAmount) // Removed .toString()
      });
      
      return res.status(200).json(updatedWallet);
    } catch (error) {
      console.error('Error updating wallet:', error);
      return res.status(500).json({ 
        message: "Failed to update wallet", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Statistics for dashboard
  app.get("/api/statistics/dashboard", async (_req, res) => {
    const employees = await storage.getAllEmployees();
    const activeEmployees = await storage.getAllActiveEmployees();
    const inactiveEmployees = await storage.getAllInactiveEmployees();
    
    // Get attendance for current month
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    
    // In a real app, these would be calculated from actual records
    // For now, we'll return mock statistics
    return res.status(200).json({
      employeeCount: {
        total: employees.length,
        active: activeEmployees.length,
        inactive: inactiveEmployees.length,
        change: "+3.2%"
      },
      attendance: {
        rate: "93.5%",
        change: "+1.5%"
      },
      payroll: {
        expected: "KES 4.2M",
        change: "+2.8%"
      },
      ewa: {
        total: "KES 890K",
        pending: 38,
        change: "+12.3%"
      }
    });
  });
  
  app.get("/api/activities", async (_req, res) => {
    // In a real app, these would be actual activities from a database
    // For now, we'll return mock activities
    const activities = [
      {
        id: 1,
        type: "employee",
        title: "New Employee Added",
        description: "John Kamau (ID: EMP-1928) has been added to the IT Department",
        time: "10 min ago",
        icon: "user-add-line"
      },
      {
        id: 2,
        type: "ewa",
        title: "New EWA Request",
        description: "Mary Wambui (Sales) requested KES 15,000 early wage access",
        time: "30 min ago",
        icon: "bank-card-line"
      },
      {
        id: 3,
        type: "attendance",
        title: "Attendance Anomaly",
        description: "5 employees in Marketing department haven't clocked in today",
        time: "1 hour ago",
        icon: "time-line"
      },
      {
        id: 4,
        type: "payroll",
        title: "Payroll Processed",
        description: "Payroll for IT Department (24 employees) has been processed",
        time: "2 hours ago",
        icon: "money-dollar-box-line"
      },
      {
        id: 5,
        type: "self-log",
        title: "Self-Log QR Generated",
        description: "Tom Mugo (Supervisor) generated QR code for warehouse team",
        time: "3 hours ago",
        icon: "login-box-line"
      }
    ];
    
    return res.status(200).json(activities);
  });

  // Mock control endpoint - for development only 
  app.post("/api/dev/mock-control", async (req, res) => {
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({ message: "Action is required" });
    }
    
    try {
      switch (action) {
        case "reset-attendance":
          // Get all active employees
          const employees = await storage.getAllActiveEmployees();
          
          // Delete today's attendance records
          await storage.deleteTodayAttendance();
          
          // Generate empty attendance records
          const emptyRecords = generateEmptyAttendance(employees);
          
          // Insert the empty records
          for (const record of emptyRecords) {
            await storage.createAttendance(record);
          }
          
          storage.clearTodayAttendanceCache?.();
          
          return res.status(200).json({ 
            success: true, 
            message: "Attendance data reset successfully" 
          });
          
        case "toggle-mocking":
          const mockingEnabled = req.body.enabled;
          
          if (mockingEnabled === undefined) {
            return res.status(400).json({ message: "Enabled flag is required" });
          }
          
          // You can store this in your storage system if needed
          return res.status(200).json({ 
            success: true, 
            mockingEnabled,
            message: `Mocking ${mockingEnabled ? 'enabled' : 'disabled'}` 
          });
          
        default:
          return res.status(400).json({ message: `Unknown action: ${action}` });
      }
    } catch (error) {
      console.error("Mock control error:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to execute mock control action" 
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: formatISO(new Date()) });
  });

  // Payment details endpoint
  app.get("/api/employees/:id/payment-details", async (req, res) => {
    try {
      const employeeId = ensureStringId(req.params.id);
      
      // Get the employee record
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // In a real implementation, this would retrieve the actual payment details from the database
      // For this implementation, we'll generate some mock data based on the employee ID
      
      // Determine if this employee uses bank transfer or mobile money (M-Pesa)
      const usesMpesa = employeeId.charCodeAt(0) % 2 === 0;
      
      let paymentDetails;
      
      if (usesMpesa) {
        // Some employees get paid via M-Pesa
        paymentDetails = {
          paymentMethod: "mpesa",
          mpesaNumber: `07${Math.floor(10000000 + Math.random() * 90000000)}`,
        };
      } else {
        // Others get paid via bank transfer
        const banks = ["Equity Bank", "KCB", "Co-operative Bank", "NCBA", "Stanbic Bank"];
        paymentDetails = {
          paymentMethod: "bank",
          bankName: banks[Math.floor(Math.random() * banks.length)],
          accountNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
        };
      }
      
      res.status(200).json(paymentDetails);
    } catch (error) {
      console.error("Error fetching employee payment details:", error);
      res.status(500).json({ error: "Failed to fetch employee payment details" });
    }
  });

  // Employee deductions endpoint
  app.get("/api/employees/:id/deductions", async (req, res) => {
    try {
      const employeeId = ensureStringId(req.params.id);
      
      // Get the employee record
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // In a real implementation, this would retrieve the actual deductions from the database
      // For this implementation, we'll generate some mock data
      
      // Generate a random number of deductions (0-3)
      const numDeductions = Math.floor(Math.random() * 4);
      const deductions = [];
      
      const deductionTypes = [
        { type: "insurance", name: "Health Insurance", minAmount: 1000, maxAmount: 5000 },
        { type: "pension", name: "Pension Contribution", minAmount: 2000, maxAmount: 8000 },
        { type: "union", name: "Union Dues", minAmount: 500, maxAmount: 1500 },
        { type: "welfare", name: "Staff Welfare", minAmount: 300, maxAmount: 1000 }
      ];
      
      // Randomly select deductions
      const selectedTypes: number[] = [];
      for (let i = 0; i < numDeductions; i++) {
        let index;
        do {
          index = Math.floor(Math.random() * deductionTypes.length);
        } while (selectedTypes.includes(index));
        
        selectedTypes.push(index);
        const deductionType = deductionTypes[index];
        
        deductions.push({
          id: i + 1,
          employeeId,
          type: deductionType.type,
          name: deductionType.name,
          amount: Math.floor(deductionType.minAmount + Math.random() * (deductionType.maxAmount - deductionType.minAmount)),
          isActive: true
        });
      }
      
      res.status(200).json(deductions);
    } catch (error) {
      console.error("Error fetching employee deductions:", error);
      res.status(500).json({ error: "Failed to fetch employee deductions" });
    }
  });

  // Active employee loans endpoint
  app.get("/api/loans/employee/:id/active", async (req, res) => {
    try {
      const employeeId = ensureStringId(req.params.id);
      
      // Get the employee record
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // In a real implementation, this would retrieve the actual loans from the database
      // For this implementation, we'll generate some mock data
      
      // Determine if this employee has any loans (30% chance)
      const hasLoans = Math.random() < 0.3;
      
      if (!hasLoans) {
        return res.status(200).json([]);
      }
      
      // Generate 1-2 active loans
      const numLoans = Math.floor(Math.random() * 2) + 1;
      const loans = [];
      
      const loanTypes = [
        { type: "personal", name: "Personal Loan", minAmount: 50000, maxAmount: 300000, termMonths: 12 },
        { type: "emergency", name: "Emergency Loan", minAmount: 10000, maxAmount: 50000, termMonths: 6 },
        { type: "education", name: "Education Loan", minAmount: 100000, maxAmount: 500000, termMonths: 24 },
        { type: "home", name: "Home Improvement", minAmount: 200000, maxAmount: 1000000, termMonths: 36 }
      ];
      
      // Randomly select loans
      const selectedTypes: number[] = [];
      for (let i = 0; i < numLoans; i++) {
        let index;
        do {
          index = Math.floor(Math.random() * loanTypes.length);
        } while (selectedTypes.includes(index));
        
        selectedTypes.push(index);
        const loanType = loanTypes[index];
        
        // Generate a random loan amount
        const principal = Math.floor(loanType.minAmount + Math.random() * (loanType.maxAmount - loanType.minAmount));
        
        // Calculate a simple monthly payment (principal / term)
        const monthlyPayment = Math.ceil(principal / loanType.termMonths);
        
        loans.push({
          id: i + 1,
          employeeId,
          type: loanType.type,
          name: loanType.name,
          principal,
          balance: Math.floor(principal * (0.3 + Math.random() * 0.7)), // 30-100% remaining
          monthlyPayment,
          termMonths: loanType.termMonths,
          isActive: true,
          startDate: formatISO(subDays(new Date(), Math.floor(Math.random() * 115))),
          nextPaymentDate: formatISO(addDays(new Date(), Math.floor(Math.random() * 30)))
        });
      }
      
      res.status(200).json(loans);
    } catch (error) {
      console.error("Error fetching employee loans:", error);
      res.status(500).json({ error: "Failed to fetch employee loans" });
    }
  });

  // Chat API Endpoints
  app.post('/api/chat/message', async (req, res) => {
    try {
      const { message, userId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const response = await chatService.processMessage(message, userId);
      res.json(response);
    } catch (error) {
      console.error('Error processing chat message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  app.get('/api/chat/history/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const history = await chatService.getHistory(userId);
      res.json(history);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  app.post('/api/chat/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const { userId } = req.body;
      const result = await chatService.processFile(req.file, userId);
      res.json(result);
    } catch (error) {
      console.error('Error processing uploaded file:', error);
      res.status(500).json({ error: 'Failed to process file' });
    }
  });

  app.post('/api/chat/import-employees', async (req, res) => {
    try {
      const { data, userId } = req.body;
      const result = await chatService.importEmployees(data, userId);
      res.json(result);
    } catch (error) {
      console.error('Error importing employees:', error);
      res.status(500).json({ error: 'Failed to import employees' });
    }
  });

  app.get('/api/chat/search-employee', async (req, res) => {
    try {
      const query = req.query.query;
      const userId = req.query.userId || 'anonymous-user';
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const results = await chatService.searchEmployee(query.toString(), userId.toString());
      res.json(results);
    } catch (error) {
      console.error('Error searching for employee:', error);
      res.status(500).json({ error: 'Failed to search for employee' });
    }
  });

  app.post('/api/chat/calculate-payroll', async (req, res) => {
    try {
      const { employeeIds, userId } = req.body;
      const result = await chatService.calculatePayroll(employeeIds, userId);
      res.json(result);
    } catch (error) {
      console.error('Error calculating payroll:', error);
      res.status(500).json({ error: 'Failed to calculate payroll' });
    }
  });

  app.post('/api/chat/command', async (req, res) => {
    try {
      const { command, userId } = req.body;
      await saveCommand(userId, command);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving command:', error);
      res.status(500).json({ error: 'Failed to save command' });
    }
  });

  app.post('/api/chat/search', async (req, res) => {
    try {
      const { search, userId } = req.body;
      await saveSearch(userId, search);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving search:', error);
      res.status(500).json({ error: 'Failed to save search' });
    }
  });

  // Add an endpoint to activate imported employees
  app.post("/api/employees/activate-imported", async (_req, res) => {
    try {
      console.log("Activating all imported employees");
      
      // Get all employees
      const allEmployees = await storage.getAllEmployees();
      console.log(`Found ${allEmployees.length} total employees`);
      
      let activatedCount = 0;
      
      // Check each employee to see if they have imported data
      for (const employee of allEmployees) {
        // Parse address to check for imported fields
        let isImported = false;
        let addressObj: Record<string, any> = {};
        
        if (typeof employee.address === 'string' && 
            (employee.address.startsWith('{') || employee.address.startsWith('['))) {
          try {
            addressObj = JSON.parse(employee.address);
            // Check if this has imported fields
            if (addressObj && 
                (addressObj.idNumber || addressObj.kraPin || addressObj.nssfNo || addressObj.nhifNo)) {
              isImported = true;
            }
          } catch (e) {
            console.error(`Failed to parse address for employee ${employee.id}: ${e}`);
          }
        }
        
        // If employee has imported data and is not active, activate them
        if (isImported && !employee.active) {
          console.log(`Activating imported employee ${employee.id}`);
          await storage.updateEmployee(employee.id, { active: true });
          activatedCount++;
        }
      }
      
      return res.status(200).json({ 
        message: `Activated ${activatedCount} imported employees`,
        activatedCount 
      });
    } catch (error) {
      console.error("Error activating imported employees:", error);
      return res.status(500).json({ 
        message: "Failed to activate imported employees",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Import employees from file upload
  app.post('/api/import/employees', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      console.log(`Processing uploaded file: ${req.file.originalname}`);
      
      // Extract data from Excel/CSV file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      console.log(`Extracted ${jsonData.length} rows from uploaded file`);
      
      // Transform data to match expected MongoDB format
      const formattedData: Employee[] = jsonData.map((row: any) => {
        // Extract name parts
        const fullName = row['Name'] || `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();
        const nameParts = fullName.split(/\s+/);
        const firstName = row['First Name'] || (nameParts.length > 0 ? nameParts[0] : '');
        const lastName = row['Last Name'] || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
        
        // Extract salary/income values
        const grossIncome = parseFloat(row['Gross Pay'] || row['Salary'] || row['Basic Salary'] || row['Gross Income'] || 0);
        const paye = parseFloat(row['PAYE'] || row['Tax'] || 0);
        const nssf = parseFloat(row['NSSF'] || row['NSSF Number'] || row['NSSF No'] || 0);
        const nhif = parseFloat(row['NHIF'] || row['NHIF Number'] || row['NHIF No'] || 0);
        const levies = parseFloat(row['Housing Levy'] || row['Levy'] || row['H-LEVY'] || 0);
        const loanDeductions = parseFloat(row['Loan'] || row['Loans'] || row['Loan Deductions'] || 0);
        const employerAdvances = parseFloat(row['Advance'] || row['Employer Advance'] || 0);
        
        // Calculate total deductions and net income
        const totalDeductions = paye + nssf + nhif + levies + loanDeductions + employerAdvances;
        const netIncome = grossIncome - totalDeductions;
        
        // Calculate EWA limits (50% of net pay by default)
        const maxSalaryAdvanceLimit = Math.floor(netIncome * 0.5);
        
        // Return MongoDB document structure
        return {
          // Basic identification
          id: row['Emp No'] || row['Employee Number'] || row['ID'] || '',
          employeeNumber: row['Emp No'] || row['Employee Number'] || row['ID'] || '',
          departmentId: row['Department ID'] || row['Department'] || '', // Required field
          other_names: firstName,
          surname: lastName,
          id_no: row['ID Number'] || row['ID'] || '',
          tax_pin: row['KRA Pin'] || row['KRA PIN'] || row['PIN'] || null,
          sex: row['Gender'] || row['Sex'] || 'other',
          
          // Employment details
          position: row['Position'] || row['Job Title'] || row['Designation'] || 'Employee',
          status: 'active',
          is_on_probation: false,
          role: 'Employee',
          
          // Financial details
          gross_income: grossIncome,
          net_income: netIncome,
          total_deductions: totalDeductions,
          loan_deductions: loanDeductions,
          employer_advances: employerAdvances,
          total_loan_deductions: loanDeductions,
          
          // Statutory deductions
          statutory_deductions: {
            nhif: nhif,
            nssf: nssf,
            tax: paye,
            levy: levies
          },
          
          // EWA information
          max_salary_advance_limit: maxSalaryAdvanceLimit,
          available_salary_advance_limit: maxSalaryAdvanceLimit,
          
          // Contact information
          contact: {
            email: row['Email'] || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            phoneNumber: row['Phone'] || row['Mobile'] || row['Contact'] || '',
          },
          
          // Bank information
          bank_info: {
            acc_no: row['Account Number'] || row['Bank Account'] || null,
            bank_name: row['Bank'] || row['Bank Name'] || null
          },
          
          // Required User fields
          username: row['Email'] || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          password: 'password123', // Default password, should be changed on first login
          
          // Required boolean flags
          id_confirmed: false,
          mobile_confirmed: false,
          tax_pin_verified: false,
          active: true,
          
          // Country and additional required fields
          country: 'KE',
          documents: {},
          crb_reports: {},
          
          // Dates
          created_at: new Date(),
          modified_at: new Date(),
          emergencyContact: {}, // Add this line to include the 'emergencyContact' property
        };
      });
      
      // Import the employees
      // @ts-ignore
      const addedCount = await storage.addEmployees(formattedData);
      
      console.log(`Successfully imported ${addedCount} employees`);
      
      return res.status(200).json({ 
        success: true, 
        message: `Successfully imported ${addedCount} employees`,
        count: addedCount
      });
    } catch (error) {
      console.error('Error importing employees from file:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to import employees', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Debug route for listing employee IDs
  app.get("/api/employees/debug/ids", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      // Return just the IDs and some basic info for debugging
      const employeeIds = employees.map(emp => ({
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        name: `${emp.other_names} ${emp.surname}`.trim(),
        createdAt: emp.created_at
      }));
      return res.status(200).json(employeeIds);
    } catch (error) {
      console.error('Error fetching employee IDs:', error);
      return res.status(500).json({ 
        message: "Failed to fetch employee IDs", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add a route for searching employees by employee number
  app.get("/api/employees/number/:employeeNumber", async (req, res) => {
    try {
      const employeeNumber = req.params.employeeNumber;
      console.log(`GET /api/employees/number/${employeeNumber} - Looking up employee with number`);
      
      const employee = await storage.getEmployeeByNumber(employeeNumber);
      
      if (!employee) {
        console.log(`Employee with number ${employeeNumber} not found`);
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employeeWithDetails = await storage.getEmployeeWithDetails(employee.id);
      
      if (!employeeWithDetails) {
        console.log(`Found employee by number but couldn't get details for ID ${employee.id}`);
        return res.status(500).json({ message: "Failed to fetch employee details" });
      }
      
      const Employee = await transformEmployeeData(employeeWithDetails);
      console.log(`Employee found by number and returned: ${Employee.id}`);
      return res.status(200).json(Employee);
    } catch (error) {
      console.error('Error fetching employee by number:', error);
      return res.status(500).json({ 
        message: "Failed to fetch employee", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
