// OE Verse collaborator profile (client direction, item 10): one page, no
// tabs, every field the studio tracks. Rates stay S4: present only when the
// serialiser says so, masked otherwise. The editor is shared with the
// directory's "Add to the Verse" flow. Round F: location comes from country
// and city presets, categories and engagements are chip multi-selects fed by
// the admin-extendable option lists, and every save stamps the profile dates.

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CurrencyCode } from '@oe/finance';
import { useAccount } from '../../stores/session';
import {
  searchVerse, saveVerseProfile,
  type VerseEntry, type VerseProfileInput,
} from '../../api/verseApi';
import { addOption, optionList, type OptionListKey } from '../../api/settings';
import { Banner, Button, Card, Masked, PageHeader, StatusChip } from '../../components/ui';
import { fmtDate, fmtMoneyWhole } from '../../lib/format';

export const VERSE_EDITOR_ROLES = ['super_admin', 'ops_admin', 'finance_admin', 'leadership'];

const field = 'w-full border border-line rounded-financial bg-raised px-3 py-2 text-base';

// ---------------------------------------------------------------------------
// Location presets (round F): country and city pickers for the region the
// studio works in, with "Other" as the free-text door for anywhere else.
// Stored as the existing "City, Country" string so old data still renders.
// ---------------------------------------------------------------------------

const OTHER = 'Other';

