import * as storageModule from './storage';
import { Employee, InsertEmployee, ServerPayrollResponse } from '../shared/schema';
import { formatKEDate, formatKESCurrency } from '../client/src/lib/format-utils';
import { calculatePayrollBasedOnAttendance } from '../client/src/lib/kenyan-payroll';
import * as XLSX from 'xlsx';

// Column mapping configuration - Based on User's Master Template
const columnMappings: Record<string, string> = {
  'Emp No': 'employeeNumber', // Maps to Employee.employeeNumber
  'Employee Name': 'fullName', // Will be split into surname & other_names later
  'Probation Period': 'is_on_probation', // Maps to Employee.is_on_probation (boolean)
  'ID Number': 'id_no', // Maps to Employee.id_no
  'KRA Pin': 'tax_pin', // Maps to Employee.tax_pin
  'NSSF No': 'nssf_no', // Maps to Employee.nssf_no (Membership No)
  'NHIF No': 'nhif_no', // Maps to Employee.nhif_no (Membership No)
  'Position': 'position', // Maps to Employee.position
  'Gross Pay': 'gross_income', // Maps to Employee.gross_income
  'PAYE': 'statutory_deductions.tax', // Maps to Employee.statutory_deductions.tax
  'NSSF': 'statutory_deductions.nssf', // Maps to Employee.statutory_deductions.nssf (Deduction Amount)
  'NHIF': 'statutory_deductions.nhif', // Maps to Employee.statutory_deductions.nhif (Deduction Amount)
  'Levy': 'statutory_deductions.levy', // Maps to Employee.statutory_deductions.levy
  'Loan Deduction': 'loan_deductions', // Maps to Employee.loan_deductions
  'Employer Advance': 'employer_advances', // Maps to Employee.employer_advances
  'Net Pay': 'net_income', // Maps to Employee.net_income
  'MPesa Number': 'contact.phoneNumber', // Maps to Employee.contact.phoneNumber
  'Bank Account Number': 'bank_info.acc_no', // Maps to Employee.bank_info.acc_no
  'T & C Accepted': 'terms_accepted', // Maps to Employee.terms_accepted
  'CONTACTS': 'contact.phoneNumber', // Alternative mapping for phone number
  'GENDER': 'sex', // Maps to Employee.sex
  'BANK CODE': 'bank_info.bank_code', // Maps to Employee.bank_info.bank_code
  'BANK': 'bank_info.bank_name', // Maps to Employee.bank_info.bank_name
  'HOUSE ALLOWANCE': 'house_allowance', // No direct mapping in Employee, consider if needed
  'JAHAZII': 'jahazii_advances', // Maps to Employee.jahazii_advances
  'STATUS': 'status', // Maps to Employee.status
};

// Define a simplified file interface instead of using Express.Multer.File
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  path?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  type: string;
  content: string;
  timestamp: Date;
  fileData?: any;
  employeeData?: any;
  actions?: ChatAction[];
  metadata?: any;
}

export interface ChatAction {
  id: string;
  label: string;
  icon?: string;
}

export interface ChatHistory {
  userId: string;
  messages: ChatMessage[];
  commands: string[];
  searches: string[];
}

