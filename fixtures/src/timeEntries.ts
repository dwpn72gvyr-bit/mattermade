// fixtures/src/timeEntries.ts
// §10 time entries: twelve months for all six people, deterministic (no
// Math.random, no Date.now), realistic in shape, and reconciling: every
// person-month ties out green through @oe/finance (§6.3, R3).
//
// How the dataset is built:
//  - Each person has a hand-written monthly plan of project hours (the §6.9
//    hour tables land exactly: A, B, C, D, E totals per person match to the
//    minute) plus fixed company hours (business development spikes for Ryan
//    and Sofia).
//  - A deterministic expander turns each plan into daily entries across the
//    person's scheduled working days, honouring the four-day week (Priya works
//    Monday to Thursday), Singapore public holidays, annual leave, one medical
//    cluster (Wei Ming, November 2025) and Mei's two-day unexplained gap in
//    March 2026 (scenario 9: a gap is a gap, not an error).
//  - Remaining scheduled time is filled with company activities so mapped time
//    approaches scheduled time; the §6.9 E crunch months for Mei run over
//    schedule on purpose, and §6.3's "absorbed overtime" reconciliation
//    adjustment ties those months back to contractual payroll.

import type { TimeEntry, RoleKey, YearMonth, CalendarDate } from '@oe/domain';
import {
  allocatePersonPeriod, computeTieOut, combineTieOuts, resolveRate, roundHalfUp,
  type CostedEntry, type DatedRate, type TieOutResult, type PersonPeriodAllocation,
  type CostedProjectEntry,
} from '@oe/finance';
import { MONTHS, datesOfMonth, dayOfWeek, stamp, epochDay } from './support';
import { PEOPLE, WORK_SCHEDULES, COST_RATES, PERSON_IDS, type PersonKey } from './people';
import { ACTIVITY_BY_NAME, ACTIVITY_BY_ID } from './activities';
import { PROJECTS, PROJECT_IDS, phasesOf } from './projects';
import { USER_ID_BY_PERSON } from './users';

// ---------------------------------------------------------------------------
// Singapore public holidays in the window, weekday-observed (fictional-year
// calendar for the demo dataset; §6.3 auto-population).
// ---------------------------------------------------------------------------

export const SG_PUBLIC_HOLIDAYS: Record<CalendarDate, string> = {
  '2025-08-11': 'National Day (observed)',
  '2025-10-20': 'Deepavali',
  '2025-12-25': 'Christmas Day',
  '2026-01-01': 'New Year',
  '2026-02-17': 'Chinese New Year',
  '2026-02-18': 'Chinese New Year',
  '2026-03-20': 'Hari Raya Puasa',
  '2026-04-03': 'Good Friday',
  '2026-05-01': 'Labour Day',
  '2026-05-27': 'Hari Raya Haji',
  '2026-06-01': 'Vesak Day (observed)',
};

// ---------------------------------------------------------------------------
// Monthly plans
// ---------------------------------------------------------------------------

interface MonthPlan {
  /** projectId -> hours; §6.9 hour tables are law (R2). */
  project?: Record<string, number>;
  /** company activity name -> fixed hours (e.g. business development). */
  company?: Record<string, number>;
  annualLeave?: CalendarDate[];
  medical?: CalendarDate[];
  /** Scheduled working days with no entries at all (scenario 9). */
  gaps?: CalendarDate[];
}

type PersonPlan = Partial<Record<YearMonth, MonthPlan>>;

const P = PROJECT_IDS;

