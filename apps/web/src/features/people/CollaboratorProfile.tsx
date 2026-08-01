// OE Verse collaborator profile (client direction, item 10): one page, no
// tabs, every field the studio tracks. Rates stay S4: present only when the
// serialiser says so, masked otherwise. The editor is shared with the
// directory's "Add to the Verse" flow.

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CurrencyCode } from '@oe/finance';
import { useAccount } from '../../stores/session';
import {
  searchVerse, saveVerseProfile, VERSE_CATEGORIES, VERSE_CAPABILITIES,
  type VerseEntry, type VerseProfileInput,
} from '../../api/verseApi';
import type { VerseProfile } from '../../api/db';
import { Banner, Button, Card, Masked, PageHeader, StatusChip } from '../../components/ui';
import { fmtMoneyWhole } from '../../lib/format';

export const VERSE_EDITOR_ROLES = ['super_admin', 'ops_admin', 'finance_admin', 'leadership'];

const ENGAGEMENTS: NonNullable<VerseProfile['engagement']>[] = [
  'Full-time', 'Freelance', 'Short Stint', 'Internship',
];

const field = 'w-full border border-line rounded-financial bg-raised px-3 py-2 text-base';

/** Star display: filled and empty glyphs, never colour alone. */
export function Stars(props: { label: string; value?: number }) {
  if (!props.value) return <span className="text-sm text-ink-faint">Not rated yet</span>;
  const v = Math.max(1, Math.min(5, Math.round(props.value)));
  return (
    <span role="img" aria-label={`${props.label} ${v} of 5`} className="text-base tracking-wide">
      <span aria-hidden="true">
        <span className="text-accent">{'★'.repeat(v)}</span>
        <span className="text-ink-faint">{'☆'.repeat(5 - v)}</span>
      </span>
    </span>
  );
}

