import * as storage from './storage';
import { formatKEDate, formatKESCurrency } from '../client/src/lib/format-utils';
import { calculatePayrollBasedOnAttendance } from '../client/src/lib/kenyan-payroll';
import * as XLSX from 'xlsx';

// Column mapping configuration
const columnMappings: Record<string, string> = {
  'EMPLO NO.': 'Emp No',
  'EMPLOYEES\' FULL NAMES': 'fullName',
  'ID NO': 'ID Number',
  'KRA PIN NO.': 'KRA Pin',
  'NSSF NO.': 'NSSF No',
  'JOB TITTLE': 'Position',
  'BASIC SALARY': 'Gross Pay',
  'PAYE': 'PAYE',
  'NSSF': 'NSSF',
  'NHIF NO': 'NHIF',
  'H-LEVY': 'Levy',
  'LOANS': 'Loan Deduction',
  'ADVANCE': 'Employer Advance',
  'EMAIL': 'email',
  'PHONE': 'mobile',
  'CONTACT': 'mobile',
  'CITY': 'city',
  'SEX': 'sex',
  'GENDER': 'sex',
  'STATUS': 'status',
  'DEPARTMENT': 'department',
  'First Name': 'First Name',
  'Last Name': 'Last Name'
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
      await storage.saveCommand(userId, message);
      
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
          await storage.saveSearch(userId, query);
          
          // Implement employee search logic here
          const employees = await storage.findEmployees({ query });
          
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
      await storage.saveMessage({
        id: Date.now().toString(),
        userId,
        type: 'user',
        content: message,
        timestamp: new Date()
      });
      
      // Save the response
      const savedResponse = await storage.saveMessage(response);
      
      return savedResponse;
    },
    
    async getHistory(userId: string): Promise<ChatHistory> {
      const history = await storage.getUserChatHistory(userId);
      if (!history) {
        return {
          userId,
          messages: [],
          commands: [],
          searches: []
        };
      }
      
      // Get the most recent messages
      const messages = await storage.getMessagesByUser(userId);
      
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
        if (transformedData.length === 0) {
          const { directExtracted, directFailedRows } = directDataExtraction(jsonData as Record<string, any>[]);
          extractedData = directExtracted;
          finalFailedRows = [...failedRows, ...directFailedRows];
        }
        
        // Filter the extracted data to only include required fields
        const requiredFields = [
          'Emp No', 'First Name', 'Last Name', 'fullName', 'ID Number', 
          'NSSF No', 'KRA Pin', 'NHIF', 'Position', 'Gross Pay', 
          'Employer Advance', 'PAYE', 'Levy', 'Loan Deduction'
        ];
        
        const filteredData = extractedData.map(row => {
          const filteredRow: Record<string, any> = { id: row.id };
          requiredFields.forEach(field => {
            filteredRow[field] = row[field] !== undefined ? row[field] : '';
          });
          return filteredRow;
        });
        
        // Format the result
        const result = {
          headers: requiredFields,
          extractedData: filteredData,
          failedRows: finalFailedRows,
          fileName: file.originalname
        };
        
        // Save a message about the file upload
        const fileMessage: ChatMessage = {
          id: Date.now().toString(),
          userId,
          type: 'file',
          content: `Uploaded: ${file.originalname}`,
          timestamp: new Date(),
          fileData: result,
          actions: [
            {
              id: 'view-data',
              label: 'View & Edit'
            },
            {
              id: 'import-data',
              label: 'Import Employees'
            }
          ]
        };
        
        await storage.saveMessage(fileMessage);
        
        return result;
      } catch (error: any) { // Handle as a generic error with message property
        console.error('Error processing file:', error);
        throw new Error(`Failed to process file: ${error.message || 'Unknown error'}`);
      }
    },
    
    async searchEmployee(query: string, userId: string): Promise<any[]> {
      // Save the search query
      await storage.saveSearch(userId, query);
      
      // Implement employee search logic
      const employees = await storage.findEmployees({ query });
      
      return employees;
    },
    
    async importEmployees(data: any[], userId: string): Promise<any> {
      // Log request details
      console.log(`Chat service importEmployees called with ${data.length} employees`);
      
      // Clean data and ensure no client IDs are used
      const cleanData = data.map(emp => {
        // Remove any client-side ID
        const { id, ...rest } = emp;
        return rest;
      });
      
      // Log info about the import
      if (cleanData.length > 0) {
        const sampleEmployees = cleanData.slice(0, 2).map(emp => ({
          employeeNumber: emp.employeeNumber || emp['Emp No'],
          name: `${emp.other_names || emp['First Name']} ${emp.surname || emp['Last Name']}`.trim()
        }));
        console.log(`Sample employee data received: ${JSON.stringify(sampleEmployees)}`);
      }
      
      // Implement employee import logic with server-generated IDs
      const addedCount = await storage.addEmployees(cleanData);
      
      // Save a message about the import
      const importMessage: ChatMessage = {
        id: Date.now().toString(),
        userId,
        type: 'system',
        content: `✅ Successfully imported ${data.length} employees.`,
        timestamp: new Date()
      };
      
      await storage.saveMessage(importMessage);
      
      return { success: true, count: data.length };
    },
    
    async calculatePayroll(employeeIds: string[], userId: string): Promise<any> {
      // Implement payroll calculation logic
      const employees = await storage.getEmployees(employeeIds);
      
      const payrollData = employees.map((employee: any) => {
        const grossPay = employee.salary || 0;
        if (grossPay <= 0) return null;
        
        // Mock attendance data
        const standardHours = 160;
        const workedHours = Math.floor(Math.random() * 40) + 130;
        
        const payrollCalculation = calculatePayrollBasedOnAttendance(
          grossPay,
          standardHours,
          workedHours
        );
        
        return {
          'Employee ID': employee.id || 'N/A',
          'Name': employee.name || 'Unknown',
          'Position': employee.position || 'N/A',
          'Standard Hours': standardHours,
          'Worked Hours': workedHours,
          'Gross Pay': grossPay,
          'Taxable Pay': payrollCalculation.taxablePay,
          'PAYE': payrollCalculation.paye,
          'NHIF': payrollCalculation.nhif,
          'NSSF': payrollCalculation.nssf,
          'Housing Levy': payrollCalculation.housingLevy,
          'Total Deductions': payrollCalculation.totalDeductions,
          'Net Pay': payrollCalculation.netPay
        };
      }).filter(Boolean);
      
      // Save a message about the payroll calculation
      const payrollMessage: ChatMessage = {
        id: Date.now().toString(),
        userId,
        type: 'system',
        content: `✅ Payroll calculation complete! Generated payroll for ${payrollData.length} employees.`,
        timestamp: new Date()
      };
      
      await storage.saveMessage(payrollMessage);
      
      return payrollData;
    },
    
    // Format employee data for display in chat
    formatEmployeeInfo(employee: any): string {
      return `
**${employee.name}**
Position: ${employee.position}
Department: ${employee.department}
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
  const specialCases: Record<string, string[]> = {
    'EMPLO NO.': ['EMP NO', 'EMPLOYEE NO', 'EMPLOYEE NUMBER', 'EMP NUMBER', 'STAFF NO', 'PAYROLL NO', 'ID'],
    'EMPLOYEES\' FULL NAMES': ['EMPLOYEE NAME', 'FULL NAME', 'NAME', 'EMPLOYEE NAMES', 'STAFF NAME', 'EMPLOYEE FULL NAME', 'SURNAME', 'OTHER NAMES'],
    'ID NO': ['ID NUMBER', 'NATIONAL ID', 'IDENTITY NUMBER', 'ID', 'IDENTIFICATION'],
    'KRA PIN NO.': ['KRA PIN', 'KRA', 'PIN NO', 'PIN NUMBER', 'TAX PIN'],
    'NSSF NO.': ['NSSF NUMBER', 'NSSF', 'SOCIAL SECURITY NO'],
    'JOB TITTLE': ['TITLE', 'POSITION', 'JOB TITLE', 'DESIGNATION', 'ROLE'],
    'BASIC SALARY': ['SALARY', 'GROSS SALARY', 'GROSS', 'GROSS PAY', 'MONTHLY SALARY', 'GROSS INCOME', 'NET INCOME'],
    'NHIF NO': ['NHIF', 'NHIF NUMBER', 'HEALTH INSURANCE', 'HEALTH INSURANCE NO'],
    'H-LEVY': ['HOUSING LEVY', 'LEVY', 'HOUSE LEVY', 'HOUSING', 'LEVIES'],
    'LOANS': ['LOAN', 'LOAN DEDUCTION', 'LOAN REPAYMENT', 'DEBT REPAYMENT', 'TOTAL LOAN DEDUCTIONS'],
    'ADVANCE': ['SALARY ADVANCE', 'ADVANCE SALARY', 'EMPLOYER ADVANCE', 'ADVANCE PAYMENT', 'EMPLOYER ADVANCES'],
    'EMAIL': ['EMAIL ADDRESS', 'MAIL', 'E-MAIL', 'EMAIL ID'],
    'PHONE': ['MOBILE', 'TELEPHONE', 'PHONE NUMBER', 'CONTACT', 'MOBILE NUMBER'],
    'CITY': ['TOWN', 'LOCALITY', 'LOCATION', 'AREA'],
    'SEX': ['GENDER', 'MALE/FEMALE', 'M/F'],
    'STATUS': ['EMPLOYEE STATUS', 'ACTIVE', 'INACTIVE', 'EMPLOYMENT STATUS'],
    'DEPARTMENT': ['DEPT', 'DIVISION', 'UNIT', 'SECTION']
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
              return extractDataWithDetectedHeaders(data.slice(rowIndex), data.slice(rowIndex + 1));
            }
          }
        }
      }
    }
  }
  
  const transformedData = data.map(row => {
    const isEmpty = Object.values(row).every(val => 
      val === "" || val === null || val === undefined
    );
    
    const valueCount = Object.values(row).filter(val => 
      val !== "" && val !== null && val !== undefined
    ).length;
    const isLikelyHeader = valueCount === 1 || 
                          (valueCount < 3 && Object.keys(row).length > 4);
    
    if (isEmpty || isLikelyHeader) {
      return null;
    }
    
    const transformedRow: Record<string, any> = {
      status: 'active', // Default status
      is_on_probation: false, // Default probation status
      role: 'Employee', // Default role
      country: 'KE', // Default country code for Kenya
      statutory_deductions: {
        nhif: 0,
        nssf: 0,
        paye: 0,
        levies: 0
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

    let mappedFields = 0;
    let fullName = '';
    let firstName = '';
    let lastName = '';
    
    Object.entries(row).forEach(([key, value]) => {
      if (headerMapping[key]) {
        const targetField = headerMapping[key];
        
        // Handle name fields
        if (targetField === 'fullName') {
          fullName = String(value || "").trim();
          const nameParts = fullName.split(/\s+/);
          
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
            transformedRow['First Name'] = firstName;
            transformedRow['Last Name'] = lastName;
            transformedRow['fullName'] = fullName;
          } else {
            transformedRow['First Name'] = fullName;
            transformedRow['Last Name'] = '';
            transformedRow['fullName'] = fullName;
          }
          mappedFields++;
        } 
        // Handle statutory deductions
        else if (['PAYE', 'NSSF', 'NHIF', 'Levy'].includes(targetField)) {
          transformedRow[targetField] = parseFloat(value) || 0;
          mappedFields++;
        }
        // Handle contact fields
        else if (['mobile', 'city'].includes(targetField)) {
          transformedRow.contact[targetField] = value;
          mappedFields++;
        }
        // Handle bank info
        else if (targetField === 'bank_name' || targetField === 'acc_no') {
          transformedRow.bank_info[targetField] = value;
          mappedFields++;
        }
        // Handle all other regular fields
        else {
          transformedRow[targetField] = value;
          mappedFields++;
        }
      }
    });
    
    // Calculate net income if gross income is available but net is not
    if (transformedRow.gross_income && !transformedRow.net_income) {
      const grossIncome = parseFloat(transformedRow.gross_income) || 0;
      const paye = transformedRow.statutory_deductions.paye || 0;
      const nssf = transformedRow.statutory_deductions.nssf || 0;
      const nhif = transformedRow.statutory_deductions.nhif || 0;
      const levies = transformedRow.statutory_deductions.levies || 0;
      const loans = transformedRow.loan_deductions || 0;
      const advances = transformedRow.employer_advances || 0;
      
      const totalDeductions = paye + nssf + nhif + levies + loans + advances;
      transformedRow.total_deductions = totalDeductions;
      transformedRow.net_income = grossIncome - totalDeductions;
    }
    
    // Set EWA limits based on net income
    if (transformedRow.net_income && !transformedRow.max_salary_advance_limit) {
      const netIncome = parseFloat(transformedRow.net_income) || 0;
      // Default to 50% of net pay as max EWA limit
      transformedRow.max_salary_advance_limit = Math.floor(netIncome * 0.5);
      transformedRow.available_salary_advance_limit = transformedRow.max_salary_advance_limit;
    }
    
    // Ensure all required fields are present
    const requiredFields = [
      'Emp No', 'First Name', 'Last Name', 'fullName', 'ID Number', 
      'NSSF No', 'KRA Pin', 'NHIF', 'Position', 'Gross Pay', 
      'Employer Advance', 'PAYE', 'Levy', 'Loan Deduction'
    ];
    
    // Add placeholders for any missing required fields
    requiredFields.forEach(field => {
      if (transformedRow[field] === undefined) {
        if (['Gross Pay', 'PAYE', 'NHIF', 'Levy', 'Employer Advance', 'Loan Deduction'].includes(field)) {
          transformedRow[field] = 0;
        } else {
          transformedRow[field] = '';
        }
      }
    });
    
    // Ensure the row has an ID
    if (!transformedRow.id) {
      transformedRow.id = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    if (mappedFields < 3 && !isEmpty && !isLikelyHeader) {
      failedRows.push({
        row, 
        reason: `Only ${mappedFields} fields could be mapped to known columns`
      });
      return null;
    }
    
    return transformedRow;
  })
  .filter((row): row is Record<string, any> => row !== null && Object.keys(row).length > 0);
  
  return { transformedData, failedRows };
}

// Extract data with detected headers
function extractDataWithDetectedHeaders(
  allRows: Array<Record<string, any>>, 
  dataRows: Array<Record<string, any>>
): {
  transformedData: Array<Record<string, any>>;
  failedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  if (allRows.length === 0 || dataRows.length === 0) {
    return { transformedData: [], failedRows: [] };
  }
  
  const headerRow = allRows[0];
  const headerMapping: Record<string, string> = {};
  const failedRows: Array<{row: Record<string, any>, reason: string}> = [];
  
  for (const [key, headerValue] of Object.entries(headerRow)) {
    const headerText = String(headerValue).trim();
    if (!headerText) continue;
    
    for (const [original, target] of Object.entries(columnMappings)) {
      if (headerText.toLowerCase().includes(original.toLowerCase()) ||
          original.toLowerCase().includes(headerText.toLowerCase())) {
        headerMapping[key] = target;
        break;
      }
    }
  }
  
  const transformedData = dataRows.map(row => {
    const isEmpty = Object.values(row).every(val => 
      val === "" || val === null || val === undefined
    );
    
    const valueCount = Object.values(row).filter(val => 
      val !== "" && val !== null && val !== undefined
    ).length;
    const isLikelyHeader = valueCount === 1 || 
                          (valueCount < 3 && Object.keys(row).length > 4);
    
    if (isEmpty || isLikelyHeader) {
      return null;
    }
    
    // Create a new row with MongoDB document structure
    const transformedRow: Record<string, any> = {
      status: 'active', // Default status
      is_on_probation: false, // Default probation status
      role: 'Employee', // Default role
      country: 'KE', // Default country code for Kenya
      statutory_deductions: {
        nhif: 0,
        nssf: 0,
        paye: 0,
        levies: 0
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
    
    let mappedFields = 0;
    let fullName = '';
    let firstName = '';
    let lastName = '';
    
    Object.entries(row).forEach(([key, value]) => {
      if (headerMapping[key]) {
        const targetField = headerMapping[key];
        
        // Handle name fields
        if (targetField === 'fullName') {
          fullName = String(value || "").trim();
          const nameParts = fullName.split(/\s+/);
          
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
            transformedRow['First Name'] = firstName;
            transformedRow['Last Name'] = lastName;
            transformedRow['fullName'] = fullName;
          } else {
            transformedRow['First Name'] = fullName;
            transformedRow['Last Name'] = '';
            transformedRow['fullName'] = fullName;
          }
          mappedFields++;
        } 
        // Handle statutory deductions
        else if (['PAYE', 'NSSF', 'NHIF', 'Levy'].includes(targetField)) {
          transformedRow[targetField] = parseFloat(value) || 0;
          mappedFields++;
        }
        // Handle contact fields
        else if (['mobile', 'city'].includes(targetField)) {
          transformedRow.contact[targetField] = value;
          mappedFields++;
        }
        // Handle bank info
        else if (targetField === 'bank_name' || targetField === 'acc_no') {
          transformedRow.bank_info[targetField] = value;
          mappedFields++;
        }
        // Handle all other regular fields
        else {
          transformedRow[targetField] = value;
          mappedFields++;
        }
      }
    });
    
    // Calculate net income if gross income is available but net is not
    if (transformedRow.gross_income && !transformedRow.net_income) {
      const grossIncome = parseFloat(transformedRow.gross_income) || 0;
      const paye = transformedRow.statutory_deductions.paye || 0;
      const nssf = transformedRow.statutory_deductions.nssf || 0;
      const nhif = transformedRow.statutory_deductions.nhif || 0;
      const levies = transformedRow.statutory_deductions.levies || 0;
      const loans = transformedRow.loan_deductions || 0;
      const advances = transformedRow.employer_advances || 0;
      
      const totalDeductions = paye + nssf + nhif + levies + loans + advances;
      transformedRow.total_deductions = totalDeductions;
      transformedRow.net_income = grossIncome - totalDeductions;
    }
    
    // Set EWA limits based on net income
    if (transformedRow.net_income && !transformedRow.max_salary_advance_limit) {
      const netIncome = parseFloat(transformedRow.net_income) || 0;
      // Default to 50% of net pay as max EWA limit
      transformedRow.max_salary_advance_limit = Math.floor(netIncome * 0.5);
      transformedRow.available_salary_advance_limit = transformedRow.max_salary_advance_limit;
    }
    
    // Ensure all required fields are present
    const requiredFields = [
      'Emp No', 'First Name', 'Last Name', 'fullName', 'ID Number', 
      'NSSF No', 'KRA Pin', 'NHIF', 'Position', 'Gross Pay', 
      'Employer Advance', 'PAYE', 'Levy', 'Loan Deduction'
    ];
    
    // Add placeholders for any missing required fields
    requiredFields.forEach(field => {
      if (transformedRow[field] === undefined) {
        if (['Gross Pay', 'PAYE', 'NHIF', 'Levy', 'Employer Advance', 'Loan Deduction'].includes(field)) {
          transformedRow[field] = 0;
        } else {
          transformedRow[field] = '';
        }
      }
    });
    
    // Ensure the row has an ID
    if (!transformedRow.id) {
      transformedRow.id = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    if (mappedFields < 3 && !isEmpty && !isLikelyHeader) {
      failedRows.push({
        row, 
        reason: `Only ${mappedFields} fields could be mapped to known columns`
      });
      return null;
    }
    
    return transformedRow;
  })
  .filter((row): row is Record<string, any> => row !== null && Object.keys(row).length > 0);
  
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
        role: 'Employee', // Default role
        country: 'KE', // Default country code for Kenya
        statutory_deductions: {
          nhif: 0,
          nssf: 0,
          paye: 0,
          levies: 0
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
            
            // Default to 30% of gross for PAYE
            extractedRow['PAYE'] = Math.floor(value * 0.3);
            // Default to 1.5% for NSSF
            extractedRow['NSSF'] = Math.min(Math.floor(value * 0.015), 2160);
            // Add default NHIF value
            extractedRow['NHIF'] = Math.min(Math.floor(value * 0.01), 1700);
            // Default to 1.5% for Housing Levy
            extractedRow['Levy'] = Math.floor(value * 0.015);
            
            // Calculate total deductions
            const totalDeductions = extractedRow['PAYE'] +
                                   extractedRow['NSSF'] +
                                   extractedRow['NHIF'] +
                                   extractedRow['Levy'];
            
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
          'Employer Advance', 'PAYE', 'Levy', 'Loan Deduction'
        ];
        
        // Add placeholders for any missing required fields
        requiredFields.forEach(field => {
          if (extractedRow[field] === undefined) {
            if (['Gross Pay', 'PAYE', 'NHIF', 'Levy', 'Employer Advance', 'Loan Deduction'].includes(field)) {
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