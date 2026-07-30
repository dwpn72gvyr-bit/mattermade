// People directory (§8). No remuneration anywhere near this screen.

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../stores/session';
import { getDirectory } from '../../api/queries';
import { Banner, Card, PageHeader } from '../../components/ui';

export default function Directory() {
  const account = useSession((s) => s.account);
  const directory = useQuery({
    queryKey: ['directory', account.userId],
    queryFn: () => getDirectory(account),
  });

  if (directory.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  return (
    <div>
      <PageHeader title="Directory" lede="The six people who are the studio." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(directory.data ?? []).map((p) => (
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
      </div>
    </div>
  );
}
