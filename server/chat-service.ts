import * as storageModule from './storage';
import { Employee, InsertEmployee, ServerPayrollResponse } from '../shared/schema';
import { formatKEDate, formatKESCurrency } from '../client/src/lib/format-utils';
import { calculatePayrollBasedOnAttendance } from '../client/src/lib/kenyan-payroll';
import * as XLSX from 'xlsx';

// Column mapping configuration - Based on User's Master Template
export const columnMappings: Record<string, string> = {
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
        // 1. Read the XLSX file
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        
        // Original JSON data for fallback or direct extraction if needed
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const originalJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];

        // 2. Preprocess the data (NEW)
        let processedResult: { transformedData: Array<any>; failedRows: Array<{row: Record<string, any>, reason: string}> } | null = null;
        let preprocessingFailed = false;
        let preprocessingReason = '';

        try {
            const { cleanedData, headerRowIndex } = preprocessPayrollData(workbook);

            if (headerRowIndex === -1) {
                preprocessingFailed = true;
                preprocessingReason = 'Could not reliably detect a header row.';
                console.warn('Preprocessing failed:', preprocessingReason);
            } else if (!cleanedData || cleanedData.length === 0) {
                preprocessingFailed = true;
                preprocessingReason = 'Preprocessing completed, but no data rows found after the header.';
                console.warn('Preprocessing notice:', preprocessingReason);
                // Treat as failure for data processing, but maybe not a hard error
            } else {
                console.log(`Header row detected at index ${headerRowIndex}. Processing ${cleanedData.length} data rows.`);
                // 3. Transform the cleaned data (EXISTING - but will be modified)
                processedResult = transformData(cleanedData); // Pass cleanedData here
            }
        } catch (preprocessError: any) {
            preprocessingFailed = true;
            preprocessingReason = `Preprocessing error: ${preprocessError.message}`;
            console.error(preprocessingReason);
        }

        let extractedData: Array<any> = [];
        let finalFailedRows: Array<{row: Record<string, any>, reason: string}> = [];

        if (processedResult && !preprocessingFailed) {
            extractedData = processedResult.transformedData;
            finalFailedRows = processedResult.failedRows;
            console.log(`Transformation successful: ${extractedData.length} records extracted, ${finalFailedRows.length} failed.`);
        } else {
            // Fallback to direct extraction if preprocessing/transformation failed or yielded nothing
            console.warn(`Preprocessing/Transformation failed or yielded no data (Reason: ${preprocessingReason || 'No data after transformation'}). Attempting direct extraction...`);
            
            if (originalJsonData.length > 0) {
                const { directExtracted, directFailedRows } = directDataExtraction(originalJsonData);
                if (directExtracted.length > 0) {
                    extractedData = directExtracted;
                    // Prepend preprocessing/transformation failures to direct failures
                    finalFailedRows = [{ row: {}, reason: `Initial processing failed: ${preprocessingReason || 'No data after transformation'}. Results below are from direct extraction.` }, ...directFailedRows];
                    console.log(`Direct extraction successful: ${extractedData.length} records extracted, ${directFailedRows.length} direct failures.`);
                } else {
                    // If both methods fail, report the initial failure reason + direct failure
                    finalFailedRows = [
                        { row: {}, reason: `Initial processing failed: ${preprocessingReason || 'No data after transformation'}.` },
                        ...directFailedRows, // Include direct failures if any
                        ...(directFailedRows.length === 0 && originalJsonData.length > 0 ? [{ row: {}, reason: 'Direct extraction also failed to find usable data.' }] : [])
                    ];
                     console.error('Both standard processing and direct extraction failed.');
                }
            } else {
                finalFailedRows = [{ row: {}, reason: "No data found in the uploaded file." }];
                 console.error('File appears empty or contains no processable data.');
            }
        }

        // Format the result
        const result = {
          extractedData: extractedData,
          failedRows: finalFailedRows,
          fileName: file.originalname
        };

        // Save a message about the file upload
        const fileMessage: ChatMessage = {
          id: Date.now().toString(),
          userId,
          type: 'file',
          content: `Processed: ${file.originalname}. Found ${extractedData.length} potential records, ${finalFailedRows.length} rows need attention.`,
          timestamp: new Date(),
          fileData: {
             fileName: result.fileName,
             recordCount: extractedData.length,
             failedCount: finalFailedRows.length
          },
          actions: extractedData.length > 0 ? [
            {
              id: 'view-data',
              label: 'Review & Import'
            }
          ] : (finalFailedRows.length > 0 ? [{ id: 'view-failed-rows', label: 'View Failed Rows'}] : []),
          metadata: {
             processedCount: extractedData.length,
             failedCount: finalFailedRows.length,
             preprocessingFailed: preprocessingFailed, // Add flag
             preprocessingReason: preprocessingReason // Add reason
          }
        };

        await storageModule.saveMessage(fileMessage);

        return result; // Return the structured result

      } catch (error: any) { // Handle as a generic error with message property
        console.error('Error processing file:', error);
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
      exact: ['NHIF', 'NHIF DEDUCTION', 'NHIF AMOUNT', 'NHIF CONTRIBUTION', 'SHIF', 'SHIF DEDUCTION', 'SHIF AMOUNT', 'SHIF CONTRIBUTION', 'SHIF', 'SHA'],
      variations: ['HEALTH INSURANCE DEDUCTION', 'NHIF DED', 'SHIF DED'],
      exclude: ['NHIF NO', 'NHIF NUMBER', 'NHIF MEMBERSHIP', 'SHIF NO', 'SHIF NUMBER']
    },
    'KRA Pin': { // Updated to match columnMappings key exactly
        exact: ['KRA PIN NUMBER', 'KRA PIN', 'TAX PIN'], // Put exact header first
        variations: ['PIN NO', 'PIN NUMBER', 'KRA PIN NO.', 'KRA NUMBER'],
        exclude: ['PHONE', 'CONTACT', 'MOBILE', 'BANK', 'ACCOUNT', 'NSSF', 'NHIF', 'ID', 'EMP', 'STAFF']
    },
     'CONTACTS': { // Add specific exclusions
        exact: ['CONTACT', 'CONTACTS', 'PHONE', 'MOBILE', 'TELEPHONE', 'PHONE NUMBER', 'MOBILE NUMBER', 'TEL NO.'],
        variations: [],
        exclude: ['KRA', 'PIN', 'TAX', 'NSSF', 'NHIF', 'ID', 'EMP', 'STAFF', 'BANK', 'ACCOUNT'] // Ensure KRA/PIN/TAX are excluded
     },
     'MPesa Number': { // Add specific exclusions
        exact: ['MPESA', 'MOBILE MONEY', 'PHONE NO', 'MOBILE NO', 'TEL NO.'],
        variations: [],
        exclude: ['KRA', 'PIN', 'TAX', 'NSSF', 'NHIF', 'ID', 'EMP', 'STAFF', 'BANK', 'ACCOUNT'] // Ensure KRA/PIN/TAX are excluded
     },
     'Bank Account Number': { // Keep existing structure
        exact: ['BANK ACC', 'BANK ACCOUNT', 'ACCOUNT NUMBER', 'ACC NO', 'ACCOUNT NO'],
        variations: ['BANK', 'ACCOUNT'],
        exclude: ['ID NO', 'ID NUMBER', 'NATIONAL ID', 'KRA', 'PIN', 'PHONE', 'MOBILE'] // Prevent matching with ID/Tax/Phone fields
     },
     'ID Number': { // Add explicit structure
        exact: ['ID NO', 'ID NUMBER', 'NATIONAL ID', 'IDENTITY NUMBER'],
        variations: ['ID', 'IDENTIFICATION'],
        exclude: ['BANK', 'ACCOUNT', 'ACC NO', 'KRA', 'PIN', 'PHONE', 'EMP NO'] // Prevent matching with bank/tax/phone/emp fields
     },
    // Simple array format for other cases
    'Emp No': ['EMPLO NO.', 'EMPLOYEE NO', 'EMPLOYEE NUMBER', 'EMP NUMBER', 'STAFF NO'],
    'Employee Name': ['EMPLOYEES\' FULL NAMES', 'FULL NAME', 'NAME', 'EMPLOYEE NAMES', 'STAFF NAME', 'EMPLOYEE FULL NAME', 'SURNAME', 'OTHER NAMES'],
    'Probation Period': ['PROBATION', 'ON PROBATION'],
    'Position': ['JOB TITTLE', 'TITLE', 'JOB TITLE', 'DESIGNATION', 'ROLE', 'SITE'],
    'Gross Pay': ['GROSS SALARY', 'GROSS', 'MONTHLY SALARY', 'GROSS INCOME', 'TOTAL GROSS PAY', 'GROSS PAY', 'BASIC PAY', 'BASIC SALARY'],
    'PAYE': ['TAX', 'INCOME TAX', 'PAYE'],
    'Levy': ['H-LEVY', 'HOUSING LEVY', 'HOUSE LEVY', 'HOUSING', 'LEVIES'],
    'Loan Deduction': ['LOANS', 'LOAN', 'LOAN REPAYMENT', 'DEBT REPAYMENT', 'TOTAL LOAN DEDUCTIONS', 'LOAN DEDUCTION'],
    'Employer Advance': ['ADVANCE', 'SALARY ADVANCE', 'ADVANCE SALARY', 'ADVANCE PAYMENT', 'EMPLOYER ADVANCES', 'SALARY ADVANCE'],
    'Net Pay': ['NET SALARY', 'TAKE HOME', 'FINAL PAY', 'NET PAY', 'NET INCOME'],
    'T & C Accepted': ['TERMS ACCEPTED', 'T&C', 'AGREED TERMS'],
    'GENDER': ['SEX', 'MALE/FEMALE', 'M/F'],
    'BANK CODE': ['BANK BRANCH CODE', 'BRANCH CODE'],
    'BANK': ['BANK NAME'], // Keep simple unless conflicts arise
    'HOUSE ALLOWANCE': ['HSE ALLOWANCE', 'H/ALLOWANCE', 'HOUSING'], // Removed 'HOLIDAY'
    'JAHAZII': ['JAHAZII ADVANCE', 'JAHAZII LOAN', 'JAHAZII'],
    'STATUS': ['EMPLOYEE STATUS', 'ACTIVE', 'INACTIVE', 'EMPLOYMENT STATUS'],
    'Total Deductions': ['TOTAL DEDUCTIONS', 'TOTAL DED', 'TOTAL DEDUCTS'], // Keep simple
  };

  const cleanedAvailableColumns = availableColumns.map(col => {
    if (col && col.startsWith('__EMPTY')) return null;
    return String(col || '').trim().toUpperCase();
  }).filter(Boolean) as string[];

  // Normalize target column once
  const upperTargetColumn = targetColumn.toUpperCase();

  // Handle special cases first (NSSF/NHIF No vs Deduction)
  const specialCase = specialCases[targetColumn];
  if (specialCase && !Array.isArray(specialCase)) {
    // Check exact matches (case-insensitive)
    for (const col of cleanedAvailableColumns) {
      if (!col) continue;
      if (specialCase.exclude.some(excl => col === excl.toUpperCase())) continue;
      if (specialCase.exact.some(exact => col === exact.toUpperCase())) return col; // Return the original case from availableColumns
    }
    // Check variations (case-insensitive includes)
    for (const col of cleanedAvailableColumns) {
      if (!col) continue;
      if (specialCase.exclude.some(excl => col.includes(excl.toUpperCase()))) continue;
      if (specialCase.variations.some(variation => col.includes(variation.toUpperCase()))) return col; // Return original case
    }
  } else {
    
    // 1. Exact match (case-insensitive)
    const exactMatch = cleanedAvailableColumns.find(col => col === upperTargetColumn);
    if (exactMatch) {
         // Find the original case version in the input list
         return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === exactMatch) || exactMatch;
    }

    // 2. Match variations from specialCases if it's an array
    if (specialCase && Array.isArray(specialCase)) {
      const upperVariations = specialCase.map(v => v.toUpperCase());
      const variationMatch = cleanedAvailableColumns.find(col => upperVariations.includes(col));
      if (variationMatch) {
           return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === variationMatch) || variationMatch;
      }
    }

    // 3. Substring containment check (both ways, case-insensitive)
    for (const col of cleanedAvailableColumns) {
      if (col.includes(upperTargetColumn) || upperTargetColumn.includes(col)) {
         return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === col) || col;
      }
    }

    // 4. Word overlap check (more robust)
    const targetWords = upperTargetColumn.split(/[\s.,\-_]+/).filter(word => word.length > 2);
    if (targetWords.length > 0) {
        for (const col of cleanedAvailableColumns) {
            const colWords = col.split(/[\s.,\-_]+/).filter(word => word.length > 2);
            if (colWords.length > 0) {
                const commonWords = targetWords.filter(word => colWords.includes(word));
                // Require at least one common word, maybe more for longer names?
                if (commonWords.length > 0) {
                    return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === col) || col;
                }
            }
        }
    }
  }

  return null; // No suitable match found
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

