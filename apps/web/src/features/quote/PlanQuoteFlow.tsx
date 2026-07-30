// Plan & Quote flow (§8.1): particulars, structure, effort, externals, price,
// scenarios, approval. The price ladder (§6.10) and the effort grid are the two
// anchor surfaces. Every figure is computed by @oe/finance in the browser, the
// same package that will compute it on the server (R1). This is where a
// prospective project's cost structure is understood before a dollar is spent.

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  priceLadder, evaluateQuote, applyDiscount, buildScenario, toMinor,
  type PricingInputs,
} from '@oe/finance';
import { RATE_CARD, AVAILABLE_RATE_CARD } from '@oe/fixtures';
import { useSession } from '../../stores/session';
import { getQuotations, acceptQuotation } from '../../api/queries';
import { Banner, Button, Card, PageHeader, Stat, StatusChip, LedgerTable, Td, Th } from '../../components/ui';
import { fmtMoneyWhole, fmtPct } from '../../lib/format';

const STEPS = ['Particulars', 'Structure', 'Effort', 'Externals', 'Price', 'Scenarios', 'Approval'] as const;

const ROLES: { key: string; label: string }[] = [
  { key: 'founder', label: 'Founder' },
  { key: 'creative_director', label: 'Creative director' },
  { key: 'account_director', label: 'Account director' },
  { key: 'account_manager', label: 'Account manager' },
  { key: 'designer', label: 'Designer' },
  { key: 'associate_creative_producer', label: 'Assoc. creative producer' },
];

const DEFAULT_PHASES = [
  'Discovery', 'Research', 'Audience analysis', 'Strategic development',
  'Concept creation', 'Recommendations', 'Presentation', 'Refinement', 'Project management',
];

// Overhead recovery basis (§6.6): monthly overhead 12,000 over the team's
// monthly productive hours (5 × 1,452.8 + 1,120 = 8,384 a year).
const OVERHEAD_PER_PRODUCTIVE_HOUR_MINOR = Math.round(12_000_00 / (8384 / 12));

type EffortGrid = Record<string, Record<string, number>>; // phase -> role -> hours

const INITIAL_EFFORT: EffortGrid = {
  Discovery: { founder: 8, creative_director: 16, account_director: 20, designer: 8 },
  Research: { account_director: 30, designer: 20, associate_creative_producer: 24 },
  'Audience analysis': { account_director: 24, associate_creative_producer: 20 },
  'Strategic development': { founder: 16, creative_director: 40, account_director: 30 },
  'Concept creation': { creative_director: 60, designer: 80, associate_creative_producer: 30 },
  Recommendations: { founder: 8, creative_director: 24, account_director: 16 },
  Presentation: { founder: 6, creative_director: 12, account_director: 10, designer: 16 },
  Refinement: { creative_director: 20, designer: 30 },
  'Project management': { account_director: 40, associate_creative_producer: 30 },
};

