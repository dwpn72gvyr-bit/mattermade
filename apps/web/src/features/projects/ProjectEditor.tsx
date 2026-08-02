// Project creation and editing (client direction, item 4): super admin,
// operations or leadership set up the project, pick its structure from a
// template or shape it freely, and assign the team. Round F: projects can
// carry several service lines (the first is primary), and phases reorder by
// drag and drop.

import React, { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Project } from '@oe/domain';
import { useAccount } from '../../stores/session';
import { getPeopleOptions, saveProject } from '../../api/projectOps';
import { getTemplates } from '../../api/queries';
import { db } from '../../api/db';
import { addOption, todayStr } from '../../api/settings';
import { Banner, Button, Card, PageHeader } from '../../components/ui';

interface PhaseRow {
  uid: number;
  id?: string;
  name: string;
}

export default function ProjectEditor() {
  const { projectId } = useParams();
  const account = useAccount();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = ['super_admin', 'ops_admin', 'leadership'].some((r) => account.roles.includes(r));

  const options = useQuery({ queryKey: ['people-options'], queryFn: () => getPeopleOptions(account) });
  const templates = useQuery({ queryKey: ['templates', account.userId], queryFn: () => getTemplates(account) });

  const existing = projectId ? db.projects.find((p) => p.id === projectId) : undefined;
  const existingClient = existing ? db.clients.find((c) => c.id === existing.clientId) : undefined;
  const existingPhases = existing
    ? db.phases.filter((ph) => ph.projectId === existing.id).sort((a, b) => a.order - b.order)
    : [];

  const uidRef = useRef(1000);
  const nextUid = () => { uidRef.current += 1; return uidRef.current; };

  const [name, setName] = useState(existing?.name ?? '');
  const [clientName, setClientName] = useState(existingClient?.name ?? '');
  const [serviceLines, setServiceLines] = useState<string[]>(() => {
    if (!existing) return ['brand_identity'];
    const lines = (existing as Project & { serviceLines?: string[] }).serviceLines;
    return lines?.length ? [...lines] : existing.serviceLine ? [existing.serviceLine] : [];
  });
  const [newLine, setNewLine] = useState('');
  const [fee, setFee] = useState(existing ? String(existing.contractValueMinor / 100) : '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayStr());
  const [endDate, setEndDate] = useState(existing?.targetEndDate ?? todayStr());
  const [teamIds, setTeamIds] = useState<string[]>(existing?.teamIds ?? []);
  const [leadUserId, setLeadUserId] = useState(existing?.leadId ?? account.userId);
  const [phases, setPhases] = useState<PhaseRow[]>(() =>
    existingPhases.length
      ? existingPhases.map((p, i) => ({ uid: i, id: p.id, name: p.name }))
      : ['Discovery', 'Concept', 'Delivery'].map((n, i) => ({ uid: i, name: n })),
  );
  const [dragUid, setDragUid] = useState<number | null>(null);

  const save = useMutation({
    mutationFn: () =>
      saveProject(account, {
        id: existing?.id,
        name,
        clientName,
        serviceLine: serviceLines[0] ?? 'brand_identity',
        serviceLines,
        contractValueMinor: Math.round(Number(fee || '0') * 100),
        startDate,
        targetEndDate: endDate,
        leadUserId,
        teamPersonIds: teamIds,
        phases: phases
          .filter((p) => p.name.trim())
          .map((p) => ({ id: p.id, name: p.name.trim() })),
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['project'] });
      navigate(`/projects/${p.id}`);
    },
  });

  const applyTemplate = (templateId: string) => {
    const t = templates.data?.find((x) => x.id === templateId);
    if (t) setPhases(t.phases.map((p) => ({ uid: nextUid(), name: p.name })));
  };

  const toggleLine = (s: string) =>
    setServiceLines((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const addNewLine = () => {
    const v = newLine.trim();
    if (!v) return;
    addOption('service_lines', v);
    setServiceLines((cur) => (cur.includes(v) ? cur : [...cur, v]));
    setNewLine('');
    void qc.invalidateQueries({ queryKey: ['people-options'] });
  };

  const movePhase = (fromUid: number, toUid: number) => {
    setPhases((arr) => {
      const from = arr.findIndex((p) => p.uid === fromUid);
      const to = arr.findIndex((p) => p.uid === toUid);
      if (from < 0 || to < 0 || from === to) return arr;
      const next = [...arr];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  };

  const lineOptions = useMemo(() => {
    const base = options.data?.serviceLines ?? [];
    return [...base, ...serviceLines.filter((s) => !base.includes(s))];
  }, [options.data, serviceLines]);

  const ready = useMemo(
    () => name.trim() && clientName.trim() && serviceLines.length > 0 && startDate <= endDate,
    [name, clientName, serviceLines, startDate, endDate],
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
              <span className="block text-sm text-ink-muted mb-0.5">Fee (SGD)</span>
              <input className={`${field} tabular`} inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-sm text-ink-muted mb-0.5">Start</span>
                <input type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-sm text-ink-muted mb-0.5">Target end</span>
                <input type="date" className={field} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <span className="block text-sm text-ink-muted">Service lines</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Service lines">
              {lineOptions.map((s) => {
                const on = serviceLines.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleLine(s)}
                    aria-pressed={on}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors duration-settle ${
                      on ? 'border-accent bg-accent text-white' : 'border-line bg-raised text-ink-muted hover:text-ink'
                    }`}
                  >
                    {s.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 max-w-xs">
              <input
                className="flex-1 border border-line rounded-financial bg-raised px-2.5 py-1 text-sm"
                placeholder="Add a new service line"
                aria-label="Add a new service line"
                value={newLine}
                onChange={(e) => setNewLine(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewLine(); } }}
              />
              <Button variant="secondary" size="sm" disabled={!newLine.trim()} onClick={addNewLine}>Add</Button>
            </div>
            {serviceLines.length > 1 && (
              <p className="text-xs text-ink-faint">
                The first selected line, {serviceLines[0]!.replace(/_/g, ' ')}, is the primary.
              </p>
            )}
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
            {phases.map((p, i) => (
              <div
                key={p.uid}
                className={`flex items-center gap-2 rounded-financial ${dragUid === p.uid ? 'opacity-50' : ''}`}
                onDragOver={(e) => { if (dragUid !== null) e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragUid !== null) movePhase(dragUid, p.uid);
                  setDragUid(null);
                }}
              >
                <span
                  draggable
                  onDragStart={(e) => {
                    setDragUid(p.uid);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(p.uid));
                  }}
                  onDragEnd={() => setDragUid(null)}
                  className="cursor-grab select-none text-ink-faint hover:text-ink-muted px-0.5 leading-none"
                  title="Drag to reorder"
                  aria-label={`Drag to reorder phase ${i + 1}`}
                  role="button"
                >
                  <span aria-hidden="true">⠿</span>
                </span>
                <span className="text-xs text-ink-faint w-5 text-right tabular">{i + 1}</span>
                <input
                  className={field}
                  value={p.name}
                  aria-label={`Phase ${i + 1} name`}
                  onChange={(e) =>
                    setPhases((arr) => arr.map((x) => (x.uid === p.uid ? { ...x, name: e.target.value } : x)))
                  }
                />
                <Button
                  variant="quiet"
                  size="sm"
                  aria-label={`Remove phase ${i + 1}`}
                  onClick={() => setPhases((arr) => arr.filter((x) => x.uid !== p.uid))}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setPhases((arr) => [...arr, { uid: nextUid(), name: '' }])}>Add phase</Button>
          </div>
          {existing && existingPhases.length > 0 && (
            <p className="text-xs text-ink-faint">
              Phases of a running project keep their recorded hours; renaming and reordering here
              reshapes the plan, it never rewrites the past.
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
