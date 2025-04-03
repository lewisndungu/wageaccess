import * as XLSX from 'xlsx';
import { Employee, Payroll } from '../shared/schema';
import { formatKESCurrency } from '../client/src/lib/format-utils';
import { columnMappings } from './chat-service';

// Define the ordered headers we want to use
const ORDERED_HEADERS = [
  'Emp No',
  'Employee Name',
  'Probation Period',
  'ID Number',
  'KRA Pin',
  'NSSF No',
  'Position',
  'Gross Pay',
  'PAYE',
  'NSSF',
  'NHIF',
  'Levy',
  'Loan Deduction',
  'Employer Advance',
  'Net Pay',
  'MPesa Number',
  'Bank Account Number',
  'T & C Accepted'
];

// Create a filtered mapping with only our desired columns in the correct order
const orderedColumnMappings: Record<string, string> = {};
ORDERED_HEADERS.forEach(header => {
  if (columnMappings[header]) {
    orderedColumnMappings[header] = columnMappings[header];
  }
});

// Reverse mapping from schema fields to template columns
const reverseColumnMappings: Record<string, string> = {};
Object.entries(orderedColumnMappings).forEach(([templateCol, schemaField]) => {
  reverseColumnMappings[schemaField as string] = templateCol;
});

interface PayrollExportData {
  employee: Employee;
  payroll: Payroll;
}

interface StatutoryDeductions {
  tax: number;
  nhif: number;
  nssf: number;
  levy: number;
}

interface PayrollWithDeductions extends Payroll {
  statutory_deductions: StatutoryDeductions;
}

export async function generatePayrollExcel(payrollData: PayrollExportData[]): Promise<Buffer> {
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  
  // Helper function to format financial values
  const formatFinancialValue = (value: number | undefined | null): string => {
    if (!value) return '0';
    return new Intl.NumberFormat('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(value);
  };
  
  // Transform data to match template columns
  const excelData = payrollData.map(({ employee, payroll }) => {
    const row: Record<string, any> = {};
    
    // Helper to safely get nested object values
    const getNestedValue = (obj: any, path: string) => {
      return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
    };

    // Map each schema field to template column in the specified order
    ORDERED_HEADERS.forEach(templateCol => {
      const schemaField = orderedColumnMappings[templateCol];
      if (!schemaField) return; // Skip if no mapping exists

      let value: any;
      
      // Special handling for fullName
      if (schemaField === 'fullName') {
        value = `${employee.other_names} ${employee.surname}`.trim();
      }
      // Special handling for statutory deductions from payroll data
      else if (schemaField.startsWith('statutory_deductions.')) {
        const deductionType = schemaField.split('.')[1] as keyof StatutoryDeductions;
        value = (payroll as PayrollWithDeductions).statutory_deductions?.[deductionType] ?? 0;
      }
      // Handle other nested fields
      else {
        value = getNestedValue(employee, schemaField)
        if (typeof value === 'string' && value.endsWith('.')) {
          value = value.slice(0, -1);
        }
      }

      // Format monetary values
      if (
        schemaField === 'gross_income' ||
        schemaField === 'net_income' ||
        schemaField === 'loan_deductions' ||
        schemaField === 'employer_advances' ||
        schemaField === 'jahazii_advances' ||
        schemaField === 'house_allowance' ||
        schemaField.startsWith('statutory_deductions.')
      ) {
        value = formatFinancialValue(value);
      }

      // Format boolean values
      if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No';
      }

      row[templateCol] = value ?? ''; // Use empty string for null/undefined values
    });

    return row;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Auto-size columns
  const colWidths: { [key: string]: number } = {};
  excelData.forEach(row => {
    Object.entries(row).forEach(([key, value]) => {
      const width = String(value).length;
      colWidths[key] = Math.max(colWidths[key] || 0, width, key.length);
    });
  });

  worksheet['!cols'] = ORDERED_HEADERS.map(col => ({
    wch: Math.min(Math.max(colWidths[col] || 10, 10), 50) // Min 10, max 50 characters
  }));

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
} 