// Mei (designer). Every §6.9 designer hour lands in 2025 H2, before her
// 2026-01-01 raise, so worked-example costs stay exact at 50.00 per hour.
// The heavy months are project E's revision crunch; §6.3 absorbed overtime
// carries the difference.
const MEI_PLAN: PersonPlan = {
  '2025-07': { project: { [P.a]: 96, [P.b]: 50, [P.e]: 44 } },
  '2025-08': { project: { [P.a]: 84, [P.b]: 50, [P.e]: 51 } },
  '2025-09': { project: { [P.b]: 55, [P.c]: 30, [P.d]: 45, [P.e]: 80 } },
  '2025-10': { project: { [P.b]: 55, [P.c]: 70, [P.e]: 100 } },
  '2025-11': { project: { [P.b]: 55, [P.c]: 60, [P.e]: 110 } },
  '2025-12': { project: { [P.b]: 55, [P.c]: 90, [P.e]: 115 } },
  '2026-01': { project: { [P.l]: 12 }, annualLeave: ['2026-01-02'] },
  '2026-02': { project: { [P.f]: 30, [P.l]: 10 } },
  '2026-03': { project: { [P.f]: 30, [P.h]: 20 }, gaps: ['2026-03-12', '2026-03-13'] },
  '2026-04': { project: { [P.f]: 30, [P.g]: 15, [P.h]: 20 }, annualLeave: ['2026-04-06', '2026-04-07', '2026-04-08'] },
  '2026-05': { project: { [P.f]: 30, [P.g]: 20, [P.h]: 20 } },
  '2026-06': { project: { [P.f]: 30, [P.g]: 20, [P.h]: 20 }, annualLeave: ['2026-06-29', '2026-06-30'] },
};

// Sofia (creative director), with a business-development ramp into 2026.
const SOFIA_PLAN: PersonPlan = {
  '2025-07': { project: { [P.a]: 30, [P.b]: 26, [P.c]: 30, [P.e]: 40 }, company: { 'Business development': 8 } },
  '2025-08': { project: { [P.a]: 30, [P.b]: 26, [P.c]: 30, [P.e]: 45 }, company: { 'Business development': 8 } },
  '2025-09': { project: { [P.b]: 27, [P.c]: 30, [P.d]: 20, [P.e]: 50 }, company: { 'Business development': 8 } },
  '2025-10': { project: { [P.b]: 27, [P.c]: 30, [P.e]: 55 }, company: { 'Business development': 8 } },
  '2025-11': { project: { [P.b]: 27, [P.c]: 30, [P.e]: 60 }, company: { 'Business development': 8 } },
  '2025-12': { project: { [P.b]: 27, [P.c]: 30, [P.e]: 65 }, company: { 'Business development': 8 }, annualLeave: ['2025-12-22', '2025-12-23', '2025-12-24', '2025-12-29', '2025-12-30'] },
  '2026-01': { project: { [P.c]: 37, [P.e]: 50 }, company: { 'Business development': 16 } },
  '2026-02': { project: { [P.c]: 37, [P.e]: 45, [P.f]: 20 }, company: { 'Business development': 16 } },
  '2026-03': { project: { [P.c]: 37, [P.e]: 40, [P.f]: 20, [P.h]: 12 }, company: { 'Business development': 20 } },
  '2026-04': { project: { [P.c]: 37, [P.f]: 20, [P.g]: 8, [P.h]: 15 }, company: { 'Business development': 24 } },
  '2026-05': { project: { [P.c]: 36, [P.f]: 20, [P.g]: 12, [P.h]: 15 }, company: { 'Business development': 20 } },
  '2026-06': { project: { [P.c]: 36, [P.f]: 20, [P.g]: 10, [P.h]: 15 }, company: { 'Business development': 16 }, annualLeave: ['2026-06-15', '2026-06-16', '2026-06-17'] },
};

