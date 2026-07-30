// Week view: seven days, mapped against scheduled, gaps shown calmly (§8).

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../stores/session';
import { getWeek, copyDay } from '../../api/queries';
import { Button, Card, PageHeader, StatusChip } from '../../components/ui';
import { fmtDateShort } from '../../lib/format';

function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - shift * 86_400_000).toISOString().slice(0, 10);
}
function addDays(date: string, n: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Week() {
  const account = useSession((s) => s.account);
  const today = useSession((s) => s.today);
  const [monday, setMonday] = useState(mondayOf(today));
  const qc = useQueryClient();

  const week = useQuery({
    queryKey: ['week', account.userId, monday],
    queryFn: () => getWeek(account, monday),
  });
  const copyLastWeek = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < 5; i += 1) {
        const target = addDays(monday, i);
        if (target > today) break;
        const src = addDays(target, -7);
        await copyDay(account, src, target);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['week'] });
      qc.invalidateQueries({ queryKey: ['day'] });
    },
  });

  const days = week.data?.days ?? [];
  const totalScheduled = days.reduce((s, d) => s + d.scheduledMinutes, 0);
  const totalMapped = days.reduce((s, d) => s + Math.min(d.mappedPaidMinutes, d.scheduledMinutes), 0);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Week"
        lede={
          totalScheduled > 0 && totalMapped >= totalScheduled
            ? 'The whole week is mapped. Thanks for keeping the picture whole.'
            : 'A gap is a gap, never an error. Fill what you remember.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="quiet" size="sm" onClick={() => setMonday(addDays(monday, -7))} aria-label="Previous week">←</Button>
            <span className="tabular text-base">{fmtDateShort(monday)} – {fmtDateShort(addDays(monday, 6))}</span>
            <Button variant="quiet" size="sm" onClick={() => setMonday(addDays(monday, 7))} disabled={addDays(monday, 7) > today} aria-label="Next week">→</Button>
            <Button variant="secondary" size="sm" onClick={() => copyLastWeek.mutate()}>Copy last week</Button>
          </div>
        }
      />
      <div className="grid md:grid-cols-7 gap-2">
        {days.map((d, i) => {
          const pct = d.scheduledMinutes > 0 ? d.mappedPaidMinutes / d.scheduledMinutes : 0;
          const isWorkday = d.scheduledMinutes > 0;
          return (
            <Card key={d.date} temp="personal" className={`p-3 ${!isWorkday ? 'opacity-60' : ''}`}>
              <div className="text-sm font-medium">{DAY_NAMES[i]}</div>
              <div className="text-xs text-ink-faint mb-2">{fmtDateShort(d.date)}</div>
              {isWorkday ? (
                <>
                  <div className="h-1.5 bg-sunken rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full ${pct >= 1 ? 'bg-positive' : 'bg-accent'}`} style={{ width: `${Math.min(100, pct * 100)}%` }} />
                  </div>
                  <div className="tabular text-sm text-ink-muted">
                    {(d.mappedPaidMinutes / 60).toFixed(1).replace(/\.0$/, '')} / {d.scheduledMinutes / 60}h
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {d.entries.filter((e) => !e.contextual).slice(0, 4).map((e) => (
                      <li key={e.id} className="text-xs text-ink-muted truncate" title={e.projectName ?? e.activityName}>
                        {e.projectName ?? e.activityName}
                      </li>
                    ))}
                    {d.entries.filter((e) => !e.contextual).length > 4 && (
                      <li className="text-xs text-ink-faint">…</li>
                    )}
                  </ul>
                </>
              ) : (
                <StatusChip tone="neutral">Off</StatusChip>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
