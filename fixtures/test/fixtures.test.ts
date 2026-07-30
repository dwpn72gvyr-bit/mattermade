// Stage A3 acceptance (§11): every fixture month ties out green; the worked
// examples reproduce from the dataset through @oe/finance; the activity table
// matches §5.3; the register holds no payroll.

import { describe, it, expect } from 'vitest';
import {
  actInternalCostMinor, estInternalCostMinor, grossProfitMinor, grossMargin,
  hoursConsumedPct, toMinor, pctValue, assertNotPayroll,
} from '@oe/finance';
import {
  fixtureDb, computeMonthlyTieOuts, MONTHS, PROJECT_IDS, PERSON_IDS,
  costedProjectEntries, projectEntries, RATE_CARD, BASELINE_HOURS,
  ACTIVITY_BY_NAME, FIXTURE_TODAY, entriesFor, scheduledPaidMinutesFor,
} from '../src';
import { epochDay } from '../src/support';

const HOURS = (projectId: string, personId: string) =>
  projectEntries(projectId)
    .filter((e) => e.personId === personId)
    .reduce((s, e) => s + e.minutes, 0) / 60;

describe('§6.3 tie-out: every month, every person, green', () => {
  const tieOuts = computeMonthlyTieOuts();

  it('covers all twelve months', () => {
    expect(tieOuts.map((t) => t.period)).toEqual(MONTHS);
  });

  for (const month of MONTHS) {
    it(`${month} ties out green for all six people`, () => {
      const t = tieOuts.find((x) => x.period === month)!;
      for (const p of t.perPerson) {
        expect(p.tieOut.status, `${p.personId} in ${month}`).toBe('green');
        expect(p.tieOut.differenceMinor, `${p.personId} in ${month}`).toBe(0);
      }
      expect(t.combined.status).toBe('green');
    });
  }
});

describe('§6.9 hour tables land exactly in the entries (R2)', () => {
  it('A · Meridian Rebrand: CD 60, Designer 180, ACP 40, Founder 10', () => {
    expect(HOURS(PROJECT_IDS.a, PERSON_IDS.sofia)).toBe(60);
    expect(HOURS(PROJECT_IDS.a, PERSON_IDS.mei)).toBe(180);
    expect(HOURS(PROJECT_IDS.a, PERSON_IDS.daniel)).toBe(40);
    expect(HOURS(PROJECT_IDS.a, PERSON_IDS.ryan)).toBe(10);
  });
  it('B · Tidal Pavilion: F 40, CD 160, D 320, ACP 260', () => {
    expect(HOURS(PROJECT_IDS.b, PERSON_IDS.ryan)).toBe(40);
    expect(HOURS(PROJECT_IDS.b, PERSON_IDS.sofia)).toBe(160);
    expect(HOURS(PROJECT_IDS.b, PERSON_IDS.mei)).toBe(320);
    expect(HOURS(PROJECT_IDS.b, PERSON_IDS.daniel)).toBe(260);
  });
  it('C · Lumen Festival: F 120, CD 400, AD 300, ACP 700, D 250', () => {
    expect(HOURS(PROJECT_IDS.c, PERSON_IDS.ryan)).toBe(120);
    expect(HOURS(PROJECT_IDS.c, PERSON_IDS.sofia)).toBe(400);
    expect(HOURS(PROJECT_IDS.c, PERSON_IDS.priya)).toBe(300);
    expect(HOURS(PROJECT_IDS.c, PERSON_IDS.daniel)).toBe(700);
    expect(HOURS(PROJECT_IDS.c, PERSON_IDS.mei)).toBe(250);
  });
  it('D · Ember Sprint: CD 20, D 45', () => {
    expect(HOURS(PROJECT_IDS.d, PERSON_IDS.sofia)).toBe(20);
    expect(HOURS(PROJECT_IDS.d, PERSON_IDS.mei)).toBe(45);
  });
  it('E · Northwind Flagship: F 100, CD 450, AD 200, D 500, ACP 400', () => {
    expect(HOURS(PROJECT_IDS.e, PERSON_IDS.ryan)).toBe(100);
    expect(HOURS(PROJECT_IDS.e, PERSON_IDS.sofia)).toBe(450);
    expect(HOURS(PROJECT_IDS.e, PERSON_IDS.priya)).toBe(200);
    expect(HOURS(PROJECT_IDS.e, PERSON_IDS.mei)).toBe(500);
    expect(HOURS(PROJECT_IDS.e, PERSON_IDS.daniel)).toBe(400);
  });
});

describe('§6.9 costs reproduce from the dataset through @oe/finance (R1, R2)', () => {
  it('A: actual internal cost 20,070; margin 47.2%', () => {
    const internal = actInternalCostMinor(costedProjectEntries(PROJECT_IDS.a));
    expect(internal).toBe(toMinor(20_070));
    const fee = fixtureDb.projects.find((p) => p.id === PROJECT_IDS.a)!.contractValueMinor;
    expect(pctValue(grossMargin(grossProfitMinor(fee, internal), fee))).toBe(47.2);
  });
  it('B: actual internal cost 54,880', () => {
    expect(actInternalCostMinor(costedProjectEntries(PROJECT_IDS.b))).toBe(toMinor(54_880));
  });
  it('C: actual internal cost 144,740', () => {
    expect(actInternalCostMinor(costedProjectEntries(PROJECT_IDS.c))).toBe(toMinor(144_740));
  });
  it('D: actual internal cost 4,850', () => {
    expect(actInternalCostMinor(costedProjectEntries(PROJECT_IDS.d))).toBe(toMinor(4_850));
  });
  it('E: actual internal cost 136,200 (all §6.9 E hours precede the raise)', () => {
    expect(actInternalCostMinor(costedProjectEntries(PROJECT_IDS.e))).toBe(toMinor(136_200));
  });
  it('estimate F1 on the baseline card matches A exactly', () => {
    expect(estInternalCostMinor(BASELINE_HOURS[PROJECT_IDS.a] as Record<string, number>, RATE_CARD)).toBe(
      toMinor(20_070),
    );
  });
});

