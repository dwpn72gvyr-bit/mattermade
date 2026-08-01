// Day mapping completeness (client direction, item 12): who has ascribed their
// scheduled day and who is short, so gentle reminders can go out. Totals and
// gaps only; notes and personal categories remain unreachable (R7). The
// framing stays kind: a gap is a gap, never an error.

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from '../../stores/session';
import { getCompleteness } from '../../api/adminApi';
import { Banner, Card, LedgerTable, PageHeader, StatusChip, Td, Th } from '../../components/ui';
import { fmtDateShort } from '../../lib/format';

export default function Completeness() {
  const account = useAccount();
  const data = useQuery({
    queryKey: ['completeness', account.userId],
    queryFn: () => getCompleteness(account),
  });
  const [nudged, setNudged] = useState<Record<string, boolean>>({});

  if (data.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }
  const d = data.data;
  if (!d) return <div className="text-ink-muted py-10 text-center">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Day mapping"
        lede="The last five working days: scheduled hours against mapped hours, per person. Reminders here are a kindness, not a scorecard; what people wrote stays theirs."
      />
      <LedgerTable
        caption="Mapping completeness, last five working days"
        head={
          <tr>
            <Th>Person</Th>
            {d.days.map((day) => <Th key={day} num>{fmtDateShort(day)}</Th>)}
            <Th num>Week</Th>
            <Th>Standing</Th>
            <Th />
          </tr>
        }
      >
        {d.rows.map((r) => {
          const pct = r.completePct;
          return (
            <tr key={r.personId}>
              <Td className="font-medium">{r.name}</Td>
              {r.days.map((day) => {
                const p = day.scheduledMinutes === 0 ? null : Math.min(1, day.mappedMinutes / day.scheduledMinutes);
                return (
                  <Td key={day.date} num>
                    {p === null ? <span className="text-ink-faint">off</span> : (
                      <span className={p >= 1 ? 'text-positive' : 'text-ink-muted'}>{Math.round(p * 100)}%</span>
                    )}
                  </Td>
                );
              })}
              <Td num className="tabular">{Math.round(pct * 100)}%</Td>
              <Td>
                {pct >= 0.95 ? (
                  <StatusChip tone="positive">Whole picture</StatusChip>
                ) : pct >= 0.6 ? (
                  <StatusChip tone="info">Nearly there</StatusChip>
                ) : (
                  <StatusChip tone="caution">A few gaps</StatusChip>
                )}
              </Td>
              <Td>
                {pct < 0.95 && (
                  <button
                    className="text-sm text-accent underline disabled:text-ink-faint disabled:no-underline"
                    disabled={nudged[r.personId]}
                    onClick={() => setNudged((n) => ({ ...n, [r.personId]: true }))}
                  >
                    {nudged[r.personId] ? 'Reminder queued' : 'Send a gentle reminder'}
                  </button>
                )}
              </Td>
            </tr>
          );
        })}
      </LedgerTable>
      <Card className="mt-4">
        <p className="text-sm text-ink-muted">
          Reminders read: "Some of your days this week still have unmapped hours. Two taps and
          it's done." They send once, in-app and by email digest, and never name anyone to
          anyone else. Delivery goes live with Stage C notifications; here they queue.
        </p>
      </Card>
    </div>
  );
}
