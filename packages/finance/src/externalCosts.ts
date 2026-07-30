// packages/finance/src/externalCosts.ts
// §6.4 External cost logic: three states (planned, committed, actual), seven
// commercial models, forecast-vs-period distinction, FX capture. External costs
// record what OuterEdit pays; mark-up is a pricing event only (R9).

import { roundHalfUp } from './money';

export type ExternalModel =
  | 'hourly' | 'daily' | 'monthly_retainer' | 'fixed_project'
  | 'fixed_phase' | 'fixed_deliverable' | 'milestone';

export type ExternalState = 'planned' | 'committed' | 'actual';
export type AccrualPolicy = 'milestone' | 'straight_line' | 'on_completion';

export interface ExternalMilestone {
  name: string;
  amountMinor: number;
  phaseId?: string;
  status: 'pending' | 'accepted';
  acceptedPeriod?: string;   // YYYY-MM
}

export interface ExternalAgreementInput {
  id: string;
  model: ExternalModel;
  state: ExternalState;
  feeMinor?: number;          // fixed models and retainer monthly fee
  rateMinor?: number;         // hourly/daily rate
  unitsByPeriod?: Record<string, number>;  // hours or days worked per YYYY-MM
  sgdRateAtCommitment: number;             // 1 for SGD (§6.4 currency)
  accrualPolicy: AccrualPolicy;
  milestones?: ExternalMilestone[];
  startPeriod: string;        // YYYY-MM
  endPeriod?: string;         // YYYY-MM; required for straight_line accrual
  completedPeriod?: string;   // set when work concluded
  attribution:
    | { type: 'single_project'; projectId: string }
    | { type: 'percentage'; splits: { projectId: string; pct: number }[] }
    | { type: 'recorded_time' }
    | { type: 'phase'; phaseId: string; projectId: string };
}

function periodsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number) as [number, number];
  const [ey, em] = to.split('-').map(Number) as [number, number];
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** §6.4 total committed value in SGD minor units. For FORECAST AT COMPLETION a
 *  committed fixed fee counts in full from the day it is signed. */
export function committedTotalMinor(a: ExternalAgreementInput): number {
  const fx = a.sgdRateAtCommitment;
  switch (a.model) {
    case 'hourly':
    case 'daily': {
      const units = Object.values(a.unitsByPeriod ?? {}).reduce((s, u) => s + u, 0);
      return roundHalfUp(units * (a.rateMinor ?? 0) * fx);
    }
    case 'monthly_retainer': {
      const months = a.endPeriod ? periodsBetween(a.startPeriod, a.endPeriod).length : 1;
      return roundHalfUp((a.feeMinor ?? 0) * months * fx);
    }
    case 'milestone':
      return roundHalfUp((a.milestones ?? []).reduce((s, m) => s + m.amountMinor, 0) * fx);
    default:
      return roundHalfUp((a.feeMinor ?? 0) * fx);
  }
}

/** §6.4 PERIOD attribution: what this agreement accrues in a given YYYY-MM.
 *  A freelancer finishing early changes no cost; remaining accrual simply
 *  recognises on completion. */
export function accruedForPeriodMinor(a: ExternalAgreementInput, period: string): number {
  const fx = a.sgdRateAtCommitment;
  switch (a.model) {
    case 'hourly':
    case 'daily': {
      const units = a.unitsByPeriod?.[period] ?? 0;
      return roundHalfUp(units * (a.rateMinor ?? 0) * fx);
    }
    case 'monthly_retainer': {
      const inWindow =
        a.startPeriod <= period && (a.endPeriod === undefined || period <= a.endPeriod);
      return inWindow ? roundHalfUp((a.feeMinor ?? 0) * fx) : 0;
    }
    case 'milestone': {
      const accepted = (a.milestones ?? []).filter((m) => m.acceptedPeriod === period);
      return roundHalfUp(accepted.reduce((s, m) => s + m.amountMinor, 0) * fx);
    }
    default: {
      // fixed_project | fixed_phase | fixed_deliverable per accrual policy
      const total = (a.feeMinor ?? 0) * fx;
      if (a.accrualPolicy === 'milestone') {
        const accepted = (a.milestones ?? []).filter((m) => m.acceptedPeriod === period);
        return roundHalfUp(accepted.reduce((s, m) => s + m.amountMinor, 0) * fx);
      }
      if (a.accrualPolicy === 'on_completion') {
        return a.completedPeriod === period ? roundHalfUp(total) : 0;
      }
      // straight_line across start..end (or completion when it arrives earlier)
      const end = a.completedPeriod && a.completedPeriod < (a.endPeriod ?? a.completedPeriod)
        ? a.completedPeriod
        : a.endPeriod ?? a.startPeriod;
      const months = periodsBetween(a.startPeriod, end);
      if (!months.includes(period)) return 0;
      const perMonth = total / months.length;
      // Last month takes the rounding remainder so the total ties exactly.
      const idx = months.indexOf(period);
      if (idx === months.length - 1) {
        const priorSum = roundHalfUp(perMonth) * (months.length - 1);
        return roundHalfUp(total) - priorSum;
      }
      return roundHalfUp(perMonth);
    }
  }
}

/** §6.4 project attribution shares (decimal per projectId). recorded_time
 *  shares are resolved by the caller from actual entries and passed in. */
export function attributionShares(
  a: ExternalAgreementInput,
  recordedTimeShares?: Record<string, number>,
): Record<string, number> {
  switch (a.attribution.type) {
    case 'single_project':
      return { [a.attribution.projectId]: 1 };
    case 'phase':
      return { [a.attribution.projectId]: 1 };
    case 'percentage':
      return Object.fromEntries(a.attribution.splits.map((s) => [s.projectId, s.pct]));
    case 'recorded_time':
      return recordedTimeShares ?? {};
  }
}

/** §6.4 FX: capture SGD rate at commitment and again at invoice; the difference
 *  posts to a company FX overhead line, never to the project. */
export function fxDifferenceMinor(args: {
  foreignAmountMinor: number;
  sgdRateAtCommitment: number;
  sgdRateAtInvoice: number;
}): number {
  return roundHalfUp(
    args.foreignAmountMinor * (args.sgdRateAtInvoice - args.sgdRateAtCommitment),
  );
}
