// Personal home: the day at a glance, the week's shape, and the door into the
// rest of the console. Warm temperature (§9.1).

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getDay, getWeek, getPortfolio } from '../../api/queries';
import { Card, CompletionRing, PageHeader, StatusChip } from '../../components/ui';

function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - shift * 86_400_000).toISOString().slice(0, 10);
}

export default function Home() {
  const account = useAccount();
  const today = useSession((s) => s.today);
  const day = useQuery({ queryKey: ['day', account.userId, today], queryFn: () => getDay(account, today) });
  const week = useQuery({ queryKey: ['week', account.userId, mondayOf(today)], queryFn: () => getWeek(account, mondayOf(today)) });
  const portfolio = useQuery({ queryKey: ['portfolio', account.userId], queryFn: () => getPortfolio(account) });

  const pct = day.data && day.data.scheduledMinutes > 0
    ? day.data.mappedPaidMinutes / day.data.scheduledMinutes
    : 0;
  const weekDays = week.data?.days.filter((d) => d.scheduledMinutes > 0) ?? [];
  const unmapped = weekDays.reduce((s, d) => s + Math.max(0, d.scheduledMinutes - d.mappedPaidMinutes), 0);
  const myProjects = (portfolio.data ?? []).filter(
    (r) => ['active', 'planning'].includes(r.project.status),
  );

  const firstName = account.name.split(' ')[0];

  return (
    <div>
      <PageHeader
        title={`Good day, ${firstName}`}
        lede="This console exists so we price fairly, protect your time, and build a studio that lasts. Your part takes about two minutes a day."
      />
      <div className="grid md:grid-cols-3 gap-4">
        <Card temp="personal" className="flex items-center gap-4">
          <CompletionRing pct={pct} size={72} label={`Today ${Math.round(pct * 100)} percent mapped`} />
          <div>
            <div className="text-base font-medium">Today</div>
            <div className="text-sm text-ink-muted">
              {pct >= 1
                ? 'Mapped, thank you.'
                : day.data?.scheduledMinutes === 0
                  ? 'No scheduled hours.'
                  : `${(Math.max(0, (day.data?.scheduledMinutes ?? 0) - (day.data?.mappedPaidMinutes ?? 0)) / 60).toFixed(1).replace(/\.0$/, '')} hours to map.`}
            </div>
            <Link to="/today" className="text-sm text-accent underline">Open Today</Link>
          </div>
        </Card>

        <Card temp="personal">
          <div className="text-base font-medium mb-1">This week</div>
          <div className="flex gap-1.5 items-end h-14 mb-1" role="img"
            aria-label={`Week mapping: ${weekDays.map((d) => `${Math.round((d.mappedPaidMinutes / Math.max(1, d.scheduledMinutes)) * 100)}%`).join(', ')}`}>
            {weekDays.map((d) => {
              const p = d.scheduledMinutes > 0 ? Math.min(1, d.mappedPaidMinutes / d.scheduledMinutes) : 0;
              return (
                <div key={d.date} className="flex-1 bg-sunken rounded-sm overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                  <div className="bg-accent/80 w-full transition-all duration-settle" style={{ height: `${p * 100}%` }} />
                </div>
              );
            })}
          </div>
          <div className="text-sm text-ink-muted">
            {unmapped === 0
              ? 'Fully mapped so far.'
              : `${(unmapped / 60).toFixed(1).replace(/\.0$/, '')} hours still unmapped. Two taps and it's done.`}
          </div>
          <Link to="/week" className="text-sm text-accent underline">Open Week</Link>
        </Card>

        <Card temp="personal">
          <div className="text-base font-medium mb-2">Your projects</div>
          {myProjects.length === 0 && (
            <p className="text-sm text-ink-muted">No active projects assigned right now.</p>
          )}
          <ul className="space-y-1.5">
            {myProjects.slice(0, 5).map((r) => (
              <li key={r.project.id} className="flex items-center justify-between gap-2">
                <Link to={`/projects/${r.project.id}`} className="text-base hover:text-accent truncate">
                  {r.project.name}
                </Link>
                {r.metrics.hoursConsumedPct !== undefined &&
                  r.metrics.hoursConsumedPct - r.metrics.scheduleElapsedPct >= 0.15 ? (
                  <StatusChip tone="caution">Running hot</StatusChip>
                ) : (
                  <StatusChip tone="positive">On track</StatusChip>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="text-xs text-ink-faint mt-6 max-w-xl">
        Nobody but you ever sees your breaks, meals, commute, or personal insights. The whole
        deal, plainly, is on the <Link to="/privacy" className="underline">privacy page</Link>.
      </p>
    </div>
  );
}