const LOCATION_PRESETS: { country: string; code: string; cities: string[] }[] = [
  { country: 'Singapore', code: 'SG', cities: ['Singapore'] },
  { country: 'Malaysia', code: 'MY', cities: ['Kuala Lumpur', 'Penang', 'Johor Bahru', 'Ipoh', 'Kota Kinabalu'] },
  { country: 'Indonesia', code: 'ID', cities: ['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Denpasar'] },
  { country: 'Thailand', code: 'TH', cities: ['Bangkok', 'Chiang Mai', 'Phuket'] },
  { country: 'Vietnam', code: 'VN', cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang'] },
  { country: 'Philippines', code: 'PH', cities: ['Manila', 'Cebu', 'Davao'] },
  { country: 'Japan', code: 'JP', cities: ['Tokyo', 'Osaka', 'Kyoto', 'Fukuoka'] },
  { country: 'South Korea', code: 'KR', cities: ['Seoul', 'Busan', 'Incheon'] },
  { country: 'China', code: 'CN', cities: ['Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'Chengdu'] },
  { country: 'Hong Kong', code: 'HK', cities: ['Hong Kong'] },
  { country: 'Taiwan', code: 'TW', cities: ['Taipei', 'Taichung', 'Kaohsiung'] },
  { country: 'India', code: 'IN', cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad'] },
  { country: 'Australia', code: 'AU', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'] },
  { country: 'UK', code: 'GB', cities: ['London', 'Manchester', 'Edinburgh', 'Bristol'] },
  { country: 'USA', code: 'US', cities: ['New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Seattle'] },
];

/** Read an existing "City, Country" string back into the pickers. Anything
 *  the presets do not recognise lands in the "Other" free-text fallback. */
function parseLocation(loc: string): { country: string; cityChoice: string; cityText: string; other: string } {
  const s = loc.trim();
  if (!s) return { country: '', cityChoice: '', cityText: '', other: '' };
  const i = s.lastIndexOf(',');
  if (i >= 0) {
    const city = s.slice(0, i).trim();
    const country = s.slice(i + 1).trim();
    const preset = LOCATION_PRESETS.find((p) => p.country.toLowerCase() === country.toLowerCase());
    if (preset) {
      const known = preset.cities.find((c) => c.toLowerCase() === city.toLowerCase());
      return known
        ? { country: preset.country, cityChoice: known, cityText: '', other: '' }
        : { country: preset.country, cityChoice: OTHER, cityText: city, other: '' };
    }
    return { country: OTHER, cityChoice: '', cityText: '', other: s };
  }
  const byCountry = LOCATION_PRESETS.find((p) => p.country.toLowerCase() === s.toLowerCase());
  if (byCountry) return { country: byCountry.country, cityChoice: '', cityText: '', other: '' };
  const byCity = LOCATION_PRESETS.find((p) => p.cities.some((c) => c.toLowerCase() === s.toLowerCase()));
  if (byCity) {
    const known = byCity.cities.find((c) => c.toLowerCase() === s.toLowerCase())!;
    return { country: byCity.country, cityChoice: known, cityText: '', other: '' };
  }
  return { country: OTHER, cityChoice: '', cityText: '', other: s };
}

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

/** Chip multi-select fed by an admin-extendable option list, with an inline
 *  "add new option" input so the list grows from here too (round F). */
function ChipMultiSelect(props: {
  label: string;
  listKey: OptionListKey;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [options, setOptions] = useState<string[]>(() => optionList(props.listKey));
  const [draft, setDraft] = useState('');
  const all = [...options, ...props.values.filter((v) => !options.includes(v))];

  const toggle = (v: string) =>
    props.onChange(props.values.includes(v) ? props.values.filter((x) => x !== v) : [...props.values, v]);

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    addOption(props.listKey, v);
    setOptions(optionList(props.listKey));
    if (!props.values.includes(v)) props.onChange([...props.values, v]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm text-ink-muted">{props.label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={props.label}>
        {all.map((v) => {
          const on = props.values.includes(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              aria-pressed={on}
              className={`rounded-full border px-3 py-1 text-sm transition-colors duration-settle ${
                on ? 'border-accent bg-accent text-white' : 'border-line bg-raised text-ink-muted hover:text-ink'
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 max-w-xs">
        <input
          className="flex-1 border border-line rounded-financial bg-raised px-2.5 py-1 text-sm"
          placeholder={`Add a new ${props.label.toLowerCase()} option`}
          aria-label={`Add a new ${props.label.toLowerCase()} option`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <Button variant="secondary" size="sm" disabled={!draft.trim()} onClick={add}>Add</Button>
      </div>
    </div>
  );
}

/** The full-field editor, shared by the profile page and the directory's
 *  "Add to the Verse" flow (no initial entry means a new profile). */
export function VerseProfileEditor(props: {
  initial?: VerseEntry;
  onDone: (collaboratorId?: string) => void;
  /** Directory flow: return to the list without a route change. */
  onBackToDirectory?: () => void;
}) {
  const account = useAccount();
  const qc = useQueryClient();
  const c = props.initial?.collaborator;
  const p = props.initial?.profile;
  const parsedLoc = parseLocation(c?.location ?? '');

  const [fullName, setFullName] = useState(c?.name ?? '');
  const [website, setWebsite] = useState(p?.website ?? '');
  const [instagram, setInstagram] = useState(p?.instagram ?? '');
  const [email, setEmail] = useState(p?.email ?? '');
  const [contactNo, setContactNo] = useState(p?.contactNo ?? '');
  const [country, setCountry] = useState(parsedLoc.country);
  const [cityChoice, setCityChoice] = useState(parsedLoc.cityChoice);
  const [cityText, setCityText] = useState(parsedLoc.cityText);
  const [locationOther, setLocationOther] = useState(parsedLoc.other);
  const [categories, setCategories] = useState<string[]>(p?.categories ?? []);
  const [capabilities, setCapabilities] = useState<string[]>(p?.capabilities ?? []);
  const [engagements, setEngagements] = useState<string[]>(p?.engagements ?? []);
  const [engagedBefore, setEngagedBefore] = useState(p?.engagedBefore ?? false);
  const [craft, setCraft] = useState<number | undefined>(p?.craftRating);
  const [personality, setPersonality] = useState<number | undefined>(p?.personalityRating);
  const [notes, setNotes] = useState(p?.notes ?? '');
  const [ratesNote, setRatesNote] = useState(p?.ratesNote ?? '');
  const [savedId, setSavedId] = useState<string | undefined>();

  const capabilityOptions = (() => {
    const base = optionList('verse_capabilities');
    return [...base, ...capabilities.filter((v) => !base.includes(v))];
  })();

  const preset = LOCATION_PRESETS.find((x) => x.country === country);
  const effectiveCity = cityChoice === OTHER ? cityText.trim() : cityChoice;
  const composedLocation =
    country === OTHER
      ? locationOther.trim()
      : country
        ? (effectiveCity && effectiveCity !== country ? `${effectiveCity}, ${country}` : country)
        : '';

  const save = useMutation({
    mutationFn: () => {
      const input: VerseProfileInput = {
        collaboratorId: c?.id ?? savedId,
        fullName: fullName.trim(),
        discipline: c?.discipline ?? (categories[0] || undefined),
        location: composedLocation || undefined,
        country: preset?.code,
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        email: email.trim() || undefined,
        contactNo: contactNo.trim() || undefined,
        categories,
        capabilities,
        engagements,
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
      setSavedId(res.collaborator.id);
    },
  });

  const toggleCapability = (cap: string) =>
    setCapabilities((cur) => (cur.includes(cap) ? cur.filter((x) => x !== cap) : [...cur, cap]));

  const resetForAnother = () => {
    setFullName(''); setWebsite(''); setInstagram(''); setEmail(''); setContactNo('');
    setCountry(''); setCityChoice(''); setCityText(''); setLocationOther('');
    setCategories([]); setCapabilities([]); setEngagements([]);
    setEngagedBefore(false); setCraft(undefined); setPersonality(undefined);
    setNotes(''); setRatesNote(''); setSavedId(undefined);
    save.reset();
  };

  const creating = !c;

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
            <span className="block text-sm text-ink-muted mb-0.5">Country</span>
            <select
              className={field}
              value={country}
              onChange={(e) => { setCountry(e.target.value); setCityChoice(''); setCityText(''); }}
            >
              <option value="">Choose…</option>
              {LOCATION_PRESETS.map((x) => (
                <option key={x.country} value={x.country}>{x.country}</option>
              ))}
              <option value={OTHER}>{OTHER}</option>
            </select>
          </label>
          {country === OTHER ? (
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Location</span>
              <input
                className={field}
                placeholder="City, Country"
                value={locationOther}
                onChange={(e) => setLocationOther(e.target.value)}
              />
            </label>
          ) : (
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">City</span>
              <select
                className={field}
                value={cityChoice}
                disabled={!preset}
                onChange={(e) => { setCityChoice(e.target.value); if (e.target.value !== OTHER) setCityText(''); }}
              >
                <option value="">Choose…</option>
                {(preset?.cities ?? []).map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
                <option value={OTHER}>{OTHER}</option>
              </select>
              {cityChoice === OTHER && (
                <input
                  className={`${field} mt-1.5`}
                  placeholder="City"
                  aria-label="Other city"
                  value={cityText}
                  onChange={(e) => setCityText(e.target.value)}
                />
              )}
            </label>
          )}
        </div>
      </Card>

      <Card>
        <ChipMultiSelect
          label="Categories"
          listKey="verse_categories"
          values={categories}
          onChange={setCategories}
        />
      </Card>

      <Card className="space-y-2">
        <span className="block text-sm text-ink-muted">Capabilities</span>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1.5">
          {capabilityOptions.map((cap) => (
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

      <Card>
        <ChipMultiSelect
          label="Engagement"
          listKey="verse_engagements"
          values={engagements}
          onChange={setEngagements}
        />
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
      {savedId && !save.isError && (
        <Banner tone="positive">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>Saved.</span>
            {props.onBackToDirectory ? (
              <button type="button" className="underline hover:no-underline" onClick={props.onBackToDirectory}>
                Back to the OE Verse directory
              </button>
            ) : (
              <Link to="/verse" className="underline hover:no-underline">Back to the OE Verse directory</Link>
            )}
            {creating && (
              <Link to={`/verse/${savedId}`} className="underline hover:no-underline">View profile</Link>
            )}
            {creating && (
              <button type="button" className="underline hover:no-underline" onClick={resetForAnother}>
                Add another collaborator
              </button>
            )}
          </span>
        </Banner>
      )}
      <div className="flex gap-2">
        <Button variant="primary" disabled={!fullName.trim() || save.isPending} onClick={() => save.mutate()}>
          {c || savedId ? 'Save profile' : 'Add to the Verse'}
        </Button>
        <Button variant="quiet" onClick={() => props.onDone(savedId)}>
          {savedId ? 'Close' : 'Cancel'}
        </Button>
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
  const dates = [
    p.addedAt && `Added ${fmtDate(p.addedAt)}`,
    p.updatedAt && `Updated ${fmtDate(p.updatedAt)}`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        crumbs={[{ label: 'OE Verse' }, { label: c.name }]}
        title={c.name}
        lede={[p.categories[0] ?? c.discipline, c.location].filter(Boolean).join(' · ')}
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
            <Row label="Categories">
              {p.categories.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {p.categories.map((cat) => (
                    <span key={cat} className="text-xs border border-line rounded-full px-2 py-0.5 text-ink-muted">{cat}</span>
                  ))}
                </span>
              ) : '—'}
            </Row>
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
              {p.engagements.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {p.engagements.map((en) => (
                    <StatusChip key={en} tone="info">{en}</StatusChip>
                  ))}
                </span>
              ) : '—'}
            </Row>
            <Row label="Engaged before">
              {p.engagedBefore ? <StatusChip tone="positive">Yes</StatusChip> : <StatusChip tone="neutral">No</StatusChip>}
            </Row>
            <Row label="Craft"><Stars label="Craft" value={p.craftRating} /></Row>
            <Row label="Personality"><Stars label="Personality" value={p.personalityRating} /></Row>
            <Row label="Notes">{p.notes ?? '—'}</Row>
            {dates && <p className="text-xs text-ink-faint pt-2">{dates}</p>}
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
