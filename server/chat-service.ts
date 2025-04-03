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

// --- Helper Functions (Restored Full Implementations) ---

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
  if (value === null || value === undefined || String(value).trim() === '') {
    return defaultValue;
  }
  const stringValue = String(value).trim().replace(/[,KESksh\s]/gi, ''); // Remove commas, KES, ksh, spaces
  if (stringValue === '' || isNaN(Number(stringValue))) {
    return defaultValue;
  }
  const num = Number(stringValue);
  return num;
}

// Define types for special cases used in findBestMatch
type SpecialCaseStructured = {
  exact: string[];
  variations: string[];
  exclude: string[];
};
type SpecialCaseValue = SpecialCaseStructured | string[];

// Restored: Improved function to find the closest matching column with context awareness
function findBestMatch(targetColumn: string, availableColumns: string[]): string | null {
  const specialCases: Record<string, SpecialCaseValue> = {
    'NSSF No': { exact: ['NSSF NO', 'NSSF NUMBER', 'NSSF NO.'], variations: ['NSSF MEMBERSHIP', 'SOCIAL SECURITY NO', 'NSSF ID'], exclude: ['NSSF DEDUCTION', 'NSSF AMOUNT', 'NSSF CONTRIBUTION', 'NSSF', 'NSSF '] },
    'NSSF': { exact: ['NSSF', 'NSSF DEDUCTION', 'NSSF AMOUNT', 'NSSF CONTRIBUTION', 'NSSF '], variations: ['SOCIAL SECURITY DEDUCTION', 'NSSF DED'], exclude: ['NSSF NO', 'NSSF NUMBER', 'NSSF MEMBERSHIP', 'NSSF NO.'] },
    'NHIF No': { exact: ['NHIF NO', 'NHIF NUMBER', 'NHIF NO.'], variations: ['NHIF MEMBERSHIP', 'HEALTH INSURANCE NO', 'NHIF ID'], exclude: ['NHIF DEDUCTION', 'NHIF AMOUNT', 'NHIF CONTRIBUTION', 'NHIF', 'SHIF', 'SHIF '] },
    'NHIF': { exact: ['NHIF', 'NHIF DEDUCTION', 'NHIF AMOUNT', 'NHIF CONTRIBUTION', 'SHIF', 'SHIF DEDUCTION', 'SHIF AMOUNT', 'SHIF CONTRIBUTION', 'SHIF', 'SHA'], variations: ['HEALTH INSURANCE DEDUCTION', 'NHIF DED', 'SHIF DED'], exclude: ['NHIF NO', 'NHIF NUMBER', 'NHIF MEMBERSHIP', 'SHIF NO', 'SHIF NUMBER'] },
    'KRA Pin': { exact: ['KRA PIN NUMBER', 'KRA PIN', 'TAX PIN', 'KRA'], variations: ['PIN NO', 'PIN NUMBER', 'KRA PIN NO.', 'KRA NUMBER'], exclude: ['PHONE', 'CONTACT', 'MOBILE', 'BANK', 'ACCOUNT', 'NSSF', 'NHIF', 'ID', 'EMP', 'STAFF'] },
     'CONTACTS': { exact: ['CONTACT', 'CONTACTS', 'PHONE', 'MOBILE', 'TELEPHONE', 'PHONE NUMBER', 'MOBILE NUMBER', 'TEL NO.'], variations: [], exclude: ['KRA', 'PIN', 'TAX', 'NSSF', 'NHIF', 'ID', 'EMP', 'STAFF', 'BANK', 'ACCOUNT'] },
     'MPesa Number': { exact: ['MPESA', 'MOBILE MONEY', 'PHONE NO', 'MOBILE NO', 'TEL NO.'], variations: [], exclude: ['KRA', 'PIN', 'TAX', 'NSSF', 'NHIF', 'ID', 'EMP', 'STAFF', 'BANK', 'ACCOUNT'] },
     'Bank Account Number': { exact: ['BANK ACC', 'BANK ACCOUNT', 'ACCOUNT NUMBER', 'ACC NO', 'ACCOUNT NO'], variations: ['BANK', 'ACCOUNT'], exclude: ['ID NO', 'ID NUMBER', 'NATIONAL ID', 'KRA', 'PIN', 'PHONE', 'MOBILE'] },
     'ID Number': { exact: ['ID NO', 'ID NUMBER', 'NATIONAL ID', 'IDENTITY NUMBER'], variations: ['ID', 'IDENTIFICATION'], exclude: ['BANK', 'ACCOUNT', 'ACC NO', 'KRA', 'PIN', 'PHONE', 'EMP NO'] },
    'Emp No': ['EMPLO NO.', 'EMPLOYEE NO', 'EMPLOYEE NUMBER', 'EMP NUMBER', 'STAFF NO'],
    'Employee Name': ['EMPLOYEES\' FULL NAMES', 'FULL NAME', 'NAME', 'NAMES', 'EMPLOYEE NAMES', 'STAFF NAME', 'EMPLOYEE FULL NAME', 'SURNAME', 'OTHER NAMES'],
    'Probation Period': ['PROBATION', 'ON PROBATION'],
    'Position': ['JOB TITTLE', 'TITLE', 'JOB TITLE', 'DESIGNATION', 'ROLE', 'SITE'],
    'Gross Pay': ['GROSS SALARY', 'GROSS', 'MONTHLY SALARY', 'GROSS INCOME', 'TOTAL GROSS PAY', 'GROSS PAY', 'GROSS EARNINGS'],
    'PAYE': ['TAX', 'INCOME TAX', 'PAYE'],
    'Levy': ['H-LEVY', 'HOUSING LEVY', 'HOUSE LEVY', 'HOUSING', 'LEVIES'],
    'Loan Deduction': ['LOANS', 'LOAN', 'LOAN REPAYMENT', 'DEBT REPAYMENT', 'TOTAL LOAN DEDUCTIONS', 'LOAN DEDUCTION'],
    'Employer Advance': ['ADVANCE', 'SALARY ADVANCE', 'ADVANCE SALARY', 'ADVANCE PAYMENT', 'EMPLOYER ADVANCES', 'SALARY ADVANCE'],
    'Net Pay': ['NET SALARY', 'TAKE HOME', 'FINAL PAY', 'NET PAY', 'NET INCOME'],
    'T & C Accepted': ['TERMS ACCEPTED', 'T&C', 'AGREED TERMS'],
    'GENDER': ['SEX', 'MALE/FEMALE', 'M/F'],
    'BANK CODE': ['BANK BRANCH CODE', 'BRANCH CODE'],
    'BANK': ['BANK NAME'],
    'HOUSE ALLOWANCE': ['HSE ALLOWANCE', 'H/ALLOWANCE', 'HOUSING'],
    'JAHAZII': ['JAHAZII ADVANCE', 'JAHAZII LOAN', 'JAHAZII'],
    'STATUS': ['EMPLOYEE STATUS', 'ACTIVE', 'INACTIVE', 'EMPLOYMENT STATUS'],
    'Total Deductions': ['TOTAL DEDUCTIONS', 'TOTAL DED', 'TOTAL DEDUCTS'],
  };

  const cleanedAvailableColumns = availableColumns.map(col => {
    if (col && col.startsWith('__EMPTY')) return null;
    return String(col || '').trim().toUpperCase();
  }).filter(Boolean) as string[];

  const upperTargetColumn = targetColumn.toUpperCase();
  const specialCase = specialCases[targetColumn];

  if (specialCase && !Array.isArray(specialCase)) {
    for (const col of cleanedAvailableColumns) {
      if (!col) continue;
      if (specialCase.exclude.some(excl => col === excl.toUpperCase())) continue;
      if (specialCase.exact.some(exact => col === exact.toUpperCase())) return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === col) || col;
    }
    for (const col of cleanedAvailableColumns) {
      if (!col) continue;
      if (specialCase.exclude.some(excl => col.includes(excl.toUpperCase()))) continue;
      if (specialCase.variations.some(variation => col.includes(variation.toUpperCase()))) return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === col) || col;
    }
  } else {
    const exactMatch = cleanedAvailableColumns.find(col => col === upperTargetColumn);
    if (exactMatch) return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === exactMatch) || exactMatch;

    if (specialCase && Array.isArray(specialCase)) {
      const upperVariations = specialCase.map(v => v.toUpperCase());
      const variationMatch = cleanedAvailableColumns.find(col => upperVariations.includes(col));
      if (variationMatch) return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === variationMatch) || variationMatch;
    }

    for (const col of cleanedAvailableColumns) {
      if (col.includes(upperTargetColumn) || upperTargetColumn.includes(col)) {
         return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === col) || col;
      }
    }

    const targetWords = upperTargetColumn.split(/[\s.,\-_]+/).filter(word => word.length > 2);
    if (targetWords.length > 0) {
        for (const col of cleanedAvailableColumns) {
            const colWords = col.split(/[\s.,\-_]+/).filter(word => word.length > 2);
            if (colWords.length > 0) {
                const commonWords = targetWords.filter(word => colWords.includes(word));
                if (commonWords.length > 0) {
                    return availableColumns.find(originalCol => String(originalCol || '').trim().toUpperCase() === col) || col;
                }
            }
        }
    }
  }
  return null;
}


