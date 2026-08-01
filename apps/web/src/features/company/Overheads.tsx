// Financial Discipline chamber (client direction, item 11): the P&L view of
// the company, budget vs actual per FY back to 2018, structured as the Xero
// chart of accounts. Below it, the console's own overhead register keeps its
// structural guarantee: payroll can never live here (§5.4 guard), and the
// register never blurs into project costs.

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { companyOverheadSchema } from '@oe/domain';
import { useAccount } from '../../stores/session';
import { getOverheads } from '../../api/queries';
import {
  PL_EXPENSE_LINES, PL_INCOME_LINES, currentFy, fyRange, getStatement, saveBudgetLine,
} from '../../api/pl';
import { Banner, Button, Card, LedgerTable, PageHeader, StatusChip, Td, Th } from '../../components/ui';
import { fmtMoneyWhole } from '../../lib/format';

// P&L figures are dollars (Xero export values), not minor units.
const fmtD = (v: number) =>
  new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(v);

const field = 'border border-line rounded-financial bg-raised px-3 py-2 text-base';

/** Union of canonical lines, actual lines and budgeted lines, alphabetical
 *  (the canonical lists are alphabetical, so their ordering is preserved). */
function mergeLines(
  canonical: readonly string[],
  actuals: Record<string, number>,
  budgets: Record<string, number>,
): string[] {
  const set = new Set<string>(canonical);
  for (const k of Object.keys(actuals)) set.add(k);
  for (const k of Object.keys(budgets)) if (set.has(k) || canonical.length === 0) set.add(k);
  return [...set].sort((a, b) => a.localeCompare(b));
}

function VarianceCell(props: {
  actual: number | undefined;
  budget: number | undefined;
  kind: 'income' | 'expense' | 'profit';
}) {
  if (props.actual === undefined || props.budget === undefined) {
    return <Td num className="text-ink-faint">—</Td>;
  }
  const v = props.actual - props.budget;
  // Unfavourable: income or profit under budget, expense over budget.
  const unfavourable = props.kind === 'expense' ? v > 0 : v < 0;
  return <Td num className={unfavourable ? 'text-critical' : ''}>{fmtD(v)}</Td>;
}

function LineRow(props: {
  fy: number;
  line: string;
  actual: number | undefined;
  budget: number | undefined;
  actualsAvailable: boolean;
  kind: 'income' | 'expense';
  onSave: (line: string, amount: number) => void;
}) {
  return (
    <tr>
      <Td className="pl-6">{props.line}</Td>
      <Td num>
        <input
          key={`${props.fy}:${props.line}`}
          className="w-28 text-right tabular border border-line rounded-financial bg-raised px-2 py-1 text-sm"
          inputMode="numeric"
          defaultValue={props.budget ?? ''}
          aria-label={`Budget for ${props.line}, FY ${props.fy}, dollars`}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (raw === '') return;
            const v = Number(raw);
            if (Number.isFinite(v)) props.onSave(props.line, v);
          }}
        />
      </Td>
      <Td num className={props.actual === undefined ? 'text-ink-faint' : ''}>
        {props.actualsAvailable && props.actual !== undefined ? fmtD(props.actual) : '—'}
      </Td>
      <VarianceCell
        actual={props.actualsAvailable ? props.actual ?? 0 : undefined}
        budget={props.budget}
        kind={props.kind}
      />
    </tr>
  );
}

function HeadingRow(props: { children: React.ReactNode }) {
  return (
    <tr className="bg-sunken/40">
      <Td colSpan={4} className="font-medium">{props.children}</Td>
    </tr>
  );
}

function TotalRow(props: {
  label: string;
  budget: number | undefined;
  actual: number | undefined;
  actualsAvailable: boolean;
  kind: 'income' | 'expense' | 'profit';
}) {
  return (
    <tr className="bg-sunken/60 font-medium">
      <Td>{props.label}</Td>
      <Td num>{props.budget !== undefined ? fmtD(props.budget) : '—'}</Td>
      <Td num className={props.actual === undefined || !props.actualsAvailable ? 'text-ink-faint' : ''}>
        {props.actualsAvailable && props.actual !== undefined ? fmtD(props.actual) : '—'}
      </Td>
      <VarianceCell
        actual={props.actualsAvailable ? props.actual : undefined}
        budget={props.budget}
        kind={props.kind}
      />
    </tr>
  );
}

