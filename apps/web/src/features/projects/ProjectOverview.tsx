// Project overview (§8.1): three health cards (budget vs timeline, hours vs
// timeline, forecast margin vs target), contract value with variations side by
// side (F15), milestones, team, risks, and the two primary actions. The same
// project renders differently for lead, finance and team member (§11 A6).

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../stores/session';
import { getProject, submitVariation, approveVariation } from '../../api/queries';
import {
  Banner, BurnBar, Button, Card, EstimateVsActual, LedgerTable, Masked,
  PageHeader, Stat, StatusChip, Td, Th,
} from '../../components/ui';
import { fmtDate, fmtMoneyWhole, fmtPct } from '../../lib/format';

const TABS = ['Health', 'Phases', 'Financials', 'External', 'Revenue', 'Variations', 'Retrospective'] as const;
type Tab = (typeof TABS)[number];

export default function ProjectOverview() {
  const { projectId = '' } = useParams();
  const account = useSession((s) => s.account);
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ['project', account.userId, projectId],
    queryFn: () => getProject(account, projectId),
  });
  const [tab, setTab] = useState<Tab>('Health');
  const [showVariationForm, setShowVariationForm] = useState(false);

  if (detail.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }
  const d = detail.data;
  if (!d) return <div className="text-ink-muted py-10 text-center">Loading…</div>;

  const m = d.metrics;
  const { seesMoney, isLeadHere } = d.access;
  const visibleTabs = TABS.filter((t) => {
    if (t === 'Financials' || t === 'Revenue') return seesMoney;
    if (t === 'External') return d.externals.length > 0;
    if (t === 'Retrospective') return Boolean(d.retrospective);
    if (t === 'Variations') return seesMoney || isLeadHere;
    return true;
  });

  const forecastMarginPct = m.forecastGrossMargin;
  const targetMargin = 0.5; // studio target band lower bound (§6.5 lens)

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Portfolio' }, { label: d.project.name }]}
        title={d.project.name}
        lede={
          <>
            {d.client?.name} · {d.project.serviceLine.replace(/_/g, ' ')} ·{' '}
            {fmtDate(d.project.startDate)} to {fmtDate(d.project.actualEndDate ?? d.project.targetEndDate)}
            {d.project.isProBono && ' · pro bono'}
          </>
        }
        actions={
          (isLeadHere || account.roles.includes('leadership')) && (
            <Button variant="primary" onClick={() => { setTab('Variations'); setShowVariationForm(true); }}>
              Log a variation
            </Button>
          )
        }
      />

      {d.project.riskFlags?.length > 0 && (
        <div className="space-y-2 mb-4">
          {d.project.riskFlags.map((r: { key: string; label: string }) => (
            <Banner key={r.key} tone="caution">{r.label}</Banner>
          ))}
        </div>
      )}

      <nav className="flex gap-1 border-b border-line mb-5" aria-label="Project sections">
        {visibleTabs.map((t) => (
          <button
            key={t}
            className={`px-3 py-2 text-base border-b-2 -mb-px transition-colors duration-settle ${
              tab === t ? 'border-accent text-accent font-medium' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'page' : undefined}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Health' && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <div className="text-sm text-ink-muted mb-2">Budget consumed vs timeline</div>
              {m.budgetConsumedPct !== undefined ? (
                <>
                  <BurnBar
                    pct={m.budgetConsumedPct}
                    scheduleElapsedPct={m.scheduleElapsedPct}
                    label={`Budget ${Math.round(m.budgetConsumedPct * 100)} percent used, timeline ${Math.round(m.scheduleElapsedPct * 100)} percent elapsed`}
                  />
                  <div className="tabular text-lg mt-2">
                    {fmtPct(m.budgetConsumedPct, 0)}
                    <span className="text-sm text-ink-muted"> at {fmtPct(m.scheduleElapsedPct, 0)} of timeline</span>
                  </div>
                </>
              ) : (
                <div className="text-ink-muted">No accepted baseline yet.</div>
              )}
            </Card>
            <Card>
              <div className="text-sm text-ink-muted mb-2">Hours consumed vs timeline</div>
              {m.hoursConsumedPct !== undefined ? (
                <>
                  <BurnBar
                    pct={m.hoursConsumedPct}
                    scheduleElapsedPct={m.scheduleElapsedPct}
                    label={`Hours ${Math.round(m.hoursConsumedPct * 100)} percent used, timeline ${Math.round(m.scheduleElapsedPct * 100)} percent elapsed`}
                  />
                  <div className="tabular text-lg mt-2">
                    {m.actInternalHours.toFixed(0)}h
                    <span className="text-sm text-ink-muted"> of {m.baselineHours}h estimated</span>
                  </div>
                </>
              ) : (
                <div className="text-ink-muted">No baseline hours.</div>
              )}
            </Card>
            <Card>
              <div className="text-sm text-ink-muted mb-2">Forecast margin vs target</div>
              {seesMoney && forecastMarginPct !== undefined ? (
                <>
                  <div className={`tabular text-lg ${forecastMarginPct < 0 ? 'text-critical' : forecastMarginPct < targetMargin ? 'text-caution' : 'text-positive'}`}>
                    {fmtPct(forecastMarginPct)}
                  </div>
                  <div className="text-sm text-ink-muted">
                    If the current pace holds, this project lands at {fmtPct(forecastMarginPct, 0)} margin
                    against a {fmtPct(targetMargin, 0)} target. The forecast updates as the picture changes.
                  </div>
                </>
              ) : seesMoney ? (
                <div className={`tabular text-lg ${m.grossMargin < 0 ? 'text-critical' : ''}`}>
                  {fmtPct(m.grossMargin)} <span className="text-sm text-ink-muted">achieved margin</span>
                </div>
              ) : (
                <Masked label="Margin is outside your access" />
              )}
            </Card>
          </div>

          <Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="Contract value"
                value={seesMoney || isLeadHere ? fmtMoneyWhole(d.project.contractValueMinor, d.project.currency) : <Masked />}
                sub={m.approvedVariationsMinor ? `+ ${fmtMoneyWhole(m.approvedVariationsMinor, d.project.currency)} approved variations` : 'no variations'}
              />
              <Stat label="Hours recorded" value={`${m.actInternalHours.toFixed(0)}h`} sub={m.burnFactor ? `burn factor ${m.burnFactor.toFixed(2)}` : undefined} />
              <Stat
                label="Team"
                value={<span className="flex flex-wrap gap-1">{d.team.map((t) => <span key={t.id} className="text-sm border border-line rounded-full px-2 py-0.5">{t.name.split(' ')[0]}</span>)}</span>}
              />
              <Stat
                label="Milestones"
                value={`${d.milestones.filter((x) => x.status === 'accepted' || x.status === 'reached').length} of ${d.milestones.length}`}
                sub="accepted or reached"
              />
            </div>
          </Card>

          {d.milestones.length > 0 && (
            <LedgerTable
              caption="Milestones"
              head={<tr><Th>Milestone</Th><Th>Due</Th><Th>Status</Th><Th>Billing</Th></tr>}
            >
              {d.milestones.map((ms) => (
                <tr key={ms.id}>
                  <Td>{ms.name}</Td>
                  <Td>{fmtDate(ms.dueDate)}</Td>
                  <Td>
                    <StatusChip tone={ms.status === 'accepted' || ms.status === 'reached' ? 'positive' : 'neutral'}>
                      {ms.status}
                    </StatusChip>
                  </Td>
                  <Td>{ms.isBillingTrigger ? 'Billing trigger' : '—'}</Td>
                </tr>
              ))}
            </LedgerTable>
          )}
        </div>
      )}

      {tab === 'Phases' && (
        <Card>
          <div className="space-y-4">
            {d.phases.map((ph) => (
              <EstimateVsActual
                key={ph.phaseId}
                label={`${ph.name}${ph.status === 'complete' ? ' ✓' : ''}`}
                estHours={ph.estHours}
                actHours={ph.actHours}
                scheduleElapsedPct={ph.scheduleElapsedPct}
                srSummary={`${ph.name}: ${ph.actHours} of ${ph.estHours} hours used, timeline ${Math.round(ph.scheduleElapsedPct * 100)} percent elapsed`}
              />
            ))}
          </div>
          <p className="text-xs text-ink-faint mt-4">
            Estimated hours are the frozen baseline split across phases. The dark tick marks
            schedule elapsed. Hours ahead of the tick are running hot.
          </p>
        </Card>
      )}

      {tab === 'Financials' && seesMoney && (
        <div className="space-y-4">
          <Card>
            <h2 className="display text-lg mb-3">Where the money went</h2>
            <LedgerTable
              caption="Profitability waterfall"
              head={<tr><Th>Line</Th><Th num>Amount</Th></tr>}
              foot={
                <tr>
                  <Td>Gross profit {m.grossProfitMinor < 0 && '(loss)'}</Td>
                  <Td num className={m.grossProfitMinor < 0 ? 'text-critical' : 'text-positive'}>
                    {fmtMoneyWhole(m.grossProfitMinor, d.project.currency)}
                  </Td>
                </tr>
              }
            >
              <tr><Td>Recognised revenue</Td><Td num>{fmtMoneyWhole(m.recognisedToDateMinor, d.project.currency)}</Td></tr>
              <tr><Td>Direct internal labour ({m.actInternalHours.toFixed(0)}h at cost per paid hour)</Td><Td num>−{fmtMoneyWhole(m.actInternalCostMinor, d.project.currency)}</Td></tr>
              <tr><Td>External costs (committed basis)</Td><Td num>−{fmtMoneyWhole(m.externalCommittedMinor, d.project.currency)}</Td></tr>
              <tr><Td>Direct expenses</Td><Td num>−{fmtMoneyWhole(m.expensesActualMinor, d.project.currency)}</Td></tr>
            </LedgerTable>
          </Card>
          <div className="grid md:grid-cols-4 gap-4">
            <Card><Stat label="Gross margin" value={fmtPct(m.grossMargin)} tone={m.grossMargin < 0 ? 'critical' : 'default'} sub="true margin, target 50 to 60%" /></Card>
            <Card><Stat label="Third-party margin" value={fmtPct(m.thirdPartyMargin)} sub="legacy lens, target 60 to 70%" /></Card>
            <Card><Stat label="Profit per internal hour" value={(m.profitPerInternalHourMinor / 100).toFixed(2)} tone={m.profitPerInternalHourMinor < 0 ? 'critical' : 'default'} sub="F8" /></Card>
            <Card><Stat label="Effective hourly revenue" value={(m.effectiveHourlyRevenueMinor / 100).toFixed(2)} sub="F7" /></Card>
          </div>
          {m.thirdPartyMargin > 0.4 && m.grossMargin < 0 && (
            <Banner tone="critical">
              The legacy lens reads {fmtPct(m.thirdPartyMargin, 0)} while the project is losing
              money once internal hours are costed. This gap is the reason the console exists.
            </Banner>
          )}
          {d.expenses.length > 0 && (
            <LedgerTable caption="Direct expenses" head={<tr><Th>Expense</Th><Th>State</Th><Th num>Amount</Th></tr>}>
              {d.expenses.map((x) => (
                <tr key={x.id}>
                  <Td>{x.description}<div className="text-xs text-ink-faint">{x.category} · {fmtDate(x.date)}</div></Td>
                  <Td><StatusChip tone={x.state === 'actual' ? 'neutral' : x.state === 'committed' ? 'info' : 'caution'}>{x.state}</StatusChip></Td>
                  <Td num>{fmtMoneyWhole(x.amountMinor, x.currency)}</Td>
                </tr>
              ))}
            </LedgerTable>
          )}
        </div>
      )}

      {tab === 'External' && (
        <LedgerTable
          caption="External collaborators"
          head={<tr><Th>Collaborator</Th><Th>Model</Th><Th>Status</Th><Th num>Fee</Th></tr>}
        >
          {d.externals.map((x) => (
            <tr key={x.id}>
              <Td>{x.collaboratorName}<div className="text-xs text-ink-faint">{x.discipline}</div></Td>
              <Td>{x.model.replace(/_/g, ' ')}</Td>
              <Td><StatusChip tone={x.status === 'completed' ? 'neutral' : 'positive'}>{x.status}</StatusChip></Td>
              <Td num>{'maskedAs' in x.fee ? <Masked as={x.fee.maskedAs} label="Rates are held by finance and ops" /> : fmtMoneyWhole(x.fee.value, x.currency)}</Td>
            </tr>
          ))}
        </LedgerTable>
      )}

      {tab === 'Revenue' && seesMoney && (
        <div className="space-y-4">
          <LedgerTable
            caption="Revenue items"
            head={<tr><Th>Item</Th><Th>Trigger</Th><Th>Recognised</Th><Th num>Amount</Th></tr>}
          >
            {d.revenue.map((r) => (
              <tr key={r.id}>
                <Td>{r.type.replace(/_/g, ' ')}</Td>
                <Td>{r.recognitionTrigger.replace(/_/g, ' ')}</Td>
                <Td>{r.recognisedAt ? fmtDate(r.recognisedAt) : r.recognitionTrigger === 'straight_line' ? 'monthly' : '—'}</Td>
                <Td num>{fmtMoneyWhole(r.amountMinor, r.currency)}</Td>
              </tr>
            ))}
          </LedgerTable>
          {d.invoices.length > 0 && (
            <LedgerTable caption="Invoices" head={<tr><Th>Number</Th><Th>Issued</Th><Th>Status</Th><Th num>Amount</Th></tr>}>
              {d.invoices.map((i) => (
                <tr key={i.id}>
                  <Td>{i.number}</Td>
                  <Td>{fmtDate(i.issuedDate)}</Td>
                  <Td><StatusChip tone={i.status === 'paid' ? 'positive' : i.status === 'overdue' ? 'critical' : 'info'}>{i.status}</StatusChip></Td>
                  <Td num>{fmtMoneyWhole(i.amountMinor, i.currency)}</Td>
                </tr>
              ))}
            </LedgerTable>
          )}
        </div>
      )}

      {tab === 'Variations' && (
        <VariationsTab
          projectId={projectId}
          variations={d.variations}
          currency={d.project.currency}
          canApprove={account.roles.includes('leadership')}
          showForm={showVariationForm}
          onFormDone={() => { setShowVariationForm(false); qc.invalidateQueries({ queryKey: ['project'] }); }}
        />
      )}

      {tab === 'Retrospective' && d.retrospective && (
        <Card className="max-w-2xl space-y-3">
          <h2 className="display text-lg">What this project taught us</h2>
          <p><span className="text-ink-muted text-sm block">What overran</span>{d.retrospective.whatOverran}</p>
          <p><span className="text-ink-muted text-sm block">Why</span>{d.retrospective.whyNotes}</p>
          <p><span className="text-ink-muted text-sm block">Client factors</span>{d.retrospective.clientFactors}</p>
          <p><span className="text-ink-muted text-sm block">Pricing lesson</span>{d.retrospective.pricingLesson}</p>
          {d.retrospective.wouldQuoteAgainAtMinor && (
            <p>
              <span className="text-ink-muted text-sm block">Would quote again at</span>
              <span className="tabular">{fmtMoneyWhole(d.retrospective.wouldQuoteAgainAtMinor, d.project.currency)}</span>
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function VariationsTab(props: {
  projectId: string;
  variations: { id: string; description: string; feeDeltaMinor: number; status: string }[];
  currency: string;
  canApprove: boolean;
  showForm: boolean;
  onFormDone: () => void;
}) {
  const account = useSession((s) => s.account);
  const qc = useQueryClient();
  const [description, setDescription] = useState('');
  const [feeDelta, setFeeDelta] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      submitVariation(account, {
        projectId: props.projectId,
        description,
        feeDeltaMinor: Math.round(Number(feeDelta) * 100),
      }),
    onSuccess: () => { setDescription(''); setFeeDelta(''); props.onFormDone(); },
  });
  const approve = useMutation({
    mutationFn: (id: string) => approveVariation(account, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project'] }),
  });

  return (
    <div className="space-y-4 max-w-2xl">
      {props.variations.length === 0 && !props.showForm && (
        <Banner tone="caution">
          Scope has moved on some projects without a variation. When the work grows, the record
          should grow with it.
        </Banner>
      )}
      {props.variations.map((v) => (
        <Card key={v.id} className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base">{v.description}</div>
            <div className="text-xs text-ink-faint">{v.status}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="tabular">{fmtMoneyWhole(v.feeDeltaMinor, props.currency)}</span>
            {v.status === 'submitted' && props.canApprove && (
              <Button variant="primary" size="sm" onClick={() => approve.mutate(v.id)}>Approve</Button>
            )}
            {v.status === 'approved' && <StatusChip tone="positive">Approved</StatusChip>}
            {v.status === 'draft' && <StatusChip tone="neutral">Draft</StatusChip>}
          </div>
        </Card>
      ))}
      <Card as="section">
        <h3 className="display text-lg mb-2">Log a variation</h3>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); if (description && feeDelta) submit.mutate(); }}
        >
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">What changed</span>
            <input
              className="w-full border border-line rounded-financial bg-raised px-3 py-2 text-base"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A fourth revision round on identity design, requested 12 June"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Fee change ({props.currency})</span>
            <input
              className="w-48 border border-line rounded-financial bg-raised px-3 py-2 text-base tabular"
              value={feeDelta}
              onChange={(e) => setFeeDelta(e.target.value)}
              inputMode="decimal"
              placeholder="4500"
            />
          </label>
          <Button type="submit" variant="primary" disabled={!description || !feeDelta}>
            Submit for approval
          </Button>
        </form>
      </Card>
    </div>
  );
}
