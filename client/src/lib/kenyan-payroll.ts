// Kenyan PAYE Tax calculator based on KRA guidelines
// See: https://www.kra.go.ke/individual/filing-paying/types-of-taxes/paye
import { formatKESCurrency } from './format-utils';

// Tax bands for 2023/2024
const PAYE_TAX_BANDS = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 500000, rate: 0.30 },
  { min: 500001, max: 800000, rate: 0.325 },
  { min: 800001, max: Infinity, rate: 0.35 },
];

// Personal relief amount
const PERSONAL_RELIEF = 2400; // KES per month

// NHIF rates
const NHIF_RATES = [
  { min: 0, max: 5999, amount: 150 },
  { min: 6000, max: 7999, amount: 300 },
  { min: 8000, max: 11999, amount: 400 },
  { min: 12000, max: 14999, amount: 500 },
  { min: 15000, max: 19999, amount: 600 },
  { min: 20000, max: 24999, amount: 750 },
  { min: 25000, max: 29999, amount: 850 },
  { min: 30000, max: 34999, amount: 900 },
  { min: 35000, max: 39999, amount: 950 },
  { min: 40000, max: 44999, amount: 1000 },
  { min: 45000, max: 49999, amount: 1100 },
  { min: 50000, max: 59999, amount: 1200 },
  { min: 60000, max: 69999, amount: 1300 },
  { min: 70000, max: 79999, amount: 1400 },
  { min: 80000, max: 89999, amount: 1500 },
  { min: 90000, max: 99999, amount: 1600 },
  { min: 100000, max: Infinity, amount: 1700 },
];

// NSSF Tier I and Tier II contributions
const NSSF_TIER_I_MAX = 6000;
const NSSF_TIER_I_RATE = 0.06;
const NSSF_TIER_II_MAX = 18000;
const NSSF_TIER_II_RATE = 0.06;

// Housing Levy
const HOUSING_LEVY_RATE = 0.015;

interface SalaryDeductions {
  grossPay: number;
  taxablePay: number;
  paye: number;
  nhif: number;
  nssf: number;
  housingLevy: number;
  totalDeductions: number;
  netPay: number;
}

export function calculatePayrollDeductions(grossSalary: number): SalaryDeductions {
  // Calculate NSSF contribution (Tier I and Tier II)
  let nssfContribution = 0;
  
  // Tier I - 6% of pensionable pay up to KES 6,000
  nssfContribution += Math.min(grossSalary * NSSF_TIER_I_RATE, NSSF_TIER_I_MAX);
  
  // Tier II - 6% of pensionable pay from KES 6,001 to KES 18,000
  if (grossSalary > NSSF_TIER_I_MAX) {
    nssfContribution += Math.min(
      (Math.min(grossSalary, NSSF_TIER_II_MAX) - NSSF_TIER_I_MAX) * NSSF_TIER_II_RATE,
      (NSSF_TIER_II_MAX - NSSF_TIER_I_MAX) * NSSF_TIER_II_RATE
    );
  }
  
  // Calculate Housing Levy
  const housingLevy = grossSalary * HOUSING_LEVY_RATE;
  
  // Calculate taxable income (gross salary minus NSSF contribution)
  const taxableIncome = grossSalary - nssfContribution;
  
  // Calculate PAYE tax
  let tax = 0;
  for (const band of PAYE_TAX_BANDS) {
    if (taxableIncome > band.min) {
      const taxableAmountInBand = Math.min(taxableIncome, band.max) - band.min;
      tax += taxableAmountInBand * band.rate;
    }
  }
  
  // Apply personal relief
  tax = Math.max(0, tax - PERSONAL_RELIEF);
  
  // Calculate NHIF contribution
  let nhifContribution = 0;
  for (const rate of NHIF_RATES) {
    if (grossSalary >= rate.min && grossSalary <= rate.max) {
      nhifContribution = rate.amount;
      break;
    }
  }
  
  // Calculate total deductions and net salary
  const totalDeductions = nssfContribution + tax + nhifContribution + housingLevy;
  const netSalary = grossSalary - totalDeductions;
  
  return {
    grossPay: grossSalary,
    taxablePay: taxableIncome,
    paye: tax,
    nhif: nhifContribution,
    nssf: nssfContribution,
    housingLevy: housingLevy,
    totalDeductions: totalDeductions,
    netPay: netSalary
  };
}

// Calculate payroll based on attendance hours and hourly rate
export function calculatePayrollBasedOnAttendance(
  monthlySalary: number, 
  standardHours: number, 
  workedHours: number
): SalaryDeductions {
  // Calculate hourly rate based on standard monthly hours (e.g., 160 hours)
  const hourlyRate = monthlySalary / standardHours;
  
  // Calculate gross pay based on actual worked hours
  const grossPay = hourlyRate * workedHours;
  
  // Calculate all deductions based on the prorated gross pay
  return calculatePayrollDeductions(grossPay);
}

// Format currency for display (updated to use our new utility function)
export function formatCurrency(amount: number): string {
  return formatKESCurrency(amount);
}
