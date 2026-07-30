// Fixed core report library (§8, Release 1). Reports are views over the same
// engine figures; a report a user cannot see is unbuildable, not blocked.

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '../../stores/session';
import { getCockpitTrend, getPortfolio, getTimeAllocationView } from '../../api/queries';
import { Banner, Card, LedgerTable, PageHeader, Td, Th } from '../../components/ui';
import { fmtMoneyWhole, fmtPct, fmtPeriod } from '../../lib/format';

const REPORTS = [
  { key: 'portfolio', name: 'Portfolio profitability', blurb: 'Every project: fee, cost, gross profit, margin, profit per hour.' },
  { key: 'monthly', name: 'Company monthly summary', blurb: 'Twelve months of revenue, project profit and operating profit.' },
  { key: 'allocation', name: 'Time allocation', blurb: 'Where paid time went, at cost, by category.' },
  { key: 'health', name: 'Delivery health', blurb: 'Hours consumed against schedule for every open project.' },
] as const;

export default function ReportLibrary() {
  const account = useSession((s) => s.account);
  const [active, setActive] = useState<(typeof REPORTS)[number]['key']>('portfolio');
  const portfolio = useQuery({ queryKey: ['portfolio', account.userId], queryFn: () => getPortfolio(account) });
  const trend = useQuery({ queryKey: ['cockpit-trend', account.userId], queryFn: () => getCockpitTrend(account), enabled: active === 'monthly' });
  const allocation = useQuery({ queryKey: ['time-allocation', account.userId], queryFn: () => getTimeAllocationView(account), enabled: active === 'allocation' });

  if (portfolio.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  return (
    <div>
      <PageHeader title="Report library" lede="The fixed core set. Every figure originates in the finance engine and drills back to its inputs." />
      <div className="grid md:grid-cols-4 gap-3 mb-6">
        {REPORTS.map((r) => (
          <button key={r.key} onClick={() => setActive(r.key)}
            className={`text-left border rounded-financial p-4 transition-colors duration-settle ${active === r.key ? 'border-accent bg-accent/5' : 'border-line bg-raised hover:bg-sunken/50'}`}>
            <div className="font-medium text-base">{r.name}</div>
            <div className="text-sm text-ink-muted mt-1">{r.blurb}</div>
          </button>
        ))}
      </div>

      {active === 'portfolio' && (
        <Card>
          <p className="text-sm text-ink-muted mb-2">The full table lives in <Link className="text-accent underline" to="/projects">Portfolio</Link>; this is the closed-project ledger.</p>
          <LedgerTable caption="Closed project profitability"
            head={<tr><Th>Project</Th><Th num>Fee</Th><Th num>Cost</Th><Th num>GP</Th><Th num>Margin</Th><Th num>Profit/hr</Th></tr>}>
            {(portfolio.data ?? [])
              .filter((r) => ['completed', 'financially_closed'].includes(r.project.status) && 'value' in r.fee)
              .map((r) => (
                <tr key={r.project.id}>
                  <Td>{r.project.name}</Td>
                  <Td num>{'value' in r.fee ? fmtMoneyWhole(r.fee.value, r.project.currency) : null}</Td>
                  <Td num>{'value' in r.actualCost ? fmtMoneyWhole(r.actualCost.value, r.project.currency) : null}</Td>
                  <Td num className={'value' in r.grossProfit && r.grossProfit.value < 0 ? 'text-critical' : ''}>
                    {'value' in r.grossProfit ? fmtMoneyWhole(r.grossProfit.value, r.project.currency) : null}
                  </Td>
                  <Td num>{'value' in r.margin ? fmtPct(r.margin.value) : null}</Td>
                  <Td num>{'value' in r.profitPerHour ? (r.profitPerHour.value / 100).toFixed(2) : null}</Td>
                </tr>
              ))}
          </LedgerTable>
        </Card>
      )}

      {active === 'monthly' && trend.data && (
        <LedgerTable caption="Company monthly summary"
          head={<tr><Th>Month</Th><Th num>Recognised revenue</Th><Th num>Project GP</Th><Th num>Operating profit</Th><Th num>Coverage</Th></tr>}>
          {trend.data.map((t) => (
            <tr key={t.period}>
              <Td>{fmtPeriod(t.period)}</Td>
              <Td num>{fmtMoneyWhole(t.recognisedRevenueMinor)}</Td>
              <Td num>{fmtMoneyWhole(t.projectGrossProfitMinor)}</Td>
              <Td num className={t.operatingProfitMinor < 0 ? 'text-critical' : ''}>{fmtMoneyWhole(t.operatingProfitMinor)}</Td>
              <Td num>{t.overheadCoverage.toFixed(2)}</Td>
            </tr>
          ))}
        </LedgerTable>
      )}

      {active === 'allocation' && allocation.data && (
        <LedgerTable caption="Time allocation by month, at cost"
          head={<tr><Th>Month</Th><Th num>Project labour</Th><Th num>Non-project</Th><Th num>Unallocated</Th></tr>}>
          {allocation.data.map((m) => (
            <tr key={m.period}>
              <Td>{fmtPeriod(m.period)}</Td>
              <Td num>{fmtMoneyWhole(m.projectLabourMinor)}</Td>
              <Td num>{fmtMoneyWhole(Object.values(m.nonProjectByActivity).reduce((s, v) => s + v, 0))}</Td>
              <Td num>{fmtMoneyWhole(m.unallocatedMinor)}</Td>
            </tr>
          ))}
        </LedgerTable>
      )}

      {active === 'health' && (
        <LedgerTable caption="Delivery health for open projects"
          head={<tr><Th>Project</Th><Th num>Hours used</Th><Th num>Timeline elapsed</Th><Th num>Gap</Th></tr>}>
          {(portfolio.data ?? [])
            .filter((r) => ['active', 'planning', 'on_hold'].includes(r.project.status) && r.metrics.hoursConsumedPct !== undefined)
            .map((r) => {
              const gap = (r.metrics.hoursConsumedPct ?? 0) - r.metrics.scheduleElapsedPct;
              return (
                <tr key={r.project.id}>
                  <Td><Link className="hover:text-accent" to={`/projects/${r.project.id}`}>{r.project.name}</Link></Td>
                  <Td num>{fmtPct(r.metrics.hoursConsumedPct ?? 0, 0)}</Td>
                  <Td num>{fmtPct(r.metrics.scheduleElapsedPct, 0)}</Td>
                  <Td num className={gap >= 0.15 ? 'text-caution font-medium' : ''}>{gap >= 0 ? '+' : ''}{fmtPct(gap, 0)}</Td>
                </tr>
              );
            })}
        </LedgerTable>
      )}
    </div>
  );
}