function PlSection() {
  const account = useAccount();
  const qc = useQueryClient();
  const [fy, setFy] = useState(currentFy());

  const statement = useQuery({
    queryKey: ['pl-statement', account.userId, fy],
    queryFn: () => getStatement(account, fy),
  });

  if (statement.isError) {
    return <Banner tone="info">The P&L sits with finance and leadership. If it should be part of your access, Ryan can grant it.</Banner>;
  }
  if (!statement.data) return null;

  const { statement: st, budgets, sourceNote } = statement.data;

  const saveLine = (line: string, amount: number) => {
    saveBudgetLine(fy, line, amount);
    void qc.invalidateQueries({ queryKey: ['pl-statement'] });
  };

  const incomeLines = mergeLines(PL_INCOME_LINES, st.income, budgets);
  const cosLines = Object.keys(st.costOfSales).length > 0
    ? Object.keys(st.costOfSales).sort((a, b) => a.localeCompare(b))
    : ['Cost of Goods Sold'];
  const expenseLines = mergeLines(PL_EXPENSE_LINES, st.expenses, budgets);

  const budgetOf = (lines: string[]) => lines.reduce((s, l) => s + (budgets[l] ?? 0), 0);
  const anyBudget = (lines: string[]) => lines.some((l) => budgets[l] !== undefined);

  const incomeBudget = anyBudget(incomeLines) ? budgetOf(incomeLines) : undefined;
  const cosBudget = anyBudget(cosLines) ? budgetOf(cosLines) : undefined;
  const opexBudget = anyBudget(expenseLines) ? budgetOf(expenseLines) : undefined;
  const grossBudget = incomeBudget !== undefined || cosBudget !== undefined
    ? (incomeBudget ?? 0) - (cosBudget ?? 0)
    : undefined;
  const netBudget = grossBudget !== undefined || opexBudget !== undefined
    ? (grossBudget ?? 0) - (opexBudget ?? 0)
    : undefined;

  return (
    <section aria-label="Profit and loss, budget versus actual">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <label className="text-sm text-ink-muted flex items-center gap-2">
          Financial year
          <select className={field} value={fy} onChange={(e) => setFy(Number(e.target.value))}>
            {fyRange().map((y) => (
              <option key={y} value={y}>FY {y}</option>
            ))}
          </select>
        </label>
        {st.ytd && <StatusChip tone="info">actuals to date</StatusChip>}
      </div>

      {!st.actualsAvailable && (
        <Banner tone="info" className="mb-3">{sourceNote}</Banner>
      )}

      <LedgerTable
        caption={`Profit and loss for FY ${fy}, budget versus actual, in dollars`}
        head={
          <tr>
            <Th>Line</Th>
            <Th num>Budget</Th>
            <Th num>Actual</Th>
            <Th num>Variance</Th>
          </tr>
        }
      >
        <HeadingRow>Income</HeadingRow>
        {incomeLines.map((line) => (
          <LineRow
            key={`${fy}:${line}`} fy={fy} line={line} kind="income"
            actual={st.income[line]} budget={budgets[line]}
            actualsAvailable={st.actualsAvailable} onSave={saveLine}
          />
        ))}
        <TotalRow label="Total Income" budget={incomeBudget} actual={st.totalIncome} actualsAvailable={st.actualsAvailable} kind="income" />

        <HeadingRow>Less Cost of Sales / Cost of Goods Sold</HeadingRow>
        {cosLines.map((line) => (
          <LineRow
            key={`${fy}:${line}`} fy={fy} line={line} kind="expense"
            actual={st.costOfSales[line]} budget={budgets[line]}
            actualsAvailable={st.actualsAvailable} onSave={saveLine}
          />
        ))}
        <TotalRow label="Gross Profit" budget={grossBudget} actual={st.grossProfit} actualsAvailable={st.actualsAvailable} kind="profit" />

        <HeadingRow>Less Operating Expenses</HeadingRow>
        {expenseLines.map((line) => (
          <LineRow
            key={`${fy}:${line}`} fy={fy} line={line} kind="expense"
            actual={st.expenses[line]} budget={budgets[line]}
            actualsAvailable={st.actualsAvailable} onSave={saveLine}
          />
        ))}
        <TotalRow label="Total Operating Expenses" budget={opexBudget} actual={st.totalOperatingExpenses} actualsAvailable={st.actualsAvailable} kind="expense" />
        <TotalRow label="Net Profit" budget={netBudget} actual={st.netProfit} actualsAvailable={st.actualsAvailable} kind="profit" />
      </LedgerTable>

      <p className="text-xs text-ink-faint mt-2">
        {sourceNote} Budgets are dollars per FY; edits save when a field loses focus.
      </p>
    </section>
  );
}