// Restored: Find Header Row in CSV-like data
function findHeaderRowInCSV(csvData: any[][], maxRowsToCheck = 10): number {
  const expectedPatterns = [
      /emp|staff|no/i, /name|full|surname|other/i, /gross|basic|salary|pay\b/i,
      /net|take\s?home/i, /nssf|social/i, /nhif|health|shif|sha/i, /tax|paye/i,
      /levy|housing/i, /deduction|deduct/i, /loan/i, /advance/i, /id\s?no|identi/i,
      /kra|pin/i, /bank/i, /position|title|designation|role|site/i, /phone|contact|mobile|mpesa/i,
  ];
  const essentialPatterns = [ /name|full|surname|other/i, /gross|basic|salary|pay\b/i, /nssf|social/i, /nhif|health|shif/i, /tax|paye/i ];
  let bestRowIndex = -1;
  let bestScore = 0;
  const minRequiredScore = 3;
  const rowsToCheck = Math.min(csvData.length, maxRowsToCheck);

  for (let i = 0; i < rowsToCheck; i++) {
      const row = csvData[i];
      const filledCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length;
      if (filledCells < minRequiredScore) continue;
      let score = 0;
      let essentialMatches = 0;
      const matchedPatterns = new Set<RegExp>();
      for (const cell of row) {
          if (cell === null || cell === undefined) continue;
          const cellStr = String(cell).trim().toLowerCase();
          if (cellStr === '') continue;
          for (const pattern of expectedPatterns) {
              if (!matchedPatterns.has(pattern) && pattern.test(cellStr)) {
                  score++;
                  matchedPatterns.add(pattern);
                  if (essentialPatterns.some(essential => essential.source === pattern.source)) {
                      essentialMatches++;
                  }
              }
          }
      }
      score += essentialMatches;
      if (score > bestScore && score >= minRequiredScore) {
          bestScore = score;
          bestRowIndex = i;
      }
  }
  if (bestScore < minRequiredScore) {
      console.warn(`Warning: Possible header detection issue. Best row (index ${bestRowIndex}) only scored ${bestScore}. Min required: ${minRequiredScore}.`);
      return -1;
  }
  console.log(`Detected header row at index ${bestRowIndex} with score ${bestScore}.`);
  return bestRowIndex;
}