// Priya (account director, four-day week: Monday to Thursday).
const PRIYA_PLAN: PersonPlan = {
  '2025-07': { project: { [P.c]: 25, [P.e]: 20 } },
  '2025-08': { project: { [P.c]: 25, [P.e]: 20 }, annualLeave: ['2025-08-18', '2025-08-19'] },
  '2025-09': { project: { [P.c]: 25, [P.e]: 25 } },
  '2025-10': { project: { [P.c]: 25, [P.e]: 25, [P.j]: 15 } },
  '2025-11': { project: { [P.c]: 25, [P.e]: 25, [P.j]: 15 } },
  '2025-12': { project: { [P.c]: 25, [P.e]: 25, [P.j]: 10 } },
  '2026-01': { project: { [P.c]: 25, [P.e]: 20 } },
  '2026-02': { project: { [P.c]: 25, [P.e]: 20, [P.f]: 20 } },
  '2026-03': { project: { [P.c]: 25, [P.e]: 20, [P.f]: 25 }, annualLeave: ['2026-03-09', '2026-03-10'] },
  '2026-04': { project: { [P.c]: 25, [P.f]: 25 } },
  '2026-05': { project: { [P.c]: 25, [P.f]: 25 } },
  '2026-06': { project: { [P.c]: 25, [P.f]: 25 } },
};

// Ryan (founder): heavy, spiking business development (§10).
const RYAN_PLAN: PersonPlan = {
  '2025-07': { project: { [P.a]: 6, [P.b]: 6, [P.c]: 10, [P.e]: 10 }, company: { 'Business development': 50, Marketing: 8 } },
  '2025-08': { project: { [P.a]: 4, [P.b]: 6, [P.c]: 10, [P.e]: 10 }, company: { 'Business development': 50, Marketing: 8 } },
  '2025-09': { project: { [P.b]: 7, [P.c]: 10, [P.e]: 12 }, company: { 'Business development': 45, Marketing: 8 } },
  '2025-10': { project: { [P.b]: 7, [P.c]: 10, [P.e]: 12 }, company: { 'Business development': 45, Marketing: 8 } },
  '2025-11': { project: { [P.b]: 7, [P.c]: 10, [P.e]: 13 }, company: { 'Business development': 40, Marketing: 8 }, annualLeave: ['2025-11-24', '2025-11-25', '2025-11-26'] },
  '2025-12': { project: { [P.b]: 7, [P.c]: 10, [P.e]: 13 }, company: { 'Business development': 30, Marketing: 8 } },
  '2026-01': { project: { [P.c]: 10, [P.e]: 10 }, company: { 'Business development': 55, Marketing: 8 } },
  '2026-02': { project: { [P.c]: 10, [P.e]: 10, [P.f]: 6 }, company: { 'Business development': 50, Marketing: 8 } },
  '2026-03': { project: { [P.c]: 10, [P.e]: 10, [P.f]: 6 }, company: { 'Business development': 50, Marketing: 8 } },
  '2026-04': { project: { [P.c]: 10, [P.f]: 6 }, company: { 'Business development': 60, Marketing: 8 } },
  '2026-05': { project: { [P.c]: 10, [P.f]: 6 }, company: { 'Business development': 65, Marketing: 8 }, annualLeave: ['2026-05-18', '2026-05-19'] },
  '2026-06': { project: { [P.c]: 10, [P.f]: 6 }, company: { 'Business development': 60, Marketing: 8 } },
};

// Wei Ming (account manager): company-heavy 2025 H2, then Verdant Walk, the
// Kite overrun, Saltwater (his lead project) and the pro bono programme.
// Medical cluster 10 to 12 November 2025.
const WEIMING_PLAN: PersonPlan = {
  '2025-07': { company: { 'Business development': 20 } },
  '2025-08': { company: { 'Business development': 20 } },
  '2025-09': { company: { 'Business development': 20 }, annualLeave: ['2025-09-22', '2025-09-23', '2025-09-24'] },
  '2025-10': { project: { [P.j]: 30 }, company: { 'Business development': 16 } },
  '2025-11': { project: { [P.j]: 30 }, company: { 'Business development': 12 }, medical: ['2025-11-10', '2025-11-11', '2025-11-12'] },
  '2025-12': { project: { [P.j]: 20 }, company: { 'Business development': 12 } },
  '2026-01': { project: { [P.l]: 15 }, company: { 'Business development': 20 } },
  '2026-02': { project: { [P.f]: 20, [P.l]: 10 }, company: { 'Business development': 12 } },
  '2026-03': { project: { [P.f]: 25, [P.h]: 25 }, company: { 'Business development': 8 } },
  '2026-04': { project: { [P.f]: 30, [P.g]: 40, [P.h]: 25 }, company: { 'Business development': 8 } },
  '2026-05': { project: { [P.f]: 35, [P.g]: 50, [P.h]: 20 }, annualLeave: ['2026-05-11', '2026-05-12'] },
  '2026-06': { project: { [P.f]: 37, [P.g]: 50, [P.h]: 20 } },
};

