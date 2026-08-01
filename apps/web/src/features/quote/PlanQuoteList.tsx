// Plan & Quote entry: quotations in play, and the door into the single-screen
// estimating workbench for the project being estimated (§8).

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getQuotations } from '../../api/queries';
import { Banner, LedgerTable, PageHeader, StatusChip, Td, Th } from '../../components/ui';
import { fmtDate, fmtMoneyWhole } from '../../lib/format';

export default function PlanQuoteList() {
  const account = useAccount();
  const quotes = useQuery({
    queryKey: ['quotations', account.userId],
    queryFn: () => getQuotations(account),
  });

  if (quotes.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  const rows = quotes.data ?? [];

  const statusNote: Record<string, string> = {
    draft: 'Being estimated in the workbench',
    sent: 'With the client, awaiting a decision',
    accepted: 'Baseline frozen and handed to delivery',
    superseded: 'Replaced by a newer version',
    declined: 'Not taken up',
  };

  return (
    <div>
      <PageHeader
        title="Plan & Quote"
        lede="Each estimate opens as a single workbench: structure, scope of work, externals, the price ladder and the scenarios on one page, every figure responding live to every edit, with approval converting the chosen model straight into a project."
      />
      <LedgerTable
        caption="Quotations"
        head={<tr><Th>Project</Th><Th>Version</Th><Th>Issued</Th><Th>Status</Th><Th num>Total (incl GST)</Th><Th /></tr>}
      >
        {rows.map(({ quotation: q, project }) => (
          <tr key={q.id}>
            <Td className="font-medium">{project?.name ?? q.projectId}</Td>
            <Td num>v{q.version}</Td>
            <Td>{fmtDate(q.issuedDate)}</Td>
            <Td>
              <StatusChip tone={q.status === 'accepted' ? 'positive' : q.status === 'draft' ? 'neutral' : 'info'}>
                {q.status}
              </StatusChip>
              <span className="block text-xs text-ink-faint mt-1">
                {statusNote[q.status] ?? q.status}
              </span>
            </Td>
            <Td num>{fmtMoneyWhole(q.totalMinor)}</Td>
            <Td>
              <Link to={`/plan-quote/${q.id}`} className="text-accent hover:underline text-sm">
                {q.status === 'draft' ? 'Continue estimating' : 'Open'}
              </Link>
            </Td>
          </tr>
        ))}
      </LedgerTable>
      <p className="text-xs text-ink-faint mt-3">
        Accepting a quotation freezes its estimate as the immutable baseline. Later change flows
        only through approved variations.
      </p>
    </div>
  );
}
