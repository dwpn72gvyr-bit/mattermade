// Employee profile (§8, client direction item 9): one page per person, no
// tabs. Everything the viewer may see flows in a single column: identity
// first, then employment and cost-rate history for those with access
// (absent otherwise, never greyed: subtractive navigation, R6), then sell
// rates. Super admin and ops can edit the identity fields inline.

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from '../../stores/session';
import { getPerson } from '../../api/queries';
import { db, nowIso } from '../../api/db';
import { Banner, Button, Card, LedgerTable, PageHeader, Stat, StatusChip, Td, Th } from '../../components/ui';
import { fmtDate, fmtMoneyWhole } from '../../lib/format';

const field = 'w-full border border-line rounded-financial bg-raised px-3 py-2 text-base';

export default function PersonProfile() {
  const { personId = '' } = useParams();
  const account = useAccount();
  const qc = useQueryClient();
  const person = useQuery({
    queryKey: ['person', account.userId, personId],
    queryFn: () => getPerson(account, personId),
  });

  const canEdit = ['super_admin', 'ops_admin'].some((r) => account.roles.includes(r));
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [team, setTeam] = useState('');
  const [skills, setSkills] = useState('');

  if (person.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }
  const d = person.data;
  if (!d) return <div className="text-ink-muted py-10 text-center">Loading…</div>;

  const startEdit = () => {
    setName(d.person.name);
    setTitle(d.person.title);
    setTeam(d.person.team ?? '');
    setSkills(d.person.skills.join(', '));
    setEditing(true);
  };

  const saveEdit = () => {
    // Mock layer only: Stage B replaces this direct mutation with a
    // people.update procedure behind the same permission check.
    const p = db.people.find((x) => x.id === personId);
    if (!p) return;
    if (name.trim()) p.name = name.trim();
    if (title.trim()) p.title = title.trim();
    p.team = team.trim() || undefined;
    p.skills = skills.split(',').map((s) => s.trim()).filter(Boolean);
    p.updatedAt = nowIso();
    p.updatedBy = account.userId;
    setEditing(false);
    void qc.invalidateQueries({ queryKey: ['person'] });
    void qc.invalidateQueries({ queryKey: ['directory'] });
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        crumbs={[{ label: 'Directory' }, { label: d.person.name }]}
        title={d.person.name}
        lede={d.person.title}
        actions={
          canEdit && !editing ? (
            <Button variant="secondary" size="sm" onClick={startEdit}>Edit profile</Button>
          ) : undefined
        }
      />

      {/* Identity */}
      <Card as="section">
        {!editing ? (
          <>
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
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-sm text-ink-muted mb-0.5">Name</span>
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-sm text-ink-muted mb-0.5">Title</span>
                <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-sm text-ink-muted mb-0.5">Team</span>
                <input className={field} value={team} onChange={(e) => setTeam(e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-sm text-ink-muted mb-0.5">Skills, separated by commas</span>
                <input className={field} value={skills} onChange={(e) => setSkills(e.target.value)} />
              </label>
            </div>
            <p className="text-xs text-ink-faint">
              Role, start date and schedule are set through operations; salary and rates
              live with finance and never change from this screen.
            </p>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={!name.trim()} onClick={saveEdit}>Save</Button>
              <Button variant="quiet" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Employment history: present only for those with access (S1, R6). */}
      {d.access.agreementsAllowed && d.agreements && (
        <section className="space-y-2">
          <h2 className="display text-lg">Employment</h2>
          {d.agreements.length === 0 ? (
            <Banner tone="info">
              No employment agreement yet. Finance enters one; cost rates derive from it.
            </Banner>
          ) : (
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
        </section>
      )}

      {d.access.agreementsAllowed && d.costRates && (
        <section className="space-y-3">
          <h2 className="display text-lg">Cost rates</h2>
          {d.costRates.length > 0 && (
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
          )}
          <Banner tone="info">
            Rates are derived from agreements, never hand-typed. A salary change creates a new
            dated agreement and rate; prior periods keep the rates that were true at the time.
          </Banner>
        </section>
      )}

      {/* Sell rates */}
      <section className="space-y-2">
        <h2 className="display text-lg">Sell rates</h2>
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
      </section>
    </div>
  );
}