function OverheadRegister() {
  const account = useAccount();
  const overheads = useQuery({
    queryKey: ['overheads', account.userId],
    queryFn: () => getOverheads(account),
  });
  const [description, setDescription] = useState('');
  const [guardMessage, setGuardMessage] = useState<string | null>(null);

  if (overheads.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  const rows = overheads.data ?? [];
  const monthly = rows.filter((r) => r.recurrence === 'monthly').reduce((s, r) => s + r.amountMinor, 0);

  const tryAdd = () => {
    const candidate = {
      id: 'oh-new', createdAt: '2026-06-30T00:00:00Z', createdBy: account.userId,
      updatedAt: '2026-06-30T00:00:00Z', updatedBy: account.userId,
      category: 'other', description, amountMinor: 100000, currency: 'SGD',
      recurrence: 'monthly', effectiveFrom: '2026-07-01', paymentStatus: 'planned',
    };
    const result = companyOverheadSchema.safeParse(candidate);
    if (!result.success) {
      setGuardMessage(result.error.issues[0]?.message ?? 'That entry is not valid.');
    } else {
      setGuardMessage('Saved to the register (demo).');
    }
  };

  return (
    <section aria-label="Console overhead register" className="max-w-3xl">
      <h2 className="display text-lg mb-1">Console overhead register (drives the cockpit)</h2>
      <p className="text-ink-muted mb-4 max-w-2xl">
        The cost of keeping the studio's lights on. Payroll never lives here; it enters through
        employment agreements so each dollar is counted once.
      </p>
      <LedgerTable
        caption="Overhead register"
        head={<tr><Th>Line</Th><Th>Category</Th><Th>Recurrence</Th><Th num>Amount</Th></tr>}
        foot={<tr><Td colSpan={3}>Monthly total</Td><Td num>{fmtMoneyWhole(monthly)}</Td></tr>}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>{r.description}</Td>
            <Td>{r.category}</Td>
            <Td>{r.recurrence}</Td>
            <Td num>{fmtMoneyWhole(r.amountMinor)}</Td>
          </tr>
        ))}
      </LedgerTable>

      <Card className="mt-5">
        <h3 className="display text-lg mb-2">Add a line</h3>
        <div className="flex gap-2 items-end flex-wrap">
          <label className="block flex-1 min-w-[240px]">
            <span className="block text-sm text-ink-muted mb-0.5">Description</span>
            <input
              className="w-full border border-line rounded-financial bg-raised px-3 py-2 text-base"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setGuardMessage(null); }}
              placeholder='Try "Design team salaries" to see the guard'
            />
          </label>
          <Button variant="primary" onClick={tryAdd} disabled={!description}>Add to register</Button>
        </div>
        {guardMessage && (
          <Banner tone={guardMessage.startsWith('Saved') ? 'positive' : 'critical'} className="mt-3">
            {guardMessage}
          </Banner>
        )}
      </Card>
    </section>
  );
}

export default function Overheads() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="P&L and overheads"
        lede="The company's profit and loss, budget against actual for each financial year, with the console's own overhead register underneath."
      />
      <PlSection />
      <hr className="my-8 border-line" />
      <OverheadRegister />
    </div>
  );
}
