// Today (§8.1): the two-minute daily ritual and the highest-stakes screen.
// Activity rows with a cascading picker, 15-minute steppers, favourites chips,
// copy yesterday, a completion ring, and contextual rows with a quiet
// "recorded for you, not counted as cost" note. An incomplete day is a gap,
// never an error state.

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../stores/session';
import {
  getDay, saveEntry, deleteEntry, copyDay, getFavourites, getAssignments,
  type DayEntryView, type SaveEntryInput,
} from '../../api/queries';
import { Banner, Button, Card, CompletionRing, PageHeader, StatusChip } from '../../components/ui';
import { fmtDate } from '../../lib/format';

function addDays(date: string, n: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000)
    .toISOString().slice(0, 10);
}

function minutesLabel(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? `${r}m` : r === 0 ? `${h}h` : `${h}h ${r}m`;
}

export default function Today() {
  const account = useSession((s) => s.account);
  const today = useSession((s) => s.today);
  const [date, setDate] = useState(today);
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['day'] });
    qc.invalidateQueries({ queryKey: ['week'] });
  };

  const day = useQuery({
    queryKey: ['day', account.userId, date],
    queryFn: () => getDay(account, date),
  });
  const favourites = useQuery({
    queryKey: ['favourites', account.userId],
    queryFn: () => getFavourites(account),
  });
  const assignments = useQuery({
    queryKey: ['assignments', account.userId],
    queryFn: () => getAssignments(account),
  });

  const save = useMutation({
    mutationFn: (input: SaveEntryInput) => saveEntry(account, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteEntry(account, id),
    onSuccess: invalidate,
  });
  const copyYesterday = useMutation({
    mutationFn: () => copyDay(account, addDays(date, -1), date),
    onSuccess: invalidate,
  });

  const d = day.data;
  const scheduled = d?.scheduledMinutes ?? 0;
  const mapped = d?.mappedPaidMinutes ?? 0;
  const pct = scheduled > 0 ? mapped / scheduled : 0;
  const remaining = Math.max(0, scheduled - mapped);
  const locked = d?.periodStatus === 'locked';

  const workRows = (d?.entries ?? []).filter((e) => !e.contextual);
  const contextualRows = (d?.entries ?? []).filter((e) => e.contextual);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Today"
        lede={
          scheduled === 0
            ? 'No scheduled hours on this day. Anything you record is for your own picture.'
            : pct >= 1
              ? "That's your day mapped. Thanks for keeping the picture whole."
              : mapped > 0
                ? `You've mapped ${(mapped / 60).toFixed(1).replace(/\.0$/, '')} of ${scheduled / 60} hours. The rest can wait until you have a minute.`
                : 'Two minutes, and the picture is whole.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="quiet" size="sm" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">←</Button>
            <span className="text-base tabular">{fmtDate(date)}</span>
            <Button variant="quiet" size="sm" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="Next day">→</Button>
          </div>
        }
      />

      {locked && (
        <Banner tone="info" className="mb-4">
          This month is closed, so these entries are preserved as they were. You can request an
          adjustment and finance will take it from there.
        </Banner>
      )}
      {save.isError && (
        <Banner tone="critical" className="mb-4">
          That didn't save. The fault is ours, and your entry is kept safely right here. Try
          again in a moment.
        </Banner>
      )}

      <div className="grid md:grid-cols-[1fr_200px] gap-6">
        <div className="space-y-4">
          {favourites.data && favourites.data.length > 0 && !locked && (
            <div className="flex flex-wrap gap-2" aria-label="Favourites">
              {favourites.data.map((f) => (
                <button
                  key={`${f.activityId}-${f.projectId ?? ''}`}
                  className="rounded-full border border-line bg-raised px-3 py-1 text-sm hover:border-accent hover:text-accent transition-colors duration-settle"
                  onClick={() =>
                    save.mutate({ date, minutes: 60, activityId: f.activityId, projectId: f.projectId })
                  }
                >
                  {f.projectName ? `${f.projectName} · ` : ''}{f.activityName} +1h
                </button>
              ))}
              <Button variant="quiet" size="sm" onClick={() => copyYesterday.mutate()}>
                Copy yesterday
              </Button>
            </div>
          )}

          <Card temp="personal" className="divide-y divide-line/60 p-0">
            {workRows.length === 0 && (
              <p className="p-5 text-ink-muted">
                Nothing mapped yet.{d?.publicHoliday ? ` It's ${d.publicHoliday}.` : ''} Add a row
                below, or copy yesterday to start from something familiar.
              </p>
            )}
            {workRows.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                locked={locked}
                onDelta={(delta) => {
                  const next = e.minutes + delta;
                  if (next <= 0) remove.mutate(e.id);
                  else save.mutate({ id: e.id, date, minutes: next, activityId: e.activityId, projectId: e.projectId, phaseId: e.phaseId, notes: e.notes });
                }}
                onDelete={() => remove.mutate(e.id)}
              />
            ))}
            {!locked && assignments.data && (
              <AddRow
                data={assignments.data}
                suggestedMinutes={remaining > 0 ? Math.min(remaining, 120) : 60}
                onAdd={(input) => save.mutate({ ...input, date })}
              />
            )}
          </Card>

          {contextualRows.length > 0 && (
            <Card temp="personal" className="bg-sunken/40">
              <div className="text-sm text-ink-muted mb-2">
                Recorded for you, not counted as cost. Only you can see these.
              </div>
              <div className="space-y-1">
                {contextualRows.map((e) => (
                  <div key={e.id} className="flex justify-between text-base">
                    <span>{e.activityName}</span>
                    <span className="tabular text-ink-muted">{minutesLabel(e.minutes)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card temp="personal" className="flex flex-col items-center gap-2">
            <CompletionRing
              pct={pct}
              size={104}
              label={`Day ${Math.round(pct * 100)} percent mapped`}
            />
            <div className="text-sm text-ink-muted text-center">
              {scheduled === 0
                ? 'Not a scheduled day'
                : remaining > 0
                  ? `${minutesLabel(remaining)} unmapped`
                  : 'Fully mapped'}
            </div>
            {d?.publicHoliday && <StatusChip tone="info">{d.publicHoliday}</StatusChip>}
          </Card>
          <div className="text-xs text-ink-faint leading-relaxed px-1">
            An incomplete day is a gap, never an error. Your notes and personal categories are
            visible to you alone.
          </div>
        </div>
      </div>
    </div>
  );
}

function EntryRow(props: {
  entry: DayEntryView;
  locked: boolean;
  onDelta: (delta: number) => void;
  onDelete: () => void;
}) {
  const e = props.entry;
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-base text-ink truncate">
          {e.projectName ? (
            <>
              <span className="font-medium">{e.projectName}</span>
              {e.phaseName && <span className="text-ink-muted"> · {e.phaseName}</span>}
              <span className="text-ink-muted"> · {e.activityName}</span>
            </>
          ) : (
            <span className="font-medium">{e.activityName}</span>
          )}
        </div>
        {e.notes && <div className="text-sm text-ink-muted truncate">{e.notes}</div>}
      </div>
      <div className="flex items-center gap-1">
        {!props.locked && (
          <Button variant="quiet" size="sm" aria-label={`Reduce ${e.activityName} by 15 minutes`} onClick={() => props.onDelta(-15)}>−</Button>
        )}
        <span className="tabular text-base w-14 text-center">{minutesLabel(e.minutes)}</span>
        {!props.locked && (
          <Button variant="quiet" size="sm" aria-label={`Extend ${e.activityName} by 15 minutes`} onClick={() => props.onDelta(15)}>+</Button>
        )}
      </div>
      {!props.locked && (
        <Button variant="quiet" size="sm" aria-label={`Remove ${e.activityName}`} onClick={props.onDelete}>×</Button>
      )}
    </div>
  );
}

function AddRow(props: {
  data: Awaited<ReturnType<typeof getAssignments>>;
  suggestedMinutes: number;
  onAdd: (input: Omit<SaveEntryInput, 'date'>) => void;
}) {
  const [scope, setScope] = useState<'project' | 'company' | 'personal'>('project');
  const [projectId, setProjectId] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [minutes, setMinutes] = useState(props.suggestedMinutes);
  const [showAll, setShowAll] = useState(false);

  const projects = showAll ? props.data.all : props.data.assigned;
  const phases = projectId ? (props.data.phasesByProject[projectId] ?? []) : [];
  const activities = useMemo(
    () => props.data.activities.filter((a) => a.scope === scope),
    [props.data.activities, scope],
  );

  const ready = activityId && minutes > 0 && (scope !== 'project' || projectId);

  return (
    <form
      className="px-5 py-4 bg-sunken/30 flex flex-wrap items-end gap-2"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!ready) return;
        props.onAdd({
          minutes,
          activityId,
          projectId: scope === 'project' ? projectId : undefined,
          phaseId: scope === 'project' && phaseId ? phaseId : undefined,
        });
        setActivityId('');
        setPhaseId('');
      }}
    >
      <label className="block">
        <span className="block text-xs text-ink-muted mb-0.5">Kind</span>
        <select className="border border-line rounded-financial bg-raised px-2 py-1.5 text-base" value={scope}
          onChange={(e) => { setScope(e.target.value as 'project' | 'company' | 'personal'); setActivityId(''); setProjectId(''); }}>
          <option value="project">Project</option>
          <option value="company">Studio</option>
          <option value="personal">Personal</option>
        </select>
      </label>
      {scope === 'project' && (
        <>
          <label className="block flex-1 min-w-[160px]">
            <span className="block text-xs text-ink-muted mb-0.5">Project</span>
            <select className="w-full border border-line rounded-financial bg-raised px-2 py-1.5 text-base" value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setPhaseId(''); }}>
              <option value="">Choose…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          {phases.length > 0 && (
            <label className="block min-w-[140px]">
              <span className="block text-xs text-ink-muted mb-0.5">Phase</span>
              <select className="w-full border border-line rounded-financial bg-raised px-2 py-1.5 text-base" value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
                <option value="">Any</option>
                {phases.map((ph) => (
                  <option key={ph.id} value={ph.id}>{ph.name}</option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      <label className="block min-w-[150px]">
        <span className="block text-xs text-ink-muted mb-0.5">Activity</span>
        <select className="w-full border border-line rounded-financial bg-raised px-2 py-1.5 text-base" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
          <option value="">Choose…</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-xs text-ink-muted mb-0.5">Duration</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="quiet" size="sm" onClick={() => setMinutes(Math.max(15, minutes - 15))} aria-label="Reduce by 15 minutes">−</Button>
          <span className="tabular w-14 text-center">{minutesLabel(minutes)}</span>
          <Button type="button" variant="quiet" size="sm" onClick={() => setMinutes(minutes + 15)} aria-label="Extend by 15 minutes">+</Button>
        </div>
      </label>
      <Button type="submit" variant="primary" disabled={!ready}>Add</Button>
      {scope === 'project' && !showAll && (
        <Button type="button" variant="quiet" size="sm" onClick={() => setShowAll(true)}>
          Find another project
        </Button>
      )}
    </form>
  );
}
