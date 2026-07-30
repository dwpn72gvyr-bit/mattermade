// Own profile: identity, schedule, and what the console holds about you (§7.6).

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../stores/session';
import { getPerson } from '../../api/queries';
import { Card, PageHeader, Stat, StatusChip } from '../../components/ui';

export default function Profile() {
  const account = useSession((s) => s.account);
  const person = useQuery({
    queryKey: ['person', account.userId, account.personId],
    queryFn: () => getPerson(account, account.personId),
    enabled: !account.isExternal,
  });

  if (account.isExternal) {
    return (
      <div className="max-w-2xl">
        <PageHeader title={account.name} lede="OE Verse collaborator" />
        <Card>Your assignments and terms live in <Link className="text-accent underline" to="/verse-portal">My work</Link>.</Card>
      </div>
    );
  }

  const p = person.data;
  return (
    <div className="max-w-2xl">
      <PageHeader title={account.name} lede={account.title} />
      <div className="space-y-4">
        <Card temp="personal">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Team" value={p?.person.team ?? '—'} />
            <Stat label="Schedule" value={p?.schedule ? `${p.schedule.daysPerWeek} days · ${p.schedule.weeklyHours}h` : '—'} />
            <Stat label="Since" value={p?.person.startDate ?? '—'} />
            <Stat label="Roles" value={<span className="flex flex-wrap gap-1">{account.roles.map((r) => <StatusChip key={r} tone="neutral">{r.replace(/_/g, ' ')}</StatusChip>)}</span>} />
          </div>
        </Card>
        <Card temp="personal">
          <h2 className="display text-lg mb-2">Your data, your rights</h2>
          <ul className="list-disc pl-5 space-y-1 text-base">
            <li>You can view everything stored about you, including who viewed which class of your data.</li>
            <li>You can correct your own time until a month locks, and request adjustments after.</li>
            <li>You can raise a dispute that cannot be dismissed silently (5 working day service level).</li>
            <li>You can export your complete personal record, unaided.</li>
          </ul>
          <p className="text-sm text-ink-muted mt-3">
            The full promise lives on the <Link to="/privacy" className="text-accent underline">privacy page</Link>.
          </p>
        </Card>
      </div>
    </div>
  );
}