export function createChatService() {
  return {
    async processMessage(message: string, userId: string): Promise<ChatMessage> {
      // Save the command to history
      await storageModule.saveCommand(userId, message);
      
      const lowerMessage = message.toLowerCase();
      let response: ChatMessage = {
        id: Date.now().toString(),
        userId,
        type: 'system',
        content: 'I processed your message',
        timestamp: new Date()
      };
      
      // Basic message processing logic, similar to the client-side implementation
      if (lowerMessage.includes('find employee') || lowerMessage.includes('search for') || lowerMessage.includes('look up')) {
        const searchTerms = message.match(/(?:find|search for|look up)(?:\s+employee)?\s+(.+)/i);
        
        if (searchTerms && searchTerms[1]) {
          const query = searchTerms[1].trim();
          await storageModule.saveSearch(userId, query);
          
          // Implement employee search logic here
          const employees = await storageModule.storage.findEmployees({ query });
          
          if (employees.length > 0) {
            response = {
              id: Date.now().toString(),
              userId,
              type: 'system',
              content: `I found ${employees.length} employee(s) matching "${query}":`,
              timestamp: new Date(),
              actions: [
                {
                  id: 'view-all-employees',
                  label: 'View All Employees'
                },
                {
                  id: 'add-employee',
                  label: 'Add New Employee'
                }
              ]
            };
            
            // Additional logic to format and return employee data
          } else {
            response = {
              id: Date.now().toString(),
              userId,
              type: 'system',
              content: `I couldn't find any employees matching "${query}". Please try a different name or ID.`,
              timestamp: new Date(),
              actions: [
                {
                  id: 'upload-employees',
                  label: 'Upload Employee Data'
                },
                {
                  id: 'add-employee',
                  label: 'Add New Employee'
                }
              ]
            };
          }
        }
      }
      // Handle other message types (similar to client-side implementation)
      else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        response = {
          id: Date.now().toString(),
          userId,
          type: 'system',
          content: `I can help you with the following tasks:
            
1. **Process Employee Data**: Upload spreadsheets with employee information
2. **Batch Upload Employees**: Add multiple employees from a spreadsheet
3. **Export Payroll**: Generate and download payroll data with Kenyan tax calculations
4. **Manage Employees**: Find, update, or query employee information
5. **Calculate Taxes**: Compute PAYE, NHIF, NSSF, and Housing Levy according to KRA regulations

You can also use the quick action buttons below the chat to access common functions.`,
          timestamp: new Date(),
          actions: [
            {
              id: 'find-employee',
              label: 'Find Employee'
            },
            {
              id: 'upload-data',
              label: 'Upload Data'
            },
            {
              id: 'calculate-payroll',
              label: 'Calculate Payroll'
            }
          ]
        };
      }
      
      // Save the message
      await storageModule.saveMessage({
        id: Date.now().toString(),
        userId,
        type: 'user',
        content: message,
        timestamp: new Date()
      });
      
      // Save the response
      const savedResponse = await storageModule.saveMessage(response);
      
      return savedResponse;
    },
    
    async getHistory(userId: string): Promise<ChatHistory> {
      const history = await storageModule.getUserChatHistory(userId);
      if (!history) {
        return {
          userId,
          messages: [],
          commands: [],
          searches: []
        };
      }
      
      // Get the most recent messages
      const messages = await storageModule.getMessagesByUser(userId);
      
      return {
        ...history,
        messages
      };
    },
    
    async processFile(file: UploadedFile, userId: string): Promise<any> {
      // Implement file processing logic with advanced data extraction
      try {
        // Read directly from the buffer
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        // Find actual data rows (skip headers)
        const dataRows = findActualDataRows(jsonData as Record<string, any>[]);
        
        // Process the data through our transformation pipeline
        const { transformedData, failedRows } = transformData(dataRows.length > 0 ? dataRows : jsonData as Record<string, any>[]);
        
        let extractedData = transformedData;
        let finalFailedRows = failedRows;
        
        // If no data was extracted using standard transformation, try direct extraction
        if (transformedData.length === 0 && jsonData.length > 0) { // Check jsonData length
          const { directExtracted, directFailedRows } = directDataExtraction(jsonData as Record<string, any>[]);
          if (directExtracted.length > 0) { // Only use if direct extraction found something
             extractedData = directExtracted;
             finalFailedRows = [...failedRows, ...directFailedRows]; // Combine failed rows
          } else {
             // If both standard and direct fail, add all original rows (if any) as failed
             if (dataRows.length > 0) {
                finalFailedRows = dataRows.map((row, index) => ({
                    row: row,
                    reason: `Row ${index + 1}: Could not automatically map or extract data. Requires manual review.`
                }));
             } else if (jsonData.length > 0) {
                 finalFailedRows = (jsonData as Record<string, any>[]).map((row, index) => ({
                    row: row,
                    reason: `Row ${index + 1}: Could not automatically map or extract data. Requires manual review.`
                 }));
             }
          }
        } else if (transformedData.length === 0 && jsonData.length === 0) {
            // Handle case where the file was empty or contained no processable data
            finalFailedRows = [{ row: {}, reason: "No data found in the uploaded file." }];
        }
        
        // Format the result - Return extractedData directly
        const result = {
          // No longer returning headers from backend
          extractedData: extractedData, // Use the data from transformation/extraction
          failedRows: finalFailedRows,
          fileName: file.originalname
        };
        
        // Save a message about the file upload
        const fileMessage: ChatMessage = {
          id: Date.now().toString(),
          userId,
          type: 'file',
          content: `Processed: ${file.originalname}. Found ${extractedData.length} potential records, ${finalFailedRows.length} rows need attention.`, // Updated content
          timestamp: new Date(),
          fileData: { // Keep fileData for potential use, but structure might differ now
             fileName: result.fileName,
             recordCount: extractedData.length,
             failedCount: finalFailedRows.length
          },
          // Add actions based on processing outcome
          actions: extractedData.length > 0 ? [
            {
              id: 'view-data',
              label: 'Review & Import' // Changed label
            }
          ] : (finalFailedRows.length > 0 ? [{ id: 'view-failed-rows', label: 'View Failed Rows'}] : []), // Add action for failed rows if no success
          metadata: { // Add counts to metadata
             processedCount: extractedData.length,
             failedCount: finalFailedRows.length
          }
        };
        
        await storageModule.saveMessage(fileMessage);
        
        return result; // Return the structured result
      } catch (error: any) { // Handle as a generic error with message property
        console.error('Error processing file:', error);
        // Optionally save an error message to chat history
         await storageModule.saveMessage({
             id: Date.now().toString(),
             userId,
             type: 'system',
             content: `Error processing file ${file.originalname}: ${error.message || 'Unknown error'}`,
             timestamp: new Date(),
             metadata: { error: true }
         });
        throw new Error(`Failed to process file: ${error.message || 'Unknown error'}`);
      }
    },
    
    async searchEmployee(query: string, userId: string): Promise<any[]> {
      // Save the search query
      await storageModule.saveSearch(userId, query);
      
      // Implement employee search logic
      const employees = await storageModule.storage.findEmployees({ query });
      
      return employees;
    },
    
    async importEmployees(data: InsertEmployee[], userId: string): Promise<any> {
      // Log request details
      console.log(
        `Chat service importEmployees called with ${data.length} employees`
      );

      // Flush all data before importing new ones
      await storageModule.storage.flushAllData();

      // Implement employee import logic with server-generated IDs
      const addedCount = await storageModule.storage.addEmployees(data);

      // Generate mock data for the newly imported employees
      console.log('Generating mock data for the newly imported employees...');
      const mockDataResults = await storageModule.storage.generateAllMockDataForEmployees(30);
      
      console.log(`Mock data generation results: 
        - ${mockDataResults.attendanceRecords} attendance records
        - ${mockDataResults.payrollRecords} payroll records
        - ${mockDataResults.ewaRequests} EWA requests
        - ${mockDataResults.todayRecords} attendance records for today (not clocked in yet)`);

      // Save a message about the import and data generation
      const importMessage: ChatMessage = {
        id: Date.now().toString(),
        userId,
        type: "system",
        content: `✅ Successfully imported ${addedCount} employees and generated: 
- ${mockDataResults.attendanceRecords} attendance records
- ${mockDataResults.payrollRecords} payroll records
- ${mockDataResults.ewaRequests} EWA requests
- ${mockDataResults.todayRecords} attendance records for today (not clocked in yet)`,
        timestamp: new Date(),
      };

      await storageModule.saveMessage(importMessage);

      return { 
        success: true, 
        count: addedCount,
        mockData: mockDataResults 
      };
    },
    
    async calculatePayroll(employeeIds: string[], userId: string): Promise<ServerPayrollResponse[]> {
      // Implement payroll calculation logic
      const employees = await storageModule.storage.getEmployees(employeeIds);
      
      const payrollData = employees.map((employee: any) => {
        const grossPay = employee.salary || employee.gross_income || 0;
        
        // Mock attendance data
        const standardHours = 160;
        const workedHours = Math.floor(Math.random() * 40) + 130;
        
        // For employees with no salary/gross_income, return minimal data
        if (grossPay <= 0) {
          return {
            'Employee ID': employee.id || 'N/A',
            'Name': `${employee.other_names || ''} ${employee.surname || ''}`.trim() || 'Unknown',
            'Position': employee.position || 'N/A',
            'Standard Hours': standardHours,
            'Worked Hours': 0,
            'Gross Pay': 0,
            'Taxable Pay': 0,
            'Tax (PAYE)': 0,
            'NHIF': 0,
            'NSSF': 0,
            'Housing Levy': 0,
            'Total Deductions': 0,
            'Net Pay': 0
          };
        }
        
        const payrollCalculation = calculatePayrollBasedOnAttendance(
          grossPay,
          standardHours,
          workedHours
        );
        
        return {
          'Employee ID': employee.id || 'N/A',
          'Name': `${employee.other_names || ''} ${employee.surname || ''}`.trim() || 'Unknown',
          'Position': employee.position || 'N/A',
          'Standard Hours': standardHours,
          'Worked Hours': workedHours,
          'Gross Pay': grossPay,
          'Taxable Pay': payrollCalculation.taxablePay,
          'Tax (PAYE)': payrollCalculation.paye,
          'NHIF': payrollCalculation.nhif,
          'NSSF': payrollCalculation.nssf,
          'Housing Levy': payrollCalculation.housingLevy,
          'Total Deductions': payrollCalculation.totalDeductions,
          'Net Pay': payrollCalculation.netPay
        };
      });
      
      // Save a message about the payroll calculation
      const payrollMessage: ChatMessage = {
        id: Date.now().toString(),
        userId,
        type: 'system',
        content: `✅ Payroll calculation complete! Generated payroll for ${payrollData.length} employees.`,
        timestamp: new Date()
      };
      
      await storageModule.saveMessage(payrollMessage);
      
      return payrollData;
    },
    
    // Format employee data for display in chat
    formatEmployeeInfo(employee: any): string {
      return `
**${employee.name}**
Position: ${employee.position}
Hire Date: ${formatKEDate(employee.hireDate)}
Salary: ${formatKESCurrency(employee.salary)}
      `.trim();
    },
    
    // Get user ID - server-side implementation 
    getUserId(): string {
      return 'anonymous-user'; // Server-side fallback that doesn't use localStorage
    }
  };
}

