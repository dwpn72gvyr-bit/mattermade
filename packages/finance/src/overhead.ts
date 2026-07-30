// packages/finance/src/overhead.ts
// §6.6 Overhead. Allocated overhead is an analytical view and is never
// aggregated into company operating profit.

import { roundHalfUp } from './money';

export type OverheadRecurrence = 'monthly' | 'annual' | 'one_off';

export interface OverheadLine {
  category: string;
  amountMinor: number;
  recurrence: OverheadRecurrence;
  effectiveFrom: string;   // YYYY-MM-DD
  effectiveTo?: string;
  oneOffPeriod?: string;   // YYYY-MM for one_off lines
}

const PAYROLL_WORDS = /salar|payroll|wage|cpf|bonus|remuneration|stipend/i;

/** §5.4 guard: the overhead register may never contain payroll. Reject on write
 *  with a clear message (tested in Stage A8 acceptance). */
export function assertNotPayroll(description: string, category: string): void {
  if (PAYROLL_WORDS.test(description) || PAYROLL_WORDS.test(category)) {
    throw new Error(
      'Salaries and payroll never live in the overhead register. They enter through employment agreements so each dollar is counted once.',
    );
  }
}

function activeIn(line: OverheadLine, period: string): boolean {
  const from = line.effectiveFrom.slice(0, 7);
  const to = line.effectiveTo?.slice(0, 7);
  return from <= period && (to === undefined || period <= to);
}

/** §6.6: monthlyOverhead = Σ register for month (annual ÷ 12, one-off in its month). */
export function monthlyOverheadMinor(lines: OverheadLine[], period: string): number {
  let total = 0;
  for (const l of lines) {
    if (l.recurrence === 'one_off') {
      if (l.oneOffPeriod === period) total += l.amountMinor;
    } else if (activeIn(l, period)) {
      total += l.recurrence === 'annual' ? l.amountMinor / 12 : l.amountMinor;
    }
  }
  return roundHalfUp(total);
}

/** §6.6 overhead lenses. All "per hour" figures are analytical views. */
export function overheadRates(args: {
  monthlyOverheadMinor: number;
  teamAvailableHours: number;
  teamProductiveHours: number;
  projectLabourCostMinor: number;
  recognisedRevenueMinor: number;
  monthlyNonProjectPayrollMinor: number;
}): {
  perAvailableHourMinor: number;
  perProductiveHourMinor: number;   // default pricing lens
  pctOfDirectLabour: number;
  pctOfRevenue: number;
  monthlyRecoveryTargetMinor: number;
} {
  return {
    perAvailableHourMinor:
      args.teamAvailableHours === 0 ? 0 : roundHalfUp(args.monthlyOverheadMinor / args.teamAvailableHours),
    perProductiveHourMinor:
      args.teamProductiveHours === 0 ? 0 : roundHalfUp(args.monthlyOverheadMinor / args.teamProductiveHours),
    pctOfDirectLabour:
      args.projectLabourCostMinor === 0 ? 0 : args.monthlyOverheadMinor / args.projectLabourCostMinor,
    pctOfRevenue:
      args.recognisedRevenueMinor === 0 ? 0 : args.monthlyOverheadMinor / args.recognisedRevenueMinor,
    monthlyRecoveryTargetMinor: args.monthlyOverheadMinor + args.monthlyNonProjectPayrollMinor,
  };
}
