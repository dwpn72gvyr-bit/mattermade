// Project templates (§5.2, item 11b): masters are copied, never linked, and
// the super admin or operations director can edit the library itself. A phase
// named "Delivery / On-site" renders nested under its parent tier.

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectTemplate } from '@oe/domain';
import { useAccount } from '../../stores/session';
import { getTemplates } from '../../api/queries';
import { deleteTemplate, saveTemplate } from '../../api/adminApi';
import { Banner, Button, Card, PageHeader } from '../../components/ui';

const SERVICE_LINES = [
  'brand_strategy', 'brand_identity', 'creative_direction', 'campaign',
  'spatial_activation', 'installation', 'exhibition', 'experience_design',
  'placemaking', 'community_engagement', 'cultural_programming', 'festival',
  'event_activation',
];

const field = 'w-full border border-line rounded-financial bg-raised px-3 py-2 text-base';

interface PhaseDraft {
  name: string;
  deliverables?: string[];
}

/** Ordered phase list with sub-tier display: the part after " / " nests. */
function PhaseList(props: { phases: { name: string }[] }) {
  let order = 0;
  return (
    <div className="space-y-0.5 text-sm">
      {props.phases.map((p, i) => {
        const cut = p.name.indexOf(' / ');
        if (cut >= 0) {
          return (
            <div key={i} className="pl-9 text-ink-faint" title={p.name}>
              {p.name.slice(cut + 3)}
            </div>
          );
        }
        order += 1;
        return (
          <div key={i} className="text-ink-muted flex gap-2">
            <span className="tabular text-ink-faint w-4 text-right">{order}</span>
            <span>{p.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function TemplateEditor(props: { initial?: ProjectTemplate; onClose: () => void }) {
  const account = useAccount();
  const qc = useQueryClient();
  const t = props.initial;

  const [name, setName] = useState(t?.name ?? '');
  const [serviceLine, setServiceLine] = useState<string>(t?.serviceLine ?? 'creative_direction');
  const [phases, setPhases] = useState<PhaseDraft[]>(
    t?.phases.map((p) => ({ name: p.name, deliverables: p.deliverables })) ?? [{ name: '' }],
  );

  const save = useMutation({
    mutationFn: () =>
      saveTemplate(account, {
        id: t?.id,
        name: name.trim(),
        serviceLine,
        phases: phases
          .filter((p) => p.name.trim())
          .map((p) => ({ name: p.name.trim(), deliverables: p.deliverables })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      props.onClose();
    },
  });

  const movePhase = (i: number, dir: -1 | 1) => {
    setPhases((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      const a = next[i]!;
      next[i] = next[j]!;
      next[j] = a;
      return next;
    });
  };

  const ready = name.trim() && phases.some((p) => p.name.trim());

  return (
    <Card className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Template name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Service line</span>
          <select className={field} value={serviceLine} onChange={(e) => setServiceLine(e.target.value)}>
            {SERVICE_LINES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="block text-sm text-ink-muted mb-1">Phases, in order</span>
        <div className="space-y-1.5">
          {phases.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                className={field}
                value={p.name}
                aria-label={`Phase ${i + 1} name`}
                onChange={(e) =>
                  setPhases((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
              <Button variant="quiet" size="sm" aria-label={`Move phase ${i + 1} up`} disabled={i === 0} onClick={() => movePhase(i, -1)}>↑</Button>
              <Button variant="quiet" size="sm" aria-label={`Move phase ${i + 1} down`} disabled={i === phases.length - 1} onClick={() => movePhase(i, 1)}>↓</Button>
              <Button variant="quiet" size="sm" aria-label={`Remove phase ${i + 1}`} onClick={() => setPhases((arr) => arr.filter((_, j) => j !== i))}>×</Button>
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => setPhases((arr) => [...arr, { name: '' }])}>
          Add phase
        </Button>
        <p className="text-xs text-ink-faint mt-2">Name a phase 'Delivery / On-site' to nest it under its parent tier.</p>
      </div>

      {save.isError && (
        <Banner tone="critical">That did not save. The fault is ours. Try again in a moment.</Banner>
      )}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" disabled={!ready || save.isPending} onClick={() => save.mutate()}>
          {t ? 'Save changes' : 'Create template'}
        </Button>
        <Button variant="quiet" size="sm" onClick={props.onClose}>Cancel</Button>
      </div>
    </Card>
  );
}

export default function Templates() {
  const account = useAccount();
  const qc = useQueryClient();
  const templates = useQuery({ queryKey: ['templates', account.userId], queryFn: () => getTemplates(account) });

  const canEdit = ['super_admin', 'ops_admin'].some((r) => account.roles.includes(r));
  const [editingId, setEditingId] = useState<string | null>(null); // 'new' for a fresh template
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (templateId: string) => deleteTemplate(account, templateId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      setConfirmingId(null);
    },
  });

  if (templates.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  return (
    <div>
      <PageHeader
        title="Project templates"
        lede="Starting structures for new estimates. A template is copied into a project, never linked, so past projects keep the shape they were built with."
        actions={
          canEdit ? (
            <Button variant="primary" onClick={() => setEditingId('new')}>New template</Button>
          ) : undefined
        }
      />
      <p className="text-xs text-ink-faint mb-4">Name a phase 'Delivery / On-site' to nest it.</p>

      {editingId === 'new' && (
        <div className="mb-4">
          <TemplateEditor onClose={() => setEditingId(null)} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 items-start">
        {(templates.data ?? []).map((t) =>
          editingId === t.id ? (
            <TemplateEditor key={t.id} initial={t} onClose={() => setEditingId(null)} />
          ) : (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-base mb-1">{t.name}</div>
                  <div className="text-xs text-ink-faint mb-2">{t.serviceLine.replace(/_/g, ' ')}</div>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button variant="quiet" size="sm" onClick={() => { setConfirmingId(null); setEditingId(t.id); }}>Edit</Button>
                    <Button variant="quiet" size="sm" onClick={() => setConfirmingId(t.id)}>Delete</Button>
                  </div>
                )}
              </div>
              <PhaseList phases={t.phases} />
              {confirmingId === t.id && (
                <div className="mt-3 border-t border-line/60 pt-3">
                  <p className="text-sm text-ink-muted mb-2">
                    Delete this template? Projects already created from it keep their structure.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(t.id)}>
                      Delete
                    </Button>
                    <Button variant="quiet" size="sm" onClick={() => setConfirmingId(null)}>Keep it</Button>
                  </div>
                </div>
              )}
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
