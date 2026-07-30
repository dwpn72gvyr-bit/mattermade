// Display formatting. All figures originate in @oe/finance (R1); this module
// only renders them.

import { formatMoney, money, type CurrencyCode } from '@oe/finance';

export function fmtMoney(amountMinor: number, currency: CurrencyCode = 'SGD', opts?: { compact?: boolean; showCents?: boolean }): string {
  return formatMoney(money(Math.round(amountMinor), currency), opts);
}

/** Whole-dollar display for ledger tables: S$38,000. */
export function fmtMoneyWhole(amountMinor: number, currency: CurrencyCode = 'SGD'): string {
  return formatMoney(money(Math.round(amountMinor), currency), { showCents: false });
}

export function fmtPct(decimal: number, decimals = 1): string {
  return `${(decimal * 100).toFixed(decimals)}%`;
}

export function fmtHours(minutes: number): string {
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

export function fmtHoursValue(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

const DATE_FMT = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_SHORT = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short' });

export function fmtDate(isoDate: string): string {
  return DATE_FMT.format(new Date(`${isoDate}T00:00:00`));
}
export function fmtDateShort(isoDate: string): string {
  return DATE_SHORT.format(new Date(`${isoDate}T00:00:00`));
}
export function fmtPeriod(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  return new Intl.DateTimeFormat('en-SG', { month: 'long', year: 'numeric' }).format(
    new Date(Number(y), Number(m) - 1, 1),
  );
}
