// Activity categories (§8): the behaviour flags are the money model in
// miniature (§5.3). Changing a flag moves money, so changes are audited.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../stores/session';
import { getActivities } from '../../api/queries';
import { Banner, LedgerTable, PageHeader, Td, Th } from '../../components/ui';

const CHECK = <span aria-label="yes" className="text-positive">✓</span>;
const CROSS = <span aria-label="no" className="text-ink-faint">✗</span>;

export default function Activities() {
  const account = useSession((s) => s.account);
  const activities = useQuery({ queryKey: ['activities', account.userId], queryFn: () => getActivities(account) });

  if (activities.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  return (
    <div>
      <PageHeader
        title="Activity categories"
        lede="These flags decide where every recorded minute lands: project cost, company cost, or nowhere at all. They are the money model in miniature."
      />
      <LedgerTable
        caption="Activity categories and behaviour flags"
        head={
          <tr>
            <Th>Activity</Th><Th>Scope</Th><Th>Paid</Th><Th>Cost-bearing</Th>
            <Th>Productive</Th><Th>Billable</Th><Th>Utilisation</Th><Th>Project-costed</Th>
          </tr>
        }
      >
        {(activities.data ?? []).map((a) => (
          <tr key={a.id}>
            <Td className="font-medium">{a.name}</Td>
            <Td>{a.scope}</Td>
            <Td>{a.paid ? CHECK : CROSS}</Td>
            <Td>{a.costBearing ? CHECK : CROSS}</Td>
            <Td>{a.productive ? CHECK : CROSS}</Td>
            <Td>{a.billable ? CHECK : CROSS}</Td>
            <Td>{a.countsTowardUtilisation ? CHECK : CROSS}</Td>
            <Td>{a.includedInProjectCosting ? CHECK : CROSS}</Td>
          </tr>
        ))}
      </LedgerTable>
      <p className="text-xs text-ink-faint mt-3">
        Personal-scope activities are never costed and are visible only to their owner. That is a
        property of the data model, not a setting.
      </p>
    </div>
  );
}