// Daniel (associate creative producer): the production backbone of B, C and E.
const DANIEL_PLAN: PersonPlan = {
  '2025-07': { project: { [P.a]: 22, [P.b]: 43, [P.c]: 58, [P.e]: 40 } },
  '2025-08': { project: { [P.a]: 18, [P.b]: 43, [P.c]: 58, [P.e]: 40 } },
  '2025-09': { project: { [P.b]: 43, [P.c]: 58, [P.e]: 40 } },
  '2025-10': { project: { [P.b]: 43, [P.c]: 58, [P.e]: 40 } },
  '2025-11': { project: { [P.b]: 44, [P.c]: 58, [P.e]: 40 } },
  '2025-12': { project: { [P.b]: 44, [P.c]: 58, [P.e]: 40 } },
  '2026-01': { project: { [P.c]: 59, [P.e]: 50, [P.l]: 10 } },
  '2026-02': { project: { [P.c]: 59, [P.e]: 55, [P.f]: 10, [P.l]: 8 }, annualLeave: ['2026-02-23', '2026-02-24'] },
  '2026-03': { project: { [P.c]: 59, [P.e]: 55, [P.f]: 10 } },
  '2026-04': { project: { [P.c]: 59, [P.f]: 15 } },
  '2026-05': { project: { [P.c]: 58, [P.f]: 20 } },
  '2026-06': { project: { [P.c]: 58, [P.f]: 20 }, annualLeave: ['2026-06-22', '2026-06-23', '2026-06-24'] },
};

const PLANS: Record<PersonKey, PersonPlan> = {
  ryan: RYAN_PLAN,
  sofia: SOFIA_PLAN,
  priya: PRIYA_PLAN,
  weiming: WEIMING_PLAN,
  mei: MEI_PLAN,
  daniel: DANIEL_PLAN,
};

/** People who also record contextual time (R7: visible to the owner alone). */
const CONTEXTUAL_BREAK: PersonKey[] = ['mei', 'weiming', 'daniel'];
const CONTEXTUAL_COMMUTE: PersonKey[] = ['weiming', 'daniel'];

/** Project activity rotation per role, all §5.3 project-costed activities. */
const ACTIVITY_CYCLE: Record<RoleKey, string[]> = {
  founder: ['Client meeting', 'Strategy', 'Concept'],
  creative_director: ['Concept', 'Design', 'Revisions', 'Client meeting'],
  account_director: ['Client meeting', 'Project management', 'Strategy'],
  account_manager: ['Project management', 'Client meeting', 'Production'],
  designer: ['Design', 'Revisions', 'Production'],
  associate_creative_producer: ['Production', 'Project management', 'Site visit', 'Work-related travel'],
  strategist: ['Strategy'],
  producer: ['Production'],
};

const FILLER_WEIGHTS: [string, number][] = [
  ['Internal meeting', 0.3],
  ['Company administration', 0.25],
  ['Internal research', 0.2],
  ['Training', 0.15],
  ['Culture and team', 0.1],
];

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

function scheduleFor(personId: string) {
  const s = WORK_SCHEDULES.find((w) => w.personId === personId);
  if (!s) throw new Error(`No work schedule for ${personId}`);
  return s;
}