// Function to find the header row in XLSX data
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

// **** NEW: Find Header Row in CSV-like data ****
function findHeaderRowInCSV(csvData: any[][], maxRowsToCheck = 20): number {
  const expectedPatterns = [
      /emp|staff|no/i, /name|full|surname|other/i, // Employee Identifiers
      /gross|basic|salary|pay\b/i, // Gross Pay variants
      /net|take\s?home/i, // Net Pay variants
      /nssf|social/i, // NSSF variants
      /nhif|health|shif|sha/i, // NHIF/SHIF variants
      /tax|paye/i, // Tax variants
      /levy|housing/i, // Housing Levy variants
      /deduction|deduct/i, // General Deductions
      /loan/i, // Loans
      /advance/i, // Advances
      /id\s?no|identi/i, // ID Number
      /kra|pin/i, // KRA PIN
      /bank/i, // Bank Info
      /position|title|designation|role|site/i, // Position
      /phone|contact|mobile|mpesa/i, // Contact
  ];
  
  // More weight to essential columns
  const essentialPatterns = [
      /name|full|surname|other/i,
      /gross|basic|salary|pay\b/i,
      /nssf|social/i,
      /nhif|health|shif/i,
      /tax|paye/i,
  ];

  let bestRowIndex = -1; // Default to -1 if no suitable header is found
  let bestScore = 0;
  const minRequiredScore = 3; // Minimum score to be considered a potential header

  // Check first N rows or less if file is smaller
  const rowsToCheck = Math.min(csvData.length, maxRowsToCheck);
  
  for (let i = 0; i < rowsToCheck; i++) {
      const row = csvData[i];
      // Skip rows that are mostly empty or seem like title rows (e.g., only 1-2 cells filled)
      const filledCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length;
      if (filledCells < minRequiredScore) continue; // Skip rows with too few values

      let score = 0;
      let essentialMatches = 0;
      const matchedPatterns = new Set<RegExp>(); // Track patterns matched in this row

      // Score each cell in the row
      for (const cell of row) {
          if (cell === null || cell === undefined) continue;
          const cellStr = String(cell).trim().toLowerCase(); // Normalize cell content
          if (cellStr === '') continue;

          let patternMatchedInCell = false;
          // Check against all expected patterns
          for (const pattern of expectedPatterns) {
              if (!matchedPatterns.has(pattern) && pattern.test(cellStr)) {
                  score++;
                  matchedPatterns.add(pattern); // Count each *pattern* only once per row
                  patternMatchedInCell = true;
                  // Check if it's an essential pattern
                  if (essentialPatterns.some(essential => essential.source === pattern.source)) {
                      essentialMatches++;
                  }
                  // Optimization: if a pattern matches, maybe we don't need to check others for this cell?
                  // break; // If we want to count each *cell* only once
              }
          }
      }

      // Add bonus for essential matches
      score += essentialMatches; // Give extra weight to rows with essential headers

      // Update best score if this row is better AND meets minimum criteria
      if (score > bestScore && score >= minRequiredScore) {
          bestScore = score;
          bestRowIndex = i;
      }
  }
  
  // Final check: if best score is too low, invalidate
  if (bestScore < minRequiredScore) {
      console.warn(`Warning: Possible header detection issue. Best row (index ${bestRowIndex}) only scored ${bestScore}. Minimum required: ${minRequiredScore}.`);
      return -1; // Indicate header not found reliably
  }
  
  console.log(`Detected header row at index ${bestRowIndex} with score ${bestScore}.`);
  return bestRowIndex;
}

