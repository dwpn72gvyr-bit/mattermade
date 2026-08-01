// Project templates (§5.2): masters are copied, never linked.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getTemplates } from '../../api/queries';
import { Banner, Card, PageHeader } from '../../components/ui';

export default function Templates() {
  const account = useAccount();
  const templates = useQuery({ queryKey: ['templates', account.userId], queryFn: () => getTemplates(account) });

  if (templates.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  return (
    <div>
      <PageHeader
        title="Project templates"
        lede="Starting structures for new estimates. A template is copied into a project, never linked, so past projects keep the shape they were built with."
      />
      <div className="grid md:grid-cols-2 gap-4">
        {(templates.data ?? []).map((t) => (
          <Card key={t.id}>
            <div className="font-medium text-base mb-1">{t.name}</div>
            <div className="text-xs text-ink-faint mb-2">{t.serviceLine.replace(/_/g, ' ')}</div>
            <ol className="list-decimal pl-5 text-sm text-ink-muted space-y-0.5">
              {t.phases.map((p) => <li key={p.name}>{p.name}</li>)}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  );
}
