// §6.9 acceptance fixtures. These figures are law (R2): if the implementation
// disagrees with a published figure, the implementation is wrong. Never edit an
// expected value to make a test pass.

import { describe, it, expect } from 'vitest';
import {
  estInternalCostMinor, grossProfitMinor, grossMargin, profitPerInternalHourMinor,
  effectiveHourlyRevenueMinor, thirdPartyMargin, totalHours, actDirectCostMinor,
} from '../src/projectMetrics';
import { companyMonth } from '../src/company';
import { computeTieOut } from '../src/allocation';
import { pctValue, majorValue, toMinor } from '../src/money';

// Shared rate card (§6.9), cost per hour in minor units.
const COST: Record<string, number> = {
  founder: 127_00,
  creative_director: 130_00,
  account_director: 100_00,
  account_manager: 60_00,
  designer: 50_00,
  associate_creative_producer: 50_00,
};

describe('§6.9 A · Two-month branding project', () => {
  const fee = toMinor(38_000);
  const hours = { creative_director: 60, designer: 180, associate_creative_producer: 40, founder: 10 };

  it('matches every published figure exactly', () => {
    const internal = estInternalCostMinor(hours, COST);
    expect(internal).toBe(toMinor(20_070));
    const gp = grossProfitMinor(fee, internal);
    expect(gp).toBe(toMinor(17_930));
    expect(pctValue(grossMargin(gp, fee))).toBe(47.2);
    expect(totalHours(hours)).toBe(290);
    expect(majorValue(profitPerInternalHourMinor(gp, 290))).toBe(61.83);
    expect(majorValue(effectiveHourlyRevenueMinor(fee, 290))).toBe(131.03);
  });
});

describe('§6.9 B · Six-month spatial activation', () => {
  const fee = toMinor(180_000);
  const hours = { founder: 40, creative_director: 160, designer: 320, associate_creative_producer: 260 };
  const external = toMinor(80_000); // fabricator 65k + lighting 8k + travel/materials 7k

  it('matches every published figure exactly', () => {
    const internal = estInternalCostMinor(hours, COST);
    expect(internal).toBe(toMinor(54_880));
    const direct = internal + external;
    expect(direct).toBe(toMinor(134_880));
    const gp = grossProfitMinor(fee, direct);
    expect(gp).toBe(toMinor(45_120));
    expect(pctValue(grossMargin(gp, fee))).toBe(25.1);
    expect(totalHours(hours)).toBe(780);
    expect(majorValue(profitPerInternalHourMinor(gp, 780))).toBe(57.85);
  });
});

describe('§6.9 C · Twelve-month festival development', () => {
  const fee = toMinor(420_000);
  const hours = {
    founder: 120, creative_director: 400, account_director: 300,
    associate_creative_producer: 700, designer: 250,
  };
  // curator retainer 48k + production milestones 120k + comms designer 25k + expenses 30k
  const external = toMinor(223_000);

  it('matches every published figure exactly', () => {
    const internal = estInternalCostMinor(hours, COST);
    expect(internal).toBe(toMinor(144_740));
    const direct = internal + external;
    expect(direct).toBe(toMinor(367_740));
    const gp = grossProfitMinor(fee, direct);
    expect(gp).toBe(toMinor(52_260));
    expect(pctValue(grossMargin(gp, fee))).toBe(12.4);
    expect(totalHours(hours)).toBe(1_770);
    expect(majorValue(profitPerInternalHourMinor(gp, 1_770))).toBe(29.53);
    expect(majorValue(Math.round(gp / 12))).toBe(4_355);
  });
});

describe('§6.9 D · Small fast-turnaround brand sprint', () => {
  const fee = toMinor(12_000);
  const hours = { creative_director: 20, designer: 45 };

  it('matches every published figure exactly', () => {
    const internal = estInternalCostMinor(hours, COST);
    expect(internal).toBe(toMinor(4_850));
    const gp = grossProfitMinor(fee, internal);
    expect(gp).toBe(toMinor(7_150));
    expect(pctValue(grossMargin(gp, fee))).toBe(59.6);
    expect(totalHours(hours)).toBe(65);
    expect(majorValue(profitPerInternalHourMinor(gp, 65))).toBe(110.0);
  });
});

