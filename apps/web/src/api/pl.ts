// Financial Discipline chamber: the P&L view of overheads (client direction,
// item 11). Structured as OuterEdit's Xero chart of accounts, budget vs actual
// per calendar FY, historically back to FY2018. Actuals load from a local,
// git-ignored Xero pull (`data/xero-actuals.local.json`) so real financial
// data never lands in a public repository; without it the structure renders
// with a clear "connect actuals" state.

import { call } from './transport';
import type { DemoAccount } from './demoAccounts';
import { todayStr } from './settings';

export const PL_INCOME_LINES = ['Sales', 'Recurrent', 'Other Revenue'] as const;

export const PL_EXPENSE_LINES = [
  'Accounting Fees', 'Allowance', 'Bank Fees', 'Bonus', 'Cleaning', 'Communication',
  'CPF', 'Depreciation', "Director's Fee", 'Donation', 'Entertainment',
  'Fixed Asset not Capitalised', 'Foreign Worker Levy', 'Freight & Courier',
  'General Expenses', 'Income Tax Expense', 'Insurance', 'Interest Expense',
  'IT Expenses', 'Local Travel', 'Marketing & Promotion', 'Medical Expenses',
  'Motor Vehicle Expenses', 'Office Expenses', 'Office Moving Expense',
  'Office Supplies', 'Outsource Labour', 'Overseas Travel', 'Penalty Fee',
  'Postage and Courier', 'Professional Fees', 'Project Costs', 'Recruitment Costs',
  'Rent', 'Repairs and Maintenance', 'Secretarial Fee', 'Skill Development Levy',
  'Staff Welfare', 'Subscriptions', 'Telecommunication', 'Training', 'Utilities',
  'Wages and Salaries',
] as const;

export interface FyStatement {
  fy: number;
  ytd: boolean;
  actualsAvailable: boolean;
  income: Record<string, number>;      // dollars
  costOfSales: Record<string, number>;
  expenses: Record<string, number>;
  totalIncome: number;
  totalCostOfSales: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  netProfit: number;
}

interface XeroSeed {
  organisation: string;
  currency: string;
  pulledAt: string;
  years: Record<string, {
    period: string; ytd: boolean;
    income: Record<string, number>;
    costOfSales: Record<string, number>;
    expenses: Record<string, number>;
  }>;
}

// Optional local actuals: Vite bundles any matching file; the glob is empty in
// a clean public checkout and the UI says so calmly.
const localSeeds = import.meta.glob<{ default: XeroSeed }>('./data/xero-actuals.local.json', {
  eager: true,
});
const seed: XeroSeed | undefined = Object.values(localSeeds)[0]?.default;

const sum = (rec: Record<string, number>) => Object.values(rec).reduce((s, v) => s + v, 0);

/** Normalise Xero account names to the console's canonical line names. */
function normalise(rec: Record<string, number>): Record<string, number> {
  const aliases: Record<string, string> = {
    'Staff welfare': 'Staff Welfare',
    'Medical expenses': 'Medical Expenses',
    'Secretarial fee': 'Secretarial Fee',
    'Postage and courier': 'Postage and Courier',
    'Director Fee': "Director's Fee",
  };
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (v === 0) continue;
    out[aliases[k] ?? k] = (out[aliases[k] ?? k] ?? 0) + v;
  }
  return out;
}

const BUDGET_KEY = 'oe-console-pl-budgets';

function readBudgets(): Record<string, Record<string, number>> {
  try {
    const raw = window.localStorage.getItem(BUDGET_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* defaults below */ }
  return {};
}

export function saveBudgetLine(fy: number, line: string, amount: number): void {
  const all = readBudgets();
  all[String(fy)] = { ...(all[String(fy)] ?? {}), [line]: amount };
  window.localStorage.setItem(BUDGET_KEY, JSON.stringify(all));
}

export function currentFy(): number {
  return Number(todayStr().slice(0, 4));
}

export function fyRange(): number[] {
  const years: number[] = [];
  for (let y = currentFy(); y >= 2018; y -= 1) years.push(y);
  return years;
}

export function getStatement(account: DemoAccount, fy: number) {
  return call('pl.statement', () => {
    const allowed = ['finance_admin', 'leadership', 'super_admin'].some((r) =>
      account.roles.includes(r),
    );
    if (!allowed) throw new Error('not_allowed');

    const year = seed?.years[String(fy)];
    const income = normalise(year?.income ?? {});
    const costOfSales = normalise(year?.costOfSales ?? {});
    const expenses = normalise(year?.expenses ?? {});
    const totalIncome = sum(income);
    const totalCos = sum(costOfSales);
    const totalOpex = sum(expenses);

    const statement: FyStatement = {
      fy,
      ytd: year?.ytd ?? false,
      actualsAvailable: Boolean(year),
      income,
      costOfSales,
      expenses,
      totalIncome,
      totalCostOfSales: totalCos,
      grossProfit: totalIncome - totalCos,
      totalOperatingExpenses: totalOpex,
      netProfit: totalIncome - totalCos - totalOpex,
    };
    return {
      statement,
      budgets: readBudgets()[String(fy)] ?? {},
      sourceNote: seed
        ? `Actuals from Xero (${seed.organisation}), pulled ${seed.pulledAt}. Xero can only serve the last three financial years; earlier FYs hold budgets and manual entries.`
        : 'No Xero actuals file present in this workspace. The structure is ready; connect Xero or add data/xero-actuals.local.json.',
    };
  });
}
