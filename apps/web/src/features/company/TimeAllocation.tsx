// Company time allocation (§8): stacked horizontal bars with a fixed category
// order and colour (§9.3). Aggregates only; no per-person surface exists (R7).

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getTimeAllocationView } from '../../api/queries';
import { Banner, Card, PageHeader } from '../../components/ui';
import { fmtMoneyWhole, fmtPeriod } from '../../lib/format';

const SEGMENTS: { key: string; label: string; colour: string }[] = [
  { key: 'project', label: 'Project labour', colour: '#3D5A4C' },
  { key: 'Business development', label: 'Business development', colour: '#3E5C7A' },
  { key: 'Marketing', label: 'Marketing', colour: '#6B4A7A' },
  { key: 'admin', label: 'Administration and internal', colour: '#8A5A2E' },
  { key: 'learning', label: 'Training and initiatives', colour: '#2E6E66' },
  { key: 'leave', label: 'Leave and public holidays', colour: '#98572E' },
  { key: 'unallocated', label: 'Unallocated', colour: '#B9B2A6' },
];

const ADMIN_KEYS = ['Company administration', 'Internal meeting'];
const LEARNING_KEYS = ['Training', 'Internal research', 'Internal initiative', 'Culture and team'];
const LEAVE_KEYS = ['Annual leave', 'Medical leave', 'Public holiday', 'Time in lieu taken'];

export default function TimeAllocation() {
  const account = useAccount();
  const data = useQuery({
    queryKey: ['time-allocation', account.userId],
    queryFn: () => getTimeAllocationView(account),
  });

  if (data.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  const months = data.data ?? [];

  return (
    <div>
      <PageHeader
        title="Company time allocation"
        lede="Where the studio's paid time went, month by month, in dollars at cost. Team aggregates only; individuals are never compared here."
      />
      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          {SEGMENTS.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: s.colour }} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {months.map((m) => {
            const byActivity = m.nonProjectByActivity;
            const sumKeys = (keys: string[]) => keys.reduce((s, k) => s + (byActivity[k] ?? 0), 0);
            const values: Record<string, number> = {
              project: m.projectLabourMinor,
              'Business development': byActivity['Business development'] ?? 0,
              Marketing: byActivity['Marketing'] ?? 0,
              admin: sumKeys(ADMIN_KEYS),
              learning: sumKeys(LEARNING_KEYS),
              leave: sumKeys(LEAVE_KEYS),
              unallocated: m.unallocatedMinor,
            };
            const total = Object.values(values).reduce((s, v) => s + v, 0);
            const summary = SEGMENTS.map((s) => `${s.label} ${fmtMoneyWhole(values[s.key] ?? 0)}`).join(', ');
            return (
              <div key={m.period} className="flex items-center gap-3">
                <span className="w-20 text-sm text-ink-muted tabular shrink-0">{fmtPeriod(m.period).slice(0, 3)} {m.period.slice(0, 4)}</span>
                <div className="flex-1 h-6 rounded-sm overflow-hidden flex border border-line" role="img" aria-label={`${fmtPeriod(m.period)}: ${summary}`}>
                  {SEGMENTS.map((s) => {
                    const v = values[s.key] ?? 0;
                    if (v <= 0 || total === 0) return null;
                    return (
                      <div
                        key={s.key}
                        style={{ width: `${(v / total) * 100}%`, background: s.colour }}
                        title={`${s.label}: ${fmtMoneyWhole(v)}`}
                      />
                    );
                  })}
                </div>
                <span className="w-24 text-right tabular text-sm text-ink-muted shrink-0">{fmtMoneyWhole(total)}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-ink-faint mt-3">
          Fixed category order and colour so months compare honestly. Every bar carries a full
          text summary for screen readers.
        </p>
      </Card>
    </div>
  );
}
