// Metric assembly: live database in, @oe/finance out. No formula lives here;
// this module only gathers inputs and calls the engine (R1). Section numbers
// cite the master prompt. Reads the working db (not static fixtures) so fresh
// workspaces and newly logged hours flow into every figure.

import {
  actInternalCostMinor, estInternalCostMinor, grossProfitMinor, grossMargin,
  profitPerInternalHourMinor, effectiveHourlyRevenueMinor, budgetConsumedPct,
  hoursConsumedPct, burnFactor, etcMinor, fcacMinor, forecastGrossProfitMinor,
  forecastGrossMargin, thirdPartyMargin, committedTotalMinor, accruedForPeriodMinor,
  attributionShares, monthlyOverheadMinor, companyMonth, recognisedRevenueMinor,
  Release1Recognition, roundHalfUp,
  type ExternalAgreementInput, type RevenueItemInput, type OverheadLine,
} from '@oe/finance';
import { RATE_CARD, HOURLY_UNITS_BY_PERIOD } from '@oe/fixtures';
import type { Project, ExternalAgreement, RevenueItem, YearMonth } from '@oe/domain';
import { db, activeMonths } from './db';
import { todayStr } from './settings';
import {
  costedProjectEntries, projectEntries, computeMonthlyTieOuts, paidRateOn,
  activityById, scheduledMinutesOn,
} from './timeMath';

/** Demo FX for aggregating USD projects into SGD company views.
 *  docs/DECISIONS.md #4: fixed demo rate, labelled in the UI. */
export const DEMO_USD_SGD = 1.35;

export function toSgd(amountMinor: number, currency: string): number {
  return currency === 'USD' ? roundHalfUp(amountMinor * DEMO_USD_SGD) : amountMinor;
}

const MS_PER_DAY = 86_400_000;
export function epochDay(date: string): number {
  return Date.UTC(
    Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)),
  ) / MS_PER_DAY;
}

// ---------------------------------------------------------------------------
// External agreements → finance inputs (§6.4)
// ---------------------------------------------------------------------------

export function toFinanceAgreement(a: ExternalAgreement): ExternalAgreementInput {
  return {
    id: a.id,
    model: a.model,
    state: a.status === 'draft' ? 'planned' : 'committed',
    feeMinor: a.feeMinor,
    rateMinor: a.rateMinor,
    unitsByPeriod: HOURLY_UNITS_BY_PERIOD[a.id],
    sgdRateAtCommitment: a.sgdRateAtCommitment,
    accrualPolicy: a.accrualPolicy,
    milestones: a.milestones?.map((m) => ({
      name: m.name,
      amountMinor: m.amountMinor,
      phaseId: m.phaseId,
      status: m.status,
      acceptedPeriod: m.acceptedAt?.slice(0, 7),
    })),
    startPeriod: a.startDate.slice(0, 7),
    endPeriod: a.endDate?.slice(0, 7),
    completedPeriod: a.status === 'completed' ? a.endDate?.slice(0, 7) : undefined,
    attribution:
      a.attribution.type === 'single_project'
        ? { type: 'single_project', projectId: a.projectIds[0]! }
        : a.attribution.type === 'phase'
          ? { type: 'phase', phaseId: a.attribution.phaseId, projectId: a.projectIds[0]! }
          : a.attribution.type === 'percentage'
            ? { type: 'percentage', splits: a.attribution.splits }
            : { type: 'recorded_time' },
  };
}

function shareFor(a: ExternalAgreement, projectId: string): number {
  const shares = attributionShares(toFinanceAgreement(a));
  return shares[projectId] ?? 0;
}

function agreementsFor(projectId: string): ExternalAgreement[] {
  return db.externalAgreements.filter((a) => a.projectIds.includes(projectId));
}

/** §6.4: for forecast at completion, committed fees count in full from signing. */
export function externalCommittedMinor(projectId: string): number {
  return agreementsFor(projectId).reduce(
    (s, a) => s + roundHalfUp(committedTotalMinor(toFinanceAgreement(a)) * shareFor(a, projectId)),
    0,
  );
}

