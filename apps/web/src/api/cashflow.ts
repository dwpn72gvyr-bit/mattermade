// Delivery and money-in view (client direction, round G). One place that
// answers: what are we working on, when does the money arrive, how many hours
// have we spent against the plan, and what is each project actually earning.
// Prospective work sits underneath, so the same questions can be asked of the
// leads we have not won yet.
//
// No formula lives here. Project figures come from metrics.ts, which calls the
// finance engine (R1). This module gathers, sorts and gates.

import type { Project } from '@oe/domain';
import { call } from './transport';
import { db, newId, type Lead, type PaymentTranche, type TrancheStatus } from './db';
import { hasModule, todayStr } from './settings';
import type { DemoAccount } from './demoAccounts';
import { computeProjectMetrics, projectHours, toSgd } from './metrics';
import { phaseEstimateVsActual } from './metrics';

const ACTIVE_STATUSES = ['planning', 'active', 'delivery', 'in_delivery', 'closing'];

export function canSeeDelivery(account: DemoAccount): boolean {
  return !account.isExternal &&
    ['finance_admin', 'leadership', 'super_admin', 'ops_admin'].some((r) => account.roles.includes(r));
}

/** Only finance and the super admin move money statuses about, and only they
 *  can overrule what Xero says (client direction, round G). */
export function canEditMoneyStatus(account: DemoAccount): boolean {
  return ['finance_admin', 'super_admin'].some((r) => account.roles.includes(r));
}

export type TrackState = 'on_track' | 'watch' | 'off_track' | 'too_early';

export interface DeliveryRow {
  projectId: string;
  code: string;
  name: string;
  clientName: string;
  status: string;
  currency: string;
  startDate: string;
  endDate: string;
  feeMinor: number;
  /** Hours the plan asked for, and hours the team has actually given. */
  plannedHours: number;
  actualHours: number;
  scheduleElapsedPct: number;
  /** What we expect to earn by the end, and what the books say so far. */
  expectedProfitMinor: number;
  expectedMargin: number;
  actualProfitMinor: number;
  actualMargin: number;
  track: TrackState;
  trackReason: string;
  tranches: PaymentTranche[];
  invoicedMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  overdueMinor: number;
}

export interface ProspectRow {
  leadId: string;
  name: string;
  organisation: string;
  stage: Lead['stage'];
  probability: number;
  estFeeMinor: number;
  /** Fee times probability: the honest weighted number. */
  weightedFeeMinor: number;
  estStartDate?: string;
  estEndDate?: string;
  /** Modelled on the studio's typical margin unless the lead says otherwise. */
  estProfitMinor: number;
  estMargin: number;
  tranches: PaymentTranche[];
  hot: boolean;
}

/** The studio's working assumption for a lead we have not costed yet. */
const ASSUMED_LEAD_MARGIN = 0.45;

function clientName(clientId: string): string {
  return db.clients.find((c) => c.id === clientId)?.name ?? 'Client';
}

function tranchesFor(key: { projectId?: string; leadId?: string }): PaymentTranche[] {
  return db.paymentTranches
    .filter((t) => (key.projectId ? t.projectId === key.projectId : t.leadId === key.leadId))
    .sort((a, b) => (a.expectedDate < b.expectedDate ? -1 : 1));
}

function plannedHoursFor(projectId: string): number {
  return phaseEstimateVsActual(projectId).reduce((s, p) => s + p.estHours, 0);
}

/** Are we where we said we would be? Hours against the plan, and the calendar
 *  against the hours. Words as well as colour, so nobody has to guess. */
