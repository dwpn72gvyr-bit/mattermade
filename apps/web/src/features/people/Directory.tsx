// People directory (§8). No remuneration anywhere near this screen.
// Client direction, item 9: searchable, and super admin or ops can add a
// person here. New people start without a salary; finance enters the
// agreement and the cost rates derive from it.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Person, RoleKey, WorkSchedule } from '@oe/domain';
import { useAccount } from '../../stores/session';
import { getDirectory } from '../../api/queries';
import { db, newId, nowIso } from '../../api/db';
import { Banner, Button, Card, PageHeader } from '../../components/ui';

const ROLE_KEYS: RoleKey[] = [
  'founder', 'creative_director', 'account_director', 'account_manager',
  'designer', 'associate_creative_producer', 'strategist', 'producer',
];

const field = 'w-full border border-line rounded-financial bg-raised px-3 py-2 text-base';

export default function Directory() {
  const account = useAccount();
  const qc = useQueryClient();
  const directory = useQuery({
    queryKey: ['directory', account.userId],
    queryFn: () => getDirectory(account),
  });

  const canManage = ['super_admin', 'ops_admin'].some((r) => account.roles.includes(r));

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [newRole, setNewRole] = useState<RoleKey>('designer');

  if (directory.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  const q = search.trim().toLowerCase();
  const people = (directory.data ?? []).filter((p) => {
    if (!q) return true;
    return [p.name, p.title, ...p.skills].join(' ').toLowerCase().includes(q);
  });

  const addPerson = () => {
    if (!newName.trim()) return;
    // Mock layer only: Stage B replaces this direct mutation with a
    // people.create procedure behind the same permission check.
    const today = nowIso().slice(0, 10);
    const person: Person = {
      id: newId('per'),
      createdAt: nowIso(), createdBy: account.userId,
      updatedAt: nowIso(), updatedBy: account.userId,
      name: newName.trim(),
      title: newTitle.trim() || 'New teammate',
      roleKey: newRole,
      team: newTeam.trim() || undefined,
      seniority: 'mid',
      employmentStatus: 'active',
      startDate: today,
      location: 'SG',
      skills: [],
    };
    db.people.push(person);
    const schedule: WorkSchedule = {
      id: newId('ws'),
      createdAt: nowIso(), createdBy: account.userId,
      updatedAt: nowIso(), updatedBy: account.userId,
      personId: person.id,
      effectiveFrom: today,
      daysPerWeek: 5,
      hoursPerDay: 8,
      weeklyHours: 40,
    };
    db.workSchedules.push(schedule);
    setNewName(''); setNewTitle(''); setNewTeam(''); setNewRole('designer');
    setAdding(false);
    void qc.invalidateQueries({ queryKey: ['directory'] });
  };

  return (
    <div>
      <PageHeader title="Directory" lede="The people who are the studio." />
      <div className="mb-4 max-w-sm">
        <label className="block">
          <span className="sr-only">Search people</span>
          <input
            type="search"
            className={field}
            placeholder="Search by name, title or skill"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {people.map((p) => (
          <Card key={p.id} temp="personal">
            <Link to={`/people/${p.id}`} className="font-medium text-base hover:text-accent">{p.name}</Link>
            <div className="text-sm text-ink-muted">{p.title}</div>
            <div className="text-xs text-ink-faint mt-1">{p.team}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {p.skills.slice(0, 3).map((s) => (
                <span key={s} className="text-xs border border-line rounded-full px-2 py-0.5 text-ink-muted">{s}</span>
              ))}
            </div>
          </Card>
        ))}

        {canManage && !adding && (
          <Card temp="personal" className="flex items-center justify-center">
            <Button variant="secondary" onClick={() => setAdding(true)}>Add person</Button>
          </Card>
        )}

        {canManage && adding && (
          <Card temp="personal" className="space-y-2">
            <div className="font-medium text-base">New person</div>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Name</span>
              <input className={field} value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Title</span>
              <input className={field} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Team</span>
              <input className={field} value={newTeam} onChange={(e) => setNewTeam(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Role</span>
              <select className={field} value={newRole} onChange={(e) => setNewRole(e.target.value as RoleKey)}>
                {ROLE_KEYS.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
            <p className="text-xs text-ink-faint">
              A new person starts with a standard schedule of 5 days at 8 hours and no
              salary or cost rate. Finance enters the employment agreement; rates derive from it.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" disabled={!newName.trim()} onClick={addPerson}>Add to directory</Button>
              <Button variant="quiet" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </Card>
        )}
      </div>
      {q && people.length === 0 && (
        <p className="text-ink-muted text-center py-10">No one matches that search.</p>
      )}
    </div>
  );
}