/** §6.4 period attribution for company monthly views. */
export function externalAccruedMinor(projectId: string, period: YearMonth): number {
  return agreementsFor(projectId).reduce(
    (s, a) => s + roundHalfUp(accruedForPeriodMinor(toFinanceAgreement(a), period) * shareFor(a, projectId)),
    0,
  );
}

export function expensesMinor(projectId: string, states: string[] = ['committed', 'actual']): number {
  return db.directExpenses
    .filter((x) => x.projectId === projectId && states.includes(x.state))
    .reduce((s, x) => s + roundHalfUp(x.amountMinor * x.sgdRate), 0);
}

// ---------------------------------------------------------------------------
// Revenue (§6.8)
// ---------------------------------------------------------------------------

function toRevenueInput(r: RevenueItem): RevenueItemInput {
  return {
    id: r.id,
    type: r.type,
    amountMinor: r.amountMinor,
    recognitionTrigger: r.recognitionTrigger,
    plannedPeriod: r.plannedDate.slice(0, 7),
    recognisedPeriod: r.recognisedAt?.slice(0, 7),
    weight: r.weight,
    startPeriod: r.startPeriod,
    endPeriod: r.endPeriod,
  };
}

const strategy = new Release1Recognition();

export function recognisedForProjectMonth(projectId: string, period: YearMonth): number {
  const items = db.revenueItems.filter((r) => r.projectId === projectId).map(toRevenueInput);
  return recognisedRevenueMinor(items, period, strategy);
}

export function recognisedToDate(projectId: string, through: YearMonth = todayStr().slice(0, 7)): number {
  return activeMonths().filter((m) => m <= through).reduce(
    (s, m) => s + recognisedForProjectMonth(projectId, m),
    0,
  );
}

// ---------------------------------------------------------------------------
// Project metrics (§6.5)
// ---------------------------------------------------------------------------

export interface ProjectMetrics {
  projectId: string;
  currency: string;
  totalApprovedFeeMinor: number;
  approvedVariationsMinor: number;
  actInternalCostMinor: number;
  actInternalHours: number;
  externalCommittedMinor: number;
  expensesActualMinor: number;
  actDirectCostMinor: number;
  recognisedToDateMinor: number;
  grossProfitMinor: number;
  grossMargin: number;
  profitPerInternalHourMinor: number;
  effectiveHourlyRevenueMinor: number;
  thirdPartyMargin: number;
  baselineDirectMinor?: number;
  baselineHours?: number;
  budgetConsumedPct?: number;
  hoursConsumedPct?: number;
  scheduleElapsedPct: number;
  fcacMinor?: number;
  forecastGrossProfitMinor?: number;
  forecastGrossMargin?: number;
  burnFactor?: number;
}

export function projectHours(projectId: string): number {
  return (
    projectEntries(projectId)
      .filter((e) => activityById(e.activityId)?.includedInProjectCosting)
      .reduce((s, e) => s + e.minutes, 0) / 60
  );
}

export function scheduleElapsedPct(p: Project): number {
  const span = epochDay(p.targetEndDate) - epochDay(p.startDate);
  if (span <= 0) return 1;
  const end = p.actualEndDate ?? todayStr();
  const raw = (Math.min(epochDay(end), epochDay(todayStr())) - epochDay(p.startDate)) / span;
  return Math.min(1, Math.max(0, raw));
}

/** Baseline hours for a project: the frozen baseline when present, else the
 *  sum of its phases' estimated hours (works for newly created projects too). */
function baselineHoursFor(p: Project): number | undefined {
  if (p.baseline) return p.baseline.totals.estHours;
  const phases = db.phases.filter((ph) => ph.projectId === p.id);
  if (phases.length === 0) return undefined;
  const total = phases.reduce(
    (s, ph) => s + Object.values(ph.estHoursByRole).reduce((a, h) => a + (h ?? 0), 0),
    0,
  );
  return total > 0 ? total : undefined;
}