// Improved function to find the closest matching column
function findBestMatch(targetColumn: string, availableColumns: string[]): string | null {
  // Maps master template names (and variations) to themselves for matching logic
  const specialCases: Record<string, string[]> = {
    // Master Template Keys & Variations
    'Emp No': ['EMPLO NO.', 'EMPLOYEE NO', 'EMPLOYEE NUMBER', 'EMP NUMBER', 'STAFF NO', 'PAYROLL NO', 'ID'],
    'Employee Name': ['EMPLOYEES\' FULL NAMES', 'FULL NAME', 'NAME', 'EMPLOYEE NAMES', 'STAFF NAME', 'EMPLOYEE FULL NAME', 'SURNAME', 'OTHER NAMES'],
    'Probation Period': ['PROBATION', 'ON PROBATION'],
    'ID Number': ['ID NO', 'NATIONAL ID', 'IDENTITY NUMBER', 'ID', 'IDENTIFICATION'],
    'KRA Pin': ['KRA PIN NO.', 'KRA', 'PIN NO', 'PIN NUMBER', 'TAX PIN'],
    'NSSF No': ['NSSF NUMBER', 'NSSF', 'SOCIAL SECURITY NO'], // Membership Number
    'Position': ['JOB TITTLE', 'TITLE', 'JOB TITLE', 'DESIGNATION', 'ROLE'],
    'Gross Pay': ['BASIC SALARY', 'SALARY', 'GROSS SALARY', 'GROSS', 'MONTHLY SALARY', 'GROSS INCOME', 'NET INCOME', 'BASIC PAY'],
    'PAYE': ['TAX', 'INCOME TAX'],
    'NSSF': ['NSSF', 'NSSF DEDUCTION', 'NSSF CONTRIBUTION'], // Deduction Amount
    'NHIF': ['NHIF NO', 'NHIF DEDUCTION', 'NHIF CONTRIBUTION', 'HEALTH INSURANCE', 'HEALTH INSURANCE NO', 'SHIF'], // Deduction Amount
    'Levy': ['H-LEVY', 'HOUSING LEVY', 'HOUSE LEVY', 'HOUSING', 'LEVIES'],
    'Loan Deduction': ['LOANS', 'LOAN', 'LOAN REPAYMENT', 'DEBT REPAYMENT', 'TOTAL LOAN DEDUCTIONS'],
    'Employer Advance': ['ADVANCE', 'SALARY ADVANCE', 'ADVANCE SALARY', 'ADVANCE PAYMENT', 'EMPLOYER ADVANCES'],
    'Net Pay': ['NET SALARY', 'TAKE HOME', 'FINAL PAY'],
    'MPesa Number': ['MPESA', 'MOBILE MONEY', 'PHONE NO', 'MOBILE NO'],
    'Bank Account Number': ['BANK ACC', 'BANK ACCOUNT', 'ACCOUNT NUMBER', 'ACC NO', 'ACCOUNT NO'],
    'T & C Accepted': ['TERMS ACCEPTED', 'T&C', 'AGREED TERMS'],
    'CONTACTS': ['CONTACT', 'CONTACTS', 'PHONE', 'MOBILE', 'TELEPHONE', 'PHONE NUMBER', 'MOBILE NUMBER'],
    'GENDER': ['SEX', 'MALE/FEMALE', 'M/F'],
    'BANK CODE': ['BANK BRANCH CODE', 'BRANCH CODE'],
    'BANK': ['BANK NAME'],
    'HOUSE ALLOWANCE': ['HSE ALLOWANCE', 'H/ALLOWANCE', 'HOUSING'],
    'JAHAZII': ['JAHAZII ADVANCE', 'JAHAZII LOAN'],
    'STATUS': ['EMPLOYEE STATUS', 'ACTIVE', 'INACTIVE', 'EMPLOYMENT STATUS'],
  };

  const cleanedAvailableColumns = availableColumns.map(col => {
    if (col && col.startsWith('__EMPTY')) return null;
    return col;
  }).filter(Boolean) as string[];

  const exactMatch = cleanedAvailableColumns.find(col => 
    col && col.toLowerCase() === targetColumn.toLowerCase());
  if (exactMatch) return exactMatch;
  
  if (specialCases[targetColumn]) {
    for (const variation of specialCases[targetColumn]) {
      const specialMatch = cleanedAvailableColumns.find(col => 
        col && col.toLowerCase() === variation.toLowerCase());
      if (specialMatch) return specialMatch;
    }
  }
  
  for (const col of cleanedAvailableColumns) {
    if (col && (col.toLowerCase().includes(targetColumn.toLowerCase()) || 
        targetColumn.toLowerCase().includes(col.toLowerCase()))) {
      return col;
    }
  }
  
  const targetWords = targetColumn.toLowerCase().split(/[\s.,\-_]+/).filter(word => word.length > 2);
  for (const col of cleanedAvailableColumns) {
    if (!col) continue;
    const colWords = col.toLowerCase().split(/[\s.,\-_]+/).filter(word => word.length > 2);
    const hasCommonWords = targetWords.some(word => colWords.includes(word));
    if (hasCommonWords) return col;
  }
  
  return null;
}