// Restored: Convert CSV-like data to JSON using provided headers
function convertToJsonWithHeaders(headerRow: any[], dataRows: any[][]): Array<Record<string, any>> {
  const normalizedHeaders = headerRow.map((header, index) => {
      const trimmedHeader = String(header || '').trim().replace(/\s+/g, ' ');
      return trimmedHeader === '' ? `__EMPTY_COL_${index}__` : trimmedHeader;
  });
  const uniqueHeaders = new Set(normalizedHeaders.filter(h => !h.startsWith('__EMPTY_COL_')));
  if (uniqueHeaders.size !== normalizedHeaders.filter(h => !h.startsWith('__EMPTY_COL_')).length) {
      console.warn('Duplicate headers detected after normalization:', normalizedHeaders);
  }
  return dataRows.map((row) => {
      const rowObject: Record<string, any> = {};
      const numHeaders = normalizedHeaders.length;
      for (let i = 0; i < numHeaders; i++) {
          const header = normalizedHeaders[i];
          const cellValue = (i < row.length) ? row[i] : undefined;
          if (!header.startsWith('__EMPTY_COL_')) {
            rowObject[header] = cellValue;
          }
      }
      return rowObject;
  }).filter(obj => Object.values(obj).some(v => v !== null && v !== undefined && String(v).trim() !== ''));
}

// Modified preprocessPayrollData to accept csvData
function preprocessPayrollData(csvData: any[][], sheetName: string): {
    headerRowIndex: number;
    cleanedData: Array<Record<string, any>>;
} {
    console.log(`Sheet ${sheetName}: 2.1. Using pre-converted CSV-like array...`);
    if (!csvData || csvData.length === 0) {
        console.warn(`Sheet ${sheetName}: CSV data array is empty.`);
        return { headerRowIndex: -1, cleanedData: [] };
    }
    console.log(`Sheet ${sheetName}: 2.2. Finding header row...`);
    const headerRowIndex = findHeaderRowInCSV(csvData);
    if (headerRowIndex === -1) {
        console.warn(`Sheet ${sheetName}: Header detection failed.`);
        return { headerRowIndex: -1, cleanedData: [] };
    }
    console.log(`Sheet ${sheetName}: 2.3. Extracting/merging header row...`);
    const headerRow = csvData[headerRowIndex];
    let mergedHeaders = [...headerRow];
    if (headerRowIndex > 0) {
        const previousRow = csvData[headerRowIndex - 1];
        mergedHeaders = headerRow.map((cell, index) => {
            const currentHeaderCell = cell === null || cell === undefined || String(cell).trim() === '' ? null : String(cell).trim();
            if (!currentHeaderCell) {
                const previousCell = (index < previousRow.length && previousRow[index] !== null && previousRow[index] !== undefined && String(previousRow[index]).trim() !== '') ? String(previousRow[index]).trim() : null;
                if (previousCell) return previousCell;
            }
            return currentHeaderCell ?? cell;
        });
    } else {
        mergedHeaders = headerRow.map(cell => cell === null || cell === undefined ? null : String(cell).trim());
    }
    console.log(`Sheet ${sheetName}: 2.4. Extracting data rows...`);
    const dataRows = csvData.slice(headerRowIndex + 1);
    if (dataRows.length === 0) {
        console.warn(`Sheet ${sheetName}: Header row found, but no data rows detected afterwards.`);
        return { headerRowIndex, cleanedData: [] };
    }
    console.log(`Sheet ${sheetName}: 2.5. Converting data rows to JSON...`);
    const cleanedData = convertToJsonWithHeaders(mergedHeaders, dataRows);
    console.log(`Sheet ${sheetName}: Preprocessing successful, ${cleanedData.length} rows cleaned.`);
    return { headerRowIndex, cleanedData };
}