function baselineInternalCostFor(p: Project): number | undefined {
  if (p.baseline) return p.baseline.totals.estInternalCostMinor;
  const phases = db.phases.filter((ph) => ph.projectId === p.id);
  if (phases.length === 0) return undefined;
  const byRole: Record<string, number> = {};
  for (const ph of phases) {
    for (const [role, h] of Object.entries(ph.estHoursByRole)) {
      byRole[role] = (byRole[role] ?? 0) + (h ?? 0);
    }
  }
  try {
    return estInternalCostMinor(byRole, RATE_CARD);
  } catch {
    return undefined;
  }
}

export function computeProjectMetrics(p: Project): ProjectMetrics {
  const approvedVariations = db.variations
    .filter((v) => v.projectId === p.id && v.status === 'approved')
    .reduce((s, v) => s + v.feeDeltaMinor, 0);
  const totalApprovedFee = p.contractValueMinor + approvedVariations;

  const internal = actInternalCostMinor(costedProjectEntries(p.id));
  const hours = projectHours(p.id);
  const external = externalCommittedMinor(p.id);
  const expenses = expensesMinor(p.id);
  const direct = internal + external + expenses;
  const recognised = recognisedToDate(p.id);
  const gp = grossProfitMinor(recognised, direct);
  const elapsed = scheduleElapsedPct(p);

  const baselineHours = baselineHoursFor(p);
  const baselineDirect = p.baseline?.totals.estDirectCostMinor;

  let fcac: number | undefined;
  let bf: number | undefined;
  const isOpen = ['active', 'planning', 'on_hold'].includes(p.status);
  if (isOpen && baselineHours && baselineHours > 0) {
    bf = burnFactor(hours, Math.max(elapsed, 0.05), baselineHours);
    const remainingHours = Math.max(0, baselineHours - hours);
    const baseInternal = baselineInternalCostFor(p);
    const blendedRate = baseInternal && baselineHours ? baseInternal / baselineHours : 0;
    const plannedExpenses = expensesMinor(p.id, ['planned']);
    const etc = etcMinor(
      [{ remainingEstHours: remainingHours, burnFactor: bf, blendedRateMinor: blendedRate }],
      0,
      plannedExpenses,
    );
    fcac = fcacMinor(direct, etc);
  }

  return {
    projectId: p.id,
    currency: p.currency,
    totalApprovedFeeMinor: totalApprovedFee,
    approvedVariationsMinor: approvedVariations,
    actInternalCostMinor: internal,
    actInternalHours: hours,
    externalCommittedMinor: external,
    expensesActualMinor: expenses,
    actDirectCostMinor: direct,
    recognisedToDateMinor: recognised,
    grossProfitMinor: gp,
    grossMargin: grossMargin(gp, recognised),
    profitPerInternalHourMinor: profitPerInternalHourMinor(gp, hours),
    effectiveHourlyRevenueMinor: effectiveHourlyRevenueMinor(recognised, hours),
    thirdPartyMargin: thirdPartyMargin({
      revenueMinor: recognised || totalApprovedFee,
      externalCostMinor: external,
      expenseMinor: expenses,
    }),
    baselineDirectMinor: baselineDirect,
    baselineHours,
    budgetConsumedPct: baselineDirect ? budgetConsumedPct(direct, baselineDirect) : undefined,
    hoursConsumedPct: baselineHours ? hoursConsumedPct(hours, baselineHours) : undefined,
    scheduleElapsedPct: elapsed,
    fcacMinor: fcac,
    forecastGrossProfitMinor: fcac !== undefined ? forecastGrossProfitMinor(totalApprovedFee, fcac) : undefined,
    forecastGrossMargin: fcac !== undefined ? forecastGrossMargin(totalApprovedFee, fcac) : undefined,
    burnFactor: bf,
  };
}

// ---------------------------------------------------------------------------
// Phase-level estimate versus actual (§8.1)
// ---------------------------------------------------------------------------

export interface PhaseEva {
  phaseId: string;
  name: string;
  order: number;
  status: string;
  estHours: number;
  actHours: number;
  scheduleElapsedPct: number;
}

