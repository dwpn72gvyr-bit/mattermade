// Company cockpit (§8.1): one page that reads like a monthly account.
// Recognised revenue, project gross profit, the payroll buckets, overheads,
// operating profit, coverage, tie-out badge. Every figure drills to its inputs.

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAccount, useSession } from '../../stores/session';
import { getCockpit, getCockpitTrend, MONTHS } from '../../api/queries';
import { Banner, Card, LedgerTable, PageHeader, Stat, StatusChip, Td, Th } from '../../components/ui';
import { fmtMoneyWhole, fmtPct, fmtPeriod } from '../../lib/format';

export default function Cockpit() {
  const account = useAccount();
  const [month, setMonth] = useState('2026-05');
  const cockpit = useQuery({
    queryKey: ['cockpit', account.userId, month],
    queryFn: () => getCockpit(account, month),
  });
  const trend = useQuery({
    queryKey: ['cockpit-trend', account.userId],
    queryFn: () => getCockpitTrend(account),
  });

  const c = cockpit.data;
  if (cockpit.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  const coverageShort = c && c.overheadCoverage < 1;

  return (
    <div>
      <PageHeader
        title="Company cockpit"
        lede="The month as one honest account: what projects earned, what the studio costs, and whether the first covers the second."
        actions={
          <select
            className="border border-line rounded-financial bg-raised px-2 py-1.5 text-base"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Month"
          >
            {[...MONTHS].reverse().map((m) => (
              <option key={m} value={m}>{fmtPeriod(m)}</option>
            ))}
          </select>
        }
      />

      {c && (
        <div className="space-y-5">
          {coverageShort && (
            <Banner tone="caution">
              {fmtPeriod(month)}'s project profit covered {Math.round(c.overheadCoverage * 100)} percent
              of running costs. Every project can make money and the studio can still fall short,
              which is exactly what this page exists to show.
            </Banner>
          )}

          <div className="grid md:grid-cols-4 gap-4">
            <Card><Stat label="Recognised revenue" value={fmtMoneyWhole(c.recognisedRevenueMinor)} sub={fmtPeriod(month)} /></Card>
            <Card><Stat label="Project gross profit" value={fmtMoneyWhole(c.projectGrossProfitMinor)} tone={c.projectGrossProfitMinor < 0 ? 'critical' : 'positive'} sub="recognised basis" /></Card>
            <Card>
              <Stat
                label="Operating profit"
                value={fmtMoneyWhole(c.operatingProfitMinor)}
                tone={c.operatingProfitMinor < 0 ? 'critical' : 'positive'}
                sub={`margin ${fmtPct(c.operatingMargin)}`}
              />
            </Card>
            <Card>
              <Stat
                label="Coverage · tie-out"
                value={
                  <span className="flex items-center gap-2">
                    <span className="tabular">{c.overheadCoverage.toFixed(2)}</span>
                    <StatusChip tone={c.tieOut.status === 'green' ? 'positive' : c.tieOut.status === 'amber' ? 'caution' : 'critical'}>
                      {c.tieOut.status}
                    </StatusChip>
                  </span>
                }
                sub="gross profit ÷ running costs"
              />
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <h2 className="display text-lg mb-3">The month, line by line</h2>
              <LedgerTable
                caption={`Company account for ${fmtPeriod(month)}`}
                head={<tr><Th>Line</Th><Th num>Amount</Th></tr>}
                foot={
                  <tr>
                    <Td>Operating profit</Td>
                    <Td num className={c.operatingProfitMinor < 0 ? 'text-critical' : 'text-positive'}>
                      {fmtMoneyWhole(c.operatingProfitMinor)}
                    </Td>
                  </tr>
                }
              >
                <tr><Td>Project gross profit</Td><Td num>{fmtMoneyWhole(c.projectGrossProfitMinor)}</Td></tr>
                <tr><Td>Non-project payroll <span className="text-xs text-ink-faint">(bd, admin, training, leave)</span></Td><Td num>−{fmtMoneyWhole(c.nonProjectPayrollMinor)}</Td></tr>
                <tr><Td>Unallocated payroll <span className="text-xs text-ink-faint">(scheduled, unmapped)</span></Td><Td num>−{fmtMoneyWhole(c.unallocatedPayrollMinor)}</Td></tr>
                <tr><Td>Company overheads</Td><Td num>−{fmtMoneyWhole(c.overheadMinor)}</Td></tr>
                <tr>
                  <Td>Reconciliation <span className="text-xs text-ink-faint">(absorbed overtime)</span></Td>
                  <Td num>{c.reconciliationMinor >= 0 ? '' : '−'}{fmtMoneyWhole(Math.abs(c.reconciliationMinor))}</Td>
                </tr>
              </LedgerTable>
              <p className="text-xs text-ink-faint mt-2">
                Salaries enter this account through exactly one door: the allocation identity.
                Projects carry their share inside gross profit; the rest appears here. Nothing is
                counted twice.
              </p>
            </Card>

            <Card>
              <h2 className="display text-lg mb-3">Where project profit came from</h2>
              <LedgerTable
                caption="Per-project contribution this month"
                head={<tr><Th>Project</Th><Th num>Revenue</Th><Th num>Costs</Th><Th num>GP</Th></tr>}
              >
                {c.perProject
                  .sort((a, b) => b.gp - a.gp)
                  .map((p) => (
                    <tr key={p.projectId}>
                      <Td><Link className="hover:text-accent" to={`/projects/${p.projectId}`}>{p.name}</Link></Td>
                      <Td num>{fmtMoneyWhole(p.recognised)}</Td>
                      <Td num>−{fmtMoneyWhole(p.labour + p.external + p.expenses)}</Td>
                      <Td num className={p.gp < 0 ? 'text-critical' : ''}>{fmtMoneyWhole(p.gp)}</Td>
                    </tr>
                  ))}
              </LedgerTable>
            </Card>
          </div>

          {trend.data && (
            <Card>
              <h2 className="display text-lg mb-3">Twelve months of coverage</h2>
              <div className="flex items-end gap-1 h-28" role="img"
                aria-label={`Overhead coverage by month: ${trend.data.map((t) => `${fmtPeriod(t.period)} ${t.overheadCoverage.toFixed(2)}`).join(', ')}`}>
                {trend.data.map((t) => {
                  const h = Math.min(1.6, Math.max(0.05, t.overheadCoverage)) / 1.6;
                  return (
                    <div key={t.period} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-sunken rounded-sm overflow-hidden flex flex-col justify-end" style={{ height: '88px' }}>
                        <div
                          className={`w-full ${t.overheadCoverage >= 1 ? 'bg-accent' : 'bg-caution'}`}
                          style={{ height: `${h * 100}%` }}
                          title={`${fmtPeriod(t.period)}: ${t.overheadCoverage.toFixed(2)}`}
                        />
                      </div>
                      <span className="text-[10px] text-ink-faint">{t.period.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-ink-faint mt-2">
                A ratio, never a speedometer. Below 1.00 the month's project profit did not cover
                running costs. Table view: each bar is labelled with its month and value.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
