// Today (§8.1): the two-minute daily ritual and the highest-stakes screen.
// Activity rows with a cascading picker, 15-minute steppers, typed hour input,
// favourites chips, copy yesterday, a completion ring, a drag-block timetable,
// and contextual rows with a quiet "recorded for you, not counted as cost"
// note. An incomplete day is a gap, never an error state.
//
// Round F: weekend and Singapore public-holiday awareness, a closed-day care
// card, and a complimentary-hours note once the day passes its schedule. None
// of it changes official costing (R2); the scheduled day stays the boundary.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import {
  getDay, saveEntry, deleteEntry, copyDay, getFavourites, getAssignments,
  type DayEntryView, type SaveEntryInput,
} from '../../api/queries';
import { Banner, Button, Card, CompletionRing, PageHeader, StatusChip } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { closedDayInfo } from '../../lib/sgHolidays';

function addDays(date: string, n: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000)
    .toISOString().slice(0, 10);
}

function minutesLabel(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? `${r}m` : r === 0 ? `${h}h` : `${h}h ${r}m`;
}

/** Parse a typed number of hours ("1.5", "0.25", "8") into whole minutes.
 *  Returns null for anything invalid, negative, zero or beyond a day. */
function parseHoursToMinutes(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '' || !/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const minutes = Math.round(n * 60);
  if (minutes < 1 || minutes > 24 * 60) return null;
  return minutes;
}

function hoursText(minutes: number): string {
  return String(Math.round((minutes / 60) * 100) / 100);
}

/** Typed hour input. Valid values commit on blur or Enter; invalid or
 *  negative input flags red and never saves. Escape reverts the draft. */
