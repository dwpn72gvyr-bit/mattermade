// Collaborator profile: a thin view over the Verse directory entry.

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getVerse } from '../../api/queries';
import { Banner, Card, Masked, PageHeader, StatusChip } from '../../components/ui';
import { fmtDate, fmtMoneyWhole } from '../../lib/format';

export default function CollaboratorProfile() {
  const { collaboratorId = '' } = useParams();
  const account = useAccount();
  const verse = useQuery({ queryKey: ['verse', account.userId], queryFn: () => getVerse(account) });

  if (verse.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }
  const entry = verse.data?.find((v) => v.collaborator.id === collaboratorId);
  if (!entry) return <div className="text-ink-muted py-10 text-center">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader
        crumbs={[{ label: 'OE Verse' }, { label: entry.collaborator.name }]}
        title={entry.collaborator.name}
        lede={`${entry.collaborator.discipline} · ${entry.collaborator.location}`}
      />
      {entry.collaborator.notes && <Card className="mb-4 text-base">{entry.collaborator.notes}</Card>}
      <div className="space-y-3">
        {entry.agreements.map((a) => (
          <Card key={a.id} className="flex items-center justify-between">
            <div>
              <div className="text-base">{a.model.replace(/_/g, ' ')}</div>
              <div className="text-xs text-ink-faint">
                {fmtDate(a.startDate)}{a.endDate ? ` → ${fmtDate(a.endDate)}` : ''} ·{' '}
                {a.projectIds.map((id) => (
                  <Link key={id} to={`/projects/${id}`} className="underline hover:text-accent">{id}</Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular">
                {'maskedAs' in a.fee ? <Masked label="Rates are held by finance and ops" /> : fmtMoneyWhole(a.fee.value, a.currency)}
              </span>
              <StatusChip tone={['active', 'committed'].includes(a.status) ? 'positive' : 'neutral'}>{a.status}</StatusChip>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
