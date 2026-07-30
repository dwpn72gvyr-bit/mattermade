// fixtures/src/support.ts
// Deterministic helpers shared by the fixture modules. No Math.random, no
// Date.now anywhere in fixtures (§10: one dataset, reproducible everywhere).

import type { YearMonth, CalendarDate } from '@oe/domain';

/** The dataset's frozen "today" (§10: the window is 2025-07 .. 2026-06). */
export const FIXTURE_TODAY: CalendarDate = '2026-06-30';

/** The twelve fixture months, oldest first. */
export const MONTHS: YearMonth[] = [
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
];

/** §5 conventions: every entity carries id + audit stamps. Fixture rows are
 *  stamped at dataset creation by the seeding super admin unless noted. */
export function stamp(id: string, createdBy = 'usr-ryan') {
  return {
    id,
    createdAt: '2025-07-01T00:00:00Z',
    createdBy,
    updatedAt: '2025-07-01T00:00:00Z',
    updatedBy: createdBy,
  };
}

const MS_PER_DAY = 86_400_000;

export function epochDay(date: CalendarDate): number {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

export function dateFromEpochDay(day: number): CalendarDate {
  const d = new Date(day * MS_PER_DAY);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** 0 = Sunday .. 6 = Saturday. */
export function dayOfWeek(date: CalendarDate): number {
  return new Date(epochDay(date) * MS_PER_DAY).getUTCDay();
}

export function daysInMonth(ym: YearMonth): number {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function datesOfMonth(ym: YearMonth): CalendarDate[] {
  const n = daysInMonth(ym);
  const out: CalendarDate[] = [];
  for (let d = 1; d <= n; d += 1) out.push(`${ym}-${String(d).padStart(2, '0')}`);
  return out;
}

/** Linear interpolation between two calendar dates (used to lay phases across
 *  a project window). frac is clamped to [0, 1]. */
export function dateAt(start: CalendarDate, end: CalendarDate, frac: number): CalendarDate {
  const a = epochDay(start);
  const b = epochDay(end);
  const f = Math.min(1, Math.max(0, frac));
  return dateFromEpochDay(Math.round(a + (b - a) * f));
}

export function daysBetween(a: CalendarDate, b: CalendarDate): number {
  return epochDay(b) - epochDay(a);
}
