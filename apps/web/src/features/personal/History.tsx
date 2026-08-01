// Personal activity history: your own record, month by month (§8).

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getMonthEntries, MONTHS } from '../../api/queries';
import { Card, LedgerTable, PageHeader, Th, Td, StatusChip } from '../../components/ui';
import { fmtDate, fmtPeriod } from '../../lib/format';

export default function History() {
  const account = useAccount();
  const [month, setMonth] = useState(MONTHS[MONTHS.length - 1]!);
  const entries = useQuery({
    queryKey: ['history', account.userId, month],
    queryFn: () => getMonthEntries(account, month),
  });

  const rows = entries.data ?? [];
  const total = rows.filter((e) => !e.contextual).reduce((s, e) => s + e.minutes, 0);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="History"
        lede="Everything you have recorded, yours to review and correct until a month closes."
        actions={
          <select
            className="border border-line rounded-financial bg-raised px-2 py-1.5 text-base"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Month"
          >
            {[...MONTHS].reverse().map((m) => (
              <option key={m} value={m}>{fmtPeriod(m)}</option>
            ))}
          </select>
        }
      />
      <Card temp="personal" className="mb-4">
        <span className="text-ink-muted text-sm">Mapped this month · </span>
        <span className="tabular font-medium">{(total / 60).toFixed(1).replace(/\.0$/, '')} hours</span>
      </Card>
      <LedgerTable
        caption={`Your entries for ${fmtPeriod(month)}`}
        head={
          <tr>
            <Th>Date</Th>
            <Th>What</Th>
            <Th num>Duration</Th>
            <Th>Kind</Th>
          </tr>
        }
      >
        {rows.map((e) => (
          <tr key={e.id}>
            <Td className="whitespace-nowrap">{fmtDate(e.date)}</Td>
            <Td>
              {e.projectName ? `${e.projectName} · ${e.activityName}` : e.activityName}
              {e.notes && <div className="text-xs text-ink-faint">{e.notes}</div>}
            </Td>
            <Td num>{(e.minutes / 60).toFixed(2).replace(/\.?0+$/, '')}h</Td>
            <Td>
              {e.contextual ? (
                <StatusChip tone="neutral">Personal</StatusChip>
              ) : e.scope === 'company' ? (
                <StatusChip tone="info">Studio</StatusChip>
              ) : (
                <StatusChip tone="positive">Project</StatusChip>
              )}
            </Td>
          </tr>
        ))}
      </LedgerTable>
    </div>
  );
}
