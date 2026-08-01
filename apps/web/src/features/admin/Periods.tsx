// Financial periods (§8): lock and reopen with their guards. A red tie-out
// blocks lock (R3); reopen is super admin with a mandatory reason (§7.4).

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, useSession } from '../../stores/session';
import { getPeriods, lockPeriod, reopenPeriod } from '../../api/queries';
import { Banner, Button, LedgerTable, PageHeader, StatusChip, Td, Th } from '../../components/ui';
import { fmtMoneyWhole, fmtPeriod } from '../../lib/format';

export default function Periods() {
  const account = useAccount();
  const qc = useQueryClient();
  const periods = useQuery({ queryKey: ['periods', account.userId], queryFn: () => getPeriods(account) });
  const [reopenTarget, setReopenTarget] = useState<string | null>(null);
  const [lockTarget, setLockTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const lock = useMutation({
    mutationFn: (ym: string) => lockPeriod(account, ym),
    onSuccess: () => { setLockTarget(null); qc.invalidateQueries({ queryKey: ['periods'] }); },
  });
  const reopen = useMutation({
    mutationFn: ({ ym, why }: { ym: string; why: string }) => reopenPeriod(account, ym, why),
    onSuccess: () => { setReopenTarget(null); setReason(''); qc.invalidateQueries({ queryKey: ['periods'] }); },
  });

  if (periods.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  const isFinance = account.roles.includes('finance_admin') || account.roles.includes('super_admin');
  const isSuper = account.roles.includes('super_admin');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Financial periods"
        lede="A month locks only when its tie-out is green: every dollar of payroll accounted for exactly once. Locking snapshots costs onto entries."
      />
      <LedgerTable
        caption="Periods"
        head={<tr><Th>Month</Th><Th>Status</Th><Th>Tie-out</Th><Th num>Payroll expected</Th><Th num>Difference</Th><Th /></tr>}
      >
        {(periods.data ?? []).map((p) => (
          <tr key={p.yearMonth}>
            <Td className="font-medium">{fmtPeriod(p.yearMonth)}</Td>
            <Td>
              <StatusChip tone={p.status === 'locked' ? 'info' : p.status === 'soft_closed' ? 'caution' : 'positive'}>
                {p.status.replace('_', ' ')}
              </StatusChip>
            </Td>
            <Td>
              <StatusChip tone={p.tieOut === 'green' ? 'positive' : p.tieOut === 'amber' ? 'caution' : 'critical'}>
                {p.tieOut}
              </StatusChip>
            </Td>
            <Td num>{fmtMoneyWhole(p.tieOutDetail.expectedMinor)}</Td>
            <Td num>{fmtMoneyWhole(p.tieOutDetail.differenceMinor)}</Td>
            <Td>
              {p.status !== 'locked' && isFinance && (
                <Button size="sm" variant="secondary" onClick={() => setLockTarget(p.yearMonth)} disabled={p.tieOut === 'red'}>
                  Lock
                </Button>
              )}
              {p.status === 'locked' && isSuper && (
                <Button size="sm" variant="quiet" onClick={() => setReopenTarget(p.yearMonth)}>Reopen</Button>
              )}
            </Td>
          </tr>
        ))}
      </LedgerTable>

      {lockTarget && (
        <div className="mt-5 border border-line rounded-financial bg-raised p-4 max-w-xl">
          <h2 className="display text-lg mb-2">Lock {fmtPeriod(lockTarget)}</h2>
          <p className="text-sm text-ink-muted mb-3">
            Locking snapshots every entry's cost and closes the month to edits. Corrections after
            this become dated adjustments.
            {lockTarget === '2026-06' && ' This month is still running; locking it now will close it early.'}
          </p>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => lock.mutate(lockTarget)}>
              Lock {fmtPeriod(lockTarget)}
            </Button>
            <Button variant="quiet" onClick={() => setLockTarget(null)}>Not yet</Button>
          </div>
        </div>
      )}

      {reopenTarget && (
        <div className="mt-5 border border-critical/40 rounded-financial bg-critical/5 p-4 max-w-xl">
          <h2 className="display text-lg mb-2">Reopen {fmtPeriod(reopenTarget)}</h2>
          <p className="text-sm text-ink-muted mb-2">
            Reopening is audited and needs a reason. Post-lock corrections stay as dated
            adjustments; history is never rewritten.
          </p>
          <input
            className="w-full border border-line rounded-financial bg-raised px-3 py-2 text-base mb-2"
            placeholder="Why this period needs to reopen"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="danger" disabled={!reason.trim()} onClick={() => reopen.mutate({ ym: reopenTarget, why: reason })}>
              Reopen with reason
            </Button>
            <Button variant="quiet" onClick={() => { setReopenTarget(null); setReason(''); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
