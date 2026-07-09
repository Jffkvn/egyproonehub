/**
 * Uganda Statutory Calculations — Egypro Edition (TypeScript Version)
 * Supports 4 employee types: local, global, contractor, exempt
 * Based on URA published rates (effective 2024/2025)
 * PAYE: Income Tax Act Cap 340
 * NSSF: NSSF Act Cap 222
 */

export interface TaxBand {
  min: number;
  max: number;
  rate: number;
}

// Default Monthly income tax bands (UGX)
export const UG_PAYE_BANDS: TaxBand[] = [
  { min: 0,        max: 235000,   rate: 0.00 },
  { min: 235000,   max: 335000,   rate: 0.10 },
  { min: 335000,   max: 410000,   rate: 0.20 },
  { min: 410000,   max: Infinity, rate: 0.30 },
];

// URA super-earner surcharge: additional 10% on gross income exceeding UGX 10,000,000.
// Applied on top of the normal PAYE (statutory, not company-configurable).
export const SURCHARGE_THRESHOLD = 10000000;
export const SURCHARGE_RATE = 0.10;

/**
 * Calculate Uganda PAYE on monthly gross salary
 * @param grossMonthly - Monthly gross salary in UGX
 * @param bands - Tax bands
 * @returns PAYE tax amount in UGX (rounded)
 */
export function calculateUgandaPAYE(grossMonthly: number, bands: TaxBand[] = UG_PAYE_BANDS): number {
  let tax = 0;

  for (const band of bands) {
    if (grossMonthly <= band.min) break;
    const upper = (band.max === Infinity || band.max === null) ? grossMonthly : Math.min(grossMonthly, band.max);
    tax += (upper - band.min) * band.rate;
  }

  // Super-earner surcharge, stacked on top of the bracket PAYE
  if (grossMonthly > SURCHARGE_THRESHOLD) {
    tax += (grossMonthly - SURCHARGE_THRESHOLD) * SURCHARGE_RATE;
  }

  return Math.round(tax);
}

/**
 * Calculate Uganda NSSF contributions
 * @param grossMonthly - Monthly gross salary in UGX
 * @param employeeRate - Employee rate (decimal)
 * @param employerRate - Employer rate (decimal)
 * @returns Object containing employee, employer, and total NSSF in UGX
 */
export function calculateUgandaNSSF(
  grossMonthly: number,
  employeeRate: number = 0.05,
  employerRate: number = 0.10
): { employee: number; employer: number; total: number } {
  const employee = Math.round(grossMonthly * employeeRate);
  const employer = Math.round(grossMonthly * employerRate);
  return { employee, employer, total: employee + employer };
}

/**
 * Calculate overtime pay
 * @param grossMonthly - Monthly gross salary in UGX
 * @param overtimeHours - Number of overtime hours worked
 * @param multiplier - Overtime multiplier (default 1.5)
 * @param standardHours - Standard monthly hours (default 173.33)
 * @param customRate - Optional custom flat rate per hour
 */
export function calculateOvertime(
  grossMonthly: number,
  overtimeHours: number,
  multiplier: number = 1.5,
  standardHours: number = 173.33,
  customRate: number | null = null
): { hourlyRate: number; overtimeRate: number; overtimePay: number } {
  if (!overtimeHours || overtimeHours <= 0) {
    return { hourlyRate: 0, overtimeRate: 0, overtimePay: 0 };
  }

  if (customRate !== null && customRate !== undefined) {
    const overtimeRate = Math.round(Number(customRate));
    const overtimePay = Math.round(overtimeRate * overtimeHours);
    return { hourlyRate: 0, overtimeRate, overtimePay };
  }

  const hourlyRate = Math.round(grossMonthly / standardHours);
  const overtimeRate = Math.round(hourlyRate * multiplier);
  const overtimePay = Math.round(overtimeRate * overtimeHours);
  return { hourlyRate, overtimeRate, overtimePay };
}

export interface PayslipInput {
  grossSalary: number;
  overtimeHours?: number;
  allowances?: number;
  leaveDeductions?: number;
  otherDeductions?: number;
  employeeType?: 'local' | 'global' | 'contractor' | 'exempt';
  pctMonthWorked?: number;
  whtRate?: number;
  customOvertimeRate?: number | null;
}

export interface PayslipResult {
  grossSalary: number;
  overtimePay: number;
  allowances: number;
  totalGross: number;
  paye: number;
  nssfEmployee: number;
  nssfEmployer: number;
  whtAmount: number;
  leaveDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  overtimeHours: number;
  overtimeRate: number;
  employeeType: 'local' | 'global' | 'contractor' | 'exempt';
  pctMonthWorked: number;
}

/**
 * Calculate complete payslip for Uganda
 * Supports 4 employee types:
 *   - 'local': PAYE + NSSF (standard Uganda employee)
 *   - 'global': PAYE only, no NSSF (expat/international staff)
 *   - 'contractor': WHT only, no PAYE, no NSSF
 *   - 'exempt': 0 PAYE, 0 NSSF, 0 WHT (interns)
 */
export function calculateUgandaPayslip({
  grossSalary,
  overtimeHours = 0,
  allowances = 0,
  leaveDeductions = 0,
  otherDeductions = 0,
  employeeType = 'local',
  pctMonthWorked = 100,
  whtRate = 6,
  customOvertimeRate = null,
}: PayslipInput): PayslipResult {
  // Pro-rata: apply percentage of month worked
  const proRataFactor = Math.min(100, Math.max(0, pctMonthWorked)) / 100;
  const proRataGross = Math.round(grossSalary * proRataFactor);

  const { overtimePay, overtimeRate } = calculateOvertime(
    proRataGross,
    overtimeHours,
    1.5,
    173.33,
    customOvertimeRate
  );

  const totalGross = proRataGross + overtimePay + allowances;

  let paye = 0;
  let nssfEmployee = 0;
  let nssfEmployer = 0;
  let whtAmount = 0;

  if (employeeType === 'contractor') {
    // Contractors: WHT only at configurable rate, no PAYE, no NSSF
    whtAmount = Math.round(proRataGross * (whtRate / 100));
  } else if (employeeType === 'exempt') {
    // Tax Exempt / Intern: No PAYE, no NSSF, no WHT
    paye = 0;
    nssfEmployee = 0;
    nssfEmployer = 0;
    whtAmount = 0;
  } else if (employeeType === 'global') {
    // Global/expat: PAYE only, no NSSF
    paye = calculateUgandaPAYE(totalGross);
  } else {
    // Local (default): PAYE + NSSF
    paye = calculateUgandaPAYE(totalGross);
    const nssf = calculateUgandaNSSF(totalGross, 0.05, 0.10);
    nssfEmployee = nssf.employee;
    nssfEmployer = nssf.employer;
  }

  const totalDeductions = paye + nssfEmployee + whtAmount + leaveDeductions + otherDeductions;
  const netPay = totalGross - totalDeductions;

  return {
    grossSalary: proRataGross,
    overtimePay,
    allowances,
    totalGross,
    paye,
    nssfEmployee,
    nssfEmployer,
    whtAmount,
    leaveDeductions,
    otherDeductions,
    totalDeductions,
    netPay,
    overtimeHours,
    overtimeRate,
    employeeType,
    pctMonthWorked,
  };
}

/**
 * Utility to format amount in UGX format
 */
export function formatUGX(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'UGX 0';
  const rounded = Math.round(Number(amount));
  return `UGX ${rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
