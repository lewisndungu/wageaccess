/**
 * Kenya Tax Calculation Utilities
 * Based on Kenya Revenue Authority (KRA) tax rates and deductions
 */

// PAYE (Pay As You Earn) Tax Rates for Kenya (2023)
const PAYE_TAX_BANDS = [
  { min: 0, max: 24000, rate: 0.10 },       // 10% on first KES 24,000
  { min: 24001, max: 32333, rate: 0.25 },   // 25% on next KES 8,333
  { min: 32334, max: 500000, rate: 0.30 },  // 30% on next KES 467,666
  { min: 500001, max: 800000, rate: 0.325 }, // 32.5% on income over KES 500,000
  { min: 800001, max: Infinity, rate: 0.35 }, // 35% on income over KES 800,000
];

// Personal relief amount per month in KES (2023)
const PERSONAL_RELIEF = 2400;

// NHIF (National Hospital Insurance Fund) rates in KES (2023)
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

// NSSF (National Social Security Fund) rates in KES (2023)
// Tier I - 6% of pensionable pay, up to KES 6,000 (Max contribution: KES 360)
// Tier II - 6% of pensionable pay between KES 6,001 and KES 18,000 (Max contribution: KES 720)
const NSSF_TIER_I_MAX = 6000;
const NSSF_TIER_II_MAX = 18000;
const NSSF_RATE = 0.06; // 6%

/**
 * Calculate PAYE tax in Kenya
 * @param grossIncome - Monthly gross income in KES
 * @returns PAYE tax amount in KES after personal relief
 */
export function calculatePAYE(grossIncome: number): number {
  let taxableIncome = grossIncome;
  let totalTax = 0;
  
  // Calculate tax for each band
  for (const band of PAYE_TAX_BANDS) {
    if (taxableIncome > band.min) {
      const bandIncome = Math.min(taxableIncome, band.max) - band.min;
      totalTax += bandIncome * band.rate;
      
      if (taxableIncome <= band.max) {
        break;
      }
    }
  }
  
  // Apply personal relief
  totalTax = Math.max(0, totalTax - PERSONAL_RELIEF);
  
  return Math.round(totalTax);
}

/**
 * Calculate NHIF contribution in Kenya
 * @param grossIncome - Monthly gross income in KES
 * @returns NHIF contribution amount in KES
 */
export function calculateNHIF(grossIncome: number): number {
  for (const rate of NHIF_RATES) {
    if (grossIncome >= rate.min && grossIncome <= rate.max) {
      return rate.amount;
    }
  }
  
  // Default to highest rate if not found (should not happen)
  return NHIF_RATES[NHIF_RATES.length - 1].amount;
}

/**
 * Calculate NSSF contribution in Kenya
 * @param grossIncome - Monthly gross income in KES
 * @returns NSSF contribution amount in KES
 */
export function calculateNSSF(grossIncome: number): number {
  let nssfContribution = 0;
  
  // Tier I contribution (on income up to KES 6,000)
  nssfContribution += Math.min(grossIncome, NSSF_TIER_I_MAX) * NSSF_RATE;
  
  // Tier II contribution (on income between KES 6,001 and KES 18,000)
  if (grossIncome > NSSF_TIER_I_MAX) {
    const tierIIIncome = Math.min(grossIncome, NSSF_TIER_II_MAX) - NSSF_TIER_I_MAX;
    nssfContribution += tierIIIncome * NSSF_RATE;
  }
  
  return Math.round(nssfContribution);
}

/**
 * Calculate Housing Levy (Affordable Housing Fund) contribution in Kenya
 * @param grossIncome - Monthly gross income in KES
 * @returns Housing Levy contribution amount in KES
 */
export function calculateHousingLevy(grossIncome: number): number {
  // Housing Levy is 1.5% of gross pay
  const HOUSING_LEVY_RATE = 0.015;
  return Math.round(grossIncome * HOUSING_LEVY_RATE);
}

/**
 * Calculate all statutory deductions in Kenya
 * @param grossIncome - Monthly gross income in KES
 * @returns Object containing all deduction types and net pay
 */
export function calculateKenyanDeductions(grossIncome: number): {
  grossPay: number;
  paye: number;
  nhif: number;
  nssf: number;
  housingLevy: number;
  totalDeductions: number;
  netPay: number;
} {
  const paye = calculatePAYE(grossIncome);
  const nhif = calculateNHIF(grossIncome);
  const nssf = calculateNSSF(grossIncome);
  const housingLevy = calculateHousingLevy(grossIncome);
  
  const totalDeductions = paye + nhif + nssf + housingLevy;
  const netPay = grossIncome - totalDeductions;
  
  return {
    grossPay: grossIncome,
    paye,
    nhif,
    nssf,
    housingLevy,
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
export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}