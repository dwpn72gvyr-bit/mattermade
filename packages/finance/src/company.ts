// packages/finance/src/company.ts
// §6.7 Company profitability. Salaries enter this model through exactly one
// door: the allocation identity (§6.3). The project share sits inside gross
// profit; the remainder appears as non-project and unallocated payroll.

import { roundHalfUp } from './money';

export interface CompanyMonthInput {
  totalProjectGrossProfitMinor: number;   // recognised basis (§6.8)
  otherIncomeMinor?: number;
  nonProjectPayrollMinor: number;         // §6.3 bucket 2
  unallocatedPayrollMinor: number;        // §6.3 bucket 3
  overheadMinor: number;                  // §6.6
  reconciliationAdjustmentsMinor?: number;
  recognisedRevenueMinor: number;
}

export interface CompanyMonthResult {
  operatingProfitMinor: number;
  operatingMargin: number;      // decimal
  overheadCoverage: number;     // decimal ratio
  runningCostsMinor: number;    // nonProject + unallocated + overhead
}

/** §6.7: operatingProfit = totalProjectGrossProfit + otherIncome
 *  − nonProjectPayroll − unallocatedPayroll − overhead ± reconciliationAdjustments. */
export function companyMonth(input: CompanyMonthInput): CompanyMonthResult {
  const running =
    input.nonProjectPayrollMinor + input.unallocatedPayrollMinor + input.overheadMinor;
  const operatingProfit = roundHalfUp(
    input.totalProjectGrossProfitMinor +
      (input.otherIncomeMinor ?? 0) -
      running +
      (input.reconciliationAdjustmentsMinor ?? 0),
  );
  return {
    operatingProfitMinor: operatingProfit,
    operatingMargin:
      input.recognisedRevenueMinor === 0 ? 0 : operatingProfit / input.recognisedRevenueMinor,
    overheadCoverage: running === 0 ? 0 : input.totalProjectGrossProfitMinor / running,
    runningCostsMinor: running,
  };
}

/** §6.7: breakEvenRevenue = (nonProjectPayroll + unallocatedPayroll + overhead)
 *  ÷ averageGrossMargin. */
export function breakEvenRevenueMinor(runningCostsMinor: number, averageGrossMargin: number): number {
  if (averageGrossMargin === 0) return 0;
  return roundHalfUp(runningCostsMinor / averageGrossMargin);
}

/** §6.7: forecastYearEnd = ytdOperatingProfit + Σ forecast months
 *  (weighted pipeline − planned costs). */
export function forecastYearEndMinor(args: {
  ytdOperatingProfitMinor: number;
  forecastMonths: { weightedPipelineGrossProfitMinor: number; plannedRunningCostsMinor: number }[];
}): number {
  return roundHalfUp(
    args.ytdOperatingProfitMinor +
      args.forecastMonths.reduce(
        (s, m) => s + m.weightedPipelineGrossProfitMinor - m.plannedRunningCostsMinor, 0),
  );
}

/** §6.7: cashRunway = cashBalance ÷ average monthly net outflow, only when cash
 *  data exists (returns undefined otherwise; the UI shows narrative, not zero). */
export function cashRunwayMonths(
  cashBalanceMinor: number | undefined,
  avgMonthlyNetOutflowMinor: number | undefined,
): number | undefined {
  if (cashBalanceMinor === undefined || !avgMonthlyNetOutflowMinor) return undefined;
  return cashBalanceMinor / avgMonthlyNetOutflowMinor;
}