describe('§6.9 E · High-value project that becomes loss-making', () => {
  const fee = toMinor(250_000); // after a 15% discount to win
  const actHours = {
    founder: 100, creative_director: 450, account_director: 200,
    designer: 500, associate_creative_producer: 400,
  };
  const externalCommitted = toMinor(95_000);
  const actExpenses = toMinor(25_000);

  it('baseline at approval', () => {
    const estDirect = toMinor(75_620) + toMinor(95_000) + toMinor(18_000);
    expect(estDirect).toBe(toMinor(188_620));
    const estGp = grossProfitMinor(fee, estDirect);
    expect(estGp).toBe(toMinor(61_380));
    expect(pctValue(grossMargin(estGp, fee))).toBe(24.6);
  });

  it('actuals: the project is losing money', () => {
    const internal = estInternalCostMinor(actHours, COST);
    expect(internal).toBe(toMinor(136_200));
    const direct = actDirectCostMinor({
      actInternalMinor: internal,
      actExternalMinor: externalCommitted,
      actExpenseMinor: actExpenses,
    });
    expect(direct).toBe(toMinor(256_200));
    const gp = grossProfitMinor(fee, direct);
    expect(gp).toBe(toMinor(-6_200));
    expect(pctValue(grossMargin(gp, fee))).toBe(-2.5);
    expect(totalHours(actHours)).toBe(1_650);
    expect(majorValue(profitPerInternalHourMinor(gp, 1_650))).toBe(-3.76);
  });

  // The most important assertion in the suite: the legacy third-party margin
  // lens reads a comfortable 52% while the project is losing money. This pair
  // is the reason the console exists; the comfortable number hides the loss.
  it('legacy third-party margin lens shows 52% on a loss-making project', () => {
    const legacy = thirdPartyMargin({
      revenueMinor: fee,
      externalCostMinor: externalCommitted,
      expenseMinor: actExpenses,
    });
    expect(pctValue(legacy, 0)).toBe(52);
  });
});

describe('§6.9 F · Company month tie-out', () => {
  const projectLabour = toMinor(38_000);
  const nonProjectPayroll = toMinor(21_000);
  const unallocated = toMinor(2_300);
  const totalPayrollPerAgreements = toMinor(61_300);
  const overhead = toMinor(6_500 + 1_800 + 400 + 800 + 1_200 + 1_300); // = 12,000

  it('payroll ties exactly and status is green', () => {
    expect(projectLabour + nonProjectPayroll + unallocated).toBe(totalPayrollPerAgreements);
    const tie = computeTieOut({
      expectedEmploymentCostMinor: totalPayrollPerAgreements,
      projectLabourMinor: projectLabour,
      nonProjectPayrollMinor: nonProjectPayroll,
      unallocatedPayrollMinor: unallocated,
      reconciliationAdjustmentMinor: 0,
    });
    expect(tie.differenceMinor).toBe(0);
    expect(tie.status).toBe('green');
  });

  it('operating profit is −800 and coverage 0.98: every project made money and the studio still lost 800 dollars', () => {
    expect(overhead).toBe(toMinor(12_000));
    const result = companyMonth({
      totalProjectGrossProfitMinor: toMinor(34_500),
      nonProjectPayrollMinor: nonProjectPayroll,
      unallocatedPayrollMinor: unallocated,
      overheadMinor: overhead,
      recognisedRevenueMinor: toMinor(96_000),
    });
    expect(result.operatingProfitMinor).toBe(toMinor(-800));
    expect(Math.round(result.overheadCoverage * 100) / 100).toBe(0.98);
  });
});
