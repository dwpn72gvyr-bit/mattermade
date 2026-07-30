// packages/finance/src/projectMetrics.ts
// §6.5 Project formulas F1-F18 plus the legacy third-party margin lens.
// B denotes the frozen baseline plus approved variations (R4).

import { roundHalfUp } from './money';

export interface HoursByRole {
  [roleKey: string]: number;
}

export interface RateCardMinor {
  [roleKey: string]: number;   // cost per paid hour, minor units (R8)
}

/** F1: estInternalCost = Σ estHours[role] × costPerPaidHour(role, estimateDate). §6.5 */
export function estInternalCostMinor(estHours: HoursByRole, rates: RateCardMinor): number {
  let total = 0;
  for (const [role, hours] of Object.entries(estHours)) {
    const rate = rates[role];
    if (rate === undefined) throw new Error(`No cost rate for role ${role}`);
    total += hours * rate;
  }
  return roundHalfUp(total);
}

export interface CostedProjectEntry {
  minutes: number;
  paidHourRateMinor: number;   // resolved on the entry's date (R8)
  includedInProjectCosting: boolean;
}

/** F2: actInternalCost = Σ entry.minutes/60 × costPerPaidHour(person, date)
 *  over entries where activity.includedInProjectCosting. §6.5 */
export function actInternalCostMinor(entries: CostedProjectEntry[]): number {
  let total = 0;
  for (const e of entries) {
    if (!e.includedInProjectCosting) continue;
    total += (e.minutes / 60) * e.paidHourRateMinor;
  }
  return roundHalfUp(total);
}

/** F4a: estDirectCost = F1 + F3a + estExpenses + contingency. §6.5 */
export function estDirectCostMinor(args: {
  estInternalMinor: number; estExternalMinor: number;
  estExpenseMinor: number; contingencyMinor: number;
}): number {
  return args.estInternalMinor + args.estExternalMinor + args.estExpenseMinor + args.contingencyMinor;
}

/** F4b: actDirectCost = F2 + F3b + actExpenses. §6.5 */
export function actDirectCostMinor(args: {
  actInternalMinor: number; actExternalMinor: number; actExpenseMinor: number;
}): number {
  return args.actInternalMinor + args.actExternalMinor + args.actExpenseMinor;
}

/** F5: grossProfit = revenue − directCost. §6.5 (F5a estimate, F5b actual) */
export function grossProfitMinor(revenueMinor: number, directCostMinor: number): number {
  return revenueMinor - directCostMinor;
}

/** F6: grossMargin = grossProfit ÷ revenue, as a decimal. §6.5 */
export function grossMargin(grossProfitMinor_: number, revenueMinor: number): number {
  if (revenueMinor === 0) return 0;
  return grossProfitMinor_ / revenueMinor;
}

/** F7: effectiveHourlyRevenue = recognisedRevenue ÷ actInternalHours (minor/hr). §6.5 */
export function effectiveHourlyRevenueMinor(revenueMinor: number, actInternalHours: number): number {
  if (actInternalHours === 0) return 0;
  return revenueMinor / actInternalHours;
}

/** F8: profitPerInternalHour = actGrossProfit ÷ actInternalHours (minor/hr). §6.5 */
export function profitPerInternalHourMinor(grossProfitMinor_: number, actInternalHours: number): number {
  if (actInternalHours === 0) return 0;
  return grossProfitMinor_ / actInternalHours;
}

/** F9: budgetConsumedPct = actDirectCost ÷ estDirectCost(B), decimal. §6.5 */
export function budgetConsumedPct(actDirectMinor: number, baselineDirectMinor: number): number {
  if (baselineDirectMinor === 0) return 0;
  return actDirectMinor / baselineDirectMinor;
}

/** F10: hoursConsumedPct = actInternalHours ÷ estInternalHours(B), decimal. §6.5 */
export function hoursConsumedPct(actHours: number, baselineHours: number): number {
  if (baselineHours === 0) return 0;
  return actHours / baselineHours;
}

/** F11 burn factor: (actHours ÷ progressPct) ÷ (estHours ÷ 1.0), clamped [0.5, 3.0].
 *  Lead may override per phase with a recorded reason. §6.5 */
