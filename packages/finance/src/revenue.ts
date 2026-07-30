// packages/finance/src/revenue.ts
// §6.8 Revenue recognition. Four lenses, each with an exclusive purpose:
// contracted (pipeline), recognised (all profitability reporting), invoiced
// (accounting alignment), collected (cash and runway). The recognition strategy
// sits behind an interface so Release 2's effort-based percentage-of-completion
// is a new strategy class, not a rewrite.

import { roundHalfUp } from './money';

export type RecognitionTrigger =
  | 'milestone_accepted' | 'phase_complete' | 'straight_line' | 'as_delivered';

export interface RevenueItemInput {
  id: string;
  type: 'fee' | 'milestone' | 'retainer_period' | 'variation' | 'deposit';
  amountMinor: number;
  recognitionTrigger: RecognitionTrigger;
  plannedPeriod: string;         // YYYY-MM
  recognisedPeriod?: string;     // set when finance marks recognition
  weight?: number;               // quotation line-item weighting (§6.8)
  startPeriod?: string;          // straight_line window
  endPeriod?: string;
}

export interface RecognitionStrategy {
  /** Amount recognised for the item in the given period, minor units. */
  recognisedInPeriod(item: RevenueItemInput, period: string): number;
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

/** Release 1 rules (§6.8): fixed fee recognises on milestone or phase completion
 *  marked by finance, weighted by quotation line-item values; retainers
 *  straight-line monthly; T&M as delivered; deposits are a liability until
 *  earned; variations recognise like their parent structure. */
export class Release1Recognition implements RecognitionStrategy {
  recognisedInPeriod(item: RevenueItemInput, period: string): number {
    if (item.type === 'deposit') return 0; // liability until earned
    if (item.recognitionTrigger === 'straight_line') {
      const start = item.startPeriod ?? item.plannedPeriod;
      const end = item.endPeriod ?? item.plannedPeriod;
      const months = periodsBetween(start, end);
      if (!months.includes(period)) return 0;
      const perMonth = item.amountMinor / months.length;
      const idx = months.indexOf(period);
      if (idx === months.length - 1) {
        return item.amountMinor - roundHalfUp(perMonth) * (months.length - 1);
      }
      return roundHalfUp(perMonth);
    }
    // milestone_accepted, phase_complete, as_delivered: recognised when finance marks it
    return item.recognisedPeriod === period ? item.amountMinor : 0;
  }
}

export function recognisedRevenueMinor(
  items: RevenueItemInput[],
  period: string,
  strategy: RecognitionStrategy = new Release1Recognition(),
): number {
  return items.reduce((s, i) => s + strategy.recognisedInPeriod(i, period), 0);
}

/** Recognised to date, inclusive of the given period. */
export function recognisedToDateMinor(
  items: RevenueItemInput[],
  throughPeriod: string,
  strategy: RecognitionStrategy = new Release1Recognition(),
): number {
  const periods = new Set<string>();
  for (const i of items) {
    if (i.recognisedPeriod && i.recognisedPeriod <= throughPeriod) periods.add(i.recognisedPeriod);
    if (i.recognitionTrigger === 'straight_line') {
      const start = i.startPeriod ?? i.plannedPeriod;
      const end = i.endPeriod ?? i.plannedPeriod;
      for (const p of periodsBetween(start, end)) if (p <= throughPeriod) periods.add(p);
    }
  }
  let total = 0;
  for (const p of periods) total += recognisedRevenueMinor(items, p, strategy);
  return total;
}