// **** NEW: Convert CSV-like data to JSON using provided headers ****
function convertToJsonWithHeaders(headerRow: any[], dataRows: any[][]): Array<Record<string, any>> {
  // Normalize header names: trim, replace multiple spaces, handle nulls/undefined
  const normalizedHeaders = headerRow.map((header, index) => {
      const trimmedHeader = String(header || '').trim().replace(/\s+/g, ' ');
      // Handle potentially duplicate or empty headers after normalization
      // If empty, use a placeholder like '__EMPTY_COL_INDEX__'
      // If duplicate, maybe append index? For now, let's allow duplicates, downstream mapping should handle it.
      return trimmedHeader === '' ? `__EMPTY_COL_${index}__` : trimmedHeader;
  });

  // Keep track of unique headers to handle potential duplicates if needed later
  const uniqueHeaders = new Set(normalizedHeaders);
  if (uniqueHeaders.size !== normalizedHeaders.length) {
      console.warn('Duplicate headers detected after normalization:', normalizedHeaders);
      // Consider adding logic here to rename duplicates if it causes issues
  }

  // Convert data rows to objects
  return dataRows.map((row, rowIndex) => {
      const rowObject: Record<string, any> = {};
      // Ensure row is treated as an array, even if sparse
      const numHeaders = normalizedHeaders.length;
      for (let i = 0; i < numHeaders; i++) {
          const header = normalizedHeaders[i];
          // Handle rows that might be shorter than the header row
          const cellValue = (i < row.length) ? row[i] : undefined; // Or null? Let's use undefined
          // Assign value to the corresponding normalized header key
          // Skip placeholder empty columns unless needed
          if (!header.startsWith('__EMPTY_COL_')) {
            rowObject[header] = cellValue;
          }
      }
      // Add original row index if needed for debugging/error reporting
      // rowObject.__originalRowIndex = headerRowIndex + 1 + rowIndex; // Example
      return rowObject;
  }).filter(obj => Object.values(obj).some(v => v !== null && v !== undefined && String(v).trim() !== '')); // Filter out completely empty rows
}

