// §6.2 canonical rate-derivation unit test (must pass exactly) plus rate
// history behaviour.

import { describe, it, expect } from 'vitest';
import {
  deriveRates, resolveRate, proRateMonthlyCostMinor,
  type AgreementInputs, type ScheduleInputs, type DatedRate,
} from '../src/costRates';
import { toMinor } from '../src/money';

const CANONICAL: AgreementInputs = {
  monthlySalaryMinor: toMinor(5_000),
  employerCpfRate: 0.17,
  cpfMonthlyCeilingMinor: toMinor(10_000), // non-binding for this salary
  cpfAppliesToBonus: true,
  contractualBonusMonths: 1,
  fixedAllowancesMonthlyMinor: 0,
  benefitsAnnualMinor: toMinor(1_200),
  annualLeaveDays: 18,
  publicHolidayDays: 11,
  expectedMedicalDays: 4,
  productiveFactor: 0.8,
};
const SCHEDULE: ScheduleInputs = { weeklyHours: 40, hoursPerDay: 8 };

describe('§6.2 canonical derivation', () => {
  it('annual = 60,000 + 5,000 + 0.17 × 65,000 + 0 + 1,200 = 77,250.00', () => {
    const r = deriveRates(CANONICAL, SCHEDULE);
    expect(r.annualEmploymentCostMinor).toBe(toMinor(77_250));
  });

  it('paidHours 2,080 → 37.14; availableHours 1,816 → 42.54; productiveHours 1,452.8 → 53.17', () => {
    const r = deriveRates(CANONICAL, SCHEDULE);
    expect(r.paidHours).toBe(2_080);
    expect(r.availableHours).toBe(1_816);
    expect(r.productiveHours).toBeCloseTo(1_452.8, 10);
    expect(r.paidHourRateMinor).toBe(37_14);
    expect(r.availableHourRateMinor).toBe(42_54);
    expect(r.productiveHourRateMinor).toBe(53_17);
  });

  it('a binding CPF ceiling caps the wage contribution', () => {
    const r = deriveRates(
      { ...CANONICAL, monthlySalaryMinor: toMinor(12_000), cpfMonthlyCeilingMinor: toMinor(7_400) },
      SCHEDULE,
    );
    // 144,000 + 12,000 + 0.17 × (7,400 × 12 + 12,000) + 1,200
    const expected = toMinor(144_000 + 12_000 + 0.17 * (7_400 * 12 + 12_000) + 1_200);
    expect(r.annualEmploymentCostMinor).toBe(expected);
  });
});

describe('§6.2 rate history', () => {
  const history: DatedRate[] = [
    { personId: 'p1', effectiveFrom: '2025-01-01', effectiveTo: '2025-06-30', paidHourRateMinor: 37_14, availableHourRateMinor: 42_54, productiveHourRateMinor: 53_17 },
    { personId: 'p1', effectiveFrom: '2025-07-01', paidHourRateMinor: 40_87, availableHourRateMinor: 46_80, productiveHourRateMinor: 58_50 },
  ];

  it('every time entry resolves the rate effective on its own date', () => {
    expect(resolveRate(history, '2025-06-30')?.paidHourRateMinor).toBe(37_14);
    expect(resolveRate(history, '2025-07-01')?.paidHourRateMinor).toBe(40_87);
    expect(resolveRate(history, '2024-12-31')).toBeUndefined();
  });

  it('mid-month changes pro-rate the month by calendar days', () => {
    // Raise effective on the 16th of a 30-day month.
    const cost = proRateMonthlyCostMinor(
      [
        { annualEmploymentCostMinor: toMinor(77_250), fromDay: 1, toDay: 15 },
        { annualEmploymentCostMinor: toMinor(85_000), fromDay: 16, toDay: 30 },
      ],
      30,
    );
    const expected = Math.round((toMinor(77_250) / 12) * 0.5 + (toMinor(85_000) / 12) * 0.5);
    expect(cost).toBe(expected);
  });
});
