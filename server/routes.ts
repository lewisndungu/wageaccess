import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertEmployeeSchema, insertAttendanceSchema, insertPayrollSchema, insertEwaRequestSchema, type InsertAttendance, type Attendance } from "@shared/schema";
import { faker } from '@faker-js/faker';
import { generateEmptyAttendance } from './mock-data-generator';
import { subDays, addDays, formatISO, startOfMonth, endOfMonth, parseISO, startOfDay, getTime, addSeconds, isSameDay, differenceInHours, differenceInMinutes } from 'date-fns';

// Define a type for the enhanced employee object sent to the client
interface EnhancedEmployee {
  id: number;
  employeeNumber: string;
  userId: number;
  departmentId: number;
  position: string;
  status: string;
  hourlyRate: string | number;
  startDate: string | Date;
  active: boolean | null;
  phoneNumber: string | null;
  emergencyContact: string | object | null;
  address: string | object | null;
  // Additional fields for frontend
  name: string;
  email: string;
  profileImage: string | null;
  department: string;
}

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
    return res.status(200).json(employees);
  });
  
  app.get("/api/employees/active", async (_req, res) => {
    const employees = await storage.getAllActiveEmployees();
    
    // Transform the employee data to parse JSON strings and include user/department details
    const transformedEmployees = await Promise.all(employees.map(async employee => {
      // Get user details
      const user = await storage.getUser(employee.userId);
      
      // Get department details
      const department = await storage.getDepartment(employee.departmentId);
      
      // Process address and emergency contact fields
      let addressObj = employee.address;
      let emergencyContactObj = employee.emergencyContact;
      
      // Parse the address field if it's a JSON string
      if (typeof addressObj === 'string' && 
          (addressObj.startsWith('{') || addressObj.startsWith('['))) {
        try {
          addressObj = JSON.parse(addressObj);
        } catch (e) {
          console.error(`Failed to parse address for employee ${employee.id}: ${e}`);
        }
      }
      
      // Parse the emergencyContact field if it's a JSON string
      if (typeof emergencyContactObj === 'string' && 
          (emergencyContactObj.startsWith('{') || emergencyContactObj.startsWith('['))) {
        try {
          emergencyContactObj = JSON.parse(emergencyContactObj);
        } catch (e) {
          console.error(`Failed to parse emergencyContact for employee ${employee.id}: ${e}`);
        }
      }
      
      // Create a complete enhanced employee object
      return {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        userId: employee.userId,
        departmentId: employee.departmentId,
        position: employee.position,
        status: employee.status,
        hourlyRate: employee.hourlyRate,
        startDate: employee.startDate,
        active: employee.active,
        phoneNumber: employee.phoneNumber,
        address: addressObj,
        emergencyContact: emergencyContactObj,
        // Additional fields for frontend
        name: user ? user.name : 'Unknown',
        email: user ? user.email || user.username : 'Unknown',
        profileImage: user && user.profileImage ? user.profileImage : faker.image.avatar(),
        department: department ? department.name : 'Unknown'
      };
    }));
    
    return res.status(200).json(transformedEmployees);
  });
  
  app.get("/api/employees/inactive", async (_req, res) => {
    const employees = await storage.getAllInactiveEmployees();
    
    // Transform the employee data to parse JSON strings and include user/department details
    const transformedEmployees = await Promise.all(employees.map(async employee => {
      // Get user details
      const user = await storage.getUser(employee.userId);
      
      // Get department details
      const department = await storage.getDepartment(employee.departmentId);
      
      // Process address and emergency contact fields
      let addressObj = employee.address;
      let emergencyContactObj = employee.emergencyContact;
      
      // Parse the address field if it's a JSON string
      if (typeof addressObj === 'string' && 
          (addressObj.startsWith('{') || addressObj.startsWith('['))) {
        try {
          addressObj = JSON.parse(addressObj);
        } catch (e) {
          console.error(`Failed to parse address for employee ${employee.id}: ${e}`);
        }
      }
      
      // Parse the emergencyContact field if it's a JSON string
      if (typeof emergencyContactObj === 'string' && 
          (emergencyContactObj.startsWith('{') || emergencyContactObj.startsWith('['))) {
        try {
          emergencyContactObj = JSON.parse(emergencyContactObj);
        } catch (e) {
          console.error(`Failed to parse emergencyContact for employee ${employee.id}: ${e}`);
        }
      }
      
      // Create a complete enhanced employee object
      return {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        userId: employee.userId,
        departmentId: employee.departmentId,
        position: employee.position,
        status: employee.status,
        hourlyRate: employee.hourlyRate,
        startDate: employee.startDate,
        active: employee.active,
        phoneNumber: employee.phoneNumber,
        address: addressObj,
        emergencyContact: emergencyContactObj,
        // Additional fields for frontend
        name: user ? user.name : 'Unknown',
        email: user ? user.email || user.username : 'Unknown',
        profileImage: user && user.profileImage ? user.profileImage : faker.image.avatar(),
        department: department ? department.name : 'Unknown'
      };
    }));
    
    return res.status(200).json(transformedEmployees);
  });
  
  app.get("/api/employees/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }
    
    const employee = await storage.getEmployeeWithDetails(id);
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    // Parse JSON strings in the employee object
    const transformedEmployee = { ...employee };
    
    // Parse the address field if it's a JSON string
    if (typeof transformedEmployee.address === 'string' && 
        (transformedEmployee.address.startsWith('{') || transformedEmployee.address.startsWith('['))) {
      try {
        transformedEmployee.address = JSON.parse(transformedEmployee.address);
      } catch (e) {
        // If parsing fails, keep the original string
        console.error(`Failed to parse address for employee ${employee.id}: ${e}`);
      }
    }
    
    // Parse the emergencyContact field if it's a JSON string
    if (typeof transformedEmployee.emergencyContact === 'string' && 
        (transformedEmployee.emergencyContact.startsWith('{') || transformedEmployee.emergencyContact.startsWith('['))) {
      try {
        transformedEmployee.emergencyContact = JSON.parse(transformedEmployee.emergencyContact);
      } catch (e) {
        // If parsing fails, keep the original string
        console.error(`Failed to parse emergencyContact for employee ${employee.id}: ${e}`);
      }
    }
    
    // Add avatar URL if no profile image exists
    if (transformedEmployee.user && !transformedEmployee.user.profileImage) {
      transformedEmployee.user.profileImage = faker.image.avatar();
    }
    
    return res.status(200).json(transformedEmployee);
  });
  
  app.post("/api/employees", validateBody(insertEmployeeSchema), async (req, res) => {
    try {
      const employee = await storage.createEmployee(req.body);
      return res.status(201).json(employee);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create employee" });
    }
  });
  
  app.patch("/api/employees/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }
    
    const employee = await storage.updateEmployee(id, req.body);
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    return res.status(200).json(employee);
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
      
      // Enhance the records with additional info for the frontend
      console.log("Enhancing records with employee details...");
      const enhancedRecords = await Promise.all(attendance.map(async (record: Attendance) => {
        const employee = await storage.getEmployeeWithDetails(record.employeeId);
        return {
          ...record,
          employeeName: employee ? employee.user.name : 'Unknown Employee',
          department: employee ? employee.department.name : 'Unknown Department'
        };
      }));
      
      console.log(`Found and enhanced ${enhancedRecords.length} attendance records`);
      
      // If we still have no records, generate some mock data
      if (enhancedRecords.length === 0) {
        console.log("No attendance records found, creating mock data");
        
        // Get some employees to use for mock data
        const employees = await storage.getAllActiveEmployees();
        if (employees.length > 0) {
          console.log(`Using ${employees.length} employees for mock data`);
          
          // Generate mock attendance for the last 7 days
          const mockAttendance = [];
          const today = new Date();
          
          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            for (const employee of employees.slice(0, 5)) { // Use only first 5 employees
              const employeeWithDetails = await storage.getEmployeeWithDetails(employee.id);
              
              // Create a mock attendance record
              const clockInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
              const clockInMinute = Math.floor(Math.random() * 60);
              
              const clockIn = new Date(date);
              clockIn.setHours(clockInHour, clockInMinute, 0, 0);
              
              const hoursWorked = 7 + Math.random() * 2; // 7-9 hours
              
              const clockOut = new Date(clockIn);
              clockOut.setHours(clockOut.getHours() + Math.floor(hoursWorked));
              clockOut.setMinutes(clockOut.getMinutes() + Math.floor((hoursWorked % 1) * 60));
              
              // Determine status based on clock-in time
              let status = 'present';
              if (clockInHour > 8 || (clockInHour === 8 && clockInMinute > 15)) {
                status = 'late';
              }
              
              mockAttendance.push({
                id: 1000 + mockAttendance.length, // Use IDs starting from 1000
                employeeId: employee.id,
                employeeName: employeeWithDetails ? employeeWithDetails.user.name : 'Unknown Employee',
                department: employeeWithDetails ? employeeWithDetails.department.name : 'Unknown Department',
                date: formatISO(date),
                clockInTime: formatISO(clockIn),
                clockOutTime: formatISO(clockOut),
                status,
                hoursWorked: hoursWorked.toFixed(2)
              });
            }
          }
          
          console.log(`Generated ${mockAttendance.length} mock attendance records`);
          return res.status(200).json(mockAttendance);
        }
      }
      
      return res.status(200).json(enhancedRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return res.status(500).json({ 
        message: "Internal server error", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.get("/api/attendance/employee/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { startDate, endDate } = req.query;
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }
    
    try {
      let attendanceRecords;
      
      // If date range is provided, filter by date range
      if (startDate && endDate) {
        console.log(`Fetching attendance for employee ${id} from ${startDate} to ${endDate}`);
        
        // Validate dates
        const parsedStartDate = parseISO(startDate as string);
        const parsedEndDate = parseISO(endDate as string);
        
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          throw new Error(`Invalid date format: startDate=${startDate}, endDate=${endDate}`);
        }
        
        attendanceRecords = await storage.getAttendanceByEmployeeAndDateRange(
          id,
          parsedStartDate,
          parsedEndDate
        );
      } else {
        // Get all attendance records for this employee
        attendanceRecords = await storage.getAttendanceForEmployee(id);
      }
      
      // Enhance the records with additional info for the frontend
      const employee = await storage.getEmployeeWithDetails(id);
      const enhancedRecords = attendanceRecords.map(record => ({
        ...record,
        employeeName: employee ? employee.user.name : 'Unknown Employee',
        department: employee ? employee.department.name : 'Unknown Department'
      }));
      
      return res.status(200).json(enhancedRecords);
    } catch (error) {
      console.error(`Error fetching attendance for employee ${id}:`, error);
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
          clockInTime: null,
          clockOutTime: null,
          status: 'absent',
          hoursWorked: "0", // No hours worked for absences
          geoLocation: null,
          approvedBy: null,
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
        if (!employeeWithDetails || !employeeWithDetails.user) {
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
          employeeName: employeeWithDetails.user.name,
          employeeAvatar: employeeWithDetails.user.profileImage,
          department: employeeWithDetails.department?.name || 'Unknown Department',
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
      const attendance = await storage.createAttendance(req.body);
      return res.status(201).json(attendance);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create attendance record" });
    }
  });
  
  // Update an attendance record
  app.patch("/api/attendance/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid attendance ID" });
      }
      
      const updatedAttendance = await storage.updateAttendance(id, req.body);
      
      return res.status(200).json(updatedAttendance);
    } catch (error) {
      console.error("Error updating attendance record:", error);
      return res.status(500).json({ message: "Failed to update attendance record" });
    }
  });
  
  // Delete an attendance record
  app.delete("/api/attendance/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid attendance ID" });
      }
      
      const deleted = await storage.deleteAttendance(id);
      
      if (deleted) {
        return res.status(200).json({ message: "Attendance record deleted successfully" });
      } else {
        return res.status(404).json({ message: "Attendance record not found" });
      }
    } catch (error) {
      console.error("Error deleting attendance record:", error);
      return res.status(500).json({ message: "Failed to delete attendance record" });
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
      const { code, action } = req.body;
      
      if (!code || !action) {
        return res.status(400).json({ message: "OTP code and action are required" });
      }
      
      // Find the OTP code
      const otpCode = await storage.getOtpCodeByCode(code);
      
      if (!otpCode) {
        return res.status(400).json({ message: "Invalid OTP code" });
      }
      
      // Check if OTP is expired
      const now = new Date();
      if (now > otpCode.expiresAt) {
        return res.status(400).json({ message: "OTP code has expired" });
      }
      
      // Check if OTP has been used
      if (otpCode.used) {
        return res.status(400).json({ message: "OTP code has already been used" });
      }
      
      // Get the employee with details (includes user and department info)
      const employee = await storage.getEmployeeWithDetails(otpCode.employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Clear attendance cache to ensure we get fresh data
      storage.clearTodayAttendanceCache?.();
      
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
        if (todayRecord && todayRecord.clockInTime !== null) {
          return res.status(400).json({ message: "Already clocked in for today" });
        }
        
        const status = determineAttendanceStatus(now, scheduledStartTimeMinutes, lateWindowMinutes);
        
        if (todayRecord) {
          // Update existing record with clock in
          attendance = await storage.updateAttendance(todayRecord.id, {
            clockInTime: now,
            status: status,
            hoursWorked: "0",
            notes: `Self-logged via OTP: ${action}`
          });
        } else {
          // Create new attendance record
          attendance = await storage.createAttendance({
            employeeId: otpCode.employeeId,
            date: today,
            clockInTime: now,
            clockOutTime: null,
            status: status,
            hoursWorked: "0",
            geoLocation: null,
            approvedBy: null,
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
        
        attendance = await storage.updateAttendance(todayRecord.id, {
          clockOutTime: now,
          hoursWorked: hoursWorked.toFixed(2),
          notes: `Self-logged via OTP: ${action}`
        });
      }
      
      // Mark OTP as used
      await storage.updateOtpCode(otpCode.id, { used: true });
      
      // Clear today's attendance cache again to force refresh
      storage.clearTodayAttendanceCache?.();
      
      // Return success with employee details included
      return res.status(200).json({ 
        success: true, 
        attendance,
        employee: {
          id: employee.id,
          name: employee.user.name,
          department: employee.department.name,
          profileImage: employee.user.profileImage
        }
      });
    } catch (error) {
      console.error("Error in verify-otp:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to process attendance", 
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
          employeeName: employee ? employee.user.name : 'Unknown Employee',
          department: employee ? employee.department.name : 'Unknown Department',
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
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }
    
    const payrollRecords = await storage.getPayrollForEmployee(id);
    return res.status(200).json(payrollRecords);
  });
  
  app.post("/api/payroll", validateBody(insertPayrollSchema), async (req, res) => {
    try {
      const payroll = await storage.createPayroll(req.body);
      return res.status(201).json(payroll);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create payroll record" });
    }
  });
  
  app.patch("/api/payroll/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid payroll ID" });
    }
    
    const payroll = await storage.updatePayroll(id, req.body);
    
    if (!payroll) {
      return res.status(404).json({ message: "Payroll record not found" });
    }
    
    return res.status(200).json(payroll);
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
          processedBy: 1 // Default admin user ID
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
    
    return res.status(200).json(ewaRequests);
  });
  
  app.get("/api/ewa/requests/employee/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }
    
    const ewaRequests = await storage.getEwaRequestsForEmployee(id);
    return res.status(200).json(ewaRequests);
  });
  
  app.post("/api/ewa/requests", validateBody(insertEwaRequestSchema), async (req, res) => {
    try {
      const ewaRequest = await storage.createEwaRequest(req.body);
      return res.status(201).json(ewaRequest);
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
      
      // Use the employee data directly from employeeWithDetails
      const user = employeeWithDetails.user;
      
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
      const hourlyRate = parseFloat(employeeWithDetails.hourlyRate?.toString() || "0");
      const monthlySalary = hourlyRate * 8 * totalWorkingDays; // 8 hours/day, 22 days/month
      
      const calculatedEarnedWage = monthlySalary * (daysWorked / totalWorkingDays);
      
      // 3. Validate that requested amount doesn't exceed the allowed percentage
      const maxAllowedPercentage = 0.5; // 50% of earned wage
      const maxAllowedAmount = calculatedEarnedWage * maxAllowedPercentage;
      
      if (amount > maxAllowedAmount) {
        return res.status(400).json({ 
          message: `Requested amount exceeds maximum allowed EWA (${maxAllowedAmount.toFixed(2)})`
        });
      }
      
      // 4. Create the EWA request
      const processingFee = amount * 0.05; // 5% processing fee
      const ewaRequest = await storage.createEwaRequest({
        employeeId,
        amount: amount.toString(), // Convert to string for decimal type
        processingFee: processingFee.toString(), // Convert to string for decimal type
        reason: reason || "Emergency funds needed",
        status: "pending",
        approvedBy: null
        // requestDate is defaulted by the schema
      });
      
      // 5. Update system flags to indicate integration occurred
      // (This would normally be done through a SystemContext update, 
      // but we'll simulate it by adding this info to the response)
      
      // 6. Return comprehensive response with all related data
      return res.status(201).json({
        success: true,
        ewaRequest,
        attendanceData: {
          daysWorked,
          totalWorkingDays,
          earnedWage: calculatedEarnedWage,
          maxAllowedAmount
        },
        systemUpdates: {
          attendanceProcessed: true,
          earnedWageCalculated: true,
          ewaRequestCreated: true
        }
      });
      
    } catch (error) {
      console.error("Error in integrated EWA request:", error);
      return res.status(500).json({ message: "Failed to process integrated EWA request" });
    }
  });
  
  app.patch("/api/ewa/requests/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid EWA request ID" });
    }
    
    const ewaRequest = await storage.updateEwaRequest(id, req.body);
    
    if (!ewaRequest) {
      return res.status(404).json({ message: "EWA request not found" });
    }
    
    return res.status(200).json(ewaRequest);
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
    
    const wallet = await storage.getWallet();
    
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    
    const parsedAmount = parseFloat(amount);
    
    // Always update employer balance
    const currentEmployerBalance = parseFloat(wallet.employerBalance?.toString() || "0");
    const updatedWallet = await storage.updateWallet(wallet.id, {
      employerBalance: (currentEmployerBalance + parsedAmount).toString() // Convert to string for decimal type
    });
    
    await storage.createWalletTransaction({
      walletId: wallet.id,
      amount: parsedAmount.toString(), // Convert to string for decimal type
      transactionType: 'employer_topup',
      description: 'Employer wallet top-up',
      referenceId: `TOP-${getTime(new Date())}`,
      fundingSource,
      status: 'completed'
    });
    
    // Calculate total balance for response only (not stored in DB)
    const totalBalance = updatedWallet ? (
      parseFloat(updatedWallet.employerBalance?.toString() || "0") + 
      parseFloat(updatedWallet.jahaziiBalance?.toString() || "0")
    ).toString() : "0";
    
    // Add totalBalance to the response
    return res.status(200).json({
      ...updatedWallet,
      totalBalance
    });
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
      const employeeId = parseInt(req.params.id);
      
      if (isNaN(employeeId)) {
        return res.status(400).json({ error: "Invalid employee ID" });
      }
      
      // Get the employee record
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // In a real implementation, this would retrieve the actual payment details from the database
      // For this implementation, we'll generate some mock data based on the employee ID
      
      // Determine if this employee uses bank transfer or mobile money (M-Pesa)
      const usesMpesa = employeeId % 2 === 0;
      
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
      const employeeId = parseInt(req.params.id);
      
      if (isNaN(employeeId)) {
        return res.status(400).json({ error: "Invalid employee ID" });
      }
      
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
      const employeeId = parseInt(req.params.id);
      
      if (isNaN(employeeId)) {
        return res.status(400).json({ error: "Invalid employee ID" });
      }
      
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

  app.post('/api/chat/upload', async (req, res) => {
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
      const { query, userId } = req.query;
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

  const httpServer = createServer(app);
  return httpServer;
}
