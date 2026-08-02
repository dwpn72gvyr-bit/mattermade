// Console settings: the financial assumptions the engine runs on (§8,
// read-only in the prototype), plus the super admin's working dials from
// round F: the NEW-item window and the option lists behind service lines and
// the OE Verse.

import React, { useState } from 'react';
import { useAccount } from '../../stores/session';
import {
  newItemWindowDays, setNewItemWindowDays,
  optionList, setOptionList, OPTION_LIST_DEFAULTS, type OptionListKey,
} from '../../api/settings';
import { Banner, Button, Card, NewBadge, PageHeader, Stat } from '../../components/ui';
import { todayStr } from '../../api/settings';

const LIST_META: { key: OptionListKey; label: string; note: string }[] = [
  { key: 'service_lines', label: 'Service lines', note: 'Projects, leads and Plan & Quote choose from this list.' },
  { key: 'verse_categories', label: 'OE Verse categories', note: 'The kind of collaborator a profile is.' },
  { key: 'verse_capabilities', label: 'OE Verse capabilities', note: 'What a collaborator can do; profiles pick several.' },
  { key: 'verse_engagements', label: 'OE Verse engagement types', note: 'How the studio engages a collaborator.' },
];

function OptionListEditor(props: { meta: (typeof LIST_META)[number] }) {
  const { key, label, note } = props.meta;
  const [values, setValues] = useState<string[]>(() => optionList(key));
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);

  const persist = (next: string[]) => {
    setValues(next);
    setOptionList(key, next);
    setSaved(true);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-medium text-ink">{label}</h3>
        {saved && <span className="text-xs text-positive">Saved</span>}
      </div>
      <p className="text-xs text-ink-faint mb-2">{note}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 text-sm border border-line rounded-financial bg-sunken/50 px-2 py-0.5">
            {v.replace(/_/g, ' ')}
            <button
              className="text-ink-faint hover:text-critical"
              aria-label={`Remove ${v}`}
              onClick={() => persist(values.filter((x) => x !== v))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-line rounded-financial bg-raised px-3 py-1.5 text-sm"
          placeholder={`Add to ${label.toLowerCase()}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              persist([...values, draft.trim()].filter((v, i, a) => a.indexOf(v) === i));
              setDraft('');
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!draft.trim()}
          onClick={() => {
            persist([...values, draft.trim()].filter((v, i, a) => a.indexOf(v) === i));
            setDraft('');
          }}
        >
          Add
        </Button>
        <Button size="sm" variant="quiet" onClick={() => persist([...OPTION_LIST_DEFAULTS[key]])}>
          Reset
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const account = useAccount();
  const isSuper = account.roles.includes('super_admin');
  const [days, setDays] = useState(() => String(newItemWindowDays()));
  const [daysSaved, setDaysSaved] = useState(false);
  const daysNum = Number(days);
  const daysOk = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 60;

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Console settings"
        lede="The assumptions the engine runs on, and the working dials of the console. Financial assumptions are dated; changing one creates a new dated value and never rewrites the past."
      />

      {isSuper && (
        <Card as="section">
          <h2 className="display text-lg mb-1">New-item window</h2>
          <p className="text-sm text-ink-muted mb-3">
            Anything added within this many days carries the <NewBadge createdAt={todayStr()} /> flag
            across leads, projects, the Directory and the OE Verse. Between 1 and 60 days.
          </p>
          <div className="flex items-center gap-2">
            <input
              className={`w-24 border rounded-financial bg-raised px-3 py-1.5 text-sm tabular ${daysOk ? 'border-line' : 'border-critical'}`}
              inputMode="numeric"
              value={days}
              aria-label="New-item window in days"
              onChange={(e) => { setDays(e.target.value); setDaysSaved(false); }}
            />
            <span className="text-sm text-ink-muted">days</span>
            <Button
              size="sm"
              variant="primary"
              disabled={!daysOk}
              onClick={() => { setNewItemWindowDays(daysNum); setDaysSaved(true); }}
            >
              Save
            </Button>
            {daysSaved && <span className="text-xs text-positive">Saved</span>}
          </div>
          {!daysOk && (
            <p className="text-xs text-critical mt-1">Use a whole number of days from 1 to 60.</p>
          )}
        </Card>
      )}

      {isSuper && (
        <Card as="section" className="space-y-6">
          <div>
            <h2 className="display text-lg mb-1">Option lists</h2>
            <p className="text-sm text-ink-muted">
              These lists feed the pickers across the console. Add what the studio needs; removing
              an option hides it from new choices without touching records that already use it.
            </p>
          </div>
          {LIST_META.map((meta) => <OptionListEditor key={meta.key} meta={meta} />)}
        </Card>
      )}

      {!isSuper && (
        <Banner tone="info">The working dials on this page sit with the super admin; the assumptions below are open to finance.</Banner>
      )}

      <Card as="section">
        <h2 className="display text-lg mb-3">Financial assumptions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Stat label="GST" value="9%" sub="on all quotations" />
          <Stat label="Base currency" value="SGD" sub="company views" />
          <Stat label="Financial year end" value="31 December" sub="client to confirm (§15)" />
          <Stat label="Employer CPF" value="17%" sub="OW ceiling S$7,400/mo" />
          <Stat label="CPF on AWS" value="Yes" sub="contractual 13th month" />
          <Stat label="Productive factor" value="0.80" sub="of available hours" />
          <Stat label="External mark-up" value="20%" sub="pricing default (R9)" />
          <Stat label="Contingency" value="10%" sub="pricing default" />
          <Stat label="Expense approval" value="S$500" sub="proposed threshold (§15)" />
          <Stat label="External engagement" value="S$10,000" sub="leadership above this (§15)" />
          <Stat label="Revision rounds" value="3 included" sub="+12% phase hours per extra round" />
          <Stat label="Aggregation floor" value="3 people" sub="2 for project budgets" />
        </div>
        <p className="text-xs text-ink-faint mt-3">
          Items marked §15 are proposals awaiting the client's confirmation and are flagged in
          docs/DECISIONS.md.
        </p>
      </Card>
    </div>
  );
}
