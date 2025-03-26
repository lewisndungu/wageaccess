import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertEmployeeSchema, insertAttendanceSchema, insertPayrollSchema, insertEwaRequestSchema } from "@shared/schema";
import { faker } from '@faker-js/faker';
import { generateEmptyAttendance } from './mock-data-generator';

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
    try {
      console.log("GET /api/attendance request received");
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      
      // Get attendance records based on date and optional employee filter
      let attendanceRecords;
      if (employeeId) {
        attendanceRecords = await storage.getAttendanceForEmployee(employeeId);
        // Filter by date if both employeeId and date are provided
        if (req.query.date) {
          const queryDate = new Date(req.query.date as string);
          attendanceRecords = attendanceRecords.filter(record => {
            if (!record.date) return false;
            const recordDate = new Date(record.date);
            return recordDate.getFullYear() === queryDate.getFullYear() &&
                   recordDate.getMonth() === queryDate.getMonth() &&
                   recordDate.getDate() === queryDate.getDate();
          });
        }
      } else {
        attendanceRecords = await storage.getAttendanceForDate(date);
      }
      
      console.log(`Found ${attendanceRecords.length} attendance records`);
      
      // Enhance the attendance records with employee details
      const enhancedRecords = await Promise.all(
        attendanceRecords.map(async (record) => {
          // Get the employee details including the user and department
          const employee = await storage.getEmployee(record.employeeId);
          if (!employee) {
            console.log(`Employee ${record.employeeId} not found`);
            return {
              ...record,
              employeeName: 'Unknown Employee',
              department: 'Unknown Department'
            };
          }
          
          // Get user and department separately
          const user = await storage.getUser(employee.userId);
          const department = await storage.getDepartment(employee.departmentId);
          
          // Log the found employee details
          console.log(`Found employee ${employee.id}: User=${user?.name}, Dept=${department?.name}`);
          
          // Return the enhanced record with employee name and department
          return {
            ...record,
            employeeName: user?.name || 'Unknown Employee',
            department: department?.name || 'Unknown Department'
          };
        })
      );
      
      console.log(`Returning ${enhancedRecords.length} enhanced records`);
      
      return res.status(200).json(enhancedRecords);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
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
      
      // In a real implementation, you would:
      // 1. Validate the company ID
      // 2. Generate a secure QR code with cryptographic signatures
      // 3. Store the QR code data in a database for validation when scanned
      
      // For this demo, we'll generate a simple QR code with dummy data
      const qrData = {
        companyId,
        timestamp,
        location: location || null,
        exp: new Date(timestamp + expiresIn * 1000).toISOString()
      };
      
      // Create a data URL for a QR code (in a real app, use a QR code generation library)
      // Here we're just creating a placeholder image URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const qrCodeUrl = `${baseUrl}/api/qr-placeholder?data=${encodeURIComponent(JSON.stringify(qrData))}`;
      
      // Calculate expiration time
      const expiresAt = new Date(timestamp + expiresIn * 1000).toISOString();
      
      return res.status(200).json({
        qrCodeUrl,
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
  
  app.get("/api/attendance/employee/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }
    
    const attendanceRecords = await storage.getAttendanceForEmployee(id);
    return res.status(200).json(attendanceRecords);
  });
  
  // Clock In/Out endpoint with enhanced status detection
  app.post("/api/attendance/clock", async (req, res) => {
    try {
      const { employeeId, action, timestamp, location } = req.body;
      
      if (!employeeId || !action) {
        return res.status(400).json({ message: "Employee ID and action are required" });
      }
      
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const now = timestamp ? new Date(timestamp) : new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Check for existing attendance record for today
      const existingRecords = await storage.getAttendanceForEmployee(employeeId);
      const todayRecord = existingRecords.find(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === today.getFullYear() &&
               recordDate.getMonth() === today.getMonth() &&
               recordDate.getDate() === today.getDate();
      });
      
      // Define standard work schedule (configurable in a real app)
      const scheduledStartTimeMinutes = 9 * 60; // 9:00 AM in minutes since midnight
      const lateWindowMinutes = 15; // 15 minute grace period
      
      // Calculate current time in minutes since midnight for comparison
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      
      let attendance;
      
      if (todayRecord) {
        // Update existing record
        if (action === 'clockIn' && !todayRecord.clockInTime) {
          // Determine status based on clock-in time
          const status = determineAttendanceStatus(now, scheduledStartTimeMinutes, lateWindowMinutes);
          
          attendance = await storage.updateAttendance(todayRecord.id, {
            clockInTime: now,
            status: status,
            hoursWorked: "0", // Will be updated on clock-out
            ...(location ? { geoLocation: JSON.stringify(location) } : {})
          });
        } else if (action === 'clockOut' && todayRecord.clockInTime && !todayRecord.clockOutTime) {
          // Calculate hours worked for payroll calculations
          const clockIn = new Date(todayRecord.clockInTime);
          const hoursWorked = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          console.log(`Employee ${employeeId} worked ${hoursWorked.toFixed(2)} hours`);
          
          attendance = await storage.updateAttendance(todayRecord.id, {
            clockOutTime: now,
            hoursWorked: hoursWorked.toFixed(2),
            ...(location ? { geoLocation: JSON.stringify(location) } : {})
          });
        } else {
          return res.status(400).json({ 
            message: action === 'clockIn' 
              ? "Already clocked in for today" 
              : "Cannot clock out without clocking in first"
          });
        }
      } else if (action === 'clockIn') {
        // Create new attendance record for clock in
        const status = determineAttendanceStatus(now, scheduledStartTimeMinutes, lateWindowMinutes);
        
        attendance = await storage.createAttendance({
          employeeId,
          date: today,
          clockInTime: now,
          clockOutTime: null,
          status: status,
          hoursWorked: "0", // Will be updated on clock-out
          geoLocation: location ? JSON.stringify(location) : null,
          approvedBy: null,
          notes: `Self-logged via app: ${action}`
        });
      } else {
        return res.status(400).json({ message: "Cannot clock out without clocking in first" });
      }
      
      return res.status(200).json(attendance);
    } catch (error) {
      console.error("Error in clock in/out:", error);
      return res.status(500).json({ 
        message: "Failed to process attendance", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.post("/api/attendance", validateBody(insertAttendanceSchema), async (req, res) => {
    try {
      const attendance = await storage.createAttendance(req.body);
      return res.status(201).json(attendance);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create attendance record" });
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
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Check for existing attendance record for today
      const existingRecords = await storage.getAttendanceForEmployee(otpCode.employeeId);
      const todayRecord = existingRecords.find(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === today.getFullYear() &&
               recordDate.getMonth() === today.getMonth() &&
               recordDate.getDate() === today.getDate();
      });
      
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
        const hoursWorked = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        
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
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const payrollRecords = await storage.getPayrollForPeriod(startDate, endDate);
      return res.status(200).json(payrollRecords);
    } else {
      // Return current month's payroll by default
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const payrollRecords = await storage.getPayrollForPeriod(startDate, endDate);
      return res.status(200).json(payrollRecords);
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
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const attendanceRecords = await storage.getAttendanceForEmployee(employeeId);
      
      // Filter for this month's records
      const thisMonthAttendance = attendanceRecords.filter(record => {
        // Safely handle date - ensure it's not null
        if (record.date) {
          const recordDate = new Date(record.date);
          return recordDate >= startOfMonth && recordDate <= now;
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
      referenceId: `TOP-${Date.now()}`,
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
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

  const httpServer = createServer(app);
  return httpServer;
}
