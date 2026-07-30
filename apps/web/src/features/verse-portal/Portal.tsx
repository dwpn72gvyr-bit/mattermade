// OE Verse portal (§7.2 external contributor): own assignments, own terms.
// Hard-walled: no internal directory, no other collaborators' data, no
// project financials.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../stores/session';
import { getMyVerseWork } from '../../api/queries';
import { Banner, Card, PageHeader, Stat, StatusChip } from '../../components/ui';
import { fmtDate, fmtMoneyWhole } from '../../lib/format';

export default function Portal() {
  const account = useSession((s) => s.account);
  const work = useQuery({ queryKey: ['verse-portal', account.userId], queryFn: () => getMyVerseWork(account) });

  if (work.isError) {
    return <Banner tone="info">This area is for OE Verse collaborators.</Banner>;
  }
  const d = work.data;
  if (!d) return <div className="text-ink-muted py-10 text-center">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Welcome, ${account.shortName}`}
        lede="Your engagements with OuterEdit: scope, terms and status. Nothing else of the studio's, and nothing of yours shown to anyone who doesn't need it."
      />
      <div className="space-y-4">
        {d.agreements.map((a) => {
          const projects = d.projects.filter((p) => a.projectIds.includes(p.id));
          return (
            <Card key={a.id} temp="personal">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-base">{projects.map((p) => p.name).join(', ') || 'Engagement'}</div>
                  <div className="text-sm text-ink-muted">{a.model.replace(/_/g, ' ')}</div>
                </div>
                <StatusChip tone={['active', 'committed'].includes(a.status) ? 'positive' : 'neutral'}>{a.status}</StatusChip>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Stat label="Your fee" value={fmtMoneyWhole(a.feeMinor ?? a.rateMinor ?? 0, a.currency)} sub={a.model === 'hourly' ? 'per hour' : a.model === 'monthly_retainer' ? 'per month' : 'agreed fee'} />
                <Stat label="Window" value={`${fmtDate(a.startDate)}${a.endDate ? ` → ${fmtDate(a.endDate)}` : ''}`} />
                <Stat label="Expenses" value={a.expensesReimbursable ? 'Reimbursable' : 'Included'} />
              </div>
              {a.milestones && a.milestones.length > 0 && (
                <div className="mt-3 border-t border-line/60 pt-2 space-y-1">
                  {a.milestones.map((m) => (
                    <div key={m.name} className="flex justify-between text-sm">
                      <span>{m.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="tabular">{fmtMoneyWhole(m.amountMinor, a.currency)}</span>
                        <StatusChip tone={m.status === 'accepted' ? 'positive' : 'neutral'}>{m.status}</StatusChip>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
