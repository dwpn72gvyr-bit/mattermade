// Personal insights (§8): visible to the owner alone, no exceptions (R7).
// Reflective, kind, and never comparative.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../stores/session';
import { getInsights } from '../../api/queries';
import { Card, EmptyState, PageHeader, Stat } from '../../components/ui';

export default function Insights() {
  const account = useSession((s) => s.account);
  const insights = useQuery({
    queryKey: ['insights', account.userId],
    queryFn: () => getInsights(account),
  });

  const i = insights.data;
  if (insights.isSuccess && (!i || i.mappedDays === 0)) {
    return (
      <EmptyState
        title="Your insights will appear after your first mapped week."
        body="They're only ever visible to you."
      />
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Insights"
        lede="Patterns in your own time, for your own reflection. Nobody else sees this page."
      />
      {i && (
        <div className="space-y-4">
          <Card temp="personal">
            <p className="text-base leading-relaxed">
              Your deepest work happened on days with one project, not three. You had{' '}
              <span className="tabular font-medium">{i.focusDays}</span> single-project days and{' '}
              <span className="tabular font-medium">{i.fragmentedDays}</span> days split across
              three or more. Something to protect where you can.
            </p>
          </Card>
          <Card temp="personal">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Project work" value={`${Math.round(i.projectMinutes / 60)}h`} sub="across the year" />
              <Stat label="Studio work" value={`${Math.round(i.companyMinutes / 60)}h`} sub="bd, admin, learning" />
              <Stat label="Leave taken" value={`${Math.round(i.leaveMinutes / 60 / 8)} days`} sub="rest matters" />
              <Stat label="Days mapped" value={i.mappedDays} sub="thank you" />
            </div>
          </Card>
          <p className="text-xs text-ink-faint">
            These reflections are computed from your own entries and shown only here. They are
            never used for ranking, scoring, or comparison, and there is no setting that changes
            that.
          </p>
        </div>
      )}
    </div>
  );
}