function HoursField(props: {
  minutes: number;
  label: string;
  disabled?: boolean;
  onCommit: (minutes: number) => void;
  onInvalidChange?: (invalid: boolean) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const parsed = draft === null ? props.minutes : parseHoursToMinutes(draft);
  const invalid = draft !== null && parsed === null;

  const commit = () => {
    if (draft !== null && parsed !== null && parsed !== props.minutes) props.onCommit(parsed);
    setDraft(null);
    props.onInvalidChange?.(false);
  };

  return (
    <span className="inline-flex items-baseline gap-1">
      <input
        type="text"
        inputMode="decimal"
        className={`w-16 border rounded-financial bg-raised px-2 py-1 text-base text-right tabular transition-colors duration-settle ${
          invalid ? 'border-critical text-critical' : 'border-line'
        }`}
        value={draft ?? hoursText(props.minutes)}
        aria-label={props.label}
        aria-invalid={invalid || undefined}
        title={invalid ? 'Hours should be a positive number, like 1.5' : undefined}
        disabled={props.disabled}
        onFocus={(e) => { setDraft(e.target.value); }}
        onChange={(e) => {
          setDraft(e.target.value);
          props.onInvalidChange?.(parseHoursToMinutes(e.target.value) === null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === 'Escape') { setDraft(null); props.onInvalidChange?.(false); }
        }}
      />
      <span className="text-xs text-ink-muted" aria-hidden="true">h</span>
    </span>
  );
}

export default function Today() {
  const account = useAccount();
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
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const copyYesterday = useMutation({
    mutationFn: () => copyDay(account, addDays(date, -1), date),
    onSuccess: (result) => {
      setCopyNote(result.skipped ? 'That day is already fully mapped, so nothing was copied.' : null);
      invalidate();
    },
  });

  const d = day.data;
  const scheduled = d?.scheduledMinutes ?? 0;
  const mapped = d?.mappedPaidMinutes ?? 0;
  const pct = scheduled > 0 ? mapped / scheduled : 0;
  const remaining = Math.max(0, scheduled - mapped);
  const locked = d?.periodStatus === 'locked';

  const workRows = (d?.entries ?? []).filter((e) => !e.contextual);
  const contextualRows = (d?.entries ?? []).filter((e) => e.contextual);

  // Weekend and Singapore public-holiday awareness (round F). The hardcoded
  // 2025 and 2026 list lives in lib/sgHolidays; the demo dataset's fixture
  // calendar arrives on the day payload as a fallback.
  const closed = closedDayInfo(date);
  const holidayName = closed.holidayName ?? d?.publicHoliday;
  const isClosedDay = closed.closed || Boolean(d?.publicHoliday);
  const closedLabel = holidayName
    ? `${holidayName}, a public holiday`
    : `a ${closed.reason ?? 'closed day'}`;

  // Complimentary hours (round F): everything mapped beyond the scheduled day.
  const complimentary = Math.max(0, mapped - scheduled);

  // Timetable ordering is a personal visual arrangement for the day; the data
  // model has no start times, so blocks run in sequence from 9:00.
  const [blockOrder, setBlockOrder] = useState<string[]>([]);
  useEffect(() => { setBlockOrder([]); }, [date]);
  const orderedWork = useMemo(() => {
    const idx = new Map(blockOrder.map((id, i) => [id, i]));
    return [...workRows].sort(
      (a, b) => (idx.get(a.id) ?? blockOrder.length) - (idx.get(b.id) ?? blockOrder.length),
    );
  }, [workRows, blockOrder]);

  const resizeEntry = (e: DayEntryView, minutes: number) =>
    save.mutate({
      id: e.id, date, minutes,
      activityId: e.activityId, projectId: e.projectId, phaseId: e.phaseId, notes: e.notes,
    });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Today"
        lede={
          scheduled === 0
            ? 'No scheduled hours on this day. Anything you record is for your own picture.'
            : pct > 1.05
              ? `You've mapped ${(mapped / 60).toFixed(1).replace(/\.0$/, '')} hours against ${scheduled / 60} scheduled. If that's real overtime it counts as effort; if it's a slip, two taps fix it.`
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
      {isClosedDay && (
        <Banner tone="info" className="mb-4">
          This day is {closedLabel}, so it is not an official work day. Hours you log here are
          welcome for transparency, and they sit outside the official eight-hour costing day.
        </Banner>
      )}
      {complimentary > 0 && mapped > 0 && (
        <Banner tone="positive" className="mb-4">
          {minutesLabel(complimentary)} of this day sits beyond your scheduled hours. Thank you
          for the extra care. These complimentary hours are recorded for the picture and never
          enter official project costs.
        </Banner>
      )}
      {copyNote && (
        <Banner tone="info" className="mb-4">{copyNote}</Banner>
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
                Nothing mapped yet.{holidayName ? ` It's ${holidayName}.` : ''} Add a row
                below, or copy yesterday to start from something familiar.
              </p>
            )}
            {orderedWork.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                locked={locked}
                onDelta={(delta) => {
                  const next = e.minutes + delta;
                  if (next <= 0) remove.mutate(e.id);
                  else save.mutate({ id: e.id, date, minutes: next, activityId: e.activityId, projectId: e.projectId, phaseId: e.phaseId, notes: e.notes });
                }}
                onSetMinutes={(minutes) => resizeEntry(e, minutes)}
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

          {isClosedDay && (
            <Card temp="personal" className="border-info/40 bg-info/5">
              <p className="display text-lg text-ink">OE is closed today. Please rest where you can.</p>
              <p className="text-sm text-ink-muted mt-1">
                The timetable below stays open, and anything you choose to map is received with thanks.
              </p>
            </Card>
          )}

          {orderedWork.length > 0 && (
            <Timetable
              entries={orderedWork}
              scheduledMinutes={scheduled}
              locked={locked}
              onReorder={setBlockOrder}
              onResize={resizeEntry}
            />
          )}

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
                  : pct > 1.05
                    ? `${minutesLabel(mapped - scheduled)} complimentary`
                    : 'Fully mapped'}
            </div>
            {holidayName && <StatusChip tone="info">{holidayName}</StatusChip>}
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
  onSetMinutes: (minutes: number) => void;
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
        {props.locked ? (
          <span className="tabular text-base w-14 text-center">{minutesLabel(e.minutes)}</span>
        ) : (
          <HoursField
            minutes={e.minutes}
            label={`Hours for ${e.activityName}`}
            onCommit={props.onSetMinutes}
          />
        )}
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

// ---------------------------------------------------------------------------
// Drag-block timetable (round F). Entries carry no start times, so blocks run
// in sequence from 9:00 in entry order. Dragging a block reorders the personal
// arrangement; dragging its lower edge resizes the entry in 15-minute steps
// and saves through the same mutation as the list.
// ---------------------------------------------------------------------------

const DAY_START_MIN = 9 * 60;   // 9:00
const DAY_END_MIN = 19 * 60;    // 19:00
const PX_PER_MIN = 64 / 60;     // 64px per hour

function Timetable(props: {
  entries: DayEntryView[];
  scheduledMinutes: number;
  locked: boolean;
  onReorder: (ids: string[]) => void;
  onResize: (entry: DayEntryView, minutes: number) => void;
}) {
  const [preview, setPreview] = useState<{ id: string; minutes: number } | null>(null);
  const resizeRef = useRef<{ id: string; startY: number; startMinutes: number; latest: number } | null>(null);
  const dragId = useRef<string | null>(null);

  const shownMinutes = (e: DayEntryView) =>
    preview && preview.id === e.id ? preview.minutes : e.minutes;

  const total = props.entries.reduce((s, e) => s + shownMinutes(e), 0);
  const spanMinutes = Math.max(DAY_END_MIN - DAY_START_MIN, total);
  const height = spanMinutes * PX_PER_MIN;

  const hourMarks: number[] = [];
  for (let m = 0; m <= spanMinutes; m += 60) hourMarks.push(m);

  const startResize = (ev: React.PointerEvent<HTMLDivElement>, e: DayEntryView) => {
    if (props.locked) return;
    ev.preventDefault();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    resizeRef.current = { id: e.id, startY: ev.clientY, startMinutes: e.minutes, latest: e.minutes };
    setPreview({ id: e.id, minutes: e.minutes });
  };
  const moveResize = (ev: React.PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current;
    if (!r) return;
    const deltaMin = (ev.clientY - r.startY) / PX_PER_MIN;
    const next = Math.min(24 * 60, Math.max(15, Math.round((r.startMinutes + deltaMin) / 15) * 15));
    if (next !== r.latest) {
      r.latest = next;
      setPreview({ id: r.id, minutes: next });
    }
  };
  const endResize = (e: DayEntryView, commit: boolean) => {
    const r = resizeRef.current;
    if (!r) return;
    resizeRef.current = null;
    setPreview(null);
    if (commit && r.latest !== r.startMinutes) props.onResize(e, r.latest);
  };

  const hoverReorder = (overId: string) => {
    const from = dragId.current;
    if (!from || from === overId) return;
    const ids = props.entries.map((x) => x.id);
    const without = ids.filter((id) => id !== from);
    const at = without.indexOf(overId);
    if (at === -1) return;
    without.splice(at, 0, from);
    props.onReorder(without);
  };

  let offset = 0;
  const blocks = props.entries.map((e) => {
    const startMin = offset;
    const minutes = shownMinutes(e);
    offset += minutes;
    return { e, startMin, minutes };
  });

  const boundaryPx = props.scheduledMinutes > 0 ? props.scheduledMinutes * PX_PER_MIN : null;

  return (
    <Card temp="personal">
      <div className="text-sm text-ink-muted mb-3">Your day as blocks</div>
      <div
        className="relative"
        style={{ height: `${height}px` }}
        role="list"
        aria-label="Day timetable from 9:00"
        onDragOver={(ev) => ev.preventDefault()}
      >
        {hourMarks.map((m) => (
          <div
            key={m}
            className="absolute left-0 right-0 border-t border-line/60"
            style={{ top: `${m * PX_PER_MIN}px` }}
            aria-hidden="true"
          >
            <span className="absolute -top-2 left-0 text-[10px] tabular text-ink-faint bg-raised pr-1">
              {String(Math.floor((DAY_START_MIN + m) / 60) % 24).padStart(2, '0')}:00
            </span>
          </div>
        ))}
        {boundaryPx !== null && boundaryPx <= height && (
          <div
            className="absolute left-10 right-0 border-t-2 border-accent/60"
            style={{ top: `${boundaryPx}px` }}
            aria-hidden="true"
          >
            <span className="absolute -top-2 right-0 text-[10px] text-accent bg-raised pl-1">
              scheduled day ends
            </span>
          </div>
        )}
        {blocks.map(({ e, startMin, minutes }) => {
          const beyond = props.scheduledMinutes > 0 && startMin >= props.scheduledMinutes;
          const h = minutes * PX_PER_MIN;
          return (
            <div
              key={e.id}
              role="listitem"
              aria-label={`${e.projectName ?? e.activityName}, ${minutesLabel(minutes)}${beyond ? ', complimentary' : ''}`}
              className={`absolute left-10 right-1 rounded-personal border overflow-hidden flex flex-col transition-colors duration-settle ${
                beyond ? 'border-info/40 bg-info/5' : 'border-accent/40 bg-accent/10'
              }`}
              style={{ top: `${startMin * PX_PER_MIN}px`, height: `${h}px` }}
              onDragOver={(ev) => { ev.preventDefault(); hoverReorder(e.id); }}
              onDrop={(ev) => ev.preventDefault()}
            >
              <div
                className={`flex-1 min-h-0 px-2 ${h >= 30 ? 'py-1' : 'py-0'} ${props.locked ? '' : 'cursor-grab active:cursor-grabbing'}`}
                draggable={!props.locked}
                onDragStart={(ev) => {
                  dragId.current = e.id;
                  ev.dataTransfer.effectAllowed = 'move';
                  ev.dataTransfer.setData('text/plain', e.id);
                }}
                onDragEnd={() => { dragId.current = null; }}
              >
                <div className="flex items-baseline justify-between gap-2 text-sm leading-tight">
                  <span className="truncate text-ink">
                    {e.projectName ? `${e.projectName} · ${e.activityName}` : e.activityName}
                  </span>
                  <span className="tabular text-ink-muted whitespace-nowrap">
                    {minutesLabel(minutes)}{beyond ? ' · complimentary' : ''}
                  </span>
                </div>
              </div>
              {!props.locked && (
                <div
                  className="h-2 shrink-0 cursor-ns-resize flex items-center justify-center touch-none"
                  aria-hidden="true"
                  title="Drag to resize in 15-minute steps"
                  onPointerDown={(ev) => startResize(ev, e)}
                  onPointerMove={moveResize}
                  onPointerUp={() => endResize(e, true)}
                  onPointerCancel={() => endResize(e, false)}
                >
                  <span className="block w-8 border-t-2 border-ink/30 rounded-full" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink-faint mt-3">
        Blocks run in sequence from 9:00 because entries carry no start times. Drag a block to
        rearrange your view of the day; drag its lower edge to change its length in 15-minute
        steps, which updates the entry itself.
      </p>
    </Card>
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
  const [durationInvalid, setDurationInvalid] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const projects = showAll ? props.data.all : props.data.assigned;
  const phases = projectId ? (props.data.phasesByProject[projectId] ?? []) : [];
  const activities = useMemo(
    () => props.data.activities.filter((a) => a.scope === scope),
    [props.data.activities, scope],
  );

  const ready = activityId && minutes > 0 && !durationInvalid && (scope !== 'project' || projectId);

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
      <div className="block">
        <span className="block text-xs text-ink-muted mb-0.5">Duration</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="quiet" size="sm" onClick={() => setMinutes(Math.max(15, minutes - 15))} aria-label="Reduce by 15 minutes">−</Button>
          <HoursField
            minutes={minutes}
            label="Duration in hours"
            onCommit={setMinutes}
            onInvalidChange={setDurationInvalid}
          />
          <Button type="button" variant="quiet" size="sm" onClick={() => setMinutes(minutes + 15)} aria-label="Extend by 15 minutes">+</Button>
        </div>
      </div>
      <Button type="submit" variant="primary" disabled={!ready}>Add</Button>
      {scope === 'project' && !showAll && (
        <Button type="button" variant="quiet" size="sm" onClick={() => setShowAll(true)}>
          Find another project
        </Button>
      )}
    </form>
  );
}