function StarInput(props: { label: string; value?: number; onChange: (n?: number) => void }) {
  return (
    <div>
      <span className="block text-sm text-ink-muted mb-0.5">{props.label}</span>
      <div role="group" aria-label={`${props.label} rating, 1 to 5`} className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = props.value !== undefined && n <= props.value;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${props.label} ${n} of 5`}
              aria-pressed={filled}
              onClick={() => props.onChange(n === props.value ? undefined : n)}
              className={`text-xl leading-none ${filled ? 'text-accent' : 'text-ink-faint hover:text-ink-muted'}`}
            >
              <span aria-hidden="true">{filled ? '★' : '☆'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The full-field editor, shared by the profile page and the directory's
 *  "Add to the Verse" flow (no initial entry means a new profile). */
export function VerseProfileEditor(props: {
  initial?: VerseEntry;
  onDone: (collaboratorId?: string) => void;
}) {
  const account = useAccount();
  const qc = useQueryClient();
  const c = props.initial?.collaborator;
  const p = props.initial?.profile;

  const [fullName, setFullName] = useState(c?.name ?? '');
  const [website, setWebsite] = useState(p?.website ?? '');
  const [instagram, setInstagram] = useState(p?.instagram ?? '');
  const [email, setEmail] = useState(p?.email ?? '');
  const [contactNo, setContactNo] = useState(p?.contactNo ?? '');
  const [location, setLocation] = useState(c?.location ?? '');
  const [category, setCategory] = useState(p?.category ?? '');
  const [capabilities, setCapabilities] = useState<string[]>(p?.capabilities ?? []);
  const [engagement, setEngagement] = useState<VerseProfile['engagement']>(p?.engagement);
  const [engagedBefore, setEngagedBefore] = useState(p?.engagedBefore ?? false);
  const [craft, setCraft] = useState<number | undefined>(p?.craftRating);
  const [personality, setPersonality] = useState<number | undefined>(p?.personalityRating);
  const [notes, setNotes] = useState(p?.notes ?? '');
  const [ratesNote, setRatesNote] = useState(p?.ratesNote ?? '');

  const save = useMutation({
    mutationFn: () => {
      const input: VerseProfileInput = {
        collaboratorId: c?.id,
        fullName: fullName.trim(),
        discipline: c?.discipline ?? (category || undefined),
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        email: email.trim() || undefined,
        contactNo: contactNo.trim() || undefined,
        category: category || undefined,
        capabilities,
        engagement,
        notes: notes.trim() || undefined,
        ratesNote: ratesNote.trim() || undefined,
        engagedBefore,
        craftRating: craft,
        personalityRating: personality,
      };
      return saveVerseProfile(account, input);
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['verse-search'] });
      props.onDone(res.collaborator.id);
    },
  });

  const toggleCapability = (cap: string) =>
    setCapabilities((cur) => (cur.includes(cap) ? cur.filter((x) => x !== cap) : [...cur, cap]));

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Full name</span>
            <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Website or portfolio</span>
            <input className={field} type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Instagram</span>
            <input className={field} value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Email</span>
            <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Contact no</span>
            <input className={field} value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Location</span>
            <input className={field} value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Category</span>
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Choose…</option>
              {VERSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm text-ink-muted mb-0.5">Engagement</span>
            <select
              className={field}
              value={engagement ?? ''}
              onChange={(e) => setEngagement((e.target.value || undefined) as VerseProfile['engagement'])}
            >
              <option value="">Choose…</option>
              {ENGAGEMENTS.map((en) => (
                <option key={en} value={en}>{en}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card className="space-y-2">
        <span className="block text-sm text-ink-muted">Capabilities</span>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1.5">
          {VERSE_CAPABILITIES.map((cap) => (
            <label key={cap} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={capabilities.includes(cap)}
                onChange={() => toggleCapability(cap)}
              />
              {cap}
            </label>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-6">
          <StarInput label="Craft" value={craft} onChange={setCraft} />
          <StarInput label="Personality" value={personality} onChange={setPersonality} />
          <label className="flex items-center gap-2 text-sm text-ink self-end pb-1">
            <input
              type="checkbox"
              checked={engagedBefore}
              onChange={(e) => setEngagedBefore(e.target.checked)}
            />
            Engaged before
          </label>
        </div>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Notes</span>
          <textarea className={field} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm text-ink-muted mb-0.5">Rates</span>
          <textarea className={field} rows={2} value={ratesNote} onChange={(e) => setRatesNote(e.target.value)} />
          <span className="block text-xs text-ink-faint mt-0.5">
            Rate notes stay with finance, ops and leadership.
          </span>
        </label>
      </Card>

      {save.isError && (
        <Banner tone="critical">That didn't save. The fault is ours. Try again in a moment.</Banner>
      )}
      <div className="flex gap-2">
        <Button variant="primary" disabled={!fullName.trim() || save.isPending} onClick={() => save.mutate()}>
          {c ? 'Save profile' : 'Add to the Verse'}
        </Button>
        <Button variant="quiet" onClick={() => props.onDone()}>Cancel</Button>
      </div>
    </div>
  );
}

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5 border-t border-line/60 first:border-t-0">
      <span className="text-sm text-ink-muted w-36 shrink-0">{props.label}</span>
      <span className="text-base min-w-0">{props.children}</span>
    </div>
  );
}

export default function CollaboratorProfile() {
  const { collaboratorId = '' } = useParams();
  const account = useAccount();
  const verse = useQuery({
    queryKey: ['verse-search', account.userId, ''],
    queryFn: () => searchVerse(account, ''),
  });
  const canEdit = VERSE_EDITOR_ROLES.some((r) => account.roles.includes(r));
  const [editing, setEditing] = useState(false);

  if (verse.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }
  const entry = verse.data?.find((v) => v.collaborator.id === collaboratorId);
  if (!entry) return <div className="text-ink-muted py-10 text-center">Loading…</div>;

  const c = entry.collaborator;
  const p = entry.profile;

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        crumbs={[{ label: 'OE Verse' }, { label: c.name }]}
        title={c.name}
        lede={[p.category ?? c.discipline, c.location].filter(Boolean).join(' · ')}
        actions={
          canEdit && !editing ? (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          ) : undefined
        }
      />

      {editing ? (
        <VerseProfileEditor initial={entry} onDone={() => setEditing(false)} />
      ) : (
        <>
          <Card as="section">
            <Row label="Full name">{c.name}</Row>
            <Row label="Website / Portfolio">
              {p.website ? (
                <a href={p.website} target="_blank" rel="noreferrer" className="underline hover:text-accent break-all">
                  {p.website}
                </a>
              ) : '—'}
            </Row>
            <Row label="Instagram">{p.instagram ?? '—'}</Row>
            <Row label="Email">
              {p.email ? <a href={`mailto:${p.email}`} className="underline hover:text-accent break-all">{p.email}</a> : '—'}
            </Row>
            <Row label="Contact no">{p.contactNo ? <span className="tabular">{p.contactNo}</span> : '—'}</Row>
            <Row label="Location">{c.location}</Row>
            <Row label="Category">{p.category ?? '—'}</Row>
            <Row label="Capabilities">
              {(p.capabilities ?? []).length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {p.capabilities.map((cap) => (
                    <span key={cap} className="text-xs border border-line rounded-full px-2 py-0.5 text-ink-muted">{cap}</span>
                  ))}
                </span>
              ) : '—'}
            </Row>
            <Row label="Engagement">
              {p.engagement ? <StatusChip tone="info">{p.engagement}</StatusChip> : '—'}
            </Row>
            <Row label="Engaged before">
              {p.engagedBefore ? <StatusChip tone="positive">Yes</StatusChip> : <StatusChip tone="neutral">No</StatusChip>}
            </Row>
            <Row label="Craft"><Stars label="Craft" value={p.craftRating} /></Row>
            <Row label="Personality"><Stars label="Personality" value={p.personalityRating} /></Row>
            <Row label="Notes">{p.notes ?? '—'}</Row>
          </Card>

          <Card as="section">
            <h2 className="display text-lg mb-2">Rates</h2>
            {entry.ratesVisible ? (
              <div className="space-y-2">
                <p className="text-base">{p.ratesNote ?? 'No rate note recorded.'}</p>
                {entry.agreements.length > 0 && (
                  <div className="space-y-1.5">
                    {entry.agreements.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm border-t border-line/60 pt-1.5">
                        <span className="text-ink-muted">{a.model.replace(/_/g, ' ')} · {a.status}</span>
                        <span className="tabular">
                          {fmtMoneyWhole(a.feeMinor ?? a.rateMinor ?? 0, a.currency as CurrencyCode)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Masked label="Rates are held by finance, ops and leadership" />
            )}
          </Card>

          <Card as="section">
            <h2 className="display text-lg mb-2">Projects worked on</h2>
            {entry.projects.length > 0 ? (
              <ul className="space-y-1">
                {entry.projects.map((pr) => (
                  <li key={pr.id}>
                    <Link to={`/projects/${pr.id}`} className="underline hover:text-accent">{pr.name}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-muted text-base">No projects together yet.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