export function burnFactor(actHours: number, progressPct: number, estHours: number): number {
  if (progressPct <= 0 || estHours <= 0) return 1;
  const raw = actHours / progressPct / estHours;
  return Math.min(3.0, Math.max(0.5, raw));
}

export interface PhaseEtcInput {
  remainingEstHours: number;
  burnFactor: number;          // from burnFactor() or lead override
  blendedRateMinor: number;    // cost per paid hour for the remaining mix
}

/** F11: ETC = Σ(remainingEstHours × burnFactor × rate)
 *  + remainingCommittedExternal + remainingPlannedExpenses. §6.5 */
export function etcMinor(
  phases: PhaseEtcInput[],
  remainingCommittedExternalMinor: number,
  remainingPlannedExpensesMinor: number,
): number {
  const labour = phases.reduce(
    (s, p) => s + p.remainingEstHours * p.burnFactor * p.blendedRateMinor, 0);
  return roundHalfUp(labour) + remainingCommittedExternalMinor + remainingPlannedExpensesMinor;
}

/** F12: FCAC = actDirectCost + ETC. §6.5 */
export function fcacMinor(actDirectMinor: number, etcMinor_: number): number {
  return actDirectMinor + etcMinor_;
}

/** F13a/F13b: forecast gross profit and margin against total approved fee. §6.5 */
export function forecastGrossProfitMinor(totalApprovedFeeMinor: number, fcac: number): number {
  return totalApprovedFeeMinor - fcac;
}
export function forecastGrossMargin(totalApprovedFeeMinor: number, fcac: number): number {
  if (totalApprovedFeeMinor === 0) return 0;
  return (totalApprovedFeeMinor - fcac) / totalApprovedFeeMinor;
}

/** F14: eacVariance = FCAC − estDirectCost(B). §6.5 */
export function eacVarianceMinor(fcac: number, baselineDirectMinor: number): number {
  return fcac - baselineDirectMinor;
}

/** F16: unbilledEffort = T&M unbilled hours × sellRate
 *  + fixed-fee out-of-scope hours with no variation × sellRate. §6.5 */
export function unbilledEffortMinor(args: {
  tmUnbilledHours?: { hours: number; sellRateMinor: number }[];
  outOfScopeHours?: { hours: number; sellRateMinor: number }[];
}): number {
  const tm = (args.tmUnbilledHours ?? []).reduce((s, h) => s + h.hours * h.sellRateMinor, 0);
  const oos = (args.outOfScopeHours ?? []).reduce((s, h) => s + h.hours * h.sellRateMinor, 0);
  return roundHalfUp(tm + oos);
}

/** F18: contributionAfterOH = actGrossProfit − overheadPerProductiveHour × actInternalHours.
 *  ANALYTICAL LENS ONLY; every rendering carries the "analytical view" label (§6.6). §6.5 */
export function contributionAfterOverheadMinor(args: {
  actGrossProfitMinor: number;
  overheadPerProductiveHourMinor: number;
  actInternalHours: number;
}): number {
  return roundHalfUp(
    args.actGrossProfitMinor - args.overheadPerProductiveHourMinor * args.actInternalHours,
  );
}

/** Legacy display lens (§6.5): thirdPartyMargin =
 *  (revenue − externalCosts − expenses − contingency) ÷ revenue.
 *  OuterEdit's historic "Margin 1", target band 60-70%. Worked example E fixes
 *  the expenses-inclusive reading: (250,000 − 95,000 − 25,000) ÷ 250,000 = 52%. */
export function thirdPartyMargin(args: {
  revenueMinor: number;
  externalCostMinor: number;
  expenseMinor: number;
  contingencyMinor?: number;
}): number {
  if (args.revenueMinor === 0) return 0;
  return (
    (args.revenueMinor - args.externalCostMinor - args.expenseMinor - (args.contingencyMinor ?? 0)) /
    args.revenueMinor
  );
}

export function totalHours(hoursByRole: HoursByRole): number {
  return Object.values(hoursByRole).reduce((s, h) => s + h, 0);
}
