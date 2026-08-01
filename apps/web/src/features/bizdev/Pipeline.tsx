// Business Development chamber (client direction, item 15): leads tracked
// TOFU to MOFU to BOFU to conversion. A converted lead becomes a live project
// that the super admin or operations director staffs.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from '../../stores/session';
import {
  STAGES, getLeads, saveLead, moveLead, addLeadNote, convertLead, pipelineSummary,
} from '../../api/bizdev';
import type { Lead, LeadStage } from '../../api/db';
import { demoAccounts } from '../../api/demoAccounts';
import { todayStr } from '../../api/settings';
import { Banner, Button, Card, PageHeader, Stat, StatusChip } from '../../components/ui';
import { fmtDateShort, fmtMoneyWhole } from '../../lib/format';

const SERVICE_LINES = [
  'brand_strategy', 'brand_identity', 'creative_direction', 'campaign',
  'spatial_activation', 'installation', 'exhibition', 'experience_design',
  'placemaking', 'community_engagement', 'cultural_programming', 'festival',
  'event_activation',
];

const OPEN_KEYS: LeadStage[] = ['tofu', 'mofu', 'bofu'];

const field = 'w-full border border-line rounded-financial bg-raised px-3 py-2 text-base';

function ownerName(userId: string): string {
  return demoAccounts.find((a) => a.userId === userId)?.name ?? userId;
}

function useInvalidateBoard() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['leads'] });
    void qc.invalidateQueries({ queryKey: ['pipeline-summary'] });
  };
}

