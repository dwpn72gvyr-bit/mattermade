// Employee profile (§8): General and Capacity for those with access; the
// Employment, Remuneration and Cost-rate tabs exist only for finance and super
// admin. Absent, not greyed out (subtractive navigation, R6).

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getPerson } from '../../api/queries';
import { Banner, Card, LedgerTable, PageHeader, Stat, StatusChip, Td, Th } from '../../components/ui';
import { fmtDate, fmtMoneyWhole } from '../../lib/format';

export default function PersonProfile() {
  const { personId = '' } = useParams();
  const account = useAccount();
  const person = useQuery({
    queryKey: ['person', account.userId, personId],
    queryFn: () => getPerson(account, personId),
  });
  const [tab, setTab] = useState('General');

  if (person.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }
  const d = person.data;
  if (!d) return <div className="text-ink-muted py-10 text-center">Loading…</div>;

  const tabs = ['General', ...(d.access.agreementsAllowed ? ['Employment', 'Cost rates'] : []), 'Sell rates'];

  return (
    <div className="max-w-3xl">
      <PageHeader crumbs={[{ label: 'Directory' }, { label: d.person.name }]} title={d.person.name} lede={d.person.title} />
      <nav className="flex gap-1 border-b border-line mb-5" aria-label="Profile sections">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            aria-current={tab === t ? 'page' : undefined}
            className={`px-3 py-2 text-base border-b-2 -mb-px ${tab === t ? 'border-accent text-accent font-medium' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {t}
          </button>
        ))}
      </nav>

      {tab === 'General' && (
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Team" value={d.person.team ?? '—'} />
            <Stat label="Role" value={d.person.roleKey.replace(/_/g, ' ')} />
            <Stat label="Since" value={fmtDate(d.person.startDate)} />
            <Stat label="Schedule" value={d.schedule ? `${d.schedule.daysPerWeek} days · ${d.schedule.weeklyHours}h` : '—'} />
          </div>
          <div className="flex flex-wrap gap-1 mt-4">
            {d.person.skills.map((s) => (
              <span key={s} className="text-xs border border-line rounded-full px-2 py-0.5 text-ink-muted">{s}</span>
            ))}
          </div>
        </Card>
      )}

      {tab === 'Employment' && d.agreements && (
        <LedgerTable
          caption="Employment agreements, dated history"
          head={<tr><Th>Effective</Th><Th>Type</Th><Th num>Monthly salary</Th><Th>Status</Th></tr>}
        >
          {d.agreements.map((a) => (
            <tr key={a.id}>
              <Td>{fmtDate(a.effectiveFrom)}{a.effectiveTo ? ` → ${fmtDate(a.effectiveTo)}` : ' → present'}</Td>
              <Td>{a.employmentType.replace(/_/g, ' ')}</Td>
              <Td num>{fmtMoneyWhole(a.monthlySalaryMinor)}</Td>
              <Td>{a.effectiveTo ? <StatusChip tone="neutral">Superseded</StatusChip> : <StatusChip tone="positive">Current</StatusChip>}</Td>
            </tr>
          ))}
        </LedgerTable>
      )}

      {tab === 'Cost rates' && d.costRates && (
        <div className="space-y-3">
          <LedgerTable
            caption="Derived cost rates, dated history"
            head={<tr><Th>Effective</Th><Th num>Per paid hour</Th><Th num>Per available hour</Th><Th num>Per productive hour</Th></tr>}
          >
            {d.costRates.map((r) => (
              <tr key={r.id}>
                <Td>{fmtDate(r.effectiveFrom)}{r.effectiveTo ? ` → ${fmtDate(r.effectiveTo)}` : ' → present'}</Td>
                <Td num>{'$'}{(r.paidHourRateMinor / 100).toFixed(2)}</Td>
                <Td num>{'$'}{(r.availableHourRateMinor / 100).toFixed(2)}</Td>
                <Td num>{'$'}{(r.productiveHourRateMinor / 100).toFixed(2)}</Td>
              </tr>
            ))}
          </LedgerTable>
          <Banner tone="info">
            Rates are derived from agreements, never hand-typed. A salary change creates a new
            dated agreement and rate; prior periods keep the rates that were true at the time.
          </Banner>
        </div>
      )}

      {tab === 'Sell rates' && (
        <LedgerTable
          caption="Role sell rates"
          head={<tr><Th>Scope</Th><Th num>Per hour</Th></tr>}
        >
          {d.sellRates
            .filter((s) => s.scope.type === 'role' && s.scope.roleKey === d.person.roleKey)
            .map((s) => (
              <tr key={s.id}>
                <Td>{d.person.roleKey.replace(/_/g, ' ')}</Td>
                <Td num>{fmtMoneyWhole(s.rateMinor)}</Td>
              </tr>
            ))}
        </LedgerTable>
      )}
    </div>
  );
}