function assessTrack(row: {
  plannedHours: number; actualHours: number; scheduleElapsedPct: number;
  expectedMargin: number; actualMargin: number;
}): { track: TrackState; trackReason: string } {
  const { plannedHours, actualHours, scheduleElapsedPct } = row;
  if (plannedHours <= 0) {
    return { track: 'too_early', trackReason: 'No hours planned yet, so there is nothing to compare against.' };
  }
  const hoursUsed = actualHours / plannedHours;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  if (scheduleElapsedPct < 0.1 && hoursUsed < 0.1) {
    return { track: 'too_early', trackReason: 'Just started. Too early to read.' };
  }
  const drift = hoursUsed - scheduleElapsedPct;
  if (hoursUsed > 1) {
    return {
      track: 'off_track',
      trackReason: `Past the planned hours: ${pct(hoursUsed)} of the plan used with ${pct(scheduleElapsedPct)} of the time gone.`,
    };
  }
  if (drift >= 0.15) {
    return {
      track: 'watch',
      trackReason: `Using hours faster than the calendar: ${pct(hoursUsed)} of the plan at ${pct(scheduleElapsedPct)} of the time.`,
    };
  }
  return {
    track: 'on_track',
    trackReason: `Hours and time are in step: ${pct(hoursUsed)} of the plan at ${pct(scheduleElapsedPct)} of the time.`,
  };
}

function deliveryRow(p: Project): DeliveryRow {
  const m = computeProjectMetrics(p);
  const plannedHours = plannedHoursFor(p.id);
  const actualHours = projectHours(p.id);
  const tranches = tranchesFor({ projectId: p.id });
  const today = todayStr();

  const paidMinor = tranches
    .filter((t) => t.status === 'paid')
    .reduce((s, t) => s + (t.actualAmountMinor ?? t.amountMinor), 0);
  const invoicedMinor = tranches
    .filter((t) => t.status === 'invoiced' || t.status === 'late')
    .reduce((s, t) => s + t.amountMinor, 0);
  const overdueMinor = tranches
    .filter((t) => t.status !== 'paid' && t.status !== 'written_off' && t.expectedDate < today)
    .reduce((s, t) => s + t.amountMinor, 0);
  const outstandingMinor = tranches
    .filter((t) => t.status !== 'paid' && t.status !== 'written_off')
    .reduce((s, t) => s + t.amountMinor, 0);

  const expectedProfitMinor = m.forecastGrossProfitMinor ?? m.grossProfitMinor;
  const expectedMargin = m.forecastGrossMargin ?? m.grossMargin;
  const track = assessTrack({
    plannedHours, actualHours, scheduleElapsedPct: m.scheduleElapsedPct,
    expectedMargin, actualMargin: m.grossMargin,
  });

  return {
    projectId: p.id,
    code: p.code,
    name: p.name,
    clientName: clientName(p.clientId),
    status: p.status,
    currency: p.currency,
    startDate: p.startDate,
    endDate: p.targetEndDate,
    feeMinor: m.totalApprovedFeeMinor,
    plannedHours,
    actualHours,
    scheduleElapsedPct: m.scheduleElapsedPct,
    expectedProfitMinor,
    expectedMargin,
    actualProfitMinor: m.grossProfitMinor,
    actualMargin: m.grossMargin,
    ...track,
    tranches,
    invoicedMinor,
    paidMinor,
    outstandingMinor,
    overdueMinor,
  };
}

function prospectRow(lead: Lead): ProspectRow {
  const tranches = tranchesFor({ leadId: lead.id });
  const fee = lead.estFeeMinor ?? 0;
  const probability = lead.probability ?? 0;
  const estProfitMinor = Math.round(fee * ASSUMED_LEAD_MARGIN);
  const dates = tranches.map((t) => t.expectedDate).sort();
  return {
    leadId: lead.id,
    name: lead.name,
    organisation: lead.organisation,
    stage: lead.stage,
    probability,
    estFeeMinor: fee,
    weightedFeeMinor: Math.round(fee * probability),
    estStartDate: dates[0],
    estEndDate: dates[dates.length - 1],
    estProfitMinor,
    estMargin: fee > 0 ? estProfitMinor / fee : 0,
    tranches,
    hot: lead.stage === 'bofu' || probability >= 0.6,
  };
}

