// Personal home (client direction, item 13): the team member landing
// experience. A warm welcome, today's ring with a one-tap door into mapping,
// a private wall of day rings with an inline day detail, and a slim projects
// strip. Streaks are gentle: a lapse resets silently and a zero streak simply
// says nothing (§9.4, R7). No leaderboards, no scores, no comparisons.

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getDay, getWeek, getPortfolio, getMonthEntries, MONTHS } from '../../api/queries';
import { db } from '../../api/db';
import { Button, Card, CompletionRing, StatusChip } from '../../components/ui';
import { fmtDate, fmtHoursValue, fmtPeriod } from '../../lib/format';
import DayRings, { type DayRingItem } from './DayRings';

// ---------------------------------------------------------------------------
// Calendar helpers (UTC date arithmetic on YYYY-MM-DD strings, as elsewhere).
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

function addDays(date: string, n: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + n * DAY_MS)
    .toISOString().slice(0, 10);
}

function mondayOf(date: string): string {
  return addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
}

function dow(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function prevMonthOf(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y! - 1}-12` : `${y}-${String(m! - 1).padStart(2, '0')}`;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
}

// Same weekday logic as the day procedures (§8.1): Mon to Fri, or Mon to Thu
// on a four-day schedule. Presentation-side estimate only; no money involved.
function isWorkday(date: string, daysPerWeek: number): boolean {
  const d = dow(date);
  return daysPerWeek === 4 ? d >= 1 && d <= 4 : d >= 1 && d <= 5;
}

function workdayCount(month: string, daysPerWeek: number): number {
  let n = 0;
  for (let i = 1; i <= daysInMonth(month); i += 1) {
    if (isWorkday(`${month}-${String(i).padStart(2, '0')}`, daysPerWeek)) n += 1;
  }
  return n;
}

const WEEKDAY_SHORT = new Intl.DateTimeFormat('en-SG', { weekday: 'short', timeZone: 'UTC' });
const MONTH_SHORT = new Intl.DateTimeFormat('en-SG', { month: 'short', timeZone: 'UTC' });

function weekdayShort(date: string): string {
  return WEEKDAY_SHORT.format(new Date(`${date}T00:00:00Z`));
}

function monthShort(month: string): string {
  return MONTH_SHORT.format(new Date(`${month}-01T00:00:00Z`));
}

function hoursText(minutes: number): string {
  return fmtHoursValue(minutes / 60);
}

function minutesLabel(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? `${r}m` : r === 0 ? `${h}h` : `${h}h ${r}m`;
}

type Range = 'week' | 'month' | 'fy';

// ---------------------------------------------------------------------------

export default function Home() {
  const account = useAccount();
  const today = useSession((s) => s.today);
  const firstName = account.shortName;

  const schedule = useMemo(() => {
    const s = db.workSchedules.find((w) => w.personId === account.personId);
    return { daysPerWeek: s?.daysPerWeek ?? 5, hoursPerDay: s?.hoursPerDay ?? 8 };
  }, [account.personId]);
  const scheduledPerDay = schedule.hoursPerDay * 60;

  const currentMonth = today.slice(0, 7);
  const prevMonth = prevMonthOf(currentMonth);

  const [range, setRange] = useState<Range>('week');
  const fyYears = useMemo(
    () => [...new Set(MONTHS.map((m) => m.slice(0, 4)))].sort(),
    [],
  );
  const [fy, setFy] = useState(currentMonth.slice(0, 4));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ---- Data -------------------------------------------------------------

  const day = useQuery({
    queryKey: ['day', account.userId, today],
    queryFn: () => getDay(account, today),
  });
  const week = useQuery({
    queryKey: ['week', account.userId, mondayOf(today)],
    queryFn: () => getWeek(account, mondayOf(today)),
  });
  const portfolio = useQuery({
    queryKey: ['portfolio', account.userId],
    queryFn: () => getPortfolio(account),
    retry: false, // externals are refused by design; fail silently (§7.2)
  });

  // Month entries feed the streak (current and previous month) and the wall.
  // Aggregated client-side rather than calling getDay thirty times.
  const monthsNeeded = useMemo(() => {
    const set = new Set<string>([currentMonth, prevMonth]);
    if (range === 'fy') for (const m of MONTHS) if (m.startsWith(fy)) set.add(m);
    return [...set].sort();
  }, [currentMonth, prevMonth, range, fy]);

  const monthQueries = useQueries({
    queries: monthsNeeded.map((m) => ({
      queryKey: ['month', account.userId, m],
      queryFn: () => getMonthEntries(account, m),
    })),
  });

  // Paid mapped minutes per date across every fetched month (small data).
  const mappedByDate = new Map<string, number>();
  for (const q of monthQueries) {
    for (const e of q.data ?? []) {
      if (e.contextual) continue;
      mappedByDate.set(e.date, (mappedByDate.get(e.date) ?? 0) + e.minutes);
    }
  }
  const loadedMonths = new Set(monthsNeeded.filter((m, i) => monthQueries[i]?.data !== undefined));

  // ---- Today ------------------------------------------------------------

  const scheduledToday = day.data?.scheduledMinutes ?? 0;
  const mappedToday = day.data?.mappedPaidMinutes ?? 0;
  const pct = scheduledToday > 0 ? mappedToday / scheduledToday : 0;
  const fullyMapped = scheduledToday > 0 && mappedToday >= scheduledToday;

  const stateLine = !day.data
    ? ' '
    : scheduledToday === 0
      ? 'No scheduled hours today. Anything you record is for your own picture.'
      : mappedToday === 0
        ? 'Nothing mapped yet. Two minutes, and the picture is whole.'
        : pct > 1.05
          ? `${hoursText(mappedToday)} hours mapped against ${hoursText(scheduledToday)} scheduled. If that is real overtime, it counts as effort.`
          : fullyMapped
            ? 'Today is fully mapped. Thanks for keeping the picture whole.'
            : `${hoursText(mappedToday)} of ${hoursText(scheduledToday)} hours mapped.`;

  // ---- Streak: consecutive fully mapped scheduled weekdays, counted back
  // from yesterday. A lapse resets silently; zero renders nothing at all.
  let streak = 0;
  if (loadedMonths.has(currentMonth) && loadedMonths.has(prevMonth)) {
    const floor = `${prevMonth}-01`; // bounded by the data we fetched
    for (let d = addDays(today, -1); d >= floor; d = addDays(d, -1)) {
      if (!isWorkday(d, schedule.daysPerWeek)) continue;
      if ((mappedByDate.get(d) ?? 0) >= scheduledPerDay) streak += 1;
      else break;
    }
  }

  // ---- The ring wall ----------------------------------------------------

  let wallItems: DayRingItem[] = [];
  if (range === 'week') {
    wallItems = (week.data?.days ?? [])
      .filter((d) => d.scheduledMinutes > 0 && d.date <= today)
      .map((d) => {
        const p = d.mappedPaidMinutes / d.scheduledMinutes;
        return {
          key: d.date,
          pct: p,
          label: `${fmtDate(d.date)}, ${Math.round(p * 100)} percent mapped`,
          caption: weekdayShort(d.date),
        };
      });
  } else if (range === 'month') {
    for (let d = `${currentMonth}-01`; d <= today; d = addDays(d, 1)) {
      if (!isWorkday(d, schedule.daysPerWeek)) continue;
      const p = (mappedByDate.get(d) ?? 0) / scheduledPerDay;
      wallItems.push({
        key: d,
        pct: p,
        label: `${fmtDate(d)}, ${Math.round(p * 100)} percent mapped`,
        caption: String(Number(d.slice(8))),
      });
    }
  } else {
    wallItems = MONTHS.filter((m) => m.startsWith(fy)).map((m) => {
      let mapped = 0;
      for (const [d, mins] of mappedByDate) if (d.startsWith(m)) mapped += mins;
      const scheduled = workdayCount(m, schedule.daysPerWeek) * scheduledPerDay;
      const p = scheduled > 0 ? mapped / scheduled : 0;
      return {
        key: m,
        pct: p,
        label: `${fmtPeriod(m)}, ${Math.round(p * 100)} percent mapped`,
        caption: monthShort(m),
      };
    });
  }

  const detail = useQuery({
    queryKey: ['day', account.userId, selectedDay],
    queryFn: () => getDay(account, selectedDay!),
    enabled: selectedDay !== null,
  });

  const switchRange = (next: Range) => {
    setRange(next);
    setSelectedDay(null);
  };

  // ---- Projects strip ---------------------------------------------------

  const myProjects = (portfolio.data ?? []).filter((r) =>
    ['active', 'planning'].includes(r.project.status),
  );

  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* 1 + 2: welcome hero with today's ring and the one-tap door in */}
      <Card temp="personal" as="section" className="settle-in md:p-8">
        <div className="flex flex-wrap items-center gap-6 md:gap-10">
          <div className="flex-1 min-w-[240px]">
            <h1 className="display text-xl text-ink">Welcome back, {firstName}.</h1>
            <p className="text-ink-muted mt-1">Thank you for helping Make Meaningful Matter.</p>
            <p className="text-md text-ink mt-4">{stateLine}</p>
            <div className="mt-5">
              <Link
                to="/today"
                className="inline-flex items-center justify-center rounded-financial font-medium transition-colors duration-settle bg-accent text-accent-contrast hover:bg-accent/85 text-md px-5 py-2"
              >
                {fullyMapped ? 'Review today' : 'Map today'}
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 mx-auto md:mx-0">
            <CompletionRing
              pct={pct}
              size={140}
              label={`Today ${Math.round(pct * 100)} percent mapped`}
            />
            {streak > 0 && (
              <div className="text-sm text-ink-muted">
                {streak === 1 ? 'Yesterday fully mapped.' : `${streak} mapped days in a row.`}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 3 + 4: the ring wall with its range toggle and inline day detail */}
      <Card temp="personal" as="section">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-md font-medium text-ink">Your days</h2>
            <p className="text-sm text-ink-muted">
              {range === 'fy'
                ? 'One ring per month, mapped against scheduled hours.'
                : 'One ring per scheduled day. Tap a ring to see what filled it.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {range === 'fy' && fyYears.length > 1 && (
              <label className="text-sm text-ink-muted">
                <span className="sr-only">Financial year</span>
                <select
                  className="border border-line rounded-financial bg-raised px-2 py-1 text-sm"
                  value={fy}
                  onChange={(e) => setFy(e.target.value)}
                >
                  {fyYears.map((y) => (
                    <option key={y} value={y}>FY{y}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex rounded-financial border border-line overflow-hidden" role="group" aria-label="Range">
              {(['week', 'month', 'fy'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={range === r}
                  onClick={() => switchRange(r)}
                  className={`px-3 py-1 text-sm transition-colors duration-settle ${
                    range === r ? 'bg-accent text-white' : 'bg-raised text-ink-muted hover:bg-sunken'
                  }`}
                >
                  {r === 'week' ? 'Week' : r === 'month' ? 'Month' : 'FY'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DayRings
          items={wallItems}
          size={44}
          selectedKey={selectedDay}
          onSelect={
            range === 'fy'
              ? undefined
              : (key) => setSelectedDay((cur) => (cur === key ? null : key))
          }
          emptyNote="No scheduled days to draw yet."
        />

        {selectedDay && range !== 'fy' && (
          <div className="mt-4 border-t border-line/60 pt-4 settle-in">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-medium text-ink">{fmtDate(selectedDay)}</div>
                {detail.data ? (
                  <>
                    <div className="text-sm text-ink-muted mb-2">
                      {detail.data.scheduledMinutes === 0
                        ? 'Not a scheduled day.'
                        : `${hoursText(detail.data.mappedPaidMinutes)} of ${hoursText(detail.data.scheduledMinutes)} hours mapped.`}
                      {detail.data.publicHoliday ? ` It was ${detail.data.publicHoliday}.` : ''}
                    </div>
                    {detail.data.entries.filter((e) => !e.contextual).length === 0 ? (
                      <p className="text-sm text-ink-muted">
                        Nothing mapped on this day. A gap, never an error.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {detail.data.entries.filter((e) => !e.contextual).map((e) => (
                          <li key={e.id} className="flex justify-between gap-3 text-base">
                            <span className="truncate">
                              {e.projectName ? (
                                <>
                                  <span className="font-medium">{e.projectName}</span>
                                  <span className="text-ink-muted"> · {e.activityName}</span>
                                </>
                              ) : (
                                e.activityName
                              )}
                            </span>
                            <span className="tabular text-ink-muted shrink-0">{minutesLabel(e.minutes)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {detail.data.entries.some((e) => e.contextual) && (
                      <p className="text-xs text-ink-faint mt-2">
                        Personal time on this day is recorded for you alone and not shown here.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-ink-muted">Fetching that day.</p>
                )}
              </div>
              <Button variant="quiet" size="sm" aria-label="Close day detail" onClick={() => setSelectedDay(null)}>
                ×
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 5: slim projects strip; absent entirely when there is nothing to show */}
      {myProjects.length > 0 && (
        <Card temp="personal" as="section">
          <h2 className="text-md font-medium text-ink mb-2">Your projects</h2>
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
      )}

      <p className="text-xs text-ink-faint max-w-xl">
        Nobody but you ever sees your breaks, meals, commute, or personal insights. The whole
        deal, plainly, is on the <Link to="/privacy" className="underline">privacy page</Link>.
      </p>
    </div>
  );
}
