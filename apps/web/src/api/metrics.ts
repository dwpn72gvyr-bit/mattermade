// Metric assembly: fixture data in, @oe/finance out. No formula lives here;
// this module only gathers inputs and calls the engine (R1). Section numbers
// cite the master prompt.

import {
  actInternalCostMinor, estInternalCostMinor, grossProfitMinor, grossMargin,
  profitPerInternalHourMinor, effectiveHourlyRevenueMinor, budgetConsumedPct,
  hoursConsumedPct, burnFactor, etcMinor, fcacMinor, forecastGrossProfitMinor,
  forecastGrossMargin, thirdPartyMargin, committedTotalMinor, accruedForPeriodMinor,
  attributionShares, monthlyOverheadMinor, companyMonth, recognisedRevenueMinor,
  Release1Recognition, roundHalfUp, computeTieOut, combineTieOuts,
  type ExternalAgreementInput, type RevenueItemInput, type OverheadLine,
} from '@oe/finance';
import {
  costedProjectEntries, projectEntries, computeMonthlyTieOuts, MONTHS,
  BASELINE_HOURS, RATE_CARD, HOURLY_UNITS_BY_PERIOD, FIXTURE_TODAY,
  ACTIVITY_BY_ID, epochDay, paidRateOn,
} from '@oe/fixtures';
import type { Project, ExternalAgreement, RevenueItem, YearMonth } from '@oe/domain';
import { db } from './db';

/** Demo FX for aggregating the one USD project into SGD company views.
 *  docs/DECISIONS.md #4: fixed demo rate, labelled in the UI. */
export const DEMO_USD_SGD = 1.35;

export function toSgd(amountMinor: number, currency: string): number {
  return currency === 'USD' ? roundHalfUp(amountMinor * DEMO_USD_SGD) : amountMinor;
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

export function recognisedToDate(projectId: string, through: YearMonth = FIXTURE_TODAY.slice(0, 7)): number {
  return MONTHS.filter((m) => m <= through).reduce(
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
  totalApprovedFeeMinor: number;      // F15: contract + approved variations
  approvedVariationsMinor: number;
  actInternalCostMinor: number;       // F2
  actInternalHours: number;
  externalCommittedMinor: number;     // F3b committed basis
  expensesActualMinor: number;
  actDirectCostMinor: number;         // F4b
  recognisedToDateMinor: number;
  grossProfitMinor: number;           // F5b
  grossMargin: number;                // F6
  profitPerInternalHourMinor: number; // F8
  effectiveHourlyRevenueMinor: number;// F7
  thirdPartyMargin: number;           // legacy lens
  baselineDirectMinor?: number;
  baselineHours?: number;
  budgetConsumedPct?: number;         // F9
  hoursConsumedPct?: number;          // F10
  scheduleElapsedPct: number;
  fcacMinor?: number;                 // F12
  forecastGrossProfitMinor?: number;  // F13a
  forecastGrossMargin?: number;       // F13b
  burnFactor?: number;
}

export function projectHours(projectId: string): number {
  return (
    projectEntries(projectId)
      .filter((e) => {
        const a = ACTIVITY_BY_ID[e.activityId];
        return a?.includedInProjectCosting;
      })
      .reduce((s, e) => s + e.minutes, 0) / 60
  );
}

export function scheduleElapsedPct(p: Project): number {
  const span = epochDay(p.targetEndDate) - epochDay(p.startDate);
  if (span <= 0) return 1;
  const end = p.actualEndDate ?? FIXTURE_TODAY;
  const raw = (Math.min(epochDay(end), epochDay(FIXTURE_TODAY)) - epochDay(p.startDate)) / span;
  return Math.min(1, Math.max(0, raw));
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

  const base = p.baseline;
  const baselineHours = base
    ? base.totals.estHours
    : BASELINE_HOURS[p.id]
      ? Object.values(BASELINE_HOURS[p.id]!).reduce((s, h) => s + (h ?? 0), 0)
      : undefined;
  const baselineDirect = base?.totals.estDirectCostMinor;

  // F11/F12 forecast for open projects: remaining baseline hours at the
  // observed burn, remaining committed external, remaining planned expenses.
  let fcac: number | undefined;
  let bf: number | undefined;
  const isOpen = ['active', 'planning', 'on_hold'].includes(p.status);
  if (isOpen && baselineHours && baselineHours > 0) {
    bf = burnFactor(hours, Math.max(elapsed, 0.05), baselineHours);
    const remainingHours = Math.max(0, baselineHours - hours);
    const blendedRate = baselineDirect && baselineHours
      ? (base ? base.totals.estInternalCostMinor : estInternalCostMinor(BASELINE_HOURS[p.id] as Record<string, number>, RATE_CARD)) / baselineHours
      : 0;
    const plannedExpenses = expensesMinor(p.id, ['planned']);
    const etc = etcMinor(
      [{ remainingEstHours: remainingHours, burnFactor: bf, blendedRateMinor: blendedRate }],
      0, // committed external already counted in full in direct (committed basis)
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
  const entries = projectEntries(projectId).filter((e) => {
    const a = ACTIVITY_BY_ID[e.activityId];
    return a?.includedInProjectCosting;
  });
  return phases
    .sort((a, b) => a.order - b.order)
    .map((ph) => {
      const est = Object.values(ph.estHoursByRole).reduce((s, h) => s + (h ?? 0), 0);
      const act = entries.filter((e) => e.phaseId === ph.id).reduce((s, e) => s + e.minutes, 0) / 60;
      const span = epochDay(ph.plannedEnd) - epochDay(ph.plannedStart);
      const elapsed = span <= 0
        ? 1
        : Math.min(1, Math.max(0, (epochDay(FIXTURE_TODAY) - epochDay(ph.plannedStart)) / span));
      return {
        phaseId: ph.id, name: ph.name, order: ph.order, status: ph.status,
        estHours: est, actHours: Math.round(act * 10) / 10, scheduleElapsedPct: elapsed,
      };
    });
}

// ---------------------------------------------------------------------------
// Company month (§6.7) and time allocation (§6.3 buckets)
// ---------------------------------------------------------------------------

const tieOutsCache = computeMonthlyTieOuts();

export function companyMonthMetrics(period: YearMonth) {
  const tie = tieOutsCache.find((t) => t.period === period)!;

  // Per-project labour costed in the month (F2 restricted to the period).
  const labourByProject = new Map<string, number>();
  for (const e of db.timeEntries) {
    if (!e.projectId || !e.date.startsWith(period)) continue;
    const a = ACTIVITY_BY_ID[e.activityId];
    if (!a?.includedInProjectCosting) continue;
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

  const nonProject = tie.perPerson.reduce((s, p) => s + p.allocation.nonProjectPayrollMinor, 0);
  const unallocated = tie.perPerson.reduce((s, p) => s + p.allocation.unallocatedPayrollMinor, 0);
  const reconciliation = tie.perPerson.reduce((s, p) => s + p.allocation.reconciliationAdjustmentMinor, 0);

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
  for (const p of tie.perPerson) {
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
    tieOut: tie.combined,
    tieOutPerPerson: tie.perPerson.map((p) => p.tieOut),
  };
}

export type CompanyMonthMetrics = ReturnType<typeof companyMonthMetrics>;

export { MONTHS, FIXTURE_TODAY, tieOutsCache };
