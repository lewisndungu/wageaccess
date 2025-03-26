/**
 * Kenya Tax Calculation Utilities
 * Based on Kenya Revenue Authority (KRA) tax rates and deductions
 */

// Tax constants
const PERSONAL_RELIEF = 2400; // Personal relief amount per month in KES
const AHL_RATE = 0.015; // Affordable Housing Levy rate (1.5%)
const SHIF_RATE = 0.0275; // Social Health Insurance Fund rate (2.75%)
const NSSF_RATE = 0.06; // National Social Security Fund rate (6%)

// PAYE (Pay As You Earn) Tax Bands
const TAX_BANDS = [
  { limit: 24_000, rate: 0.1 },    // 10% on first KES 24,000
  { limit: 8_333, rate: 0.25 },    // 25% on next KES 8,333
  { limit: 467_667, rate: 0.3 },   // 30% on next KES 467,667
  { limit: 300_000, rate: 0.325 }, // 32.5% on next KES 300,000
  { limit: Infinity, rate: 0.35 }, // 35% on the rest
];

/**
 * Calculate Affordable Housing Levy (AHL)
 * @param grossIncome - Monthly gross income in KES
 * @returns AHL amount in KES
 */
export function calculateAffordableHousingLevy(grossIncome: number): number {
  return Math.round(grossIncome * AHL_RATE);
}

/**
 * Calculate Social Health Insurance Fund (SHIF) contribution
 * @param grossIncome - Monthly gross income in KES
 * @returns SHIF contribution amount in KES
 */
export function calculateSHIF(grossIncome: number): number {
  return Math.round(grossIncome * SHIF_RATE);
}

/**
 * Calculate National Social Security Fund (NSSF) contribution
 * @param grossIncome - Monthly gross income in KES
 * @returns NSSF contribution amount in KES
 */
export function calculateNSSF(grossIncome: number): number {
  if (grossIncome <= 0) {
    return 0;
  } else if (grossIncome <= 8000) {
    return 480; // Minimum NSSF contribution
  } else if (grossIncome <= 72000) {
    return Math.round(NSSF_RATE * grossIncome);
  } else {
    return 4320; // Maximum NSSF contribution (72,000 * 6%)
  }
}

/**
 * Calculate taxable income after deducting qualifying deductions
 * @param grossIncome - Monthly gross income in KES
 * @param otherDeductions - Other qualifying deductions in KES
 * @returns Taxable income amount in KES
 */
export function calculateTaxableIncome(grossIncome: number, otherDeductions = 0): number {
  const ahl = calculateAffordableHousingLevy(grossIncome);
  const shif = calculateSHIF(grossIncome);
  const nssf = calculateNSSF(grossIncome);

  return grossIncome - (ahl + shif + nssf + otherDeductions);
}

/**
 * Calculate PAYE tax in Kenya
 * @param taxableIncome - Monthly taxable income in KES
 * @returns PAYE tax amount in KES after personal relief
 */
export function calculatePAYE(taxableIncome: number): number {
  let remainingIncome = Math.max(0, taxableIncome); // Ensure non-negative
  let totalTax = 0;

  // Process each tax band
  for (const band of TAX_BANDS) {
    if (remainingIncome <= 0) break;
    
    const amountInBand = Math.min(remainingIncome, band.limit);
    totalTax += amountInBand * band.rate;
    remainingIncome -= amountInBand;
  }

  // Apply personal relief
  const finalPAYE = Math.max(totalTax - PERSONAL_RELIEF, 0);
  return Math.round(finalPAYE);
}

/**
 * Calculate all statutory deductions in Kenya
 * @param grossIncome - Monthly gross income in KES
 * @returns Object containing all deduction types and net pay
 */
export function calculateKenyanDeductions(grossIncome: number): {
  grossPay: number;
  paye: number;
  nhif: number; // renamed to nhif for backward compatibility
  nssf: number;
  housingLevy: number; // renamed to housingLevy for backward compatibility
  totalDeductions: number;
  netPay: number;
} {
  // Calculate deductions
  const ahl = calculateAffordableHousingLevy(grossIncome);
  const shif = calculateSHIF(grossIncome);
  const nssf = calculateNSSF(grossIncome);
  
  // Calculate taxable income
  const taxableIncome = calculateTaxableIncome(grossIncome);
  
  // Calculate PAYE
  const paye = calculatePAYE(taxableIncome);
  
  // Calculate total deductions and net income
  const totalDeductions = ahl + shif + nssf + paye;
  const netPay = grossIncome - totalDeductions;
  
  // Return deductions using the existing property names for compatibility
  return {
    grossPay: grossIncome,
    paye,
    nhif: shif, // SHIF is the successor to NHIF
    nssf,
    housingLevy: ahl, // AHL is the same as Housing Levy
    totalDeductions,
    netPay
  };
}

/**
 * Calculate earned wage amount based on days worked
 * @param salary - Monthly salary in KES
 * @param daysWorked - Number of days worked in the period
 * @param totalWorkingDays - Total working days in the month (typically 20-22)
 * @returns Earned wage amount in KES
 */
export function calculateEarnedWage(
  salary: number, 
  daysWorked: number,

  totalWorkingDays: number = 22
): number {
  // Safety check to prevent division by zero or negative values
  if (totalWorkingDays <= 0 || daysWorked < 0) {
    return 0;
  }
  
  // Ensure days worked doesn't exceed total working days
  const effectiveDaysWorked = Math.min(daysWorked, totalWorkingDays);
  
  // Calculate pro-rated salary based on days worked
  return Math.round((salary / totalWorkingDays) * effectiveDaysWorked);
}

/**
 * Format a number as Kenyan Shillings
 * @param amount - Amount to format
 * @returns Formatted string with KES symbol
 */
export function formatKES(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) {
    return "KES 0";
  }
  
  return `KES ${amount.toLocaleString('en-KE', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}