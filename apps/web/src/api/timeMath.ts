// Time and payroll maths over the LIVE database (not the static fixtures), so
// fresh-mode workspaces and newly logged hours flow through every report the
// same way the fictional dataset does. All money maths stays in @oe/finance.

import {
  allocatePersonPeriod, computeTieOut, combineTieOuts, resolveRate, roundHalfUp,
  type CostedEntry, type DatedRate, type TieOutResult, type PersonPeriodAllocation,
  type CostedProjectEntry, type ActivityFlags,
} from '@oe/finance';
import type { TimeEntry, Activity } from '@oe/domain';
import { db, activeMonths } from './db';

export function activityById(id: string): Activity | undefined {
  return db.activities.find((a) => a.id === id);
}

const dow = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

export function isWorkday(personId: string, date: string): boolean {
  const s = db.workSchedules.find((w) => w.personId === personId);
  const d = dow(date);
  if (!s) return d >= 1 && d <= 5;
  return s.daysPerWeek === 4 ? d >= 1 && d <= 4 : d >= 1 && d <= 5;
}

export function scheduledMinutesOn(personId: string, date: string): number {
  if (!isWorkday(personId, date)) return 0;
  const s = db.workSchedules.find((w) => w.personId === personId);
  return (s?.hoursPerDay ?? 8) * 60;
}

function datesOfMonth(ym: string): string[] {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
}

export function scheduledPaidMinutesFor(personId: string, period: string): number {
  return datesOfMonth(period).reduce((s, d) => s + scheduledMinutesOn(personId, d), 0);
}

function datedRates(personId: string): DatedRate[] {
  return db.costRates
    .filter((r) => r.personId === personId)
    .map((r) => ({
      personId: r.personId,
      effectiveFrom: r.effectiveFrom,
      ...(r.effectiveTo ? { effectiveTo: r.effectiveTo } : {}),
      paidHourRateMinor: r.paidHourRateMinor,
      availableHourRateMinor: r.availableHourRateMinor,
      productiveHourRateMinor: r.productiveHourRateMinor,
    }));
}

/** §6.2: every time entry resolves the rate effective on its own date. */
export function paidRateOn(personId: string, date: string): number {
  const rate = resolveRate(datedRates(personId), date);
  if (!rate) {
    // A person without a rate window (edge of dataset): fall back to their
    // latest known rate rather than crash the browser demo.
    const all = datedRates(personId).sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
    return all[0]?.paidHourRateMinor ?? 0;
  }
  return rate.paidHourRateMinor;
}

export function projectEntries(projectId: string): TimeEntry[] {
  return db.timeEntries.filter((e) => e.projectId === projectId);
}

export function costedProjectEntries(projectId: string): CostedProjectEntry[] {
  return projectEntries(projectId).map((e) => {
    const activity = activityById(e.activityId);
    return {
      minutes: e.minutes,
      paidHourRateMinor: paidRateOn(e.personId, e.date),
      includedInProjectCosting: activity?.includedInProjectCosting ?? false,
    };
  });
}

function toCostedEntry(e: TimeEntry): CostedEntry {
  const activity = activityById(e.activityId)!;
  return {
    personId: e.personId,
    date: e.date,
    minutes: e.minutes,
    activity: activity as ActivityFlags,
    paidHourRateMinor: activity.paid ? paidRateOn(e.personId, e.date) : 0,
    ...(e.projectId ? { projectId: e.projectId } : {}),
    ...(e.phaseId ? { phaseId: e.phaseId } : {}),
  };
}

export interface MonthlyPersonTieOut {
  personId: string;
  allocation: PersonPeriodAllocation;
  tieOut: TieOutResult;
}

export interface MonthlyTieOut {
  period: string;
  perPerson: MonthlyPersonTieOut[];
  combined: TieOutResult;
}

/** §6.3 tie-out per person per month, over live entries. The identity closes
 *  by construction (unallocated fills the gap; overtime absorbs), so the
 *  current in-progress month stays green rather than red. */
export function computeMonthlyTieOuts(): MonthlyTieOut[] {
  return activeMonths().map((period) => {
    const perPerson = db.people.map((person) => {
      const scheduledPaidMinutes = scheduledPaidMinutesFor(person.id, period);
      const rate = paidRateOn(person.id, `${period}-01`);
      const expectedEmploymentCostMinor = roundHalfUp((scheduledPaidMinutes / 60) * rate);
      const entries = db.timeEntries
        .filter((e) => e.personId === person.id && e.date.startsWith(period))
        .map(toCostedEntry);
      const allocation = allocatePersonPeriod({
        personId: person.id,
        period,
        entries,
        scheduledPaidMinutes,
        expectedEmploymentCostMinor,
        paidHourRateMinor: rate,
      });
      const tieOut = computeTieOut({
        expectedEmploymentCostMinor,
        projectLabourMinor: allocation.projectLabourMinor,
        nonProjectPayrollMinor: allocation.nonProjectPayrollMinor,
        unallocatedPayrollMinor: allocation.unallocatedPayrollMinor,
        reconciliationAdjustmentMinor: allocation.reconciliationAdjustmentMinor,
      });
      return { personId: person.id, allocation, tieOut };
    });
    return { period, perPerson, combined: combineTieOuts(perPerson.map((x) => x.tieOut)) };
  });
}

/** Day-mapping completeness for the reminder view (client direction, item 12):
 *  scheduled vs mapped minutes per person over recent workdays. Gaps only,
 *  never notes or categories. */
export function completenessFor(days: string[]): {
  personId: string; name: string;
  days: { date: string; scheduledMinutes: number; mappedMinutes: number }[];
  scheduledMinutes: number; mappedMinutes: number;
}[] {
  return db.people.map((person) => {
    const perDay = days.map((date) => {
      const scheduled = scheduledMinutesOn(person.id, date);
      const mapped = db.timeEntries
        .filter((e) => e.personId === person.id && e.date === date)
        .filter((e) => activityById(e.activityId)?.scope !== 'personal')
        .reduce((s, e) => s + e.minutes, 0);
      return { date, scheduledMinutes: scheduled, mappedMinutes: mapped };
    });
    return {
      personId: person.id,
      name: person.name,
      days: perDay,
      scheduledMinutes: perDay.reduce((s, d) => s + d.scheduledMinutes, 0),
      mappedMinutes: perDay.reduce((s, d) => s + Math.min(d.mappedMinutes, d.scheduledMinutes || d.mappedMinutes), 0),
    };
  });
}