export default function PlanQuoteFlow() {
  const { quoteId = '' } = useParams();
  const account = useSession((s) => s.account);
  const qc = useQueryClient();
  const quotes = useQuery({ queryKey: ['quotations', account.userId], queryFn: () => getQuotations(account) });
  const record = quotes.data?.find((q) => q.quotation.id === quoteId);

  const [step, setStep] = useState(0);
  const [effort, setEffort] = useState<EffortGrid>(INITIAL_EFFORT);
  const [externalCost, setExternalCost] = useState(30_000);
  const [expenses, setExpenses] = useState(12_000);
  const [contingencyPct, setContingencyPct] = useState(0.1);
  const [markUpPct, setMarkUpPct] = useState(0.2);
  const [targetMargin, setTargetMargin] = useState(0.5);
  const [discountPct, setDiscountPct] = useState(0);
  const [confirmedBreach, setConfirmedBreach] = useState(false);
  const [durationMonths, setDurationMonths] = useState(12);

  const accept = useMutation({
    mutationFn: () => acceptQuotation(account, quoteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  });

  const hoursByRole = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const phase of Object.values(effort)) {
      for (const [role, h] of Object.entries(phase)) {
        totals[role] = (totals[role] ?? 0) + (h || 0);
      }
    }
    return totals;
  }, [effort]);

  const inputs: PricingInputs = useMemo(() => ({
    estHoursByRole: hoursByRole,
    paidRatesMinor: RATE_CARD,
    availableRatesMinor: AVAILABLE_RATE_CARD,
    externalCostMinor: toMinor(externalCost),
    externalMarkUpPct: markUpPct,
    expensesMinor: toMinor(expenses),
    contingencyPct,
    overheadPerProductiveHourMinor: OVERHEAD_PER_PRODUCTIVE_HOUR_MINOR,
    targetGrossMarginPct: targetMargin,
  }), [hoursByRole, externalCost, expenses, contingencyPct, markUpPct, targetMargin]);

  const ladder = useMemo(() => priceLadder(inputs), [inputs]);
  const discounted = useMemo(() => applyDiscount(ladder, discountPct), [ladder, discountPct]);
  const breach = discounted.breachesMinimumSafe;

  const scenarios = useMemo(() => {
    const scale = (f: number): PricingInputs => ({
      ...inputs,
      estHoursByRole: Object.fromEntries(Object.entries(hoursByRole).map(([r, h]) => [r, h * f])),
    });
    const price = (i: PricingInputs) => priceLadder(i).recommendedPriceMinor;
    return [
      buildScenario('best', 'Best', scale(0.85), price(scale(0.85)), durationMonths - 1),
      buildScenario('expected', 'Expected', inputs, discounted.quotedPriceMinor, durationMonths),
      buildScenario('high_effort', 'High-effort', scale(1.25), discounted.quotedPriceMinor, durationMonths + 2),
      buildScenario('reduced_scope', 'Reduced-scope', scale(0.7), price(scale(0.7)), durationMonths - 2),
    ];
  }, [inputs, hoursByRole, discounted.quotedPriceMinor, durationMonths]);

  const q = record?.quotation;
  const accepted = q?.status === 'accepted';
  const gst = 0.09;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Plan & Quote' }, { label: record?.project?.name ?? 'Estimate' }]}
        title={record?.project?.name ?? 'Estimate'}
        lede="One language from promise to proof: these phases, roles and hours become the structure the project is delivered and measured against."
      />

      <nav className="flex gap-1 mb-6 flex-wrap" aria-label="Estimate steps">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            aria-current={step === i ? 'step' : undefined}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors duration-settle ${
              step === i
                ? 'border-accent bg-accent text-white'
                : i < step
                  ? 'border-accent/40 text-accent bg-accent/5'
                  : 'border-line text-ink-muted hover:text-ink'
            }`}
          >
            {i + 1} · {s}
          </button>
        ))}
      </nav>

      {step === 0 && (
        <Card className="max-w-2xl space-y-3">
          <h2 className="display text-lg">Particulars</h2>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Client" value={record?.project ? 'Harbourline Trust' : '—'} />
            <Stat label="Service line" value={record?.project?.serviceLine.replace(/_/g, ' ') ?? '—'} />
            <Stat label="Window" value={`${record?.project?.startDate ?? ''} → ${record?.project?.targetEndDate ?? ''}`} />
            <Stat
              label="Duration"
              value={
                <span className="flex items-center gap-2">
                  <input
                    type="number" min={1} max={24}
                    className="w-16 border border-line rounded-financial bg-raised px-2 py-1 tabular"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value) || 1)}
                    aria-label="Duration in months"
                  />
                  months
                </span>
              }
            />
          </div>
          <p className="text-sm text-ink-muted">
            Probability {Math.round((record?.project?.probability ?? 0.6) * 100)}%. A weighted
            view of this fee flows into the company pipeline the moment the estimate is saved.
          </p>
        </Card>
      )}

      {step === 1 && (
        <Card className="max-w-2xl">
          <h2 className="display text-lg mb-2">Structure</h2>
          <p className="text-sm text-ink-muted mb-3">
            Creative strategy template. Phases can be renamed or removed; the estimate, the time
            entries, the costs and the retrospective will all share whatever structure leaves
            this screen.
          </p>
          <ol className="list-decimal pl-6 space-y-1">
            {DEFAULT_PHASES.map((p) => <li key={p} className="text-base">{p}</li>)}
          </ol>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h2 className="display text-lg mb-3">Effort grid</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-ink-muted">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Phase</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="text-right px-2 py-1.5 font-medium whitespace-nowrap">{r.label}</th>
                  ))}
                  <th className="text-right px-2 py-1.5 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {DEFAULT_PHASES.map((phase) => {
                  const row = effort[phase] ?? {};
                  const rowTotal = Object.values(row).reduce((s, h) => s + (h || 0), 0);
                  return (
                    <tr key={phase}>
                      <td className="px-2 py-1">{phase}</td>
                      {ROLES.map((r) => (
                        <td key={r.key} className="px-1 py-1 text-right">
                          <input
                            type="number" min={0}
                            aria-label={`${phase}, ${r.label} hours`}
                            className="w-16 border border-line rounded-financial bg-raised px-1.5 py-0.5 text-right tabular"
                            value={row[r.key] ?? ''}
                            placeholder="0"
                            onChange={(e) =>
                              setEffort((prev) => ({
                                ...prev,
                                [phase]: { ...prev[phase], [r.key]: Number(e.target.value) || 0 },
                              }))
                            }
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right tabular font-medium">{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-line font-medium">
                <tr>
                  <td className="px-2 py-1.5">Total</td>
                  {ROLES.map((r) => (
                    <td key={r.key} className="px-2 py-1.5 text-right tabular">{hoursByRole[r.key] ?? 0}</td>
                  ))}
                  <td className="px-2 py-1.5 text-right tabular">{ladder.estHours}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="max-w-xl space-y-4">
          <h2 className="display text-lg">External costs</h2>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">External collaborators and partners (SGD, what we pay)</span>
            <input type="number" min={0} className="w-40 border border-line rounded-financial bg-raised px-3 py-2 tabular"
              value={externalCost} onChange={(e) => setExternalCost(Number(e.target.value) || 0)} />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Expenses: travel, production, licences (SGD)</span>
            <input type="number" min={0} className="w-40 border border-line rounded-financial bg-raised px-3 py-2 tabular"
              value={expenses} onChange={(e) => setExpenses(Number(e.target.value) || 0)} />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Mark-up on external sell (a pricing event, never a recorded cost)</span>
            <input type="range" min={0} max={0.4} step={0.05} value={markUpPct}
              onChange={(e) => setMarkUpPct(Number(e.target.value))} className="w-64 align-middle" />
            <span className="tabular ml-2">{fmtPct(markUpPct, 0)}</span>
          </label>
          <p className="text-sm text-ink-muted">
            External sell at mark-up: <span className="tabular">{fmtMoneyWhole(ladder.externalSellMinor)}</span>
          </p>
        </Card>
      )}

      {step === 4 && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <Card>
            <h2 className="display text-lg mb-3">The price ladder</h2>
            <LedgerTable
              caption="Price ladder, §6.10"
              head={<tr><Th>Layer</Th><Th num>Amount</Th></tr>}
            >
              <tr><Td>1 · Effort</Td><Td num>{ladder.estHours} hours</Td></tr>
              <tr><Td>2 · Internal cost (cost per paid hour)</Td><Td num>{fmtMoneyWhole(ladder.internalCostMinor)}</Td></tr>
              <tr><Td>3 · Loaded check (the leave-carrying floor)</Td><Td num className="text-ink-muted">{fmtMoneyWhole(ladder.loadedCheckMinor)}</Td></tr>
              <tr><Td>4 · External cost</Td><Td num>{fmtMoneyWhole(ladder.externalCostMinor)}</Td></tr>
              <tr><Td>5 · External sell (+{fmtPct(markUpPct, 0)})</Td><Td num>{fmtMoneyWhole(ladder.externalSellMinor)}</Td></tr>
              <tr><Td>6 · Expenses</Td><Td num>{fmtMoneyWhole(ladder.expensesMinor)}</Td></tr>
              <tr>
                <Td>
                  7 · Contingency{' '}
                  <input type="range" min={0} max={0.25} step={0.05} value={contingencyPct}
                    onChange={(e) => setContingencyPct(Number(e.target.value))} className="w-24 align-middle mx-1" aria-label="Contingency percent" />
                  <span className="tabular">{fmtPct(contingencyPct, 0)}</span>
                </Td>
                <Td num>{fmtMoneyWhole(ladder.contingencyMinor)}</Td>
              </tr>
              <tr><Td>8 · Overhead recovery <span className="text-xs text-ink-faint">(analytical view)</span></Td><Td num>{fmtMoneyWhole(ladder.overheadRecoveryMinor)}</Td></tr>
              <tr>
                <Td>
                  9 · Target margin on price{' '}
                  <input type="range" min={0.2} max={0.65} step={0.05} value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))} className="w-24 align-middle mx-1" aria-label="Target margin percent" />
                  <span className="tabular">{fmtPct(targetMargin, 0)}</span>
                </Td>
                <Td num className="font-medium">{fmtMoneyWhole(ladder.recommendedPriceMinor)}</Td>
              </tr>
            </LedgerTable>
          </Card>

          <div className="space-y-3">
            <Card className="space-y-2">
              <Stat label="Negotiation floor" value={fmtMoneyWhole(ladder.negotiationFloorMinor)} sub="below this the project destroys cash" tone="critical" />
              <Stat label="Minimum safe price" value={fmtMoneyWhole(ladder.minimumSafePriceMinor)} sub="below this it does not pay its share of the studio" tone="caution" />
              <Stat label="Recommended price" value={fmtMoneyWhole(ladder.recommendedPriceMinor)} sub={`at ${fmtPct(targetMargin, 0)} margin on price`} tone="positive" />
            </Card>
            <Card>
              <div className="text-sm text-ink-muted mb-1">Discount lever</div>
              <input type="range" min={0} max={0.6} step={0.01} value={discountPct}
                onChange={(e) => { setDiscountPct(Number(e.target.value)); setConfirmedBreach(false); }}
                className="w-full" aria-label="Discount percent" />
              <div className="flex justify-between text-sm mt-1">
                <span className="tabular">{fmtPct(discountPct, 0)} discount</span>
                <span className="tabular font-medium">{fmtMoneyWhole(discounted.quotedPriceMinor)}</span>
              </div>
              <div className="text-sm mt-2 space-y-0.5">
                <div className="flex justify-between"><span className="text-ink-muted">Resulting margin</span><span className={`tabular ${discounted.grossMargin < 0.2 ? 'text-critical' : ''}`}>{fmtPct(discounted.grossMargin)}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Profit per hour</span><span className="tabular">{(discounted.profitPerHourMinor / 100).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Profit per month</span><span className="tabular">{fmtMoneyWhole(Math.round(discounted.grossProfitMinor / durationMonths))}</span></div>
              </div>
              {breach && !confirmedBreach && (
                <Banner tone="critical" className="mt-3">
                  This discount takes the price below the minimum safe price. The project would
                  not pay its share of the studio.
                  <Button variant="danger" size="sm" className="mt-2" onClick={() => setConfirmedBreach(true)}>
                    I understand, keep the discount
                  </Button>
                </Banner>
              )}
              {breach && confirmedBreach && (
                <Banner tone="caution" className="mt-3">Breach acknowledged. It will be visible on the approval step.</Banner>
              )}
            </Card>
          </div>
        </div>
      )}

      {step === 5 && (
        <Card>
          <h2 className="display text-lg mb-3">Four scenarios, one structure</h2>
          <LedgerTable
            caption="Scenario comparison"
            head={<tr><Th>Scenario</Th><Th num>Fee</Th><Th num>Cost</Th><Th num>Gross profit</Th><Th num>Margin</Th><Th num>Profit/hr</Th><Th num>Profit/mo</Th></tr>}
          >
            {scenarios.map((s) => (
              <tr key={s.key} className={s.key === 'expected' ? 'bg-accent/5' : ''}>
                <Td className={s.key === 'expected' ? 'font-medium' : ''}>
                  {s.label}{s.key === 'expected' && <span className="text-xs text-accent block">approval baseline</span>}
                </Td>
                <Td num>{fmtMoneyWhole(s.quote.quotedPriceMinor)}</Td>
                <Td num>{fmtMoneyWhole(s.ladder.negotiationFloorMinor)}</Td>
                <Td num className={s.quote.grossProfitMinor < 0 ? 'text-critical' : ''}>{fmtMoneyWhole(s.quote.grossProfitMinor)}</Td>
                <Td num>{fmtPct(s.quote.grossMargin)}</Td>
                <Td num>{(s.quote.profitPerHourMinor / 100).toFixed(2)}</Td>
                <Td num>{fmtMoneyWhole(s.profitPerMonthMinor)}</Td>
              </tr>
            ))}
          </LedgerTable>
          <p className="text-xs text-ink-faint mt-2">
            Expected is always the approval baseline. High-effort assumes 25 percent more hours
            at the same fee; that margin is the one to be able to live with.
          </p>
        </Card>
      )}

      {step === 6 && (
        <Card className="max-w-2xl space-y-4">
          <h2 className="display text-lg">Approval</h2>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Quoted fee (excl GST)" value={fmtMoneyWhole(discounted.quotedPriceMinor)} />
            <Stat label="GST 9%" value={fmtMoneyWhole(Math.round(discounted.quotedPriceMinor * gst))} />
            <Stat label="Margin at quote" value={fmtPct(discounted.grossMargin)} tone={discounted.grossMargin < 0.2 ? 'critical' : 'default'} />
            <Stat label="Estimated hours" value={`${ladder.estHours}h`} />
          </div>
          {breach && (
            <Banner tone="critical">This quote sits below the minimum safe price and carries an acknowledged breach.</Banner>
          )}
          <div className="text-sm text-ink-muted">
            Standard clauses attach on issue: three rounds of amendments included, working files
            at 20 percent of cost, look-and-feel scope limits, sample-application clarification.
          </div>
          {accepted ? (
            <Banner tone="positive">
              Accepted. The estimate is frozen as the baseline; change now flows only through
              approved variations.
            </Banner>
          ) : account.roles.includes('leadership') ? (
            <Button variant="primary" onClick={() => accept.mutate()} disabled={accept.isPending || (breach && !confirmedBreach)}>
              Accept and freeze baseline
            </Button>
          ) : (
            <Banner tone="info">Quotation acceptance sits with leadership.</Banner>
          )}
          {accept.isError && (
            <Banner tone="critical">{String((accept.error as Error).message) === 'already_accepted' ? 'This version is already accepted and immutable.' : "That didn't save. Try again in a moment."}</Banner>
          )}
        </Card>
      )}

      <div className="flex justify-between mt-6 max-w-2xl">
        <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
        <Button variant="primary" onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} disabled={step === STEPS.length - 1}>
          Continue
        </Button>
      </div>
    </div>
  );
}