// **** NEW: Preprocessing Function ****
function preprocessPayrollData(workbook: XLSX.WorkBook): {
  headerRowIndex: number;
  cleanedData: Array<Record<string, any>>;
} {
  // 1. Convert the first sheet to CSV-like array structure (array of arrays)
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
      throw new Error("Workbook contains no sheets.");
  }
  const worksheet = workbook.Sheets[sheetName];
  const csvData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }); // Use null for empty cells

  if (!csvData || csvData.length === 0) {
      console.warn("Sheet appears empty after CSV conversion.");
      return { headerRowIndex: -1, cleanedData: [] };
  }

  // 2. Find header row using the scoring mechanism
  const headerRowIndex = findHeaderRowInCSV(csvData);

  if (headerRowIndex === -1) {
      // Header detection failed or confidence is too low
      return { headerRowIndex: -1, cleanedData: [] };
  }

  // 3. Extract the header row and all subsequent data rows
  const headerRow = csvData[headerRowIndex];
  const dataRows = csvData.slice(headerRowIndex + 1);

  if (dataRows.length === 0) {
      console.warn("Header row found, but no data rows detected afterwards.");
      // Still return header index, but data is empty
      return { headerRowIndex, cleanedData: [] };
  }

  // 4. Convert data rows to JSON format using normalized headers
  const cleanedData = convertToJsonWithHeaders(headerRow, dataRows);

  return { headerRowIndex, cleanedData };
}

