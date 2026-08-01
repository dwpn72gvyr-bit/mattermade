// OE Verse (client direction, item 10): the searchable talent book. Search
// drives verse.search with a short debounce; category chips narrow the list.
// Rates never appear on cards; they live on the profile, behind S4.

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from '../../stores/session';
import { searchVerse, VERSE_CATEGORIES } from '../../api/verseApi';
import { Banner, Button, Card, PageHeader, StatusChip } from '../../components/ui';
import { Stars, VerseProfileEditor, VERSE_EDITOR_ROLES } from './CollaboratorProfile';

const field = 'w-full border border-line rounded-financial bg-raised px-3 py-2 text-base';

export default function VerseDirectory() {
  const account = useAccount();
  const navigate = useNavigate();
  const canEdit = VERSE_EDITOR_ROLES.some((r) => account.roles.includes(r));

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const verse = useQuery({
    queryKey: ['verse-search', account.userId, debounced],
    queryFn: () => searchVerse(account, debounced),
  });

  if (verse.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  const entries = (verse.data ?? []).filter(
    (e) => !category || e.profile.category === category,
  );

  if (adding) {
    return (
      <div className="max-w-2xl">
        <PageHeader
          title="Add to the Verse"
          lede="A new collaborator profile: who they are, what they do, how it went."
        />
        <VerseProfileEditor
          onDone={(collaboratorId) => {
            setAdding(false);
            if (collaboratorId) navigate(`/verse/${collaboratorId}`);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="OE Verse"
        lede="The collaborator network: who we work with, what they bring, how it went."
        actions={
          canEdit ? (
            <Button variant="primary" size="sm" onClick={() => setAdding(true)}>Add to the Verse</Button>
          ) : undefined
        }
      />

      <div className="mb-3 max-w-sm">
        <label className="block">
          <span className="sr-only">Search the Verse</span>
          <input
            type="search"
            className={field}
            placeholder="Search by name, capability, project or place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5" role="group" aria-label="Filter by category">
        <button
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={`rounded-full border px-3 py-1 text-sm transition-colors duration-settle ${
            category === null ? 'border-accent bg-accent text-white' : 'border-line bg-raised text-ink-muted hover:text-ink'
          }`}
        >
          All
        </button>
        {VERSE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory((cur) => (cur === cat ? null : cat))}
            aria-pressed={category === cat}
            className={`rounded-full border px-3 py-1 text-sm transition-colors duration-settle ${
              category === cat ? 'border-accent bg-accent text-white' : 'border-line bg-raised text-ink-muted hover:text-ink'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {entries.map(({ collaborator: c, profile: p }) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/verse/${c.id}`} className="font-medium text-base hover:text-accent">{c.name}</Link>
                <div className="text-sm text-ink-muted">{p.category ?? c.discipline}</div>
                <div className="text-xs text-ink-faint">{c.location}</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {p.engagement && <StatusChip tone="info">{p.engagement}</StatusChip>}
                {p.engagedBefore && <StatusChip tone="positive">Engaged before</StatusChip>}
              </div>
            </div>
            {p.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {p.capabilities.slice(0, 5).map((cap) => (
                  <span key={cap} className="text-xs border border-line rounded-full px-2 py-0.5 text-ink-muted">{cap}</span>
                ))}
                {p.capabilities.length > 5 && (
                  <span className="text-xs text-ink-faint px-1 py-0.5">and {p.capabilities.length - 5} more</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
              <span className="flex items-baseline gap-1.5">
                <span className="text-ink-muted">Craft</span>
                <Stars label="Craft" value={p.craftRating} />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-ink-muted">Personality</span>
                <Stars label="Personality" value={p.personalityRating} />
              </span>
            </div>
          </Card>
        ))}
      </div>

      {!verse.isLoading && entries.length === 0 && (
        <p className="text-ink-muted text-center py-10">
          No one in the Verse matches that yet.
        </p>
      )}
    </div>
  );
}
