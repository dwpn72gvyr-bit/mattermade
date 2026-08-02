// Singapore public holidays, 2025 and 2026 (round F). The gazetted list from
// the Ministry of Manpower, including the Monday off in lieu whenever a
// holiday falls on a Sunday. Used by the personal Today screen to recognise
// days the studio is closed; it never changes official costing (R2), which
// stays anchored to the scheduled day.

export const SG_HOLIDAYS_2025_2026: Record<string, string> = {
  // 2025
  '2025-01-01': "New Year's Day",
  '2025-01-29': 'Chinese New Year',
  '2025-01-30': 'Chinese New Year',
  '2025-03-31': 'Hari Raya Puasa',
  '2025-04-18': 'Good Friday',
  '2025-05-01': 'Labour Day',
  '2025-05-12': 'Vesak Day',
  '2025-06-07': 'Hari Raya Haji',
  '2025-08-09': 'National Day',
  '2025-10-20': 'Deepavali',
  '2025-12-25': 'Christmas Day',
  // 2026
  '2026-01-01': "New Year's Day",
  '2026-02-17': 'Chinese New Year',
  '2026-02-18': 'Chinese New Year',
  '2026-03-21': 'Hari Raya Puasa',
  '2026-04-03': 'Good Friday',
  '2026-05-01': 'Labour Day',
  '2026-05-27': 'Hari Raya Haji',
  '2026-05-31': 'Vesak Day',
  '2026-06-01': 'Vesak Day (off in lieu)',
  '2026-08-09': 'National Day',
  '2026-08-10': 'National Day (off in lieu)',
  '2026-11-08': 'Deepavali',
  '2026-11-09': 'Deepavali (off in lieu)',
  '2026-12-25': 'Christmas Day',
};

/** Holiday name for an ISO date, or undefined when it is an ordinary day. */
export function sgHolidayName(date: string): string | undefined {
  return SG_HOLIDAYS_2025_2026[date];
}

/** True on Saturdays and Sundays. */
export function isWeekend(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
}

export interface ClosedDayInfo {
  closed: boolean;
  /** 'Saturday', 'Sunday', or the holiday name. */
  reason?: string;
  holidayName?: string;
}

/** Weekend and public-holiday awareness for a calendar date. */
export function closedDayInfo(date: string): ClosedDayInfo {
  const holidayName = sgHolidayName(date);
  if (holidayName) return { closed: true, reason: holidayName, holidayName };
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (d === 6) return { closed: true, reason: 'Saturday' };
  if (d === 0) return { closed: true, reason: 'Sunday' };
  return { closed: false };
}