// Restored: Function to transform pre-processed data
function transformData(data: Array<Record<string, any>>): {
   transformedData: Array<InsertEmployee>; // Return InsertEmployee
   failedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  if (!data || data.length === 0) {
    return { transformedData: [], failedRows: [] };
  }

  const actualHeaders = Object.keys(data[0] || {});
  const headerMapping: Record<string, string> = {}; // Maps *actualHeader* -> *targetSchemaField*
  Object.entries(columnMappings).forEach(([masterKey, targetSchemaField]) => {
    const bestMatchHeader = findBestMatch(masterKey, actualHeaders);
    if (bestMatchHeader) {
         if (headerMapping[bestMatchHeader] && headerMapping[bestMatchHeader] !== targetSchemaField) {
             console.warn(`Header mapping conflict: Actual header '${bestMatchHeader}' matched master key '${masterKey}' (field: ${targetSchemaField}), but was already mapped to field '${headerMapping[bestMatchHeader]}'. Overwriting.`);
         }
        headerMapping[bestMatchHeader] = targetSchemaField;
    }
  });
  console.log('Detected header mapping (Actual Header -> Schema Field):', headerMapping);
  const mappedSchemaFields = Object.values(headerMapping);
  const essentialFieldsMapped = ['fullName', 'gross_income'].filter(field => mappedSchemaFields.includes(field)).length;
  if (Object.keys(headerMapping).length === 0) {
    return { transformedData: [], failedRows: data.map((row, index) => ({ row, reason: `Row ${index + 1}: Could not map any headers.` })) };
  } else if (Object.keys(headerMapping).length < 3 || essentialFieldsMapped < 1) {
     console.warn(`Low confidence mapping: Only ${Object.keys(headerMapping).length} headers mapped (${essentialFieldsMapped} essential).`);
  }

  const failedRows: Array<{row: Record<string, any>, reason: string}> = [];
  const transformedResultData: Array<InsertEmployee> = []; // Use InsertEmployee

  data.forEach((row, rowIndex) => {
    const isEmpty = Object.values(row).every(val => val === "" || val === null || val === undefined);
    if (isEmpty) return;

    // Initialize with InsertEmployee structure and defaults
    const transformedRow: InsertEmployee & { extractionErrors?: string[] } = {
      // Use InsertEmployee fields and defaults
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-trans`, // Indicate transform origin
      status: 'active', is_on_probation: false, role: 'employee', country: 'KE',
      statutory_deductions: { nhif: 0, nssf: 0, tax: 0, levy: 0 },
      contact: { email: '', phoneNumber: '' },
      bank_info: { acc_no: null, bank_name: null, bank_code: null },
      gross_income: 0, net_income: 0, total_deductions: 0, loan_deductions: 0, employer_advances: 0, jahazii_advances: 0,
      max_salary_advance_limit: 0, available_salary_advance_limit: 0, terms_accepted: false,
      surname: '', other_names: '', id_no: '', tax_pin: '', sex: '', nssf_no: '', nhif_no: '', employeeNumber: '', position: '',
      id_confirmed: false, mobile_confirmed: false, tax_pin_verified: false,
      created_at: new Date(), modified_at: new Date(), active: true,
      // Add fields potentially missing from Employee but needed for InsertEmployee or processing logic
      house_allowance: 0,
      startDate: new Date(), // Default or should be parsed?
      extractionErrors: [],
    };

    let mappedFields = 0;
    Object.entries(row).forEach(([actualHeader, value]) => {
      if (headerMapping[actualHeader] && value !== null && value !== undefined && String(value).trim() !== '') {
        const targetSchemaField = headerMapping[actualHeader];
        const processedValue = String(value).trim();
        try {
          if (targetSchemaField === 'fullName') {
            const nameParts = processedValue.split(/\s+/);
            if (nameParts.length >= 2) {
              transformedRow.surname = nameParts.slice(-1).join(' ');
              transformedRow.other_names = nameParts.slice(0, -1).join(' ');
            } else {
              transformedRow.other_names = processedValue; transformedRow.surname = '';
            }
          } else if (targetSchemaField === 'is_on_probation' || targetSchemaField === 'terms_accepted') {
            setNestedValue(transformedRow, targetSchemaField, parseBoolean(processedValue));
          } else if ( targetSchemaField.startsWith('statutory_deductions.') || ['gross_income', 'net_income', 'loan_deductions', 'employer_advances', 'jahazii_advances', 'house_allowance'].includes(targetSchemaField) ) {
            setNestedValue(transformedRow, targetSchemaField, parseNumber(processedValue));
          } else {
            setNestedValue(transformedRow, targetSchemaField, processedValue);
          }
          mappedFields++;
        } catch (e) {
          console.warn(`Error processing field '${targetSchemaField}' (from '${actualHeader}') value '${value}' row ${rowIndex}:`, e);
          transformedRow.extractionErrors?.push(`Error processing ${targetSchemaField}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    });

    // Post-processing calculations & Sanity checks
    const houseAllowance = transformedRow.house_allowance ?? 0;
    transformedRow.total_deductions = (transformedRow.statutory_deductions?.tax ?? 0) + (transformedRow.statutory_deductions?.nssf ?? 0) + (transformedRow.statutory_deductions?.nhif ?? 0) + (transformedRow.statutory_deductions?.levy ?? 0) + (transformedRow.loan_deductions ?? 0) + (transformedRow.employer_advances ?? 0) + houseAllowance;
    if ((transformedRow.gross_income ?? 0) > 0 && !mappedSchemaFields.includes('net_income')) {
      transformedRow.net_income = (transformedRow.gross_income ?? 0) - (transformedRow.total_deductions ?? 0);
    }
    const netIncomeForLimit = transformedRow.net_income ?? 0;
    if (netIncomeForLimit > 0 && !mappedSchemaFields.includes('max_salary_advance_limit')) {
      transformedRow.max_salary_advance_limit = Math.floor(netIncomeForLimit * 0.5);
      transformedRow.available_salary_advance_limit = transformedRow.max_salary_advance_limit;
    }
    const gross = transformedRow.gross_income ?? 0;
    const nssf = transformedRow.statutory_deductions?.nssf ?? 0;
    const levy = transformedRow.statutory_deductions?.levy ?? 0;
    const totalDed = transformedRow.total_deductions ?? 0;
    if (nssf > 4320) transformedRow.extractionErrors?.push(`Warning: NSSF (${nssf}) exceeds cap.`);
    if (levy > 2500) transformedRow.extractionErrors?.push(`Warning: Levy (${levy}) exceeds cap.`);
    if (gross > 0 && totalDed > gross) {
        const netSource = mappedSchemaFields.includes('net_income') ? `provided Net Pay (${transformedRow.net_income})` : `calculated Net Pay (${transformedRow.net_income})`;
        transformedRow.extractionErrors?.push(`Warning: Total Deductions (${totalDed}) > Gross (${gross}), results in ${netSource}.`);
    }

    // Final validation
    const hasIdentifier = transformedRow.employeeNumber || transformedRow.id_no || (transformedRow.other_names && transformedRow.surname) || transformedRow.other_names;
    const minFieldsRequired = 3;
    if (mappedFields < minFieldsRequired || !hasIdentifier) {
      failedRows.push({ row, reason: `Row ${rowIndex + 1}: Insufficient data mapped (${mappedFields} fields) or missing identifier.` });
    } else {
       // Remove temporary error storage before adding
       const { extractionErrors, ...finalData } = transformedRow;
       if (extractionErrors && extractionErrors.length > 0) {
           console.warn(`Row ${rowIndex + 1} completed with warnings:`, extractionErrors);
           // Optionally store warnings elsewhere if needed, for now just log
       }
       transformedResultData.push(finalData); // Add the clean InsertEmployee data
    }
  });

  return { transformedData: transformedResultData, failedRows };
}