/** Money we expect, month by month, from live projects and from prospects
 *  (prospects weighted by how likely they are). */
export interface CashflowMonth {
  month: string;
  projectExpectedMinor: number;
  projectReceivedMinor: number;
  prospectWeightedMinor: number;
}

function cashflowMonths(rows: DeliveryRow[], prospects: ProspectRow[]): CashflowMonth[] {
  const map = new Map<string, CashflowMonth>();
  const bucket = (month: string) => {
    const found = map.get(month);
    if (found) return found;
    const fresh = { month, projectExpectedMinor: 0, projectReceivedMinor: 0, prospectWeightedMinor: 0 };
    map.set(month, fresh);
    return fresh;
  };
  for (const r of rows) {
    for (const t of r.tranches) {
      if (t.status === 'written_off') continue;
      if (t.status === 'paid' && t.actualDate) {
        bucket(t.actualDate.slice(0, 7)).projectReceivedMinor += toSgd(t.actualAmountMinor ?? t.amountMinor, r.currency);
      } else {
        bucket(t.expectedDate.slice(0, 7)).projectExpectedMinor += toSgd(t.amountMinor, r.currency);
      }
    }
  }
  for (const p of prospects) {
    for (const t of p.tranches) {
      bucket(t.expectedDate.slice(0, 7)).prospectWeightedMinor += Math.round(t.amountMinor * p.probability);
    }
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

export interface DeliveryOverview {
  rows: DeliveryRow[];
  prospects: ProspectRow[];
  months: CashflowMonth[];
  totals: {
    feeMinor: number;
    paidMinor: number;
    outstandingMinor: number;
    overdueMinor: number;
    expectedProfitMinor: number;
    actualProfitMinor: number;
    weightedProspectMinor: number;
  };
  canEditMoney: boolean;
  seesProspects: boolean;
}

export function getDeliveryOverview(account: DemoAccount) {
  return call('cashflow.overview', (): DeliveryOverview => {
    if (!canSeeDelivery(account)) throw new Error('not_allowed');

    const rows = db.projects
      .filter((p) => ACTIVE_STATUSES.includes(p.status))
      .map(deliveryRow)
      .sort((a, b) => (a.endDate < b.endDate ? -1 : 1));

    const seesProspects = hasModule(account.userId, account.roles, 'bizdev');
    const prospects = seesProspects
      ? db.leads
        .filter((l) => ['tofu', 'mofu', 'bofu'].includes(l.stage))
        .map(prospectRow)
        .sort((a, b) => {
          if (a.hot !== b.hot) return a.hot ? -1 : 1;
          return b.weightedFeeMinor - a.weightedFeeMinor;
        })
      : [];

    const sum = (f: (r: DeliveryRow) => number) => rows.reduce((s, r) => s + toSgd(f(r), r.currency), 0);

    return {
      rows,
      prospects,
      months: cashflowMonths(rows, prospects),
      totals: {
        feeMinor: sum((r) => r.feeMinor),
        paidMinor: sum((r) => r.paidMinor),
        outstandingMinor: sum((r) => r.outstandingMinor),
        overdueMinor: sum((r) => r.overdueMinor),
        expectedProfitMinor: sum((r) => r.expectedProfitMinor),
        actualProfitMinor: sum((r) => r.actualProfitMinor),
        weightedProspectMinor: prospects.reduce((s, p) => s + p.weightedFeeMinor, 0),
      },
      canEditMoney: canEditMoneyStatus(account),
      seesProspects,
    };
  });
}

// ---------------------------------------------------------------------------
// Editing the schedule. Anyone who sets up a project can plan the tranches;
// only finance and the super admin say whether money has actually arrived.
// ---------------------------------------------------------------------------

export interface TrancheInput {
  id?: string;
  projectId?: string;
  leadId?: string;
  label: string;
  amountMinor: number;
  expectedDate: string;
  actualDate?: string;
  actualAmountMinor?: number;
  status?: TrancheStatus;
  note?: string;
  manualOverride?: boolean;
}

function canPlanTranches(account: DemoAccount): boolean {
  return ['super_admin', 'ops_admin', 'leadership', 'finance_admin'].some((r) => account.roles.includes(r));
}

export function getTranches(account: DemoAccount, key: { projectId?: string; leadId?: string }) {
  return call('cashflow.tranches', () => {
    if (!canPlanTranches(account)) throw new Error('not_allowed');
    return tranchesFor(key);
  });
}

export function saveTranche(account: DemoAccount, input: TrancheInput) {
  return call('cashflow.saveTranche', () => {
    if (!canPlanTranches(account)) throw new Error('not_allowed');
    if (!input.label.trim()) throw new Error('needs_label');
    if (!Number.isFinite(input.amountMinor) || input.amountMinor < 0) throw new Error('bad_amount');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expectedDate)) throw new Error('bad_date');

    const moneyFields = input.actualDate !== undefined || input.status !== undefined;
    if (moneyFields && !canEditMoneyStatus(account)) throw new Error('money_needs_finance');

    const now = new Date().toISOString();
    if (input.id) {
      const t = db.paymentTranches.find((x) => x.id === input.id);
      if (!t) throw new Error('not_found');
      Object.assign(t, {
        label: input.label.trim(),
        amountMinor: input.amountMinor,
        expectedDate: input.expectedDate,
        actualDate: input.actualDate,
        actualAmountMinor: input.actualAmountMinor,
        status: input.status ?? t.status,
        note: input.note,
        manualOverride: input.manualOverride ?? t.manualOverride,
        updatedAt: now,
        updatedBy: account.userId,
      });
      return t;
    }
    const tranche: PaymentTranche = {
      id: newId('tr'),
      projectId: input.projectId,
      leadId: input.leadId,
      label: input.label.trim(),
      amountMinor: input.amountMinor,
      expectedDate: input.expectedDate,
      actualDate: input.actualDate,
      actualAmountMinor: input.actualAmountMinor,
      status: input.status ?? 'expected',
      note: input.note,
      manualOverride: input.manualOverride,
      updatedAt: now,
      updatedBy: account.userId,
    };
    db.paymentTranches.push(tranche);
    return tranche;
  });
}

