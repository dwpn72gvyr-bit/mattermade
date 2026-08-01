// OE Verse directory (§8): the external collaborator network. Rates are S4:
// visible to finance, ops and leadership; scope and status for everyone else.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getVerse } from '../../api/queries';
import { Banner, Card, Masked, PageHeader, StatusChip } from '../../components/ui';
import { fmtMoneyWhole } from '../../lib/format';

export default function VerseDirectory() {
  const account = useAccount();
  const verse = useQuery({ queryKey: ['verse', account.userId], queryFn: () => getVerse(account) });

  if (verse.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  return (
    <div>
      <PageHeader
        title="OE Verse"
        lede="The collaborator network: who we work with, on what terms, across which projects."
      />
      <div className="grid md:grid-cols-2 gap-4">
        {(verse.data ?? []).map(({ collaborator: c, agreements }) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-base">{c.name}</div>
                <div className="text-sm text-ink-muted">{c.discipline}</div>
                <div className="text-xs text-ink-faint">{c.location} · {c.defaultCurrency}</div>
              </div>
              <StatusChip tone={agreements.some((a) => ['active', 'committed'].includes(a.status)) ? 'positive' : 'neutral'}>
                {agreements.some((a) => ['active', 'committed'].includes(a.status)) ? 'Engaged' : 'Available'}
              </StatusChip>
            </div>
            <div className="mt-3 space-y-1.5">
              {agreements.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm border-t border-line/60 pt-1.5">
                  <span className="text-ink-muted">{a.model.replace(/_/g, ' ')} · {a.status}</span>
                  <span className="tabular">
                    {'maskedAs' in a.fee ? <Masked label="Rates are held by finance and ops" /> : fmtMoneyWhole(a.fee.value, a.currency)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
