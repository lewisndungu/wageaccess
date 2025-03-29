export interface PayrollDeductions {
  paye: number;
  shif: number;
  nssf: number;
  affordableHousingLevy: number;
  ewa: number;
  totalDeductions: number;
}

export interface PayrollCalculation {
  grossIncome: number;
  taxableIncome: number;
  deductions: PayrollDeductions;
  netIncome: number;
}

export class PayrollCalculator {
  private readonly AHL_RATE = 0.015;
  private readonly SHIF_RATE = 0.0275;
  private readonly PERSONAL_RELIEF = 2400;
  private readonly NSSF_RATE = 0.06;

  private readonly TAX_BANDS = [
    { limit: 24_000, rate: 0.1 },
    { limit: 8_333, rate: 0.25 },
    { limit: 467_667, rate: 0.3 },
    { limit: 300_000, rate: 0.325 },
    { limit: Infinity, rate: 0.35 },
  ];

  calculateAffordableHousingLevy(grossIncome: number): number {
    return grossIncome * this.AHL_RATE;
  }

  calculateSHIF(grossIncome: number): number {
    return grossIncome * this.SHIF_RATE;
  }

  calculateNSSF(grossIncome: number): number {
    if (grossIncome <= 0) {
      return 0;
    } else if (grossIncome <= 8000) {
      return 480;
    } else if (grossIncome <= 72000) {
      return this.NSSF_RATE * grossIncome;
    } else {
      return 4320;
    }
  }

  calculateTaxableIncome(grossIncome: number, otherDeductions = 0): number {
    const ahl = this.calculateAffordableHousingLevy(grossIncome);
    const shif = this.calculateSHIF(grossIncome);
    const nssf = this.calculateNSSF(grossIncome);

    return grossIncome - (ahl + shif + nssf + otherDeductions);
  }

  calculatePAYE(taxableIncome: number): number {
    let remainingIncome = taxableIncome;
    let totalTax = 0;

    // Ensure we don't start with negative income
    remainingIncome = Math.max(0, remainingIncome);

    // First band: 0-24,000 at 10%
    if (remainingIncome > 0) {
      const band1Taxable = Math.min(remainingIncome, this.TAX_BANDS[0].limit);
      totalTax += band1Taxable * this.TAX_BANDS[0].rate;
      remainingIncome -= band1Taxable;
    }

    // Second band: 24,001-32,333 at 25%
    if (remainingIncome > 0) {
      const band2Taxable = Math.min(remainingIncome, this.TAX_BANDS[1].limit);
      totalTax += band2Taxable * this.TAX_BANDS[1].rate;
      remainingIncome -= band2Taxable;
    }

    // Third band: 32,334-500,000 at 30%
    if (remainingIncome > 0) {
      const band3Taxable = Math.min(remainingIncome, this.TAX_BANDS[2].limit);
      totalTax += band3Taxable * this.TAX_BANDS[2].rate;
      remainingIncome -= band3Taxable;
    }

    // Fourth band: 500,001-800,000 at 32.5%
    if (remainingIncome > 0) {
      const band4Taxable = Math.min(remainingIncome, this.TAX_BANDS[3].limit);
      totalTax += band4Taxable * this.TAX_BANDS[3].rate;
      remainingIncome -= band4Taxable;
    }

    // Fifth band: 800,001+ at 35%
    if (remainingIncome > 0) {
      totalTax += remainingIncome * this.TAX_BANDS[4].rate;
    }

    // Apply personal relief
    const finalPAYE = Math.max(totalTax - this.PERSONAL_RELIEF, 0);
    return Math.round(finalPAYE);
  }

  calculateNetIncome(grossIncome: number, ewaDeductions = 0): PayrollCalculation {
    const ahl = this.calculateAffordableHousingLevy(grossIncome);
    const shif = this.calculateSHIF(grossIncome);
    const nssf = this.calculateNSSF(grossIncome);

    const taxableIncome = this.calculateTaxableIncome(grossIncome);

    const paye = this.calculatePAYE(taxableIncome);

    // Include EWA deductions in the total deductions and net income calculation
    const statutoryDeductions = ahl + shif + nssf + paye;
    const totalDeductions = statutoryDeductions + ewaDeductions;
    const netIncome = grossIncome - totalDeductions;

    return {
      grossIncome,
      taxableIncome: taxableIncome,
      deductions: {
        paye,
        shif,
        nssf,
        affordableHousingLevy: ahl,
        ewa: ewaDeductions,
        totalDeductions: totalDeductions
      },
      netIncome,
    };
  }
}

// Create a singleton instance
export const payrollCalculator = new PayrollCalculator(); 