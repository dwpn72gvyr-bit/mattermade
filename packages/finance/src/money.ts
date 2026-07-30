// packages/finance/src/money.ts
// Minor-unit arithmetic, rounding and currency. Master prompt §3 (Money):
// all monetary values are integer minor units (cents) with an explicit currency
// code; never floating point for stored money; rounding is half-up at the final
// display or storage boundary only, with intermediate calculation at full precision.

export type CurrencyCode = 'SGD' | 'USD' | (string & {});

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Currency mismatch: ${a} vs ${b}`);
    this.name = 'CurrencyMismatchError';
  }
}

export function money(amountMinor: number, currency: CurrencyCode = 'SGD'): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`Money must be integer minor units, got ${amountMinor}`);
  }
  return { amountMinor, currency };
}

/** Half-up rounding, negative values round half away from zero so that
 *  -3.7575 dollars displays as -3.76. Final-boundary rounding only (§3). */
export function roundHalfUp(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(value) + Number.EPSILON);
}

/** Round a full-precision dollar (major unit) value to integer minor units. */
export function toMinor(major: number): number {
  return roundHalfUp(major * 100);
}

/** Minor units to major units for display maths and tests. Not for storage. */
export function toMajor(amountMinor: number): number {
  return amountMinor / 100;
}

function assertSame(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
}

export function add(a: Money, b: Money): Money {
  assertSame(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSame(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function sum(items: Money[], currency: CurrencyCode = 'SGD'): Money {
  return items.reduce((acc, m) => add(acc, m), money(0, currency));
}

/** Multiply money by a scalar at full precision, rounding once at the boundary. */
export function multiply(m: Money, factor: number): Money {
  return money(roundHalfUp(m.amountMinor * factor), m.currency);
}

/** Ratio of two money values as a decimal (percentages are decimals, §3). */
export function ratio(numerator: Money, denominator: Money): number {
  assertSame(numerator, denominator);
  if (denominator.amountMinor === 0) return 0;
  return numerator.amountMinor / denominator.amountMinor;
}

/** Convert with an explicit FX rate captured at the relevant event (§6.4). */
export function convert(m: Money, sgdRate: number): Money {
  return money(roundHalfUp(m.amountMinor * sgdRate), 'SGD');
}

const FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

export function formatMoney(m: Money, opts?: { compact?: boolean; showCents?: boolean }): string {
  const showCents = opts?.showCents ?? m.amountMinor % 100 !== 0;
  const key = `${m.currency}|${opts?.compact ? 1 : 0}|${showCents ? 1 : 0}`;
  let fmt = FORMATTER_CACHE.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: m.currency,
      notation: opts?.compact ? 'compact' : 'standard',
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    });
    FORMATTER_CACHE.set(key, fmt);
  }
  return fmt.format(m.amountMinor / 100);
}

/** Percentage display helper: decimal in, one-decimal percent out ("47.2%"). */
export function formatPct(decimal: number, decimals = 1): string {
  return `${(decimal * 100).toFixed(decimals)}%`;
}

/** Round a decimal ratio to N decimal places of the PERCENT value, for tests
 *  asserting published figures like 47.2 (§6.9). */
export function pctValue(decimal: number, decimals = 1): number {
  const f = 10 ** decimals;
  return roundHalfUp(decimal * 100 * f) / f;
}

/** Round a major-unit value to 2 dp, for per-hour figures like 61.83 (§6.9). */
export function majorValue(amountMinor: number, decimals = 2): number {
  const f = 10 ** decimals;
  return roundHalfUp((amountMinor / 100) * f) / f;
}