// Restored: Direct extraction for non-standard formats (Fallback) - WITH LINTER FIXES
function directDataExtraction(data: Array<Record<string, any>>): {
  directExtracted: Array<InsertEmployee>;
  directFailedRows: Array<{row: Record<string, any>, reason: string}>;
} {
  const directExtracted: Array<InsertEmployee> = [];
  const directFailedRows: Array<{row: Record<string, any>, reason: string}> = [];

  data.forEach((row, rowIndex) => {
    const rowValues = Object.values(row);
    const hasNameLike = rowValues.some(val => typeof val === 'string' && val.length > 3 && /[A-Za-z]{2,}\s?[A-Za-z]*/.test(String(val)));
    const hasNumberLike = rowValues.some(val => (typeof val === 'number' && !isNaN(val)) || (typeof val === 'string' && /^\d+(\.\d+)?$/.test(String(val).trim().replace(/,/g, ''))));

    if (hasNameLike && hasNumberLike) {
      // Initialize ensures statutory_deductions exists
      const extractedRow: InsertEmployee = {
        id: `direct-${Date.now()}-${rowIndex}`, status: 'active', is_on_probation: false, role: 'employee', country: 'KE',
        statutory_deductions: { nhif: 0, nssf: 0, tax: 0, levy: 0 }, contact: { email: '', phoneNumber: '' },
        bank_info: { acc_no: null, bank_name: null, bank_code: null }, gross_income: 0, net_income: 0, total_deductions: 0,
        loan_deductions: 0, employer_advances: 0, jahazii_advances: 0, max_salary_advance_limit: 0, available_salary_advance_limit: 0,
        terms_accepted: false, surname: '', other_names: '', id_no: '', tax_pin: '', sex: '', nssf_no: '', nhif_no: '',
        employeeNumber: '', position: '', id_confirmed: false, mobile_confirmed: false, tax_pin_verified: false,
        created_at: new Date(), modified_at: new Date(), active: true,
        house_allowance: 0, startDate: new Date(),
      };
      let extractedFieldsCount = 0;
      let hasIdentifier = false;

      // Extraction logic...
      Object.entries(row).forEach(([key, value]) => {
        const processedValue = String(value).trim();
        if (processedValue === '') return;
        // ... (keep the guessing logic as before) ...
        if (typeof value === 'string' && value.length > 3 && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(processedValue) && !extractedRow.other_names) {
          const nameParts = processedValue.split(/\s+/); extractedRow.surname = nameParts.slice(-1).join(' '); extractedRow.other_names = nameParts.slice(0, -1).join(' '); hasIdentifier = true; extractedFieldsCount++;
        } else if (/^\d{5,}$/.test(processedValue.replace(/\s/g, '')) && !extractedRow.id_no) {
          extractedRow.id_no = processedValue.replace(/\s/g, ''); extractedFieldsCount++; hasIdentifier = true;
        } else if (/^[A-Z]\d{9}[A-Z]$/i.test(processedValue.replace(/\s/g, '')) && !extractedRow.tax_pin) {
          extractedRow.tax_pin = processedValue.replace(/\s/g, '').toUpperCase(); extractedFieldsCount++;
        } else if (/^\+?\d{9,15}$/.test(processedValue.replace(/\s/g, '')) && !extractedRow.contact!.phoneNumber) {
           extractedRow.contact!.phoneNumber = processedValue.replace(/\s/g, ''); extractedFieldsCount++;
        } else if (((typeof value === 'number' && value > 500) || (typeof value === 'string' && /^\d{3,}(\.\d+)?$/.test(processedValue.replace(/,/g,'')))) && !extractedRow.gross_income) {
           const potentialGross = parseNumber(value, 0);
           if (potentialGross > 500) { extractedRow.gross_income = potentialGross; extractedFieldsCount++; }
        } else if (/^[a-zA-Z0-9\-\/]+$/.test(processedValue) && !extractedRow.employeeNumber && processedValue.length < 15) {
            extractedRow.employeeNumber = processedValue; hasIdentifier = true; extractedFieldsCount++;
        }
      });

      // Calculation logic - Add checks for undefined
      const currentGross = extractedRow.gross_income ?? 0; // Use nullish coalescing

      if (currentGross > 0) {
          // Assign calculations, ensuring statutory_deductions is accessed safely (though initialized)
          const deductions = extractedRow.statutory_deductions ?? { nhif: 0, nssf: 0, tax: 0, levy: 0 }; // Default again just in case

          deductions.tax = Math.max(0, Math.floor((currentGross - 24000) * 0.1));
          deductions.nssf = Math.min(Math.floor(currentGross * 0.06 * 2), 4320); // Correct NSSF cap (was 2160*2)

          let nhifCalc = 150;
          if (currentGross >= 100000) nhifCalc = 1700;
          else if (currentGross >= 50000) nhifCalc = 1200;
          else if (currentGross >= 20000) nhifCalc = 750;
          else if (currentGross >= 12000) nhifCalc = 500;
          else if (currentGross >= 6000) nhifCalc = 300;
          deductions.nhif = nhifCalc;

          deductions.levy = Math.min(Math.floor(currentGross * 0.015), 2500);

          extractedRow.statutory_deductions = deductions; // Re-assign the updated object

          // Safely calculate total deductions and net income
          extractedRow.total_deductions = (deductions.tax ?? 0) + (deductions.nssf ?? 0) + (deductions.nhif ?? 0) + (deductions.levy ?? 0) + (extractedRow.loan_deductions ?? 0) + (extractedRow.employer_advances ?? 0);
          extractedRow.net_income = currentGross - (extractedRow.total_deductions ?? 0);
          extractedRow.max_salary_advance_limit = Math.floor((extractedRow.net_income ?? 0) * 0.5);
          extractedRow.available_salary_advance_limit = extractedRow.max_salary_advance_limit;
      }

      // Validation logic...
      const minDirectFields = 3;
      if (extractedFieldsCount >= minDirectFields && hasIdentifier) {
        directExtracted.push(extractedRow);
      } else {
        const hasValues = Object.values(row).some(v => v !== "" && v !== null && v !== undefined);
        if (hasValues) directFailedRows.push({ row, reason: `Direct Extr. Row ${rowIndex + 1}: Got ${extractedFieldsCount} fields, Identifier: ${hasIdentifier}. Min ${minDirectFields} + ID needed.` });
      }
    } else {
        const hasValues = Object.values(row).some(v => v !== "" && v !== null && v !== undefined);
        if (hasValues) directFailedRows.push({ row, reason: `Direct Extr. Row ${rowIndex + 1}: No Name+Number pattern.` });
    }
  });
  return { directExtracted, directFailedRows };
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
    
    async processFile(file: UploadedFile, userId: string, processAllSheets: boolean = false): Promise<any> {
       // --- The processFile logic remains the same as in Step 4 ---
       // It now correctly calls the full helper functions defined above.
      try {
        console.log(`1. Processing file: ${file.originalname}, Process all sheets: ${processAllSheets}`);
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });

        let finalExtractedData: Array<InsertEmployee> = [];
        let allFailedRows: Array<{row: Record<string, any>, reason: string}> = [];
        let preprocessingIssues: Array<{ sheet: string, reason: string }> = [];
        let directExtractionAttemptedSheets: string[] = [];

        const sheetNamesToProcess = processAllSheets ? workbook.SheetNames : [workbook.SheetNames[0]];
        console.log(`Processing sheets: ${sheetNamesToProcess.join(', ')}`);

        for (const sheetName of sheetNamesToProcess) {
            if (!sheetName) continue;

            console.log(`--- Processing Sheet: ${sheetName} ---`);
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                const reason = `Sheet ${sheetName} not found or is empty.`;
                console.warn(reason);
                preprocessingIssues.push({ sheet: sheetName, reason });
                allFailedRows.push({ row: {}, reason });
                continue;
            }

            // *** Optimization: Convert to array-of-arrays ONCE per sheet ***
            console.log(`Sheet ${sheetName}: Converting sheet to CSV-like array...`);
            const csvData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

            // *** Optimization: Defer originalJsonData creation ***
            let originalJsonData: Record<string, any>[] | null = null; // Initialize as null

            let sheetProcessedSuccessfully = false;
            let preprocessedCleanData: Array<Record<string, any>> | null = null;

            // --- Attempt Standard Preprocessing ---
            console.log(`2. Preprocessing data for sheet: ${sheetName}...`);
            try {
                // *** Optimization: Pass csvData to preprocessPayrollData ***
                const preprocessResult = preprocessPayrollData(csvData, sheetName);
                if (preprocessResult.headerRowIndex !== -1 && preprocessResult.cleanedData.length > 0) {
                    console.log(`Sheet ${sheetName}: Preprocessing successful, found ${preprocessResult.cleanedData.length} cleaned rows.`);
                    preprocessedCleanData = preprocessResult.cleanedData; // This is already JSON data

                    // --- Attempt Transformation ---
                    console.log(`3. Transforming ${preprocessedCleanData.length} cleaned records for sheet: ${sheetName}...`);
                    try {
                        // transformData expects JSON data, which preprocessResult.cleanedData provides
                        const { transformedData, failedRows: transformFailures } = transformData(preprocessedCleanData); // Using restored helper
                        if (transformedData.length > 0) {
                            finalExtractedData = finalExtractedData.concat(transformedData); // Already InsertEmployee[]
                            console.log(`Sheet ${sheetName}: Transformation successful, extracted ${transformedData.length} records.`);
                        }
                        if (transformFailures.length > 0) {
                            allFailedRows = allFailedRows.concat(transformFailures.map(f => ({ ...f, reason: `Sheet ${sheetName}: ${f.reason}` })));
                            console.warn(`Sheet ${sheetName}: Transformation failed for ${transformFailures.length} rows.`);
                        }
                         // Only set to true if transformation logic was reached, even if it yielded 0 rows from non-empty cleaned data
                        sheetProcessedSuccessfully = true;
                    } catch (transformError: any) {
                        const reason = `Sheet ${sheetName}: Error during data transformation: ${transformError.message}`;
                        console.error(reason);
                        preprocessingIssues.push({ sheet: sheetName, reason });
                         // Add the preprocessed data that failed transformation to failedRows for inspection
                        if (preprocessedCleanData) {
                            allFailedRows = allFailedRows.concat(preprocessedCleanData.map(row => ({ row, reason: `Sheet ${sheetName}: Transformation Crash - ${transformError.message}` })));
                        } else {
                            allFailedRows.push({ row: {}, reason }); // Generic failure if preprocessedCleanData was null
                        }
                    }
                } else if (preprocessResult.headerRowIndex === -1) {
                    const reason = `Sheet ${sheetName}: Could not reliably detect header row.`;
                    console.warn(reason);
                    preprocessingIssues.push({ sheet: sheetName, reason });
                } else { // Header found but no data rows
                    const reason = `Sheet ${sheetName}: Preprocessing found header but no data rows.`;
                    console.warn(reason);
                    preprocessingIssues.push({ sheet: sheetName, reason });
                    sheetProcessedSuccessfully = true; // Mark as processed because we determined there's no data
                }
            } catch (preprocessError: any) {
                const reason = `Sheet ${sheetName}: Preprocessing error: ${preprocessError.message}`;
                console.error(reason);
                preprocessingIssues.push({ sheet: sheetName, reason });
                allFailedRows.push({ row: {}, reason: `Sheet ${sheetName}: Preprocessing Crash - ${reason}` });
            }

             // --- Attempt Direct Extraction (Fallback) ---
            // Only attempt if standard processing didn't run successfully OR if it ran but yielded zero results from potentially valid CSV data
            const needsDirectExtraction = !sheetProcessedSuccessfully || (sheetProcessedSuccessfully && finalExtractedData.length === 0 && csvData.length > (preprocessPayrollData(csvData, sheetName).headerRowIndex + 1));

            if (needsDirectExtraction && csvData.length > 1) { // Need at least a potential header + data row
                 console.warn(`Sheet ${sheetName}: Standard processing failed or yielded no data. Attempting direct extraction...`);
                 directExtractionAttemptedSheets.push(sheetName);

                 // *** Optimization: Create originalJsonData ONLY when needed ***
                 try {
                     console.log(`Sheet ${sheetName}: Converting sheet to JSON for direct extraction fallback...`);
                     originalJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];

                     if (originalJsonData && originalJsonData.length > 0) {
                        // Calls the directDataExtraction function with fixes
                        const { directExtracted, directFailedRows } = directDataExtraction(originalJsonData);
                        if (directExtracted.length > 0) {
                            console.log(`Sheet ${sheetName}: Direct extraction successful for ${directExtracted.length} records.`);
                            // Avoid adding duplicates if some were processed partially before failure
                            const existingIds = new Set(finalExtractedData.map(e => e.id));
                            const newData = directExtracted.filter(d => !existingIds.has(d.id));
                            finalExtractedData = finalExtractedData.concat(newData);

                            allFailedRows = allFailedRows.concat(directFailedRows.map(f => ({ ...f, reason: `Sheet ${sheetName} (Direct): ${f.reason}` })));
                            preprocessingIssues.push({ sheet: sheetName, reason: `Used direct extraction, ${directExtracted.length} records found and integrated.` });
                        } else {
                             const reason = `Sheet ${sheetName}: Direct extraction also failed to find usable data.`;
                             console.warn(reason);
                             preprocessingIssues.push({ sheet: sheetName, reason });
                             allFailedRows = allFailedRows.concat(directFailedRows.map(f => ({ ...f, reason: `Sheet ${sheetName} (Direct): ${f.reason}` })));
                        }
                    } else {
                         console.warn(`Sheet ${sheetName}: Conversion to JSON for direct extraction yielded no data.`);
                         preprocessingIssues.push({ sheet: sheetName, reason: 'Direct extraction skipped, no data after JSON conversion.' });
                    }
                 } catch (directError: any) {
                     const reason = `Sheet ${sheetName}: Error during direct extraction: ${directError.message}`;
                     console.error(reason);
                     preprocessingIssues.push({ sheet: sheetName, reason });
                     allFailedRows.push({ row: {}, reason: `Sheet ${sheetName}: Direct Extraction Crash - ${reason}` });
                 }
            } else if (!sheetProcessedSuccessfully && csvData.length <= 1) {
                 const reason = `Sheet ${sheetName}: Standard processing failed and the sheet appears empty or has only a header.`;
                 console.warn(reason);
                 preprocessingIssues.push({ sheet: sheetName, reason });
            }


            console.log(`--- Finished Sheet: ${sheetName} ---`);
        } // --- End loop through sheets ---

        // --- Final Results and Messaging ---
        console.log('4. Finalizing results...');
         const result = {
             extractedData: finalExtractedData,
             failedRows: allFailedRows,
             fileName: file.originalname,
             preprocessingIssues: preprocessingIssues,
             processedAllSheets: processAllSheets
         };

         const messageContent = `Processed: ${file.originalname}${processAllSheets ? ' (all sheets)' : ' (first sheet)'}. ` +
                                `Extracted ${result.extractedData.length} records. ` +
                                `${result.failedRows.length} rows/sheets need attention.` +
                                (result.preprocessingIssues.length > 0 ? ` ${result.preprocessingIssues.length} sheet(s) had processing issues.` : '');

         const fileMessage: ChatMessage = {
             id: Date.now().toString(),
             userId,
             type: 'file',
             content: messageContent,
             timestamp: new Date(),
             fileData: { fileName: result.fileName, recordCount: result.extractedData.length, failedCount: result.failedRows.length },
             actions: result.extractedData.length > 0 ? [{ id: 'view-data', label: 'Review & Import' }] : (result.failedRows.length > 0 ? [{ id: 'view-failed-rows', label: 'View Failed Rows/Issues' }] : []),
             metadata: { processedCount: result.extractedData.length, failedCount: result.failedRows.length, preprocessingIssues: result.preprocessingIssues, processedAllSheets: result.processedAllSheets, directExtractionAttempted: directExtractionAttemptedSheets }
         };

         console.log('5. Saving message...');
         await storageModule.saveMessage(fileMessage);

         return result;

      } catch (error: any) {
         console.error('Overall error processing file:', error);
         await storageModule.saveMessage({
             id: Date.now().toString(), userId, type: 'system',
             content: `Error processing file ${file.originalname}: ${error.message || 'Unknown error'}`,
             timestamp: new Date(), metadata: { error: true, errorMessage: error.message || 'Unknown error' }
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
    },

  };
}

// Create a singleton instance of the chat service
export const chatService = createChatService();