export function phaseEstimateVsActual(projectId: string): PhaseEva[] {
  const phases = db.phases.filter((ph) => ph.projectId === projectId);
  const entries = projectEntries(projectId).filter(
    (e) => activityById(e.activityId)?.includedInProjectCosting,
  );
  return phases
    .sort((a, b) => a.order - b.order)
    .map((ph) => {
      const est = Object.values(ph.estHoursByRole).reduce((s, h) => s + (h ?? 0), 0);
      const act = entries.filter((e) => e.phaseId === ph.id).reduce((s, e) => s + e.minutes, 0) / 60;
      const span = epochDay(ph.plannedEnd) - epochDay(ph.plannedStart);
      const elapsed = span <= 0
        ? 1
        : Math.min(1, Math.max(0, (epochDay(todayStr()) - epochDay(ph.plannedStart)) / span));
      return {
        phaseId: ph.id, name: ph.name, order: ph.order, status: ph.status,
        estHours: est, actHours: Math.round(act * 10) / 10, scheduleElapsedPct: elapsed,
      };
    });
}

// ---------------------------------------------------------------------------
// Company month (§6.7) and time allocation (§6.3 buckets)
// ---------------------------------------------------------------------------

// Tie-outs recompute when entries change; a tiny cache avoids repeated work
// within one render burst.
let tieOutsCacheKey = '';
let tieOutsCacheValue: ReturnType<typeof computeMonthlyTieOuts> = [];

export function tieOuts() {
  const key = `${db.timeEntries.length}:${db.timeEntries[db.timeEntries.length - 1]?.id ?? ''}`;
  if (key !== tieOutsCacheKey) {
    tieOutsCacheKey = key;
    tieOutsCacheValue = computeMonthlyTieOuts();
  }
  return tieOutsCacheValue;
}

export function companyMonthMetrics(period: YearMonth) {
  const tie = tieOuts().find((t) => t.period === period);
  const perPersonTie = tie?.perPerson ?? [];

  const labourByProject = new Map<string, number>();
  for (const e of db.timeEntries) {
    if (!e.projectId || !e.date.startsWith(period)) continue;
    if (!activityById(e.activityId)?.includedInProjectCosting) continue;
    const cost = (e.minutes / 60) * paidRateOn(e.personId, e.date);
    labourByProject.set(e.projectId, (labourByProject.get(e.projectId) ?? 0) + cost);
  }

  const perProject = db.projects
    .map((p) => {
      const labour = roundHalfUp(labourByProject.get(p.id) ?? 0);
      const external = externalAccruedMinor(p.id, period);
      const expenses = db.directExpenses
        .filter((x) => x.projectId === p.id && x.date.startsWith(period) && x.state !== 'planned')
        .reduce((s, x) => s + roundHalfUp(x.amountMinor * x.sgdRate), 0);
      const recognised = toSgd(recognisedForProjectMonth(p.id, period), p.currency);
      const gp = recognised - labour - external - expenses;
      return { projectId: p.id, name: p.name, labour, external, expenses, recognised, gp };
    })
    .filter((x) => x.labour || x.external || x.expenses || x.recognised);

  const recognisedRevenue = perProject.reduce((s, x) => s + x.recognised, 0);
  const projectGrossProfit = perProject.reduce((s, x) => s + x.gp, 0);

  const nonProject = perPersonTie.reduce((s, p) => s + p.allocation.nonProjectPayrollMinor, 0);
  const unallocated = perPersonTie.reduce((s, p) => s + p.allocation.unallocatedPayrollMinor, 0);
  const reconciliation = perPersonTie.reduce((s, p) => s + p.allocation.reconciliationAdjustmentMinor, 0);

  const overheadLines: OverheadLine[] = db.companyOverheads.map((l) => ({
    category: l.category,
    amountMinor: l.amountMinor,
    recurrence: l.recurrence,
    effectiveFrom: l.effectiveFrom,
    effectiveTo: l.effectiveTo,
    oneOffPeriod: l.oneOffPeriod,
  }));
  const overhead = monthlyOverheadMinor(overheadLines, period);

  const result = companyMonth({
    totalProjectGrossProfitMinor: projectGrossProfit,
    nonProjectPayrollMinor: nonProject,
    unallocatedPayrollMinor: unallocated,
    overheadMinor: overhead,
    reconciliationAdjustmentsMinor: reconciliation,
    recognisedRevenueMinor: recognisedRevenue,
  });

  const nonProjectByActivity: Record<string, number> = {};
  for (const p of perPersonTie) {
    for (const [name, v] of Object.entries(p.allocation.nonProjectByActivityMinor)) {
      nonProjectByActivity[name] = (nonProjectByActivity[name] ?? 0) + v;
    }
  }

  return {
    period,
    recognisedRevenueMinor: recognisedRevenue,
    perProject,
    projectGrossProfitMinor: projectGrossProfit,
    nonProjectPayrollMinor: nonProject,
    nonProjectByActivity,
    unallocatedPayrollMinor: unallocated,
    reconciliationMinor: reconciliation,
    overheadMinor: overhead,
    operatingProfitMinor: result.operatingProfitMinor,
    operatingMargin: result.operatingMargin,
    overheadCoverage: result.overheadCoverage,
    runningCostsMinor: result.runningCostsMinor,
    tieOut: tie?.combined ?? {
      expectedMinor: 0, allocatedMinor: 0, differenceMinor: 0, differencePct: 0, status: 'green' as const,
    },
    tieOutPerPerson: perPersonTie.map((p) => p.tieOut),
  };
}

