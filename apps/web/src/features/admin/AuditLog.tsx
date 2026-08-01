// Audit log (§7.5): append-only; super-admin actions logged like everyone
// else's. No update or delete path exists.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getAudit } from '../../api/queries';
import { Banner, LedgerTable, PageHeader, StatusChip, Td, Th } from '../../components/ui';

export default function AuditLog() {
  const account = useAccount();
  const audit = useQuery({ queryKey: ['audit', account.userId], queryFn: () => getAudit(account) });

  if (audit.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Audit log"
        lede="Append-only. Salary changes, rate changes, post-date time edits, approvals, locks, reopens and sensitive exports, with who and when. There is no way to edit this trail, including for super admins."
      />
      <LedgerTable
        caption="Audit records, newest first"
        head={<tr><Th>When</Th><Th>Who</Th><Th>Action</Th><Th>Entity</Th><Th>Reason</Th></tr>}
      >
        {(audit.data ?? []).map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap tabular text-sm">{r.occurredAt.slice(0, 16).replace('T', ' ')}</Td>
            <Td>{r.actorUserId.replace('usr-', '')}</Td>
            <Td>
              <StatusChip tone={r.action === 'reopen' ? 'critical' : r.action === 'lock' || r.action === 'approve' ? 'info' : 'neutral'}>
                {r.action}
              </StatusChip>
            </Td>
            <Td className="text-sm">{r.entityType} · {r.entityId}</Td>
            <Td className="text-sm text-ink-muted">{r.reason ?? '—'}</Td>
          </tr>
        ))}
      </LedgerTable>
    </div>
  );
}