/** Fixture convention: a four-day schedule works Monday to Thursday. */
function isScheduledWorkday(personId: string, date: CalendarDate): boolean {
  const dow = dayOfWeek(date);
  const s = scheduleFor(personId);
  if (s.daysPerWeek === 4) return dow >= 1 && dow <= 4;
  return dow >= 1 && dow <= 5;
}

/** Scheduled paid minutes for a person-month, derived from the WorkSchedule.
 *  Paid leave and public holidays remain scheduled paid time (§6.3 bucket 2);
 *  only unpaid leave would shrink this, and the dataset uses none. */
export function scheduledPaidMinutesFor(personId: string, period: YearMonth): number {
  const s = scheduleFor(personId);
  return (
    datesOfMonth(period).filter((d) => isScheduledWorkday(personId, d)).length *
    s.hoursPerDay * 60
  );
}

const DATED_RATES: DatedRate[] = COST_RATES.map((r) => ({
  personId: r.personId,
  effectiveFrom: r.effectiveFrom,
  ...(r.effectiveTo ? { effectiveTo: r.effectiveTo } : {}),
  paidHourRateMinor: r.paidHourRateMinor,
  availableHourRateMinor: r.availableHourRateMinor,
  productiveHourRateMinor: r.productiveHourRateMinor,
}));

/** §6.2: every time entry resolves the rate effective on its own date. */
export function paidRateOn(personId: string, date: CalendarDate): number {
  const rate = resolveRate(DATED_RATES.filter((r) => r.personId === personId), date);
  if (!rate) throw new Error(`No cost rate covers ${personId} on ${date}`);
  return rate.paidHourRateMinor;
}

// ---------------------------------------------------------------------------
// The deterministic expander
// ---------------------------------------------------------------------------

const round15 = (n: number) => Math.round(n / 15) * 15;

interface Task {
  kind: 'project' | 'company';
  ref: string; // projectId or company activity name
  remaining: number;
}

function phaseIdFor(projectId: string, date: CalendarDate): string | undefined {
  const project = PROJECTS.find((p) => p.id === projectId);
  const phases = phasesOf(projectId);
  if (!project || phases.length === 0) return undefined;
  const span = epochDay(project.targetEndDate) - epochDay(project.startDate);
  const frac = span <= 0 ? 0 : (epochDay(date) - epochDay(project.startDate)) / span;
  const idx = Math.min(phases.length - 1, Math.max(0, Math.floor(frac * phases.length)));
  return phases[idx]!.id;
}