export type CompanyMonthMetrics = ReturnType<typeof companyMonthMetrics>;

// ---------------------------------------------------------------------------
// Complimentary overtime lens (client direction, round F). The official day is
// 8 scheduled hours; hours mapped beyond it, and any hours on weekends or
// closed days, are intelligence the studio received with the team's
// compliments. They never enter official cost or profit (R2, §6): this lens
// values them separately so profitability reports can end with an honest
// acknowledgement of the gift.
// ---------------------------------------------------------------------------

export interface ProjectOvertime {
  minutes: number;
  /** Valued at each person's paid rate on the day, for scale only. */
  complimentaryValueMinor: number;
  byPerson: { personId: string; name: string; minutes: number; valueMinor: number }[];
}

export function projectOvertime(projectId: string): ProjectOvertime {
  // Overtime is a property of a person's day, not of a single entry: a day is
  // in overtime once the person's total costed project minutes pass their
  // schedule. The excess is attributed to this project by its share of the
  // day's project minutes.
  const acc = new Map<string, { minutes: number; valueMinor: number }>();

  const costedMinutes = (e: { activityId: string; minutes: number }) =>
    activityById(e.activityId)?.includedInProjectCosting ? e.minutes : 0;

  const personDays = new Map<string, Map<string, typeof db.timeEntries>>();
  for (const e of db.timeEntries) {
    if (!e.projectId) continue;
    const days = personDays.get(e.personId) ?? new Map();
    personDays.set(e.personId, days);
    const list = days.get(e.date) ?? [];
    list.push(e);
    days.set(e.date, list);
  }

  for (const [personId, days] of personDays) {
    for (const [date, entries] of days) {
      const dayTotal = entries.reduce((s, e) => s + costedMinutes(e), 0);
      if (dayTotal === 0) continue;
      const overtime = Math.max(0, dayTotal - scheduledMinutesOn(personId, date));
      if (overtime === 0) continue;
      const projectShare = entries
        .filter((e) => e.projectId === projectId)
        .reduce((s, e) => s + costedMinutes(e), 0);
      if (projectShare === 0) continue;
      const minutes = roundHalfUp(overtime * (projectShare / dayTotal));
      const valueMinor = roundHalfUp((minutes / 60) * paidRateOn(personId, date));
      const cur = acc.get(personId) ?? { minutes: 0, valueMinor: 0 };
      acc.set(personId, {
        minutes: cur.minutes + minutes,
        valueMinor: cur.valueMinor + valueMinor,
      });
    }
  }

  const byPerson = [...acc.entries()]
    .map(([personId, v]) => ({
      personId,
      name: db.people.find((p) => p.id === personId)?.name ?? personId,
      ...v,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    minutes: byPerson.reduce((s, p) => s + p.minutes, 0),
    complimentaryValueMinor: byPerson.reduce((s, p) => s + p.valueMinor, 0),
    byPerson,
  };
}