/** Move a tranche's payment status by hand. Used when Xero and the bank
 *  disagree, or when Xero is not connected at all. */
export function setTrancheStatus(
  account: DemoAccount,
  trancheId: string,
  status: TrancheStatus,
  opts: { actualDate?: string; actualAmountMinor?: number; note?: string } = {},
) {
  return call('cashflow.setStatus', () => {
    if (!canEditMoneyStatus(account)) throw new Error('money_needs_finance');
    const t = db.paymentTranches.find((x) => x.id === trancheId);
    if (!t) throw new Error('not_found');
    t.status = status;
    t.manualOverride = true;
    if (status === 'paid') {
      t.actualDate = opts.actualDate ?? todayStr();
      t.actualAmountMinor = opts.actualAmountMinor ?? t.actualAmountMinor ?? t.amountMinor;
    }
    if (status === 'expected' || status === 'invoiced') {
      t.actualDate = undefined;
      t.actualAmountMinor = undefined;
    }
    if (opts.note !== undefined) t.note = opts.note;
    t.updatedAt = new Date().toISOString();
    t.updatedBy = account.userId;
    return t;
  });
}

export function deleteTranche(account: DemoAccount, trancheId: string) {
  return call('cashflow.deleteTranche', () => {
    if (!canPlanTranches(account)) throw new Error('not_allowed');
    const i = db.paymentTranches.findIndex((x) => x.id === trancheId);
    if (i < 0) throw new Error('not_found');
    db.paymentTranches.splice(i, 1);
    return { ok: true };
  });
}
