// fixtures/src/periods.ts
// §10 financial periods: months before 2026-05 locked with green tie-outs,
// 2026-05 soft-closed, 2026-06 open. Tie-out detail is computed through
// @oe/finance from the actual entries, never hand-typed (R1).

import type { FinancialPeriod, TieOutReport } from '@oe/domain';
import { MONTHS, stamp } from './support';
import { computeMonthlyTieOuts } from './timeEntries';

function toReport(m: ReturnType<typeof computeMonthlyTieOuts>[number]): TieOutReport {
  return {
    period: m.period,
    expectedMinor: m.combined.expectedMinor,
    allocatedMinor: m.combined.allocatedMinor,
    differenceMinor: m.combined.differenceMinor,
    status: m.combined.status,
    perPerson: m.perPerson.map((p) => ({
      personId: p.personId,
      expectedMinor: p.tieOut.expectedMinor,
      allocatedMinor: p.tieOut.allocatedMinor,
      differenceMinor: p.tieOut.differenceMinor,
      status: p.tieOut.status,
    })),
  };
}

const tieOuts = computeMonthlyTieOuts();

export const FINANCIAL_PERIODS: FinancialPeriod[] = MONTHS.map((yearMonth) => {
  const detail = toReport(tieOuts.find((t) => t.period === yearMonth)!);
  const status: FinancialPeriod['status'] =
    yearMonth < '2026-05' ? 'locked' : yearMonth === '2026-05' ? 'soft_closed' : 'open';
  return {
    ...stamp(`fp-${yearMonth}`, 'usr-daniel'),
    yearMonth,
    status,
    tieOut: detail.status,
    tieOutDetail: detail,
    ...(status === 'locked'
      ? { lockedByUserId: 'usr-daniel', lockedAt: `${yearMonth}-28T09:00:00Z` }
      : {}),
  };
});