function buildEntries(): TimeEntry[] {
  const entries: TimeEntry[] = [];
  const perDayCount = new Map<string, number>();
  const cycleCursor = new Map<string, number>();

  const push = (
    personKey: PersonKey, date: CalendarDate, minutes: number,
    activityName: string, projectId?: string, notes?: string,
  ) => {
    const personId = PERSON_IDS[personKey];
    const activity = ACTIVITY_BY_NAME[activityName];
    if (!activity) throw new Error(`Unknown activity ${activityName}`);
    const dayKey = `${personKey}-${date}`;
    const seq = (perDayCount.get(dayKey) ?? 0) + 1;
    perDayCount.set(dayKey, seq);
    const userId = USER_ID_BY_PERSON[personId]!;
    entries.push({
      ...stamp(`te-${personKey}-${date}-${seq}`, userId),
      createdAt: `${date}T10:00:00Z`,
      updatedAt: `${date}T10:00:00Z`,
      personId,
      date,
      minutes,
      ...(projectId ? { projectId, phaseId: phaseIdFor(projectId, date) } : {}),
      activityId: activity.id,
      ...(notes ? { notes } : {}),
      source: 'manual',
      status: 'confirmed',
    });
  };

  for (const person of PEOPLE) {
    const personKey = (Object.entries(PERSON_IDS) as [PersonKey, string][])
      .find(([, id]) => id === person.id)![0];
    const plan = PLANS[personKey];
    const schedule = scheduleFor(person.id);
    const dayMinutes = schedule.hoursPerDay * 60;

    for (const month of MONTHS) {
      const monthPlan: MonthPlan = plan[month] ?? {};
      const workdays = datesOfMonth(month).filter((d) => isScheduledWorkday(person.id, d));
      const phDays = workdays.filter((d) => SG_PUBLIC_HOLIDAYS[d] !== undefined);
      const leaveDays = monthPlan.annualLeave ?? [];
      const medicalDays = monthPlan.medical ?? [];
      const gapDays = monthPlan.gaps ?? [];

      // Build-time integrity: leave and gap dates must be scheduled workdays
      // that are not public holidays, or the plan is wrong.
      for (const d of [...leaveDays, ...medicalDays, ...gapDays]) {
        if (!workdays.includes(d) || SG_PUBLIC_HOLIDAYS[d] !== undefined) {
          throw new Error(`Plan date ${d} for ${person.id} is not a plain scheduled workday`);
        }
      }

      // Full-day paid leave entries (§5.3: paid, cost-bearing, not productive).
      for (const d of phDays) push(personKey, d, dayMinutes, 'Public holiday', undefined, SG_PUBLIC_HOLIDAYS[d]);
      for (const d of leaveDays) push(personKey, d, dayMinutes, 'Annual leave');
      for (const d of medicalDays) push(personKey, d, dayMinutes, 'Medical leave');

      const offDays = new Set([...phDays, ...leaveDays, ...medicalDays, ...gapDays]);
      const availableDays = workdays.filter((d) => !offDays.has(d));

      // Assemble the month's task queue: project hours, fixed company hours,
      // then a company filler that tops mapped time up to scheduled time.
      const tasks: Task[] = [];
      for (const [projectId, hours] of Object.entries(monthPlan.project ?? {})) {
        tasks.push({ kind: 'project', ref: projectId, remaining: hours * 60 });
      }
      for (const [activityName, hours] of Object.entries(monthPlan.company ?? {})) {
        tasks.push({ kind: 'company', ref: activityName, remaining: hours * 60 });
      }
      const assigned = tasks.reduce((s, t) => s + t.remaining, 0);
      const capacity = availableDays.length * dayMinutes;
      const fillerTotal = Math.max(0, capacity - assigned);
      if (fillerTotal > 0) {
        const parts = FILLER_WEIGHTS.map(
          ([name, w]) => [name, round15(fillerTotal * w)] as [string, number],
        );
        const partSum = parts.reduce((s, p) => s + p[1], 0);
        parts[0]![1] += fillerTotal - partSum;
        for (const [name, minutes] of parts) {
          if (minutes > 0) tasks.push({ kind: 'company', ref: name, remaining: minutes });
        }
      }

      // Spread tasks across available days: even daily targets, chunks capped
      // at four hours, round-robin so days interleave activities. Totals are
      // exact because the final day drains whatever remains.
      let remainingTotal = tasks.reduce((s, t) => s + t.remaining, 0);
      let cursor = 0;
      availableDays.forEach((date, i) => {
        const daysLeft = availableDays.length - i;
        let target = i === availableDays.length - 1
          ? remainingTotal
          : Math.min(remainingTotal, round15(remainingTotal / daysLeft));
        while (target > 0) {
          const active = tasks.filter((t) => t.remaining > 0);
          if (active.length === 0) break;
          const task = active[cursor % active.length]!;
          cursor += 1;
          const chunk = Math.min(task.remaining, target, 240);
          if (chunk <= 0) break;
          if (task.kind === 'project') {
            const cKey = `${personKey}-${task.ref}`;
            const n = cycleCursor.get(cKey) ?? 0;
            cycleCursor.set(cKey, n + 1);
            const cycle = ACTIVITY_CYCLE[person.roleKey];
            push(personKey, date, chunk, cycle[n % cycle.length]!, task.ref);
          } else {
            push(personKey, date, chunk, task.ref);
          }
          task.remaining -= chunk;
          target -= chunk;
          remainingTotal -= chunk;
        }
      });

      // Contextual time (§5.3 personal scope): never costed, owner-only (R7).
      for (const date of availableDays) {
        if (CONTEXTUAL_BREAK.includes(personKey)) push(personKey, date, 60, 'Break or meal');
        if (CONTEXTUAL_COMMUTE.includes(personKey)) push(personKey, date, 60, 'Commuting');
      }
    }
  }

  return entries;
}

