// Report accuracy: the figures the UI assembles must equal the finance
// engine's published values (R1, R2). If a screen ever disagrees with the
// engine, this suite fails before a person ever sees the number.

import { describe, it, expect } from 'vitest';
import { toMinor, pctValue, majorValue } from '@oe/finance';
import { PROJECT_IDS, fixtureDb, MONTHS } from '@oe/fixtures';
import { computeProjectMetrics, companyMonthMetrics } from './metrics';

const project = (id: string) => fixtureDb.projects.find((p) => p.id === id)!;

describe('portfolio metrics reproduce §6.9 on the recognised basis', () => {
  it('A · Meridian: internal 20,070, GP 17,930, margin 47.2%', () => {
    const m = computeProjectMetrics(project(PROJECT_IDS.a));
    expect(m.actInternalCostMinor).toBe(toMinor(20_070));
    expect(m.recognisedToDateMinor).toBe(toMinor(38_000));
    expect(m.grossProfitMinor).toBe(toMinor(17_930));
    expect(pctValue(m.grossMargin)).toBe(47.2);
    expect(majorValue(m.profitPerInternalHourMinor)).toBe(61.83);
  });

  it('B · Tidal Pavilion: direct 134,880, GP 45,120, margin 25.1%', () => {
    const m = computeProjectMetrics(project(PROJECT_IDS.b));
    expect(m.actInternalCostMinor).toBe(toMinor(54_880));
    expect(m.externalCommittedMinor + m.expensesActualMinor).toBe(toMinor(80_000));
    expect(m.actDirectCostMinor).toBe(toMinor(134_880));
    expect(m.grossProfitMinor).toBe(toMinor(45_120));
    expect(pctValue(m.grossMargin)).toBe(25.1);
  });

  it('E · Northwind: the loss and the lens that hides it', () => {
    const m = computeProjectMetrics(project(PROJECT_IDS.e));
    expect(m.actInternalCostMinor).toBe(toMinor(136_200));
    expect(m.actDirectCostMinor).toBe(toMinor(256_200));
    expect(m.grossProfitMinor).toBe(toMinor(-6_200));
    expect(pctValue(m.grossMargin)).toBe(-2.5);
    expect(pctValue(m.thirdPartyMargin, 0)).toBe(52);
  });
});

describe('company months hold the §6.7 identity', () => {
  for (const month of MONTHS) {
    it(`${month}: operating profit equals GP − running costs ± reconciliation, tie-out green`, () => {
      const c = companyMonthMetrics(month);
      expect(c.operatingProfitMinor).toBe(
        c.projectGrossProfitMinor -
          c.nonProjectPayrollMinor -
          c.unallocatedPayrollMinor -
          c.overheadMinor +
          c.reconciliationMinor,
      );
      expect(c.tieOut.status).toBe('green');
      expect(c.overheadMinor).toBe(toMinor(12_000));
      // Per-project contributions sum exactly to the headline figures.
      expect(c.perProject.reduce((s, p) => s + p.gp, 0)).toBe(c.projectGrossProfitMinor);
      expect(c.perProject.reduce((s, p) => s + p.recognised, 0)).toBe(c.recognisedRevenueMinor);
    });
  }
});
