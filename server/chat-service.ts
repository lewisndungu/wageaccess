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
  'NSSF No': 'nssf_no', // Maps to Employee.nssf_no
  'NHIF No': 'nhif_no', // Maps to Employee.nhif_no
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
    
    async searchEmployee(query: string, userId: string): Promise<Employee[]> {
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
      // Fetch employees individually as getEmployees(ids) doesn't exist
      const employeePromises = employeeIds.map(id => storageModule.storage.getEmployee(id));
      const employeesData = await Promise.all(employeePromises);
      const employees = employeesData.filter((emp): emp is Employee => emp !== undefined);
      
      const payrollData = employees.map((employee: Employee) => {
        const grossPay = employee.gross_income || 0;
        
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
    formatEmployeeInfo(employee: Employee): string {
      return `
**${employee.other_names} ${employee.surname}**
Position: ${employee.position}
Hire Date: ${formatKEDate(employee.startDate)}
Salary: ${formatKESCurrency(employee.gross_income)}
      `.trim();
    },
    
    // Get user ID - server-side implementation 
    getUserId(): string {
      return 'anonymous-user'; // Server-side fallback that doesn't use localStorage
    }
  };
}

// Define types for special cases
type SpecialCaseStructured = {
  exact: string[];
  variations: string[];
  exclude: string[];
};

type SpecialCaseValue = SpecialCaseStructured | string[];

// Improved function to find the closest matching column with context awareness
function findBestMatch(targetColumn: string, availableColumns: string[]): string | null {
  // Special cases for NSSF and NHIF to distinguish between number and deduction
  const specialCases: Record<string, SpecialCaseValue> = {
    'NSSF No': {
      exact: ['NSSF NO', 'NSSF NUMBER', 'NSSF NO.'],
      variations: ['NSSF MEMBERSHIP', 'SOCIAL SECURITY NO', 'NSSF ID'],
      exclude: ['NSSF DEDUCTION', 'NSSF AMOUNT', 'NSSF CONTRIBUTION', 'NSSF', 'NSSF ']
    },
    'NSSF': {
      exact: ['NSSF', 'NSSF DEDUCTION', 'NSSF AMOUNT', 'NSSF CONTRIBUTION', 'NSSF '],
      variations: ['SOCIAL SECURITY DEDUCTION', 'NSSF DED'],
      exclude: ['NSSF NO', 'NSSF NUMBER', 'NSSF MEMBERSHIP', 'NSSF NO.']
    },
    'NHIF No': {
      exact: ['NHIF NO', 'NHIF NUMBER', 'NHIF NO.'],
      variations: ['NHIF MEMBERSHIP', 'HEALTH INSURANCE NO', 'NHIF ID'],
      exclude: ['NHIF DEDUCTION', 'NHIF AMOUNT', 'NHIF CONTRIBUTION', 'NHIF', 'SHIF', 'SHIF ']
    },
    'NHIF': {
      exact: ['NHIF', 'NHIF DEDUCTION', 'NHIF AMOUNT', 'NHIF CONTRIBUTION', 'SHIF', 'SHIF DEDUCTION', 'SHIF AMOUNT', 'SHIF CONTRIBUTION', 'SHIF '],
      variations: ['HEALTH INSURANCE DEDUCTION', 'NHIF DED', 'SHIF DED'],
      exclude: ['NHIF NO', 'NHIF NUMBER', 'NHIF MEMBERSHIP', 'SHIF NO', 'SHIF NUMBER']
    },
    // Simple array format for other cases
    'Emp No': ['EMPLO NO.', 'EMPLOYEE NO', 'EMPLOYEE NUMBER', 'EMP NUMBER', 'STAFF NO'],
    'Employee Name': ['EMPLOYEES\' FULL NAMES', 'FULL NAME', 'NAME', 'EMPLOYEE NAMES', 'STAFF NAME', 'EMPLOYEE FULL NAME', 'SURNAME', 'OTHER NAMES'],
    'Probation Period': ['PROBATION', 'ON PROBATION'],
    'ID Number': ['ID NO', 'NATIONAL ID', 'IDENTITY NUMBER', 'ID', 'IDENTIFICATION', 'ID NUMBER'],
    'KRA Pin': ['KRA PIN NO.', 'KRA', 'PIN NO', 'PIN NUMBER', 'TAX PIN', 'KRA PIN NUMBER'],
    'Position': ['JOB TITTLE', 'TITLE', 'JOB TITLE', 'DESIGNATION', 'ROLE', 'SITE'],
    'Gross Pay': ['GROSS SALARY', 'GROSS', 'MONTHLY SALARY', 'GROSS INCOME', 'TOTAL GROSS PAY', 'GROSS PAY', 'BASIC PAY', 'BASIC SALARY'],
    'PAYE': ['TAX', 'INCOME TAX', 'PAYE'],
    'Levy': ['H-LEVY', 'HOUSING LEVY', 'HOUSE LEVY', 'HOUSING', 'LEVIES'],
    'Loan Deduction': ['LOANS', 'LOAN', 'LOAN REPAYMENT', 'DEBT REPAYMENT', 'TOTAL LOAN DEDUCTIONS', 'LOAN DEDUCTION'],
    'Employer Advance': ['ADVANCE', 'SALARY ADVANCE', 'ADVANCE SALARY', 'ADVANCE PAYMENT', 'EMPLOYER ADVANCES', 'SALARY ADVANCE'],
    'Net Pay': ['NET SALARY', 'TAKE HOME', 'FINAL PAY', 'NET PAY', 'NET INCOME'],
    'MPesa Number': ['MPESA', 'MOBILE MONEY', 'PHONE NO', 'MOBILE NO', 'TEL NO.'],
    'Bank Account Number': ['BANK ACC', 'BANK ACCOUNT', 'ACCOUNT NUMBER', 'ACC NO', 'ACCOUNT NO'],
    'T & C Accepted': ['TERMS ACCEPTED', 'T&C', 'AGREED TERMS'],
    'CONTACTS': ['CONTACT', 'CONTACTS', 'PHONE', 'MOBILE', 'TELEPHONE', 'PHONE NUMBER', 'MOBILE NUMBER', 'TEL NO.'],
    'GENDER': ['SEX', 'MALE/FEMALE', 'M/F'],
    'BANK CODE': ['BANK BRANCH CODE', 'BRANCH CODE'],
    'BANK': ['BANK NAME'],
    'HOUSE ALLOWANCE': ['HSE ALLOWANCE', 'H/ALLOWANCE', 'HOUSING', 'HOLIDAY'],
    'JAHAZII': ['JAHAZII ADVANCE', 'JAHAZII LOAN', 'JAHAZII'],
    'STATUS': ['EMPLOYEE STATUS', 'ACTIVE', 'INACTIVE', 'EMPLOYMENT STATUS'],
    'Total Deductions': ['TOTAL DEDUCTIONS', 'TOTAL DED', 'TOTAL DEDUCTS'],
  };

  const cleanedAvailableColumns = availableColumns.map(col => {
    if (col && col.startsWith('__EMPTY')) return null;
    return col;
  }).filter(Boolean) as string[];

  // For NSSF and NHIF special handling
  const specialCase = specialCases[targetColumn];
  if (specialCase && !Array.isArray(specialCase)) {
    // First check exact matches
    for (const col of cleanedAvailableColumns) {
      if (!col) continue;
      const upperCol = col.toUpperCase();
      
      // Check if this column should be excluded
      if (specialCase.exclude.some(excl => upperCol === excl.toUpperCase())) {
        continue;
      }
      
      // Check exact matches first
      if (specialCase.exact.some(exact => upperCol === exact.toUpperCase())) {
        return col;
      }
    }
    
    // Then check variations
    for (const col of cleanedAvailableColumns) {
      if (!col) continue;
      const upperCol = col.toUpperCase();
      
      // Skip if in exclude list
      if (specialCase.exclude.some(excl => upperCol.includes(excl.toUpperCase()))) {
        continue;
      }
      
      // Check variations
      if (specialCase.variations.some(variation => upperCol.includes(variation.toUpperCase()))) {
        return col;
      }
    }
  } else {
    // Original matching logic for other columns
    const exactMatch = cleanedAvailableColumns.find(col => 
      col && col.toLowerCase() === targetColumn.toLowerCase());
    if (exactMatch) return exactMatch;
    
    if (specialCase && Array.isArray(specialCase)) {
      for (const variation of specialCase) {
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
  // Log input value and type for debugging (conceptual)
  // console.log(`parseNumber: Input value='${value}', type=${typeof value}`);

  if (value === null || value === undefined || String(value).trim() === '') {
     // console.log(`parseNumber: Value is null, undefined, or empty string. Returning default: ${defaultValue}`);
    return defaultValue;
  }

  // Convert to string, remove commas AND common currency symbols/spaces just in case
  const stringValue = String(value).trim().replace(/[,KESksh\s]/gi, ''); // Remove commas, KES, ksh, spaces (case-insensitive)

  // Check if the cleaned string is a valid number representation
  if (stringValue === '' || isNaN(Number(stringValue))) {
      // console.warn(`parseNumber: Value '${value}' resulted in non-numeric string '${stringValue}' after cleaning. Returning default: ${defaultValue}`);
      return defaultValue;
  }

  const num = Number(stringValue);
  //  console.log(`parseNumber: Value '${value}' successfully parsed to number: ${num}`);
  return num;
}

// Function to find the header row and return its index
function findHeaderRow(data: Array<Record<string, any>>, maxRowsToCheck = 10): number {
  let bestMatchCount = 0;
  let bestMatchIndex = -1;

  // Check first N rows
  for (let i = 0; i < Math.min(maxRowsToCheck, data.length); i++) {
    const row = data[i];
    let currentMatchCount = 0;
    
    // Get all values from the current row, including those in __EMPTY_X columns
    const rowValues = Object.values(row).map(val => String(val || '').trim());
    
    // For each master template column, try to find a match in this row
    for (const masterKey of Object.keys(columnMappings)) {
      const bestMatch = findBestMatch(masterKey, rowValues);
      if (bestMatch) {
        currentMatchCount++;
      }
    }

    // Update best match if this row has more matches
    if (currentMatchCount > bestMatchCount) {
      bestMatchCount = currentMatchCount;
      bestMatchIndex = i;
    }
  }

  return bestMatchIndex;
}

// Transform data function
function transformData(data: Array<Record<string, any>>): {
  transformedData: Array<Record<string, any>>;
  failedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  if (!data || data.length === 0) {
    return { transformedData: [], failedRows: [] };
  }

  // Find the header row
  const headerRowIndex = findHeaderRow(data);
  if (headerRowIndex === -1) {
    return {
      transformedData: [],
      failedRows: data.map((row, index) => ({ 
        row, 
        reason: `Row ${index + 1}: Could not find a valid header row in the first few rows.` 
      }))
    };
  }

  // Get the header row and create mapping
  const headerRow = data[headerRowIndex];
  const headerMapping: Record<string, string> = {};
  
  // Get all values from header row, including __EMPTY_X columns
  const headerEntries = Object.entries(headerRow);
  
  // For each master template column, find the best matching header
  Object.entries(columnMappings).forEach(([masterKey, targetField]) => {
    // Create array of header values for matching
    const headerValues = headerEntries.map(([key, value]) => ({
      key,
      value: String(value || '').trim()
    })).filter(h => h.value); // Filter out empty values

    // Find best match among header values for this master key
    for (const header of headerValues) {
      if (findBestMatch(masterKey, [header.value])) {
        headerMapping[header.key] = targetField;
        break; // Stop after finding first match for this master key
      }
    }
  });

  console.log('Detected header mapping:', headerMapping);

  if (Object.keys(headerMapping).length === 0) {
    return {
      transformedData: [],
      failedRows: data.map((row, index) => ({ 
        row, 
        reason: `Row ${index + 1}: Could not map any headers to expected columns.` 
      }))
    };
  }

  // Process data rows (skip header row)
  const dataRows = data.slice(headerRowIndex + 1);
  const failedRows: Array<{row: Record<string, any>, reason: string}> = [];
  
  const transformedData = dataRows.map((row, rowIndex) => {
    // Skip empty rows
    const isEmpty = Object.values(row).every(val => 
      val === "" || val === null || val === undefined
    );
    if (isEmpty) return null;

    // Initialize with Employee interface structure and defaults
    const transformedRow: Employee & { extractionErrors?: string[] } = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
      nhif_no: '',
      employeeNumber: '',
      position: '',
      extractionErrors: [],
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

    // Process each field according to the header mapping
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
          console.warn(`Error processing field '${targetField}' with value '${value}' for row index ${rowIndex}:`, e);
          transformedRow.extractionErrors?.push(`Error processing ${targetField}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    });

    // Post-processing calculations
    const houseAllowance = transformedRow.house_allowance ?? 0;
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

    // Sanity checks
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

    // Final validation
    const hasIdentifier = transformedRow.employeeNumber || transformedRow.other_names || transformedRow.surname;
    
    if (mappedFields < 3 || !hasIdentifier) {
      failedRows.push({
        row,
        reason: `Row ${rowIndex + headerRowIndex + 2}: Only ${mappedFields} fields mapped or no clear identifier (Name/Emp No).`
      });
      return null;
    }

    return transformedRow;
  })
  .filter((row): row is Employee & { extractionErrors?: string[] } => {
    return row !== null && typeof row === 'object';
  });

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
  directExtracted: Array<InsertEmployee>; // Use InsertEmployee from schema
  directFailedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  const directExtracted: Array<InsertEmployee> = [];
  const directFailedRows: Array<{row: Record<string, any>, reason: string}> = [];

  data.forEach((row, rowIndex) => { // Added rowIndex for error reporting
    const rowValues = Object.values(row);
    const hasName = rowValues.some(val => 
      typeof val === 'string' && val.length > 3 && /[A-Za-z]{2,}\\s+[A-Za-z]{2,}/.test(String(val))
    );
    
    const hasNumber = rowValues.some(val => 
      typeof val === 'number' || (typeof val === 'string' && /^\\d+$/.test(String(val)))
    );
    
    if (hasName && hasNumber) {
      // Initialize with InsertEmployee structure
      const extractedRow: InsertEmployee = {
        id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-direct`, // Add direct indicator
        status: 'active', // Default status
        is_on_probation: false, // Default probation status
        role: 'employee', // Default role
        country: 'KE', // Default country code for Kenya
        statutory_deductions: { nhif: 0, nssf: 0, tax: 0, levy: 0 },
        contact: { email: '', phoneNumber: '' }, // Use phoneNumber
        bank_info: { acc_no: null, bank_name: null, bank_code: null }, // Add bank_code
        gross_income: 0,
        // net_income will be calculated if possible, or defaulted
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
        sex: '', // Default sex
        nssf_no: '',
        nhif_no: '', // Default nhif_no
        employeeNumber: '', // Default employeeNumber
        position: '', // Default position
        // extractionErrors: [], // Consider adding if useful, needs Employee type
        id_confirmed: false,
        mobile_confirmed: false,
        tax_pin_verified: false,
        created_at: new Date(),
        modified_at: new Date(),
        active: true,
      };
      
      let extractedFieldsCount = 0;
      let hasIdentifier = false;

      Object.entries(row).forEach(([key, value]) => {
        const processedValue = String(value).trim();
        if (processedValue === '') return; // Skip empty values

        // Full name extraction
        if (typeof value === 'string' && value.length > 3 && /[A-Za-z]{2,}\\s+[A-Za-z]{2,}/.test(processedValue)) {
          const nameParts = processedValue.split(/\\s+/);
          if (nameParts.length >= 2) {
            extractedRow.surname = nameParts.slice(-1).join(' ');
            extractedRow.other_names = nameParts.slice(0, -1).join(' ');
          } else {
            extractedRow.other_names = processedValue;
            // Keep surname empty
          }
          hasIdentifier = true;
          extractedFieldsCount++;
        }
        // ID number (basic check)
        else if (/^\\d{5,}$/.test(processedValue) && !extractedRow.id_no) {
          extractedRow.id_no = processedValue;
          extractedFieldsCount++;
        }
        // KRA PIN (basic check)
        else if (/^[A-Z]\\d{9}[A-Z]$/i.test(processedValue) && !extractedRow.tax_pin) { // Case-insensitive
          extractedRow.tax_pin = processedValue.toUpperCase();
          extractedFieldsCount++;
        }
        // NSSF number (basic check)
        else if (/^\\d{4,10}$/.test(processedValue) && !extractedRow.nssf_no) {
          extractedRow.nssf_no = processedValue;
          extractedFieldsCount++;
        }
         // NHIF number (basic check - often same as ID, but could be different)
         else if (/^\\d{5,}$/.test(processedValue) && !extractedRow.nhif_no && processedValue !== extractedRow.id_no) {
          extractedRow.nhif_no = processedValue;
          extractedFieldsCount++;
        }
        // Employee Number (basic check - alphanumeric)
        else if (/^[a-zA-Z0-9\-\/]+$/.test(processedValue) && !extractedRow.employeeNumber) {
            extractedRow.employeeNumber = processedValue;
            hasIdentifier = true;
            extractedFieldsCount++;
        }
        // Phone Number (basic check - digits, maybe +)
        else if (/^\+?\d{9,15}$/.test(processedValue) && !extractedRow.contact!.phoneNumber) {
            extractedRow.contact!.phoneNumber = processedValue;
            extractedFieldsCount++;
        }
        // Position (string, likely contains letters)
        else if (typeof value === 'string' && /[a-zA-Z]/.test(processedValue) && !extractedRow.position && !hasIdentifier) { // Avoid grabbing names as positions
             extractedRow.position = processedValue;
             extractedFieldsCount++;
        }
        // Salary amount (number > 1000)
        else if (typeof value === 'number' && value > 1000 && !extractedRow.gross_income) {
          extractedRow.gross_income = value;

          // --- Default statutory calculation based on gross ---
          // These are rough estimates and may not be accurate.
          // Consider linking the actual calculation logic if available.
          const gross = extractedRow.gross_income;
          // PAYE - Very rough estimate (e.g., 10% after reliefs) - Needs proper calculation
          if (extractedRow.statutory_deductions) {
              extractedRow.statutory_deductions.tax = Math.max(0, Math.floor((gross - 24000) * 0.1)); // Simplified PAYE placeholder
          }
          // NSSF - Tier I (6% up to 7k) + Tier II (6% from 7k to 36k) - max 2160
          const nssfTier1Limit = 7000;
          const nssfTier2Limit = 36000;
          const nssfRate = 0.06;
          const nssfTier1 = Math.min(gross, nssfTier1Limit) * nssfRate;
          const nssfTier2Base = Math.max(0, gross - nssfTier1Limit);
          const nssfTier2 = Math.min(nssfTier2Base, nssfTier2Limit - nssfTier1Limit) * nssfRate;
          extractedRow.statutory_deductions!.nssf = Math.min(Math.floor(nssfTier1 + nssfTier2), 2160);
          // NHIF - Based on gross income bands (simplified) - max 1700
          let nhifCalc = 0;
          if (gross >= 100000) nhifCalc = 1700;
          else if (gross >= 50000) nhifCalc = 1200;
          else if (gross >= 20000) nhifCalc = 750;
          else if (gross >= 12000) nhifCalc = 500;
          else if (gross >= 6000) nhifCalc = 300;
          else nhifCalc = 150;
          extractedRow.statutory_deductions!.nhif = nhifCalc;
          // Housing Levy - 1.5% of gross - max 2500
          extractedRow.statutory_deductions!.levy = Math.min(Math.floor(gross * 0.015), 2500);
          // --- End default calculation ---

          extractedFieldsCount++;
        }
        // Other numeric values could be loans, advances (more complex to guess)
      });

      // Post-processing: Calculate total deductions and net income if possible
      if ((extractedRow.gross_income ?? 0) > 0) {
          extractedRow.total_deductions =
              (extractedRow.statutory_deductions?.tax ?? 0) +
              (extractedRow.statutory_deductions?.nssf ?? 0) +
              (extractedRow.statutory_deductions?.nhif ?? 0) +
              (extractedRow.statutory_deductions?.levy ?? 0) +
              (extractedRow.loan_deductions ?? 0) +
              (extractedRow.employer_advances ?? 0);

          extractedRow.net_income = (extractedRow.gross_income ?? 0) - (extractedRow.total_deductions ?? 0);

          // Calculate EWA limits based on net income
          const netIncomeForLimit = extractedRow.net_income ?? 0;
          if (netIncomeForLimit > 0) {
              extractedRow.max_salary_advance_limit = Math.floor(netIncomeForLimit * 0.5);
              extractedRow.available_salary_advance_limit = extractedRow.max_salary_advance_limit;
          }
      }

      // Validation: Check if enough meaningful fields were extracted
      if (extractedFieldsCount >= 3 && hasIdentifier) { // Require at least 3 fields + a name/employeeNumber
        directExtracted.push(extractedRow);
      } else {
        directFailedRows.push({
          row,
          reason: `Row ${rowIndex + 1}: Only identified ${extractedFieldsCount} fields or missing identifier (Name/Emp No). Minimum 3 fields + identifier required.`
        });
      }
    } else {
      // Check if the row is truly empty before marking as failed
      const hasValues = Object.values(row).some(v => v !== "" && v !== null && v !== undefined);
      if (hasValues) {
        directFailedRows.push({
          row,
          reason: `Row ${rowIndex + 1}: Does not contain a recognizable pattern (e.g., Name and Number).`
        });
      }
      // Ignore completely empty rows silently
    }
  });
  
  return { directExtracted, directFailedRows };
}

// Create a singleton instance of the chat service
export const chatService = createChatService();