// packages/finance/src/costRates.ts
// §6.2 Cost-rate derivation. Pure: inputs in, numbers out, no clock (pass asOf).

import { roundHalfUp } from './money';

export interface AgreementInputs {
  monthlySalaryMinor: number;
  employerCpfRate: number;          // decimal, e.g. 0.17
  cpfMonthlyCeilingMinor: number;   // ordinary-wage ceiling
  cpfAppliesToBonus: boolean;
  contractualBonusMonths: number;   // AWS / 13th month; discretionary excluded (§6.2)
  fixedAllowancesMonthlyMinor: number;
  benefitsAnnualMinor: number;
  annualLeaveDays: number;
  publicHolidayDays: number;
  expectedMedicalDays: number;
  productiveFactor: number;         // default 0.80
}

export interface ScheduleInputs {
  weeklyHours: number;
  hoursPerDay: number;
}

export interface DerivedRates {
  annualEmploymentCostMinor: number;
  paidHours: number;
  availableHours: number;
  productiveHours: number;
  paidHourRateMinor: number;        // COSTING basis (R8)
  availableHourRateMinor: number;   // PRICING floor basis
  productiveHourRateMinor: number;  // OVERHEAD-RECOVERY basis
  methodVersion: string;
  derivation: { agreement: AgreementInputs; schedule: ScheduleInputs };
}

export const METHOD_VERSION = '6.2-v1';

/** §6.2: annualEmploymentCost = 12×salary + bonusMonths×salary + employerCpf
 *  + 12×allowances + benefits. CPF = rate × min(salary, ceiling) × 12
 *  + (appliesToBonus ? rate × bonusAmount : 0). */
export function annualEmploymentCostMinor(a: AgreementInputs): number {
  const base = 12 * a.monthlySalaryMinor;
  const bonus = a.contractualBonusMonths * a.monthlySalaryMinor;
  const cpfOnWages = a.employerCpfRate * Math.min(a.monthlySalaryMinor, a.cpfMonthlyCeilingMinor) * 12;
  const cpfOnBonus = a.cpfAppliesToBonus ? a.employerCpfRate * bonus : 0;
  const allowances = 12 * a.fixedAllowancesMonthlyMinor;
  return roundHalfUp(base + bonus + cpfOnWages + cpfOnBonus + allowances + a.benefitsAnnualMinor);
}

/** §6.2 hour bases. Nothing here assumes 40 hours (§6.3 part-time edge case). */
export function hourBases(a: AgreementInputs, s: ScheduleInputs): {
  paidHours: number; availableHours: number; productiveHours: number;
} {
  const paidHours = s.weeklyHours * 52;
  const availableHours =
    paidHours - (a.annualLeaveDays + a.publicHolidayDays + a.expectedMedicalDays) * s.hoursPerDay;
  const productiveHours = availableHours * a.productiveFactor;
  return { paidHours, availableHours, productiveHours };
}

/** §6.2 derived rates; derived, never hand-typed (schema note in §5.1). */
export function deriveRates(a: AgreementInputs, s: ScheduleInputs): DerivedRates {
  const annual = annualEmploymentCostMinor(a);
  const { paidHours, availableHours, productiveHours } = hourBases(a, s);
  return {
    annualEmploymentCostMinor: annual,
    paidHours,
    availableHours,
    productiveHours,
    paidHourRateMinor: roundHalfUp(annual / paidHours),
    availableHourRateMinor: roundHalfUp(annual / availableHours),
    productiveHourRateMinor: roundHalfUp(annual / productiveHours),
    methodVersion: METHOD_VERSION,
    derivation: { agreement: a, schedule: s },
  };
}

export interface DatedRate {
  personId: string;
  effectiveFrom: string;            // calendar date YYYY-MM-DD (§3 Dates)
  effectiveTo?: string;             // inclusive; open-ended when absent
  paidHourRateMinor: number;
  availableHourRateMinor: number;
  productiveHourRateMinor: number;
}

/** §6.2 rate history: every time entry resolves the rate effective on its own
 *  date. Returns undefined when no window covers the date; callers must treat
 *  that as an error, never fall back silently. */
export function resolveRate(rates: DatedRate[], date: string): DatedRate | undefined {
  return rates.find(
    (r) => r.effectiveFrom <= date && (r.effectiveTo === undefined || date <= r.effectiveTo),
  );
}

/** §6.2: mid-month changes pro-rate that month's employment cost by calendar days. */
export function proRateMonthlyCostMinor(
  segments: { annualEmploymentCostMinor: number; fromDay: number; toDay: number }[],
  daysInMonth: number,
): number {
  let total = 0;
  for (const seg of segments) {
    const days = seg.toDay - seg.fromDay + 1;
    total += (seg.annualEmploymentCostMinor / 12) * (days / daysInMonth);
  }
  return roundHalfUp(total);
}
