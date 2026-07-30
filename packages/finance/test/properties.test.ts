// §6.9 property tests: allocation always ties within tolerance for random
// schedules and entries; no rate resolves outside its effective window; gross
// margin is scale-invariant.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { allocatePersonPeriod, computeTieOut, type ActivityFlags } from '../src/allocation';
import { resolveRate, type DatedRate } from '../src/costRates';
import { grossMargin, grossProfitMinor } from '../src/projectMetrics';
import { priceLadder, evaluateQuote } from '../src/pricing';

const PROJECT_WORK: ActivityFlags = {
  id: 'design', name: 'Design', scope: 'project', paid: true, costBearing: true,
  productive: true, billable: true, countsTowardUtilisation: true, includedInProjectCosting: true,
};
const COMPANY_WORK: ActivityFlags = {
  id: 'admin', name: 'Company administration', scope: 'company', paid: true, costBearing: true,
  productive: true, billable: false, countsTowardUtilisation: false, includedInProjectCosting: false,
};
const PERSONAL: ActivityFlags = {
  id: 'meal', name: 'Break or meal', scope: 'personal', paid: false, costBearing: false,
  productive: false, billable: false, countsTowardUtilisation: false, includedInProjectCosting: false,
};

describe('allocation identity holds for random schedules and entries', () => {
  it('allocated + adjustment always equals expected employment cost, exactly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 20000 }),                 // scheduled minutes
        fc.array(
          fc.record({
            minutes: fc.integer({ min: 15, max: 600 }),
            kind: fc.constantFrom<'project' | 'company' | 'personal'>('project', 'company', 'personal'),
          }),
          { maxLength: 60 },
        ),
        fc.integer({ min: 20_00, max: 90_00 }),                // paid-hour rate minor
        (scheduledMinutes, rawEntries, rate) => {
          const entries = rawEntries.map((e, i) => ({
            personId: 'p', date: '2025-05-05', minutes: e.minutes,
            activity: e.kind === 'project' ? PROJECT_WORK : e.kind === 'company' ? COMPANY_WORK : PERSONAL,
            paidHourRateMinor: rate,
          }));
          const expected = Math.round((scheduledMinutes / 60) * rate);
          const alloc = allocatePersonPeriod({
            personId: 'p', period: '2025-05', entries,
            scheduledPaidMinutes: scheduledMinutes,
            expectedEmploymentCostMinor: expected,
            paidHourRateMinor: rate,
          });
          const tie = computeTieOut({
            expectedEmploymentCostMinor: expected,
            projectLabourMinor: alloc.projectLabourMinor,
            nonProjectPayrollMinor: alloc.nonProjectPayrollMinor,
            unallocatedPayrollMinor: alloc.unallocatedPayrollMinor,
            reconciliationAdjustmentMinor: alloc.reconciliationAdjustmentMinor,
          });
          // With the reconciliation adjustment applied the identity is exact (R3).
          expect(tie.differenceMinor).toBe(0);
          expect(tie.status).toBe('green');
        },
      ),
    );
  });

  it('personal and unpaid time never creates cost anywhere', () => {
    fc.assert(
      fc.property(fc.integer({ min: 15, max: 600 }), fc.integer({ min: 20_00, max: 90_00 }), (minutes, rate) => {
        const alloc = allocatePersonPeriod({
          personId: 'p', period: '2025-05',
          entries: [{ personId: 'p', date: '2025-05-05', minutes, activity: PERSONAL, paidHourRateMinor: rate }],
          scheduledPaidMinutes: 0,
          expectedEmploymentCostMinor: 0,
          paidHourRateMinor: rate,
        });
        expect(alloc.projectLabourMinor).toBe(0);
        expect(alloc.nonProjectPayrollMinor).toBe(0);
        expect(alloc.unallocatedPayrollMinor).toBe(0);
      }),
    );
  });
});

describe('rate windows', () => {
  it('no rate is ever resolved from outside its effective window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3650 }),
        (offset) => {
          const base = new Date(Date.UTC(2023, 0, 1));
          const d = new Date(base.getTime() + offset * 86_400_000);
          const date = d.toISOString().slice(0, 10);
          const rates: DatedRate[] = [
            { personId: 'p', effectiveFrom: '2024-01-01', effectiveTo: '2024-12-31', paidHourRateMinor: 1, availableHourRateMinor: 1, productiveHourRateMinor: 1 },
            { personId: 'p', effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31', paidHourRateMinor: 2, availableHourRateMinor: 2, productiveHourRateMinor: 2 },
          ];
          const r = resolveRate(rates, date);
          if (r) {
            expect(r.effectiveFrom <= date).toBe(true);
            expect(r.effectiveTo === undefined || date <= r.effectiveTo).toBe(true);
          } else {
            expect(date < '2024-01-01' || date > '2025-12-31').toBe(true);
          }
        },
      ),
    );
  });
});

describe('gross margin scale invariance', () => {
  it('scaling revenue and cost together leaves margin unchanged', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_00, max: 500_000_00 }),
        fc.integer({ min: 0, max: 400_000_00 }),
        fc.integer({ min: 2, max: 9 }),
        (revenue, cost, k) => {
          const m1 = grossMargin(grossProfitMinor(revenue, cost), revenue);
          const m2 = grossMargin(grossProfitMinor(revenue * k, cost * k), revenue * k);
          expect(m2).toBeCloseTo(m1, 12);
        },
      ),
    );
  });
});

describe('pricing ladder invariants', () => {
  it('floors are ordered and a 50% target doubles total cost', () => {
    const ladder = priceLadder({
      estHoursByRole: { designer: 100 },
      paidRatesMinor: { designer: 50_00 },
      availableRatesMinor: { designer: 60_00 },
      externalCostMinor: 10_000_00,
      expensesMinor: 2_000_00,
      overheadPerProductiveHourMinor: 30_00,
      targetGrossMarginPct: 0.5,
    });
    expect(ladder.negotiationFloorMinor).toBeLessThanOrEqual(ladder.minimumSafePriceMinor);
    expect(ladder.minimumSafePriceMinor).toBeLessThanOrEqual(ladder.recommendedPriceMinor);
    expect(ladder.recommendedPriceMinor).toBe(ladder.totalCostMinor * 2);
    const below = evaluateQuote(ladder, ladder.minimumSafePriceMinor - 1);
    expect(below.breachesMinimumSafe).toBe(true);
  });
});