// **** MODIFIED: Transform data function ****
function transformData(data: Array<Record<string, any>>): {
  transformedData: Array<Record<string, any>>;
  failedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  // Input `data` is now assumed to be pre-processed:
  // - It's an array of objects.
  // - Keys of the objects are the normalized headers detected by preprocessPayrollData.
  // - Rows before the header are already removed.

  if (!data || data.length === 0) {
    return { transformedData: [], failedRows: [] };
  }

  // --- Header Mapping ---
  // We no longer need to find the header row index.
  // We map from the MASTER template keys (columnMappings) to the *actual normalized headers* present in the data.
  const actualHeaders = Object.keys(data[0] || {}); // Get normalized headers from the first data row
  const headerMapping: Record<string, string> = {}; // Maps *actualHeader* -> *targetSchemaField*

  Object.entries(columnMappings).forEach(([masterKey, targetSchemaField]) => {
    // Find the best matching *actual header* for this *master template key*
    const bestMatchHeader = findBestMatch(masterKey, actualHeaders);
    if (bestMatchHeader) {
        // Check if this actual header is already mapped (e.g., 'Name' matching both 'Employee Name' and 'Surname')
        // Prioritize the first match or implement more complex logic if needed. For now, overwrite.
         if (headerMapping[bestMatchHeader] && headerMapping[bestMatchHeader] !== targetSchemaField) {
             console.warn(`Header mapping conflict: Actual header '${bestMatchHeader}' matched master key '${masterKey}' (field: ${targetSchemaField}), but was already mapped to field '${headerMapping[bestMatchHeader]}'. Overwriting mapping.`);
         }
        headerMapping[bestMatchHeader] = targetSchemaField;
    }
  });

  console.log('Detected header mapping (Actual Header -> Schema Field):', headerMapping);

  // Check if enough essential headers were mapped
  const mappedSchemaFields = Object.values(headerMapping);
  const essentialFieldsMapped = ['fullName', 'gross_income', 'nssf_no', 'nhif_no', 'tax_pin'].filter(field => mappedSchemaFields.includes(field)).length;

  if (Object.keys(headerMapping).length === 0) {
    // This case should ideally be caught by preprocessPayrollData, but as a fallback...
    return {
      transformedData: [],
      failedRows: data.map((row, index) => ({
        row,
        reason: `Row ${index + 1}: Could not map any headers to expected schema fields.`
      }))
    };
  } else if (Object.keys(headerMapping).length < 3 || essentialFieldsMapped < 1) {
     console.warn(`Low confidence mapping: Only ${Object.keys(headerMapping).length} headers mapped (${essentialFieldsMapped} essential fields). Proceeding, but results may be incomplete.`);
  }

  // --- Process Data Rows ---
  // We no longer slice the data, as it's already cleaned.
  const failedRows: Array<{row: Record<string, any>, reason: string}> = [];

  const transformedData = data.map((row, rowIndex) => {
    // Skip empty rows (should have been filtered by convertToJsonWithHeaders, but double-check)
    const isEmpty = Object.values(row).every(val =>
      val === "" || val === null || val === undefined
    );
    if (isEmpty) return null;

    // Initialize with Employee interface structure and defaults
    // (Keep the existing initialization)
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
      total_loan_deductions: 0, // Note: This seems redundant with loan_deductions, clarify if needed
      id_confirmed: false,
      mobile_confirmed: false,
      tax_pin_verified: false,
      hourlyRate: 0,
      hoursWorked: 0,
      startDate: new Date(), // Consider if this should be parsed or defaulted
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

    // Process each field based on the *actual header* and the derived headerMapping
    Object.entries(row).forEach(([actualHeader, value]) => {
      // Check if this actual header corresponds to a target schema field
      if (headerMapping[actualHeader] && value !== null && value !== undefined && String(value).trim() !== '') {
        const targetSchemaField = headerMapping[actualHeader];
        const processedValue = String(value).trim();

        try {
          // Apply parsing/transformation based on the targetSchemaField
          if (targetSchemaField === 'fullName') {
            const nameParts = processedValue.split(/\s+/);
            if (nameParts.length >= 2) {
              transformedRow.surname = nameParts.slice(-1).join(' ');
              transformedRow.other_names = nameParts.slice(0, -1).join(' ');
            } else {
              transformedRow.other_names = processedValue;
              // Ensure surname isn't accidentally left from a previous mapping if name is short
              transformedRow.surname = '';
            }
          } else if (targetSchemaField === 'is_on_probation' || targetSchemaField === 'terms_accepted') {
            setNestedValue(transformedRow, targetSchemaField, parseBoolean(processedValue));
          } else if (
            targetSchemaField.startsWith('statutory_deductions.') ||
            targetSchemaField === 'gross_income' ||
            targetSchemaField === 'net_income' ||
            targetSchemaField === 'loan_deductions' ||
            targetSchemaField === 'employer_advances' ||
            targetSchemaField === 'jahazii_advances' ||
            targetSchemaField === 'house_allowance'
          ) {
            setNestedValue(transformedRow, targetSchemaField, parseNumber(processedValue));
          } else {
            // Default: set string value, use setNestedValue for paths like 'contact.phoneNumber'
            setNestedValue(transformedRow, targetSchemaField, processedValue);
          }
          mappedFields++;
        } catch (e) {
          console.warn(`Error processing field '${targetSchemaField}' (from header '${actualHeader}') with value '${value}' for row index ${rowIndex}:`, e);
          transformedRow.extractionErrors?.push(`Error processing ${targetSchemaField}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    });

    // --- Post-processing calculations & Sanity checks ---
    // Keep the existing logic here, it operates on the transformedRow object

    // Example: Ensure full name is consistent if mapped separately
    if (mappedSchemaFields.includes('surname') && mappedSchemaFields.includes('other_names') && !mappedSchemaFields.includes('fullName')) {
        // If surname and other_names were mapped directly, ensure they are populated
        // This might override the split logic if 'fullName' wasn't found but 'surname'/'other_names' were.
        // The current logic prioritizes 'fullName' if found.
    }


    const houseAllowance = transformedRow.house_allowance ?? 0;
    transformedRow.total_deductions =
      (transformedRow.statutory_deductions?.tax ?? 0) +
      (transformedRow.statutory_deductions?.nssf ?? 0) +
      (transformedRow.statutory_deductions?.nhif ?? 0) +
      (transformedRow.statutory_deductions?.levy ?? 0) +
      (transformedRow.loan_deductions ?? 0) +
      (transformedRow.employer_advances ?? 0) +
      houseAllowance;

    // Calculate Net Income only if not explicitly provided in the sheet
    if (transformedRow.gross_income && !mappedSchemaFields.includes('net_income')) {
      transformedRow.net_income = (transformedRow.gross_income ?? 0) - (transformedRow.total_deductions ?? 0);
    }

    // Calculate EWA limits
    const netIncomeForLimit = transformedRow.net_income ?? 0;
    // Only calculate if limit wasn't explicitly mapped
    if (netIncomeForLimit > 0 && !mappedSchemaFields.includes('max_salary_advance_limit')) {
      transformedRow.max_salary_advance_limit = Math.floor(netIncomeForLimit * 0.5);
      transformedRow.available_salary_advance_limit = transformedRow.max_salary_advance_limit;
    }

    // Sanity checks (keep existing)
    const gross = transformedRow.gross_income ?? 0;
    const nhif = transformedRow.statutory_deductions?.nhif ?? 0;
    const nssf = transformedRow.statutory_deductions?.nssf ?? 0;
    const levy = transformedRow.statutory_deductions?.levy ?? 0;
    const totalDed = transformedRow.total_deductions ?? 0;

    if (nssf > 4320) {
      transformedRow.extractionErrors?.push(`Warning: NSSF (${nssf}) exceeds the KES 2160 cap.`);
    }
    if (levy > 2500) {
      transformedRow.extractionErrors?.push(`Warning: Housing Levy (${levy}) exceeds the KES 2500 cap.`);
    }
    if (gross > 0 && totalDed > gross && mappedSchemaFields.includes('net_income') && (transformedRow.net_income ?? 0) < 0) {
       // Only flag if total deductions > gross AND net income wasn't calculated by us (meaning it came from sheet)
       transformedRow.extractionErrors?.push(`Warning: Total Deductions (${totalDed}) exceed Gross Income (${gross}), resulting in negative Net Pay (${transformedRow.net_income}).`);
    } else if (gross > 0 && totalDed > gross && !mappedSchemaFields.includes('net_income')) {
       // If we calculated net_income and it's negative
       transformedRow.extractionErrors?.push(`Warning: Calculated Total Deductions (${totalDed}) exceed Gross Income (${gross}).`);
    }


    // --- Final validation ---
    // Check for essential identifiers and minimum mapped fields
    const hasIdentifier = transformedRow.employeeNumber || transformedRow.id_no || (transformedRow.other_names && transformedRow.surname) || transformedRow.other_names;
    const minFieldsRequired = 3; // Adjust as needed

    if (mappedFields < minFieldsRequired || !hasIdentifier) {
      failedRows.push({
        row, // The original row object from the preprocessed data
        reason: `Row ${rowIndex + 1}: Insufficient data mapped (${mappedFields} fields) or missing key identifier (Name/Emp No/ID No).`
      });
      return null; // Mark row as failed
    }

    return transformedRow; // Return the successfully transformed row
  })
  .filter((row): row is Employee & { extractionErrors?: string[] } => {
    // Filter out null values (failed rows)
    return row !== null && typeof row === 'object';
  });

  return { transformedData, failedRows };
}

// Extract data with detected headers - *Likely NO LONGER NEEDED* as transformData now handles preprocessed data
// function extractDataWithDetectedHeaders( allRows: Array<Record<string, any>>, dataRows: Array<Record<string, any>>): { ... }

// Direct extraction for non-standard formats - *Retained as Fallback*
function directDataExtraction(data: Array<Record<string, any>>): {
  directExtracted: Array<InsertEmployee>; // Use InsertEmployee from schema
  directFailedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  const directExtracted: Array<InsertEmployee> = [];
  const directFailedRows: Array<{row: Record<string, any>, reason: string}> = [];

  data.forEach((row, rowIndex) => { // Added rowIndex for error reporting
    const rowValues = Object.values(row);
    // Slightly relaxed check: look for any string that looks like a name and any number
     const hasNameLike = rowValues.some(val =>
         typeof val === 'string' && val.length > 3 && /[A-Za-z]{2,}\s?[A-Za-z]*/.test(String(val))
     );
     
    const hasNumberLike = rowValues.some(val =>
         (typeof val === 'number' && !isNaN(val)) ||
         (typeof val === 'string' && /^\d+(\.\d+)?$/.test(String(val).trim().replace(/,/g, ''))) // Look for numeric strings (int/float)
     );

    if (hasNameLike && hasNumberLike) {
      // Initialize with InsertEmployee structure (keep existing)
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
        // Add extractionErrors if adapting Employee type
        id_confirmed: false,
        mobile_confirmed: false,
        tax_pin_verified: false,
        created_at: new Date(),
        modified_at: new Date(),
        active: true,
        // Add other fields from InsertEmployee if necessary
      };
      
      let extractedFieldsCount = 0;
      let hasIdentifier = false;

      // Keep existing direct extraction logic attempting to guess fields
      Object.entries(row).forEach(([key, value]) => {
        const processedValue = String(value).trim();
        if (processedValue === '') return; // Skip empty values

        // Full name extraction (Improved slightly)
        if (typeof value === 'string' && value.length > 3 && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(processedValue) && !extractedRow.other_names) {
          const nameParts = processedValue.split(/\s+/);
           extractedRow.surname = nameParts.slice(-1).join(' ');
           extractedRow.other_names = nameParts.slice(0, -1).join(' ');
           hasIdentifier = true;
           extractedFieldsCount++;
        }
         // Simple Name guess (if full name didn't match)
         else if (typeof value === 'string' && value.length > 2 && /[A-Za-z]/.test(processedValue) && !hasIdentifier && !extractedRow.position) {
             // Avoid assigning things like 'Active' as a name
             if (!['active', 'inactive', 'terminated', 'yes', 'no', 'true', 'false'].includes(processedValue.toLowerCase())) {
                 extractedRow.other_names = processedValue; // Assume it's at least part of the name
                 hasIdentifier = true;
                 extractedFieldsCount++;
             }
         }
        // ID number (basic check - look for 5+ digits)
        else if (/^\d{5,}$/.test(processedValue.replace(/\s/g, '')) && !extractedRow.id_no) {
          extractedRow.id_no = processedValue.replace(/\s/g, '');
          extractedFieldsCount++;
        }
        // KRA PIN (basic check)
        else if (/^[A-Z]\d{9}[A-Z]$/i.test(processedValue.replace(/\s/g, '')) && !extractedRow.tax_pin) { // Case-insensitive, remove spaces
          extractedRow.tax_pin = processedValue.replace(/\s/g, '').toUpperCase();
          extractedFieldsCount++;
        }
        // NSSF number (basic check - 4 to 10 digits)
        else if (/^\d{4,10}$/.test(processedValue.replace(/\s/g, '')) && !extractedRow.nssf_no) {
          extractedRow.nssf_no = processedValue.replace(/\s/g, '');
          extractedFieldsCount++;
        }
         // NHIF number (basic check - often same as ID, but could be different, 5+ digits)
         else if (/^\d{5,}$/.test(processedValue.replace(/\s/g, '')) && !extractedRow.nhif_no && processedValue.replace(/\s/g, '') !== extractedRow.id_no) {
          extractedRow.nhif_no = processedValue.replace(/\s/g, '');
          extractedFieldsCount++;
        }
        // Employee Number (basic check - alphanumeric with potential hyphen/slash)
        else if (/^[a-zA-Z0-9\-\/]+$/.test(processedValue) && !extractedRow.employeeNumber && processedValue.length < 15) { // Add length limit?
            extractedRow.employeeNumber = processedValue;
            hasIdentifier = true; // Emp No is a valid identifier
            extractedFieldsCount++;
        }
        // Phone Number (basic check - digits, maybe +, 9-15 length)
        else if (/^\+?\d{9,15}$/.test(processedValue.replace(/\s/g, '')) && !extractedRow.contact!.phoneNumber) {
            extractedRow.contact!.phoneNumber = processedValue.replace(/\s/g, '');
            extractedFieldsCount++;
        }
        // Position (string, likely contains letters, avoid simple numbers or IDs)
        else if (typeof value === 'string' && /[a-zA-Z]{3,}/.test(processedValue) && !extractedRow.position && !/^\d+$/.test(processedValue) && processedValue !== extractedRow.other_names) { // Avoid grabbing names/IDs as positions
             extractedRow.position = processedValue;
             extractedFieldsCount++;
        }
        // Salary amount (number > 500 or numeric string)
        else if (((typeof value === 'number' && value > 500) || (typeof value === 'string' && /^\d{3,}(\.\d+)?$/.test(processedValue.replace(/,/g,'')))) && !extractedRow.gross_income) {
           const potentialGross = parseNumber(value, 0);
           if (potentialGross > 500) { // Check parsed value
                extractedRow.gross_income = potentialGross;
                // Keep the default statutory calculation logic
                const gross = extractedRow.gross_income;
                if (extractedRow.statutory_deductions) {
                    extractedRow.statutory_deductions.tax = Math.max(0, Math.floor((gross - 24000) * 0.1)); // Simplified PAYE
                    const nssfTier1Limit = 7000, nssfTier2Limit = 36000, nssfRate = 0.06;
                    const nssfTier1 = Math.min(gross, nssfTier1Limit) * nssfRate;
                    const nssfTier2Base = Math.max(0, gross - nssfTier1Limit);
                    const nssfTier2 = Math.min(nssfTier2Base, nssfTier2Limit - nssfTier1Limit) * nssfRate;
                    extractedRow.statutory_deductions.nssf = Math.min(Math.floor(nssfTier1 + nssfTier2), 2160);
                    let nhifCalc = 0;
                    if (gross >= 100000) nhifCalc = 1700; else if (gross >= 50000) nhifCalc = 1200;
                    else if (gross >= 20000) nhifCalc = 750; else if (gross >= 12000) nhifCalc = 500;
                    else if (gross >= 6000) nhifCalc = 300; else nhifCalc = 150;
                    extractedRow.statutory_deductions.nhif = nhifCalc;
                    extractedRow.statutory_deductions.levy = Math.min(Math.floor(gross * 0.015), 2500);
                }
                extractedFieldsCount++;
           }
        }
        // Other numeric values could be loans, advances (more complex to guess reliably)
      });

      // Post-processing: Calculate total deductions and net income if possible (Keep existing)
      if ((extractedRow.gross_income ?? 0) > 0) {
          extractedRow.total_deductions =
              (extractedRow.statutory_deductions?.tax ?? 0) +
              (extractedRow.statutory_deductions?.nssf ?? 0) +
              (extractedRow.statutory_deductions?.nhif ?? 0) +
              (extractedRow.statutory_deductions?.levy ?? 0) +
              (extractedRow.loan_deductions ?? 0) + // These will likely be 0 unless guessed
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
      const minDirectFields = 3; // Minimum fields for direct extraction
      if (extractedFieldsCount >= minDirectFields && hasIdentifier) { // Require identifier + min fields
        directExtracted.push(extractedRow);
      } else {
         // Only fail rows that had *some* values initially
          const hasValues = Object.values(row).some(v => v !== "" && v !== null && v !== undefined);
          if (hasValues) {
              directFailedRows.push({
                row,
                reason: `Direct Extraction - Row ${rowIndex + 1}: Only identified ${extractedFieldsCount} fields or missing identifier (Name/Emp No). Minimum ${minDirectFields} fields + identifier required.`
              });
          }
      }
    } else {
      // Row didn't meet the basic Name+Number pattern check
       const hasValues = Object.values(row).some(v => v !== "" && v !== null && v !== undefined);
       if (hasValues) {
        directFailedRows.push({
          row,
          reason: `Direct Extraction - Row ${rowIndex + 1}: Does not contain a recognizable pattern (e.g., Name-like string and Number).`
        });
       }
      // Ignore completely empty rows silently
    }
  });

  return { directExtracted, directFailedRows };
}

// Create a singleton instance of the chat service
export const chatService = createChatService();