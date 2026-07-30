// packages/finance/src/allocation.ts
// §6.3 Time and payroll allocation: the single-count identity (R3) and tie-out.
// EmploymentCost = ProjectLabourCost + NonProjectPayrollCost + UnallocatedPayrollCost
//                  ± ReconciliationAdjustment, per person per period.

import { roundHalfUp } from './money';

export type ActivityScope = 'project' | 'company' | 'personal';

export interface ActivityFlags {
  id: string;
  name: string;
  scope: ActivityScope;
  paid: boolean;
  costBearing: boolean;
  productive: boolean;
  billable: boolean;
  countsTowardUtilisation: boolean;
  includedInProjectCosting: boolean;
}

export type AllocationBucket =
  | 'project_labour'      // §6.3 bucket 1
  | 'non_project_payroll' // §6.3 bucket 2
  | 'no_cost';            // personal or unpaid: recorded for the individual alone

/** §6.3 bucket assignment by activity flags. */
export function bucketForActivity(a: ActivityFlags): AllocationBucket {
  if (a.scope === 'personal' || !a.paid) return 'no_cost';
  if (a.scope === 'project' && a.includedInProjectCosting) return 'project_labour';
  if (a.scope === 'company' && a.paid && a.costBearing) return 'non_project_payroll';
  // Paid project-scope activity excluded from costing behaves as company time.
  if (a.paid && a.costBearing) return 'non_project_payroll';
  return 'no_cost';
}

export interface CostedEntry {
  personId: string;
  date: string;               // YYYY-MM-DD
  minutes: number;
  activity: ActivityFlags;
  paidHourRateMinor: number;  // resolved on the entry's date (R8: cost per paid hour)
  projectId?: string;
  phaseId?: string;
}

export interface PersonPeriodAllocation {
  personId: string;
  period: string;                          // YYYY-MM
  projectLabourMinor: number;
  nonProjectPayrollMinor: number;
  nonProjectByActivityMinor: Record<string, number>;
  unallocatedPayrollMinor: number;
  reconciliationAdjustmentMinor: number;   // negative "absorbed overtime" (§6.3)
  mappedPaidMinutes: number;
  scheduledPaidMinutes: number;
}

/** §6.3: allocate one person's entries for one period against their expected
 *  employment cost and scheduled paid minutes.
 *  - Overtime (salaried): recorded hours cost at standard rate so projects show
 *    true effort; a period-level negative reconciliation adjustment labelled
 *    "absorbed overtime" ties back to contractual payroll.
 *  - Scheduled paid hours with no entry become unallocated payroll, valued at
 *    the person's cost per paid hour. */
export function allocatePersonPeriod(args: {
  personId: string;
  period: string;
  entries: CostedEntry[];
  scheduledPaidMinutes: number;
  expectedEmploymentCostMinor: number;   // period employment cost per §6.2, pro-rated
  paidHourRateMinor: number;             // rate for valuing unallocated time
}): PersonPeriodAllocation {
  let projectLabour = 0;
  let nonProject = 0;
  const nonProjectByActivity: Record<string, number> = {};
  let mappedPaidMinutes = 0;

  for (const e of args.entries) {
    const bucket = bucketForActivity(e.activity);
    if (bucket === 'no_cost') continue;
    const cost = (e.minutes / 60) * e.paidHourRateMinor; // full precision until the end
    mappedPaidMinutes += e.minutes;
    if (bucket === 'project_labour') {
      projectLabour += cost;
    } else {
      nonProject += cost;
      nonProjectByActivity[e.activity.name] = (nonProjectByActivity[e.activity.name] ?? 0) + cost;
    }
  }

  const unmappedMinutes = Math.max(0, args.scheduledPaidMinutes - mappedPaidMinutes);
  const unallocated = (unmappedMinutes / 60) * args.paidHourRateMinor;

  const projectLabourMinor = roundHalfUp(projectLabour);
  const nonProjectPayrollMinor = roundHalfUp(nonProject);
  const unallocatedPayrollMinor = roundHalfUp(unallocated);

  // §6.3 overtime: allocation above expected employment cost is absorbed, so the
  // company P&L tells the truth about cash while projects tell the truth about effort.
  const allocated = projectLabourMinor + nonProjectPayrollMinor + unallocatedPayrollMinor;
  const reconciliationAdjustmentMinor = args.expectedEmploymentCostMinor - allocated;

  return {
    personId: args.personId,
    period: args.period,
    projectLabourMinor,
    nonProjectPayrollMinor,
    nonProjectByActivityMinor: Object.fromEntries(
      Object.entries(nonProjectByActivity).map(([k, v]) => [k, roundHalfUp(v)]),
    ),
    unallocatedPayrollMinor,
    reconciliationAdjustmentMinor,
    mappedPaidMinutes,
    scheduledPaidMinutes: args.scheduledPaidMinutes,
  };
}

export type TieOutStatus = 'green' | 'amber' | 'red';

export interface TieOutResult {
  expectedMinor: number;
  allocatedMinor: number;
  differenceMinor: number;
  differencePct: number;   // decimal
  status: TieOutStatus;
}

/** §6.3 computeTieOut: green within 0.5%, amber within 2%, red beyond.
 *  A red tie-out blocks period lock (R3). */
export function computeTieOut(args: {
  expectedEmploymentCostMinor: number;
  projectLabourMinor: number;
  nonProjectPayrollMinor: number;
  unallocatedPayrollMinor: number;
  reconciliationAdjustmentMinor: number;
}): TieOutResult {
  const allocated =
    args.projectLabourMinor +
    args.nonProjectPayrollMinor +
    args.unallocatedPayrollMinor +
    args.reconciliationAdjustmentMinor;
  const difference = allocated - args.expectedEmploymentCostMinor;
  const base = Math.abs(args.expectedEmploymentCostMinor);
  const pct = base === 0 ? (difference === 0 ? 0 : 1) : Math.abs(difference) / base;
  const status: TieOutStatus = pct <= 0.005 ? 'green' : pct <= 0.02 ? 'amber' : 'red';
  return {
    expectedMinor: args.expectedEmploymentCostMinor,
    allocatedMinor: allocated,
    differenceMinor: difference,
    differencePct: pct,
    status,
  };
}

/** Company-month tie-out across people: worst individual status wins (§6.7,
 *  asserted monthly with runTieOut). */
export function combineTieOuts(results: TieOutResult[]): TieOutResult {
  const expected = results.reduce((s, r) => s + r.expectedMinor, 0);
  const allocated = results.reduce((s, r) => s + r.allocatedMinor, 0);
  const difference = allocated - expected;
  const pct = expected === 0 ? 0 : Math.abs(difference) / Math.abs(expected);
  const rank: Record<TieOutStatus, number> = { green: 0, amber: 1, red: 2 };
  const worst = results.reduce<TieOutStatus>(
    (acc, r) => (rank[r.status] > rank[acc] ? r.status : acc),
    'green',
  );
  return { expectedMinor: expected, allocatedMinor: allocated, differenceMinor: difference, differencePct: pct, status: worst };
}