/** Shared create-and-edit form for a lead. */
function LeadForm(props: { initial?: Lead; onDone: () => void }) {
  const account = useAccount();
  const invalidate = useInvalidateBoard();
  const l = props.initial;

  const [name, setName] = useState(l?.name ?? '');
  const [organisation, setOrganisation] = useState(l?.organisation ?? '');
  const [contactName, setContactName] = useState(l?.contactName ?? '');
  const [contactEmail, setContactEmail] = useState(l?.contactEmail ?? '');
  const [source, setSource] = useState(l?.source ?? '');
  const [serviceLine, setServiceLine] = useState(l?.serviceLine ?? 'creative_direction');
  const [fee, setFee] = useState(l?.estFeeMinor !== undefined ? String(l.estFeeMinor / 100) : '');
  const [probability, setProbability] = useState(l?.probability ?? 0.3);
  const [nextStep, setNextStep] = useState(l?.nextStep ?? '');
  const [nextStepDate, setNextStepDate] = useState(l?.nextStepDate ?? '');

  const save = useMutation({
    mutationFn: () =>
      saveLead(account, {
        id: l?.id,
        name: name.trim(),
        organisation: organisation.trim(),
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        source: source.trim() || undefined,
        serviceLine,
        estFeeMinor: fee.trim() ? Math.round(Number(fee) * 100) : undefined,
        probability,
        nextStep: nextStep.trim() || undefined,
        nextStepDate: nextStepDate || undefined,
      }),
    onSuccess: () => {
      invalidate();
      props.onDone();
    },
  });

  const ready = name.trim() && organisation.trim();

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Opportunity name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Organisation</span>
          <input className={field} value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Contact name</span>
          <input className={field} value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Contact email</span>
          <input className={field} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Source</span>
          <input className={field} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Referral, event, inbound…" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Service line</span>
          <select className={field} value={serviceLine} onChange={(e) => setServiceLine(e.target.value)}>
            {SERVICE_LINES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Estimated fee (SGD)</span>
          <input className={`${field} tabular`} inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">
            Probability <span className="tabular">{Math.round(probability * 100)}%</span>
          </span>
          <input
            type="range" min={0} max={1} step={0.05} value={probability}
            className="w-full accent-accent"
            onChange={(e) => setProbability(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Next step</span>
          <input className={field} value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Send the proposal, follow up…" />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Next step date</span>
          <input type="date" className={field} value={nextStepDate} onChange={(e) => setNextStepDate(e.target.value)} />
        </label>
      </div>
      {save.isError && (
        <Banner tone="critical">That did not save. The fault is ours. Try again in a moment.</Banner>
      )}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" disabled={!ready || save.isPending} onClick={() => save.mutate()}>
          {l ? 'Save changes' : 'Add lead'}
        </Button>
        <Button variant="quiet" size="sm" onClick={props.onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function LeadDetail(props: { lead: Lead }) {
  const { lead } = props;
  const account = useAccount();
  const navigate = useNavigate();
  const invalidate = useInvalidateBoard();
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [convertMsg, setConvertMsg] = useState<string | null>(null);

  const addNote = useMutation({
    mutationFn: () => addLeadNote(account, lead.id, note),
    onSuccess: () => {
      setNote('');
      invalidate();
    },
  });

  const convert = useMutation({
    mutationFn: () => convertLead(account, lead.id),
    onSuccess: (res) => {
      invalidate();
      navigate(`/projects/${res.project.id}`);
    },
    onError: (e: Error) => {
      if (e.message === 'conversion_needs_admin') {
        setConvertMsg('Conversion sits with the super admin or operations director.');
      } else if (e.message === 'already_converted') {
        setConvertMsg('This lead already lives on as a project.');
      } else {
        setConvertMsg('That did not convert. The fault is ours. Try again in a moment.');
      }
    },
  });

  if (editing) {
    return (
      <div className="mt-3 pt-3 border-t border-line/60">
        <LeadForm initial={lead} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const notes = [...lead.notes].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="mt-3 pt-3 border-t border-line/60 space-y-3">
      <div className="text-sm text-ink-muted space-y-0.5">
        {lead.contactName && <div>Contact: {lead.contactName}{lead.contactEmail ? ` (${lead.contactEmail})` : ''}</div>}
        {lead.source && <div>Source: {lead.source}</div>}
        {lead.serviceLine && <div>Service line: {lead.serviceLine.replace(/_/g, ' ')}</div>}
      </div>

      <div>
        <h4 className="text-sm font-medium text-ink mb-1">Notes</h4>
        {notes.length === 0 && <p className="text-sm text-ink-faint">No notes yet. The first one sets the scene.</p>}
        <ul className="space-y-1.5">
          {notes.map((n, i) => (
            <li key={i} className="text-sm">
              <span className="text-ink-faint text-xs">{fmtDateShort(n.at.slice(0, 10))} · {n.by}</span>
              <div className="text-ink-muted">{n.body}</div>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-2">
          <input
            className={`${field} flex-1`}
            value={note}
            placeholder="Add a note to the timeline"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) addNote.mutate(); }}
          />
          <Button size="sm" disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
            Add note
          </Button>
        </div>
      </div>

      {convertMsg && <Banner tone="info">{convertMsg}</Banner>}

      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit details</Button>
        {lead.stage === 'bofu' && !lead.convertedProjectId && (
          <Button variant="primary" size="sm" disabled={convert.isPending} onClick={() => { setConvertMsg(null); convert.mutate(); }}>
            Convert to project
          </Button>
        )}
        {lead.convertedProjectId && (
          <Button variant="quiet" size="sm" onClick={() => navigate(`/projects/${lead.convertedProjectId}`)}>
            Open project
          </Button>
        )}
      </div>
    </div>
  );
}

function LeadCard(props: { lead: Lead; expanded: boolean; onToggle: () => void }) {
  const { lead } = props;
  const account = useAccount();
  const invalidate = useInvalidateBoard();
  const move = useMutation({
    mutationFn: (stage: LeadStage) => moveLead(account, lead.id, stage),
    onSuccess: invalidate,
  });

  const openIdx = OPEN_KEYS.indexOf(lead.stage);
  const isOpen = openIdx >= 0;
  const overdue = isOpen && lead.nextStepDate !== undefined && lead.nextStepDate < todayStr();

  return (
    <Card className="!p-3">
      <button className="w-full text-left" onClick={props.onToggle} aria-expanded={props.expanded}>
        <div className="font-medium text-base text-ink">{lead.name}</div>
        <div className="text-sm text-ink-muted">{lead.organisation}</div>
      </button>
      <div className="flex items-baseline justify-between gap-2 mt-1.5">
        <span className="tabular text-sm text-ink">
          {lead.estFeeMinor !== undefined ? fmtMoneyWhole(lead.estFeeMinor) : 'Fee open'}
        </span>
        <span className="tabular text-xs text-ink-muted">{Math.round((lead.probability ?? 0) * 100)}%</span>
      </div>
      {(lead.nextStep || lead.nextStepDate) && (
        <div className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
          <span className={overdue ? 'text-caution' : 'text-ink-muted'}>
            {lead.nextStep ?? 'Next step'}
            {lead.nextStepDate ? ` · ${fmtDateShort(lead.nextStepDate)}` : ''}
          </span>
          {overdue && <StatusChip tone="caution">date passed</StatusChip>}
        </div>
      )}
      <div className="text-xs text-ink-faint mt-1">{ownerName(lead.ownerUserId)}</div>

      <div className="flex items-center gap-1 mt-2">
        {isOpen && (
          <>
            <Button
              variant="quiet" size="sm" disabled={openIdx === 0 || move.isPending}
              aria-label="Move one stage earlier"
              onClick={() => move.mutate(OPEN_KEYS[openIdx - 1]!)}
            >
              ←
            </Button>
            <Button
              variant="quiet" size="sm" disabled={openIdx === OPEN_KEYS.length - 1 || move.isPending}
              aria-label="Move one stage later"
              onClick={() => move.mutate(OPEN_KEYS[openIdx + 1]!)}
            >
              →
            </Button>
            <Button variant="quiet" size="sm" disabled={move.isPending} onClick={() => move.mutate('parked')}>
              Park
            </Button>
          </>
        )}
        {lead.stage === 'parked' && (
          <Button variant="quiet" size="sm" disabled={move.isPending} onClick={() => move.mutate('tofu')}>
            Reopen
          </Button>
        )}
      </div>

      {props.expanded && <LeadDetail lead={lead} />}
    </Card>
  );
}

export default function Pipeline() {
  const account = useAccount();
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const leads = useQuery({ queryKey: ['leads', account.userId], queryFn: () => getLeads(account) });
  const summary = useQuery({
    queryKey: ['pipeline-summary', account.userId],
    queryFn: () => pipelineSummary(account),
  });

  if (leads.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  const all = leads.data ?? [];
  const byStage = (key: LeadStage) => all.filter((l) => l.stage === key);
  const openStages = STAGES.filter((s) => OPEN_KEYS.includes(s.key));
  const restStages = STAGES.filter((s) => !OPEN_KEYS.includes(s.key));
  const s = summary.data;

  return (
    <div>
      <PageHeader
        title="Leads & pipeline"
        lede="Opportunities move from top of funnel through conversation and proposal to conversion. A won lead becomes a live project; a parked one stays warm for later."
        actions={
          <Button variant="primary" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Close form' : 'Add lead'}
          </Button>
        }
      />

      {s && (
        <Card className="mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Stat label="Top of funnel" value={s.countByStage.tofu} />
            <Stat label="Middle of funnel" value={s.countByStage.mofu} />
            <Stat label="Bottom of funnel" value={s.countByStage.bofu} />
            <Stat label="Converted" value={s.countByStage.converted} />
            <Stat label="Parked" value={s.countByStage.parked} />
            <Stat
              label="Weighted pipeline"
              value={fmtMoneyWhole(s.weightedPipelineMinor)}
              sub="Open leads, fee times probability"
            />
          </div>
        </Card>
      )}

      {adding && (
        <Card className="mb-5">
          <h2 className="display text-lg mb-3">New lead</h2>
          <LeadForm onDone={() => setAdding(false)} />
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_0.75fr] gap-4 items-start">
        {openStages.map((stage) => (
          <section key={stage.key} aria-label={stage.label}>
            <div className="mb-2">
              <h2 className="font-medium text-ink">{stage.label}</h2>
              <p className="text-xs text-ink-faint">{stage.blurb}</p>
            </div>
            <div className="space-y-3">
              {byStage(stage.key).map((l) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  expanded={expandedId === l.id}
                  onToggle={() => setExpandedId((id) => (id === l.id ? null : l.id))}
                />
              ))}
              {byStage(stage.key).length === 0 && (
                <p className="text-sm text-ink-faint border border-dashed border-line rounded-financial px-3 py-4 text-center">
                  Nothing here right now.
                </p>
              )}
            </div>
          </section>
        ))}

        <section aria-label="Converted and parked">
          {restStages.map((stage) => (
            <div key={stage.key} className="mb-5">
              <div className="mb-2">
                <h2 className="font-medium text-ink">{stage.label}</h2>
                <p className="text-xs text-ink-faint">{stage.blurb}</p>
              </div>
              <div className="space-y-3">
                {byStage(stage.key).map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    expanded={expandedId === l.id}
                    onToggle={() => setExpandedId((id) => (id === l.id ? null : l.id))}
                  />
                ))}
                {byStage(stage.key).length === 0 && (
                  <p className="text-sm text-ink-faint border border-dashed border-line rounded-financial px-3 py-4 text-center">
                    Nothing here right now.
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
