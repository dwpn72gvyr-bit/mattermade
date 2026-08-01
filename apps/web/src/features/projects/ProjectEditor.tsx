// Project creation and editing (client direction, item 4): super admin,
// operations or leadership set up the project, pick its structure from a
// template or shape it freely, and assign the team.

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAccount } from '../../stores/session';
import { getPeopleOptions, saveProject } from '../../api/projectOps';
import { getTemplates } from '../../api/queries';
import { db } from '../../api/db';
import { todayStr } from '../../api/settings';
import { Banner, Button, Card, PageHeader } from '../../components/ui';

export default function ProjectEditor() {
  const { projectId } = useParams();
  const account = useAccount();
  const navigate = useNavigate();
  const canManage = ['super_admin', 'ops_admin', 'leadership'].some((r) => account.roles.includes(r));

  const options = useQuery({ queryKey: ['people-options'], queryFn: () => getPeopleOptions(account) });
  const templates = useQuery({ queryKey: ['templates', account.userId], queryFn: () => getTemplates(account) });

  const existing = projectId ? db.projects.find((p) => p.id === projectId) : undefined;
  const existingClient = existing ? db.clients.find((c) => c.id === existing.clientId) : undefined;
  const existingPhases = existing
    ? db.phases.filter((ph) => ph.projectId === existing.id).sort((a, b) => a.order - b.order)
    : [];

  const [name, setName] = useState(existing?.name ?? '');
  const [clientName, setClientName] = useState(existingClient?.name ?? '');
  const [serviceLine, setServiceLine] = useState(existing?.serviceLine ?? 'brand_identity');
  const [fee, setFee] = useState(existing ? String(existing.contractValueMinor / 100) : '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayStr());
  const [endDate, setEndDate] = useState(existing?.targetEndDate ?? todayStr());
  const [teamIds, setTeamIds] = useState<string[]>(existing?.teamIds ?? []);
  const [leadUserId, setLeadUserId] = useState(existing?.leadId ?? account.userId);
  const [phaseNames, setPhaseNames] = useState<string[]>(
    existingPhases.length ? existingPhases.map((p) => p.name) : ['Discovery', 'Concept', 'Delivery'],
  );

  const save = useMutation({
    mutationFn: () =>
      saveProject(account, {
        id: existing?.id,
        name,
        clientName,
        serviceLine,
        contractValueMinor: Math.round(Number(fee || '0') * 100),
        startDate,
        targetEndDate: endDate,
        leadUserId,
        teamPersonIds: teamIds,
        phases: phaseNames.filter((p) => p.trim()).map((p) => ({ name: p.trim() })),
      }),
    onSuccess: (p) => navigate(`/projects/${p.id}`),
  });

  const applyTemplate = (templateId: string) => {
    const t = templates.data?.find((x) => x.id === templateId);
    if (t) setPhaseNames(t.phases.map((p) => p.name));
  };

  const ready = useMemo(
    () => name.trim() && clientName.trim() && startDate <= endDate,
    [name, clientName, startDate, endDate],
  );

  if (!canManage) {
    return <Banner tone="info">Project setup sits with the super admin, operations or leadership. If it should be yours, Ryan can grant it.</Banner>;
  }

  const field = 'w-full border border-line rounded-financial bg-raised px-3 py-2 text-base';

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={existing ? `Edit ${existing.name}` : 'New project'}
        lede="The structure set here is the same structure time lands on, costs accrue to, and the retrospective measures."
      />
      <div className="space-y-4">
        <Card className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Project name</span>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Client</span>
              <input className={field} value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Service line</span>
              <select className={field} value={serviceLine} onChange={(e) => setServiceLine(e.target.value as typeof serviceLine)}>
                {(options.data?.serviceLines ?? []).map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Fee (SGD)</span>
              <input className={`${field} tabular`} inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Start</span>
              <input type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Target end</span>
              <input type="date" className={field} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="display text-lg">Structure</h2>
            <label className="text-sm text-ink-muted flex items-center gap-2">
              Start from a template
              <select className="border border-line rounded-financial bg-raised px-2 py-1 text-sm" defaultValue="" onChange={(e) => e.target.value && applyTemplate(e.target.value)}>
                <option value="">Choose…</option>
                {(templates.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="space-y-1.5">
            {phaseNames.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-ink-faint w-5 text-right tabular">{i + 1}</span>
                <input
                  className={field}
                  value={p}
                  aria-label={`Phase ${i + 1} name`}
                  onChange={(e) => setPhaseNames((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <Button variant="quiet" size="sm" aria-label={`Remove phase ${i + 1}`} onClick={() => setPhaseNames((arr) => arr.filter((_, j) => j !== i))}>×</Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setPhaseNames((arr) => [...arr, ''])}>Add phase</Button>
          </div>
          {existing && existingPhases.length > 0 && (
            <p className="text-xs text-ink-faint">
              Phases of a running project keep their recorded hours; editing here renames the plan,
              it never rewrites the past.
            </p>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="display text-lg">Team</h2>
          <div className="flex flex-wrap gap-2">
            {(options.data?.people ?? []).map((p) => {
              const on = teamIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setTeamIds((t) => (on ? t.filter((x) => x !== p.id) : [...t, p.id]))}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors duration-settle ${
                    on ? 'border-accent bg-accent text-white' : 'border-line bg-raised text-ink-muted hover:text-ink'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          <label className="block max-w-xs">
            <span className="block text-sm text-ink-muted mb-0.5">Project lead</span>
            <select className={field} value={leadUserId} onChange={(e) => setLeadUserId(e.target.value)}>
              {(options.data?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.email.split('@')[0]}</option>
              ))}
            </select>
          </label>
        </Card>

        {save.isError && (
          <Banner tone="critical">That didn't save. The fault is ours. Try again in a moment.</Banner>
        )}
        <div className="flex gap-2">
          <Button variant="primary" disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {existing ? 'Save changes' : 'Create project'}
          </Button>
          <Button variant="quiet" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