export const TIME_ENTRIES: TimeEntry[] = buildEntries();

// ---------------------------------------------------------------------------
// Query helpers (shared by the mock API, the tests and the seeder)
// ---------------------------------------------------------------------------

export function entriesFor(personId: string, month: YearMonth): TimeEntry[] {
  return TIME_ENTRIES.filter((e) => e.personId === personId && e.date.startsWith(month));
}

export function projectEntries(projectId: string): TimeEntry[] {
  return TIME_ENTRIES.filter((e) => e.projectId === projectId);
}

function toCostedEntry(e: TimeEntry): CostedEntry {
  const activity = ACTIVITY_BY_ID[e.activityId];
  if (!activity) throw new Error(`Unknown activity id ${e.activityId}`);
  return {
    personId: e.personId,
    date: e.date,
    minutes: e.minutes,
    activity,
    // Contextual and unpaid activities are never costed; a zero rate keeps
    // even an accidental multiplication at zero (belt and braces, R7/R8).
    paidHourRateMinor: activity.paid ? paidRateOn(e.personId, e.date) : 0,
    ...(e.projectId ? { projectId: e.projectId } : {}),
    ...(e.phaseId ? { phaseId: e.phaseId } : {}),
  };
}

/** F2 inputs (§6.5): a project's entries with the rate resolved on each
 *  entry's date, ready for @oe/finance actInternalCostMinor. */
export function costedProjectEntries(projectId: string): CostedProjectEntry[] {
  return projectEntries(projectId).map((e) => {
    const activity = ACTIVITY_BY_ID[e.activityId];
    if (!activity) throw new Error(`Unknown activity id ${e.activityId}`);
    return {
      minutes: e.minutes,
      paidHourRateMinor: paidRateOn(e.personId, e.date),
      includedInProjectCosting: activity.includedInProjectCosting,
    };
  });
}

export interface MonthlyPersonTieOut {
  personId: string;
  allocation: PersonPeriodAllocation;
  tieOut: TieOutResult;
}

export interface MonthlyTieOut {
  period: YearMonth;
  perPerson: MonthlyPersonTieOut[];
  combined: TieOutResult;
}

/** §6.3 tie-out for every person and month in the window (the Stage A3
 *  acceptance gate: every month must be green).
 *
 *  Fixture simplification, documented in fixtures/src/README.md: a person's
 *  expected period employment cost is defined as scheduled paid minutes times
 *  their cost per paid hour, so the identity closes exactly by construction;
 *  overtime months (Mei's E crunch) close through the negative "absorbed
 *  overtime" reconciliation adjustment that allocatePersonPeriod computes. */
export function computeMonthlyTieOuts(): MonthlyTieOut[] {
  return MONTHS.map((period) => {
    const perPerson = PEOPLE.map((person) => {
      const scheduledPaidMinutes = scheduledPaidMinutesFor(person.id, period);
      const rate = paidRateOn(person.id, `${period}-01`);
      const expectedEmploymentCostMinor = roundHalfUp((scheduledPaidMinutes / 60) * rate);
      const allocation = allocatePersonPeriod({
        personId: person.id,
        period,
        entries: entriesFor(person.id, period).map(toCostedEntry),
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