describe('§5.3 activity flags', () => {
  it('project work is costed; leave is paid but not productive; contextual is never costed', () => {
    const design = ACTIVITY_BY_NAME['Design']!;
    expect(design).toMatchObject({ scope: 'project', paid: true, costBearing: true, productive: true, billable: true, countsTowardUtilisation: true, includedInProjectCosting: true });
    const bd = ACTIVITY_BY_NAME['Business development']!;
    expect(bd).toMatchObject({ scope: 'company', paid: true, costBearing: true, productive: true, billable: false, countsTowardUtilisation: true, includedInProjectCosting: false });
    const admin = ACTIVITY_BY_NAME['Company administration']!;
    expect(admin).toMatchObject({ scope: 'company', countsTowardUtilisation: false });
    const leave = ACTIVITY_BY_NAME['Annual leave']!;
    expect(leave).toMatchObject({ scope: 'company', paid: true, costBearing: true, productive: false, billable: false });
    const unpaid = ACTIVITY_BY_NAME['Unpaid leave']!;
    expect(unpaid).toMatchObject({ paid: false, costBearing: false });
    const meal = ACTIVITY_BY_NAME['Break or meal']!;
    expect(meal).toMatchObject({ scope: 'personal', paid: false, costBearing: false, includedInProjectCosting: false });
  });
});

describe('§5.4 overhead register', () => {
  it('contains no payroll-like entries and sums to 12,000 a month (§6.9 F)', () => {
    for (const line of fixtureDb.companyOverheads) {
      expect(() => assertNotPayroll(line.description, line.category)).not.toThrow();
    }
    const monthly = fixtureDb.companyOverheads
      .filter((l) => l.recurrence === 'monthly')
      .reduce((s, l) => s + l.amountMinor, 0);
    expect(monthly).toBe(toMinor(12_000));
  });
});

describe('§10 dataset shape', () => {
  it('12 projects: ≥3 active, one estimating, one on hold, one lost, one pro bono, one USD', () => {
    const p = fixtureDb.projects;
    expect(p).toHaveLength(12);
    expect(p.filter((x) => x.status === 'active').length).toBeGreaterThanOrEqual(3);
    expect(p.some((x) => x.status === 'estimating')).toBe(true);
    expect(p.some((x) => x.status === 'on_hold')).toBe(true);
    expect(p.some((x) => x.status === 'lost')).toBe(true);
    expect(p.some((x) => x.isProBono)).toBe(true);
    expect(p.some((x) => x.currency === 'USD')).toBe(true);
  });

  it('the overrunning project is at least 15 points ahead of schedule elapsed', () => {
    const f = fixtureDb.projects.find((p) => p.id === PROJECT_IDS.f)!;
    const actHours = projectEntries(PROJECT_IDS.f).reduce((s, e) => s + e.minutes, 0) / 60;
    const baseHours = Object.values(BASELINE_HOURS[PROJECT_IDS.f]!).reduce((s, h) => s + (h ?? 0), 0);
    const elapsed =
      (epochDay(FIXTURE_TODAY) - epochDay(f.startDate)) /
      (epochDay(f.targetEndDate) - epochDay(f.startDate));
    expect(hoursConsumedPct(actHours, baseHours) - elapsed).toBeGreaterThanOrEqual(0.15);
  });

  it('Mei has a two-day gap in March 2026 (a gap, never an error)', () => {
    const dates = new Set(entriesFor(PERSON_IDS.mei, '2026-03').map((e) => e.date));
    expect(dates.has('2026-03-12')).toBe(false);
    expect(dates.has('2026-03-13')).toBe(false);
    // The gap leaves unallocated payroll, not silence: scheduled minutes exceed mapped.
    const mapped = entriesFor(PERSON_IDS.mei, '2026-03')
      .filter((e) => ACTIVITY_BY_NAME['Break or meal']!.id !== e.activityId)
      .reduce((s, e) => s + e.minutes, 0);
    expect(scheduledPaidMinutesFor(PERSON_IDS.mei, '2026-03')).toBeGreaterThan(0);
    expect(mapped).toBeLessThan(scheduledPaidMinutesFor(PERSON_IDS.mei, '2026-03'));
  });

  it('periods: months before 2026-05 locked, then soft_closed, then open; all green', () => {
    for (const fp of fixtureDb.financialPeriods) {
      expect(fp.tieOut).toBe('green');
      if (fp.yearMonth < '2026-05') expect(fp.status).toBe('locked');
      else if (fp.yearMonth === '2026-05') expect(fp.status).toBe('soft_closed');
      else expect(fp.status).toBe('open');
    }
  });
});
