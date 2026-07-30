// packages/policy/src/masking.ts
// §7.1 aggregation floor and R6 server-side masking. Any aggregate that would
// reveal an individual by subtraction must contain at least 3 people, else it
// renders as a range or rolls up a level. For project budget views the floor
// is 2 contributors, with a percentage-only fallback below that. The
// serialiser STRIPS forbidden fields: a masked value never reaches the client
// in any form, including inside aggregates that would reveal it by subtraction.

import type { Actor, IsoDate } from './roles';
import { can, type Decision, type MaskKind, type Resource } from './can';

export interface ContributionMinor {
  personId: string;
  amountMinor: number;
}

export type AggregateView =
  | { kind: 'value'; amountMinor: number; contributorCount: number }
  | { kind: 'range'; lowMinor: number; highMinor: number }
  | { kind: 'rolled_up' }
  | { kind: 'percentage'; pct: number };

export interface MaskAggregateOptions {
  /** Minimum distinct contributors before the exact value may appear. §7.1: 3. */
  floor?: number;
  /** Below the floor, render as a rounded range (default) or roll up a level. */
  below?: 'range' | 'rolled_up';
}

/** §7.1 aggregation floor default: at least 3 people. */
export const AGGREGATION_FLOOR = 3;
/** §7.1 project budget views: floor of 2 contributors. */
export const PROJECT_BUDGET_FLOOR = 2;

/** Coarseness of a below-floor range: at least S$1,000, widening with the
 *  order of magnitude so the range never pinpoints the underlying value. */
function rangeStepMinor(totalMinor: number): number {
  const magnitude = Math.abs(totalMinor);
  if (magnitude === 0) return 1_000_00;
  return Math.max(1_000_00, Math.pow(10, Math.floor(Math.log10(magnitude))));
}

/**
 * §7.1 aggregation floor. With fewer than `floor` (default 3) distinct people
 * behind an aggregate, the exact total would be recoverable by subtraction, so
 * the result degrades to a rounded range that strictly contains the total
 * (neither endpoint equals it), or rolls up a level when `below: 'rolled_up'`.
 */
export function maskAggregate(
  values: ContributionMinor[],
  opts: MaskAggregateOptions = {},
): AggregateView {
  const floor = opts.floor ?? AGGREGATION_FLOOR;
  const people = new Set(values.map((v) => v.personId));
  const totalMinor = values.reduce((acc, v) => acc + v.amountMinor, 0);
  if (people.size >= floor) {
    return { kind: 'value', amountMinor: totalMinor, contributorCount: people.size };
  }
  if (opts.below === 'rolled_up' || people.size === 0) return { kind: 'rolled_up' };
  const step = rangeStepMinor(totalMinor);
  let lowMinor = Math.floor(totalMinor / step) * step;
  const highMinor = lowMinor + step;
  if (lowMinor === totalMinor) lowMinor -= step; // strict containment: the exact total never appears
  return { kind: 'range', lowMinor, highMinor };
}

/**
 * §7.1 project budget views: floor of 2 contributors, percentage-only fallback
 * below that. The percentage is coarsened to the nearest 5 points so a single
 * contributor's cost rate cannot be recovered from budget × percentage.
 */
export function maskProjectBudget(
  contributions: ContributionMinor[],
  budgetMinor: number,
): AggregateView {
  const people = new Set(contributions.map((c) => c.personId));
  const consumedMinor = contributions.reduce((acc, c) => acc + c.amountMinor, 0);
  if (people.size >= PROJECT_BUDGET_FLOOR) {
    return { kind: 'value', amountMinor: consumedMinor, contributorCount: people.size };
  }
  const pct = budgetMinor > 0 ? Math.round((consumedMinor / budgetMinor) / 0.05) * 0.05 : 0;
  return { kind: 'percentage', pct };
}

/**
 * R6/§7.3: the API serialiser applies can() to every field before the response
 * leaves the server. Forbidden and masked fields are STRIPPED, never nulled
 * with a hint: a value the user may not see is never sent in any form. Masked
 * presentations (aggregates, ranges, percentages) are produced separately via
 * maskAggregate/maskProjectBudget from data the viewer is entitled to.
 *
 * Returns null when the viewer may not see the resource at all.
 */
export function serialiseWithPolicy(
  actor: Actor,
  resource: Resource,
  payload: Record<string, unknown>,
  asOf?: IsoDate,
): Record<string, unknown> | null {
  const whole = can(actor, 'view', resource, undefined, asOf);
  if (whole.allow === false) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    const decision = can(actor, 'view', resource, key, asOf);
    if (decision.allow === true) out[key] = value;
    // allow === false or 'masked': strip. The raw value never leaves the server.
  }
  return out;
}

/** What the UI Masked renderer shows for a field (§9: masking is honest,
 *  never a fake zero). Absent = stripped entirely; masked = render the veil. */
export type MaskedFieldView =
  | { visible: true }
  | { visible: false; masked: true; as: MaskKind }
  | { visible: false; masked: false };

/** Translate a §7.3 Decision into the UI Masked renderer's contract. */
export function maskDecisionToView(decision: Decision): MaskedFieldView {
  if (decision.allow === true) return { visible: true };
  if (decision.allow === 'masked') return { visible: false, masked: true, as: decision.as };
  return { visible: false, masked: false };
}
