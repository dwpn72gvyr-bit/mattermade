// packages/finance/src/pricing.ts
// §6.10 The pricing ladder, the three floors and the sensitivity levers.
// Mark-up is a pricing event (R9): it exists only here, never in recorded costs.

import { roundHalfUp } from './money';
import type { HoursByRole, RateCardMinor } from './projectMetrics';

export interface PricingInputs {
  estHoursByRole: HoursByRole;
  paidRatesMinor: RateCardMinor;        // ladder step 2 basis
  availableRatesMinor: RateCardMinor;   // ladder step 3, the leave-carrying floor
  externalCostMinor: number;            // step 4, at what OuterEdit pays
  externalMarkUpPct?: number;           // step 5, default 0.20
  expensesMinor: number;                // step 6
  contingencyPct?: number;              // step 7, default 0.10
  overheadPerProductiveHourMinor: number; // step 8 basis (analytical layer)
  targetGrossMarginPct: number;         // step 9, margin applied ON PRICE
}

export interface PriceLadder {
  estHours: number;                     // 1 effort
  internalCostMinor: number;            // 2
  loadedCheckMinor: number;             // 3
  externalCostMinor: number;            // 4
  externalSellMinor: number;            // 5
  expensesMinor: number;                // 6
  contingencyMinor: number;             // 7
  overheadRecoveryMinor: number;        // 8
  totalCostMinor: number;               // 2+4+6+7+8
  negotiationFloorMinor: number;        // 2+4+6+7: below this the project destroys cash
  minimumSafePriceMinor: number;        // floor + overhead recovery
  recommendedPriceMinor: number;        // totalCost ÷ (1 − targetGrossMarginPct)
}

/** §6.10: compute every layer of the ladder. A 50% target means price = 2 × cost
 *  because margin is applied on price, not on cost. */
export function priceLadder(inp: PricingInputs): PriceLadder {
  const markUp = inp.externalMarkUpPct ?? 0.2;
  const contingencyPct = inp.contingencyPct ?? 0.1;

  let estHours = 0;
  let internal = 0;
  let loaded = 0;
  for (const [role, hours] of Object.entries(inp.estHoursByRole)) {
    estHours += hours;
    const paid = inp.paidRatesMinor[role];
    const avail = inp.availableRatesMinor[role];
    if (paid === undefined || avail === undefined) throw new Error(`No rate for role ${role}`);
    internal += hours * paid;
    loaded += hours * avail;
  }

  const externalSell = inp.externalCostMinor * (1 + markUp);
  const contingency = contingencyPct * (internal + inp.externalCostMinor + inp.expensesMinor);
  const overheadRec = inp.overheadPerProductiveHourMinor * estHours;
  const totalCost = internal + inp.externalCostMinor + inp.expensesMinor + contingency + overheadRec;
  const negotiationFloor = internal + inp.externalCostMinor + inp.expensesMinor + contingency;

  const target = inp.targetGrossMarginPct;
  if (target >= 1) throw new Error('Target margin must be below 100%');
  const recommended = totalCost / (1 - target);

  return {
    estHours,
    internalCostMinor: roundHalfUp(internal),
    loadedCheckMinor: roundHalfUp(loaded),
    externalCostMinor: roundHalfUp(inp.externalCostMinor),
    externalSellMinor: roundHalfUp(externalSell),
    expensesMinor: roundHalfUp(inp.expensesMinor),
    contingencyMinor: roundHalfUp(contingency),
    overheadRecoveryMinor: roundHalfUp(overheadRec),
    totalCostMinor: roundHalfUp(totalCost),
    negotiationFloorMinor: roundHalfUp(negotiationFloor),
    minimumSafePriceMinor: roundHalfUp(negotiationFloor + overheadRec),
    recommendedPriceMinor: roundHalfUp(recommended),
  };
}

export interface QuoteOutcome {
  quotedPriceMinor: number;
  grossProfitMinor: number;        // against direct costs (no overhead recovery)
  grossMargin: number;             // decimal
  profitPerHourMinor: number;
  breachesNegotiationFloor: boolean;
  breachesMinimumSafe: boolean;    // hard confirmation required (§6.10 discount lever)
}

/** Evaluate an actual quoted price against the ladder. */
export function evaluateQuote(ladder: PriceLadder, quotedPriceMinor: number): QuoteOutcome {
  const gp = quotedPriceMinor - ladder.negotiationFloorMinor;
  return {
    quotedPriceMinor,
    grossProfitMinor: gp,
    grossMargin: quotedPriceMinor === 0 ? 0 : gp / quotedPriceMinor,
    profitPerHourMinor: ladder.estHours === 0 ? 0 : gp / ladder.estHours,
    breachesNegotiationFloor: quotedPriceMinor < ladder.negotiationFloorMinor,
    breachesMinimumSafe: quotedPriceMinor < ladder.minimumSafePriceMinor,
  };
}

/** §6.10 sensitivity lever: discount, absorbed entirely by margin. */
export function applyDiscount(ladder: PriceLadder, discountPct: number): QuoteOutcome {
  const price = roundHalfUp(ladder.recommendedPriceMinor * (1 - discountPct));
  return evaluateQuote(ladder, price);
}

/** §6.10 sensitivity lever: additional revisions, default +12% of the affected
 *  phase's hours per round beyond the three included. */
export function additionalRevisionHours(
  affectedPhaseHours: number,
  extraRounds: number,
  pctPerRound = 0.12,
): number {
  return affectedPhaseHours * pctPerRound * Math.max(0, extraRounds);
}

/** §6.10 sensitivity lever: duration extension adds the monthly project
 *  management run rate and scales time-based external costs. */
export function durationExtensionCostMinor(args: {
  extraMonths: number;
  monthlyPmRunRateMinor: number;
  monthlyTimeBasedExternalMinor: number;
}): number {
  return roundHalfUp(
    args.extraMonths * (args.monthlyPmRunRateMinor + args.monthlyTimeBasedExternalMinor),
  );
}

/** §6.10 sensitivity lever: delayed client decisions = duration extension plus a
 *  context-switching factor applied to remaining phase hours. */
export function delayedDecisionHours(remainingPhaseHours: number, contextSwitchFactor = 0.08): number {
  return remainingPhaseHours * contextSwitchFactor;
}

export type ScenarioKey = 'best' | 'expected' | 'high_effort' | 'reduced_scope';

export interface Scenario {
  key: ScenarioKey;
  label: string;
  ladder: PriceLadder;
  quote: QuoteOutcome;
  durationMonths: number;
  profitPerMonthMinor: number;
}

/** §6.10 scenarios: four sharing one structure; Expected is always the approval
 *  baseline. */
export function buildScenario(
  key: ScenarioKey,
  label: string,
  inputs: PricingInputs,
  quotedPriceMinor: number,
  durationMonths: number,
): Scenario {
  const ladder = priceLadder(inputs);
  const quote = evaluateQuote(ladder, quotedPriceMinor);
  return {
    key,
    label,
    ladder,
    quote,
    durationMonths,
    profitPerMonthMinor:
      durationMonths === 0 ? 0 : roundHalfUp(quote.grossProfitMinor / durationMonths),
  };
}