// Function to skip header rows and find the actual data rows
function findActualDataRows(data: Array<Record<string, any>>): Array<Record<string, any>> {
  const dataStartIndex = data.findIndex(row => {
    const rowValues = Object.values(row).map(v => String(v || '').toLowerCase());
    return rowValues.some(v => 
      v.includes('employee') || v.includes('name') || v.includes('emp') || 
      v.includes('no.') || v.includes('salary') || v.includes('id')
    );
  });

  if (dataStartIndex >= 0) {
    return data.slice(dataStartIndex + 1);
  }
  
  return data;
}

// Helper function to set nested values in an object using dot notation
function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

// Function to parse boolean values leniently
function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerVal = value.trim().toLowerCase();
    return lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1';
  }
  return !!value; // Fallback for numbers or other types
}

// Function to parse numeric values, defaulting to 0 if invalid
function parseNumber(value: any, defaultValue = 0): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(String(value).replace(/,/g, '')); // Remove commas before parsing
  return isNaN(num) ? defaultValue : num;
}

// Transform data function
function transformData(data: Array<Record<string, any>>): {
  transformedData: Array<Record<string, any>>;
  failedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  if (!data || data.length === 0) {
    return { transformedData: [], failedRows: [] };
  }
  
  const originalHeaders = Object.keys(data[0]);
  const headerMapping: Record<string, string> = {};
  const failedRows: Array<{row: Record<string, any>, reason: string}> = [];
  
  Object.entries(columnMappings).forEach(([original, target]) => {
    const bestMatch = findBestMatch(original, originalHeaders);
    if (bestMatch) {
      headerMapping[bestMatch] = target;
    }
  });
  
  if (Object.keys(headerMapping).length === 0) {
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      for (const [key, value] of Object.entries(row)) {
        const valueStr = String(value).trim().toLowerCase();
        if (!valueStr) continue;
        
        for (const [original, target] of Object.entries(columnMappings)) {
          const originalLower = original.toLowerCase();
          if (valueStr.includes(originalLower) || 
              originalLower.includes(valueStr)) {
            const rowIndex = i;
            
            if (rowIndex < data.length - 1) {
              // Call extractDataWithDetectedHeaders but return its result directly
              return extractDataWithDetectedHeaders(data.slice(rowIndex), data.slice(rowIndex + 1));
            }
          }
        }
      }
    }
    // If no mapping found after checking initial rows, mark all as failed
    return {
      transformedData: [],
      failedRows: data.map((row, index) => ({ row, reason: `Row ${index + 1}: Could not detect headers or map data.` }))
    };
  }
  
  const transformedData = data.map((row, rowIndex) => {
    // Skip rows that look like headers or are empty
    const isEmpty = Object.values(row).every(val => 
      val === "" || val === null || val === undefined
    );
    if (isEmpty) return null;

    // Basic header row check (might need refinement)
    const isPossiblyHeader = Object.values(row).some(val => 
        typeof val === 'string' && 
        Object.keys(columnMappings).some(colKey => val.toLowerCase().includes(colKey.toLowerCase()))
    );
    if (rowIndex === 0 && isPossiblyHeader && data.length > 1) return null; // Skip first row if it looks like a header
    
    // Initialize with Employee interface structure and defaults
    const transformedRow: Employee & { extractionErrors?: string[] } = {
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: 'active',
      is_on_probation: false,
      role: 'employee',
      country: 'KE',
      statutory_deductions: { nhif: 0, nssf: 0, tax: 0, levy: 0 },
      contact: { email: '', phoneNumber: '' },
      bank_info: { acc_no: null, bank_name: null, bank_code: null },
      gross_income: 0,
      net_income: 0,
      total_deductions: 0,
      loan_deductions: 0,
      employer_advances: 0,
      jahazii_advances: 0,
      max_salary_advance_limit: 0,
      available_salary_advance_limit: 0,
      terms_accepted: false,
      surname: '',
      other_names: '',
      id_no: '',
      tax_pin: '',
      sex: '',
      nssf_no: '',
      nhif_no: '', // Ensure nhif_no is initialized
      employeeNumber: '',
      position: '',
      extractionErrors: [], // Initialize error array
      total_loan_deductions: 0,
      id_confirmed: false,
      mobile_confirmed: false,
      tax_pin_verified: false,
      hourlyRate: 0,
      hoursWorked: 0,
      startDate: new Date(),
      created_at: new Date(),
      modified_at: new Date(),
      active: true,
      house_allowance: 0,
      documents: {},
      crb_reports: {},
      username: '',
      password: '',
    };

    let mappedFields = 0;

    Object.entries(row).forEach(([key, value]) => {
      if (headerMapping[key] && value !== null && value !== undefined && String(value).trim() !== '') {
        const targetField = headerMapping[key];
        const processedValue = String(value).trim();

        try {
          if (targetField === 'fullName') {
            const nameParts = processedValue.split(/\s+/);
            if (nameParts.length >= 2) {
              transformedRow.surname = nameParts.slice(-1).join(' ');
              transformedRow.other_names = nameParts.slice(0, -1).join(' ');
            } else {
              transformedRow.other_names = processedValue;
              // Keep surname empty if only one part
            }
          } else if (targetField === 'is_on_probation' || targetField === 'terms_accepted') {
            setNestedValue(transformedRow, targetField, parseBoolean(processedValue));
          } else if (
            targetField.startsWith('statutory_deductions.') ||
            targetField === 'gross_income' ||
            targetField === 'net_income' ||
            targetField === 'loan_deductions' ||
            targetField === 'employer_advances' ||
            targetField === 'jahazii_advances' ||
            targetField === 'house_allowance' // Include house_allowance for parsing
          ) {
            setNestedValue(transformedRow, targetField, parseNumber(processedValue));
          } else {
            // Default case: set the value directly
            setNestedValue(transformedRow, targetField, processedValue);
          }
          mappedFields++;
        } catch (e) {
          console.warn(`Error processing field '${targetField}' with value '${value}' for row index ${rowIndex}:`, e);
          transformedRow.extractionErrors?.push(`Error processing ${targetField}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    });
    
    // Post-processing and calculations
    // Calculate total deductions (including potential house_allowance if parsed)
    const houseAllowance = (transformedRow as any).house_allowance ?? 0; // Get house allowance if it exists
    transformedRow.total_deductions =
      (transformedRow.statutory_deductions?.tax ?? 0) +
      (transformedRow.statutory_deductions?.nssf ?? 0) +
      (transformedRow.statutory_deductions?.nhif ?? 0) +
      (transformedRow.statutory_deductions?.levy ?? 0) +
      (transformedRow.loan_deductions ?? 0) +
      (transformedRow.employer_advances ?? 0) +
      houseAllowance; // Add house allowance to total deductions

    // Calculate net income if not directly mapped and gross income is present
    if (transformedRow.gross_income && !Object.values(headerMapping).includes('net_income')) {
      transformedRow.net_income = (transformedRow.gross_income ?? 0) - (transformedRow.total_deductions ?? 0);
    }
    
    // Calculate EWA limits based on net income
    const netIncomeForLimit = transformedRow.net_income ?? 0;
    if (netIncomeForLimit > 0 && !transformedRow.max_salary_advance_limit) { // Only calculate if not explicitly provided
      transformedRow.max_salary_advance_limit = Math.floor(netIncomeForLimit * 0.5);
      transformedRow.available_salary_advance_limit = transformedRow.max_salary_advance_limit; // Set available initially
    }

    // --- ADD SANITY CHECKS ---
    const gross = transformedRow.gross_income ?? 0;
    const nhif = transformedRow.statutory_deductions?.nhif ?? 0;
    const nssf = transformedRow.statutory_deductions?.nssf ?? 0;
    const levy = transformedRow.statutory_deductions?.levy ?? 0;
    const totalDed = transformedRow.total_deductions ?? 0;

    // Check statutory deductions against known caps/reasonableness
    if (nhif > 1700) { // NHIF cap is 1700
        transformedRow.extractionErrors?.push(`Warning: NHIF (${nhif}) exceeds the KES 1700 cap.`);
    }
    if (nssf > 2160) { // NSSF Tier II cap is 1080, Tier I+II is 2160. Check against higher cap.
        transformedRow.extractionErrors?.push(`Warning: NSSF (${nssf}) exceeds the KES 2160 cap.`);
    }
     if (levy > 2500) { // Housing Levy cap is 2500
        transformedRow.extractionErrors?.push(`Warning: Housing Levy (${levy}) exceeds the KES 2500 cap.`);
    }
     // Check if total deductions exceed gross income (only if gross > 0)
     if (gross > 0 && totalDed > gross) {
         transformedRow.extractionErrors?.push(`Warning: Total Deductions (${totalDed}) exceed Gross Income (${gross}).`);
     }
    // --- END SANITY CHECKS ---

    // Final validation (mapped fields, identifier)
    const hasIdentifier = transformedRow.employeeNumber || transformedRow.other_names || transformedRow.surname;
    
    if (mappedFields < 3 || !hasIdentifier) {
      failedRows.push({
        row,
        reason: `Row ${rowIndex + 1}: Only ${mappedFields} fields mapped or no clear identifier (Name/Emp No).`
      });
      return null; // Mark row as failed
    }
    

    return transformedRow; // Return the processed row
  })
  .filter((row): row is Employee & { extractionErrors?: string[] } => {
    return row !== null && typeof row === 'object';
  }); // Filter out null rows and ensure type safety
  
  return { transformedData, failedRows };
}

// Extract data with detected headers
function extractDataWithDetectedHeaders( allRows: Array<Record<string, any>>, dataRows: Array<Record<string, any>>): {
  transformedData: Array<Record<string, any>>;
  failedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  if (allRows.length === 0 || dataRows.length === 0) {
    return { transformedData: [], failedRows: [] };
  }
  
  const headerRow = allRows[0]; // The row identified as a potential header
  const headerMapping: Record<string, string> = {}; // Maps internal key (e.g., '__EMPTY_1') to target field (e.g., 'fullName')
  const failedRows: Array<{row: Record<string, any>, reason: string}> = [];
  
  // Extract detected header values and their original keys
  const detectedHeaders = Object.entries(headerRow)
                              .map(([key, value]) => ({ key, value: String(value || '').trim() }))
                              .filter(h => h.value);
  const detectedHeaderValues = detectedHeaders.map(h => h.value);

  // Iterate through the MASTER template keys we expect (from columnMappings)
  for (const masterKey of Object.keys(columnMappings)) {
    const targetFieldName = columnMappings[masterKey]; // e.g., 'fullName'

    // Use findBestMatch to find the best matching DETECTED header VALUE for this masterKey
    const bestMatchValue = findBestMatch(masterKey, detectedHeaderValues);

    if (bestMatchValue) {
      // Find the original internal key corresponding to this best matching value
      const matchingHeader = detectedHeaders.find(h => h.value === bestMatchValue);
      if (matchingHeader) {
        // Map the internal key (e.g., '__EMPTY_1') to the target field name (e.g., 'fullName')
        // Avoid overwriting if multiple masterKeys somehow map to the same detected header
        if (!headerMapping[matchingHeader.key]) {
             headerMapping[matchingHeader.key] = targetFieldName;
        }
      }
    }
  }

  // If very few headers were mapped, consider it a failure
  if (Object.keys(headerMapping).length < 3) {
      return {
          transformedData: [],
          failedRows: dataRows.map((row, index) => ({ row, reason: `Row ${index + 1}: Could not reliably map detected headers.` }))
      };
  }
  
  const transformedData = dataRows.map((row, rowIndex) => {
    const isEmpty = Object.values(row).every(val => 
      val === "" || val === null || val === undefined
    );
    if (isEmpty) return null;

    // No need for header check here as we are processing rows after the detected header
    
    // Initialize with Employee interface structure and defaults
    const transformedRow: Partial<Employee> & { extractionErrors?: string[] } = {
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: 'active',
      is_on_probation: false,
      role: 'employee',
      country: 'KE',
      statutory_deductions: { nhif: 0, nssf: 0, tax: 0, levy: 0 },
      contact: { email: '', phoneNumber: '' },
      bank_info: { acc_no: null, bank_name: null, bank_code: null },
      gross_income: 0,
      net_income: 0,
      total_deductions: 0,
      loan_deductions: 0,
      employer_advances: 0,
      jahazii_advances: 0,
      max_salary_advance_limit: 0,
      available_salary_advance_limit: 0,
      terms_accepted: false,
      surname: '',
      other_names: '',
      id_no: '',
      tax_pin: '',
      sex: '',
      nssf_no: '',
      nhif_no: '', // Ensure nhif_no is initialized
      employeeNumber: '',
      position: '',
      extractionErrors: [], // Initialize error array
    };
    
    let mappedFields = 0;
    
    Object.entries(row).forEach(([key, value]) => {
      // Use the headerMapping derived from detected headers
      if (headerMapping[key] && value !== null && value !== undefined && String(value).trim() !== '') {
        const targetField = headerMapping[key];
        const processedValue = String(value).trim();

        try {
          if (targetField === 'fullName') {
            const nameParts = processedValue.split(/\s+/);
            if (nameParts.length >= 2) {
              transformedRow.surname = nameParts.slice(-1).join(' ');
              transformedRow.other_names = nameParts.slice(0, -1).join(' ');
            } else {
              transformedRow.other_names = processedValue;
            }
          } else if (targetField === 'is_on_probation' || targetField === 'terms_accepted') {
            setNestedValue(transformedRow, targetField, parseBoolean(processedValue));
          } else if (
            targetField.startsWith('statutory_deductions.') ||
            targetField === 'gross_income' ||
            targetField === 'net_income' ||
            targetField === 'loan_deductions' ||
            targetField === 'employer_advances' ||
            targetField === 'jahazii_advances' ||
            targetField === 'house_allowance'
          ) {
            setNestedValue(transformedRow, targetField, parseNumber(processedValue));
          } else {
            setNestedValue(transformedRow, targetField, processedValue);
          }
          mappedFields++;
        } catch (e) {
          console.warn(`Error processing field '${targetField}' with value '${value}' for detected header row index ${rowIndex}:`, e);
           transformedRow.extractionErrors?.push(`Error processing ${targetField}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    });
    
    // Post-processing and calculations
    const houseAllowance = (transformedRow as any).house_allowance ?? 0;
    transformedRow.total_deductions =
      (transformedRow.statutory_deductions?.tax ?? 0) +
      (transformedRow.statutory_deductions?.nssf ?? 0) +
      (transformedRow.statutory_deductions?.nhif ?? 0) +
      (transformedRow.statutory_deductions?.levy ?? 0) +
      (transformedRow.loan_deductions ?? 0) +
      (transformedRow.employer_advances ?? 0) +
      houseAllowance;

    if (transformedRow.gross_income && !Object.values(headerMapping).includes('net_income')) {
      transformedRow.net_income = (transformedRow.gross_income ?? 0) - (transformedRow.total_deductions ?? 0);
    }
    
    const netIncomeForLimit = transformedRow.net_income ?? 0;
    if (netIncomeForLimit > 0 && !transformedRow.max_salary_advance_limit) {
      transformedRow.max_salary_advance_limit = Math.floor(netIncomeForLimit * 0.5);
      transformedRow.available_salary_advance_limit = transformedRow.max_salary_advance_limit;
    }

    // --- ADD SANITY CHECKS (Identical to transformData) ---
    const gross = transformedRow.gross_income ?? 0;
    const nhif = transformedRow.statutory_deductions?.nhif ?? 0;
    const nssf = transformedRow.statutory_deductions?.nssf ?? 0;
    const levy = transformedRow.statutory_deductions?.levy ?? 0;
    const totalDed = transformedRow.total_deductions ?? 0;

    if (nhif > 1700) {
       transformedRow.extractionErrors?.push(`Warning: NHIF (${nhif}) exceeds the KES 1700 cap.`);
    }
    if (nssf > 2160) {
       transformedRow.extractionErrors?.push(`Warning: NSSF (${nssf}) exceeds the KES 2160 cap.`);
    }
     if (levy > 2500) {
       transformedRow.extractionErrors?.push(`Warning: Housing Levy (${levy}) exceeds the KES 2500 cap.`);
    }
     if (gross > 0 && totalDed > gross) {
         transformedRow.extractionErrors?.push(`Warning: Total Deductions (${totalDed}) exceed Gross Income (${gross}).`);
     }
    // --- END SANITY CHECKS ---

    // Final validation
    const hasIdentifier = transformedRow.employeeNumber || transformedRow.other_names || transformedRow.surname;
    
    if (mappedFields < 3 || !hasIdentifier) {
      failedRows.push({
        row,
        reason: `Detected Header Row ${rowIndex + 1}: Only ${mappedFields} fields mapped or no clear identifier (Name/Emp No).`
      });
      return null;
    }
    
    return transformedRow;
  })
  .filter((row): row is InsertEmployee => {
    return row !== null && typeof row === 'object';
  });
  
  return { transformedData, failedRows };
}

// Direct extraction for non-standard formats
function directDataExtraction(data: Array<Record<string, any>>): {
  directExtracted: Array<Record<string, any>>;
  directFailedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  const directExtracted: Array<Record<string, any>> = [];
  const directFailedRows: Array<{row: Record<string, any>, reason: string}> = [];

  data.forEach(row => {
    const rowValues = Object.values(row);
    const hasName = rowValues.some(val => 
      typeof val === 'string' && val.length > 3 && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(String(val))
    );
    
    const hasNumber = rowValues.some(val => 
      typeof val === 'number' || (typeof val === 'string' && /^\d+$/.test(String(val)))
    );
    
    if (hasName && hasNumber) {
      // Create a new row with MongoDB document structure
      const extractedRow: Record<string, any> = {
        status: 'active', // Default status
        is_on_probation: false, // Default probation status
        role: 'employee', // Default role
        country: 'KE', // Default country code for Kenya
        statutory_deductions: {
          nhif: 0,
          nssf: 0,
          tax: 0,
          levy: 0
        },
        contact: {
          mobile: '',
          city: ''
        },
        bank_info: {
          acc_no: null,
          bank_name: null
        }
      };
      
      let extractedFields = 0;
      
      Object.entries(row).forEach(([key, value]) => {
        // Full name extraction
        if (typeof value === 'string' && value.length > 3 && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(String(value))) {
          const fullName = String(value).trim();
          const nameParts = fullName.split(/\s+/);
          
          if (nameParts.length >= 2) {
            extractedRow['First Name'] = nameParts[0];
            extractedRow['Last Name'] = nameParts.slice(1).join(' ');
            extractedRow['fullName'] = fullName;
          } else {
            extractedRow['First Name'] = fullName;
            extractedRow['Last Name'] = '';
            extractedRow['fullName'] = fullName;
          }
          extractedFields++;
        } 
        // ID number
        else if (/^\d{5,}$/.test(String(value))) {
          extractedRow['ID Number'] = value;
          extractedFields++;
        }
        // KRA PIN
        else if (/^[A-Z]\d{9}[A-Z]$/.test(String(value))) {
          extractedRow['KRA Pin'] = value;
          extractedFields++;
        }
        // NSSF number
        else if (/^\d{4,6}$/.test(String(value))) {
          extractedRow['NSSF No'] = value;
          extractedFields++;
        }
        // Salary amount
        else if (typeof value === 'number' && value > 1000) {
          if (!extractedRow['Gross Pay']) {
            extractedRow['Gross Pay'] = value;
            
            // Default to 30% of gross for tax
            extractedRow['tax'] = Math.floor(value * 0.3);
            // Default to 1.5% for NSSF
            extractedRow['NSSF'] = Math.min(Math.floor(value * 0.015), 2160);
            // Add default NHIF value
            extractedRow['NHIF'] = Math.min(Math.floor(value * 0.01), 1700);
            // Default to 1.5% for levy
            extractedRow['levy'] = Math.floor(value * 0.015);
            
            // Calculate total deductions
            const totalDeductions = extractedRow['tax'] +
                                   extractedRow['NSSF'] +
                                   extractedRow['NHIF'] +
                                   extractedRow['levy'];
            
            extractedRow['Loan Deduction'] = 0;
            extractedRow['Employer Advance'] = 0;
            
            extractedFields++;
          }
        }
      });
      
      if (extractedFields > 2) {
        // Ensure all required fields are present
        const requiredFields = [
          'Emp No', 'First Name', 'Last Name', 'fullName', 'ID Number', 
          'NSSF No', 'KRA Pin', 'NHIF', 'Position', 'Gross Pay', 
          'Employer Advance', 'tax', 'levy', 'Loan Deduction'
        ];
        
        // Add placeholders for any missing required fields
        requiredFields.forEach(field => {
          if (extractedRow[field] === undefined) {
            if (['Gross Pay', 'tax', 'NHIF', 'levy', 'Employer Advance', 'Loan Deduction'].includes(field)) {
              extractedRow[field] = 0;
            } else {
              extractedRow[field] = '';
            }
          }
        });
        
        // Ensure the row has an ID
        if (!extractedRow.id) {
          extractedRow.id = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
        
        directExtracted.push(extractedRow);
      } else {
        directFailedRows.push({
          row, 
          reason: `Could only identify ${extractedFields} fields (minimum 3 required)`
        });
      }
    } else {
      const hasValues = Object.values(row).some(v => v !== "" && v !== null && v !== undefined);
      if (hasValues) {
        directFailedRows.push({
          row, 
          reason: 'Row does not contain recognizable employee data pattern'
        });
      }
    }
  });
  
  return { directExtracted, directFailedRows };
}

// Create a singleton instance of the chat service
export const chatService = createChatService(); 