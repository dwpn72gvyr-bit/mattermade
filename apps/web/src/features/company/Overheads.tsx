// Overhead register (§8): the structural guarantee is that payroll can never
// live here (§5.4 guard), and the register never blurs into project costs.

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companyOverheadSchema } from '@oe/domain';
import { useSession } from '../../stores/session';
import { getOverheads } from '../../api/queries';
import { Banner, Button, Card, LedgerTable, PageHeader, Td, Th } from '../../components/ui';
import { fmtMoneyWhole } from '../../lib/format';

export default function Overheads() {
  const account = useSession((s) => s.account);
  const overheads = useQuery({
    queryKey: ['overheads', account.userId],
    queryFn: () => getOverheads(account),
  });
  const [description, setDescription] = useState('');
  const [guardMessage, setGuardMessage] = useState<string | null>(null);

  if (overheads.isError) {
    return <Banner tone="info">This area isn't part of your access. If it should be, Ryan or the ops team can grant it.</Banner>;
  }

  const rows = overheads.data ?? [];
  const monthly = rows.filter((r) => r.recurrence === 'monthly').reduce((s, r) => s + r.amountMinor, 0);

  const tryAdd = () => {
    const candidate = {
      id: 'oh-new', createdAt: '2026-06-30T00:00:00Z', createdBy: account.userId,
      updatedAt: '2026-06-30T00:00:00Z', updatedBy: account.userId,
      category: 'other', description, amountMinor: 100000, currency: 'SGD',
      recurrence: 'monthly', effectiveFrom: '2026-07-01', paymentStatus: 'planned',
    };
    const result = companyOverheadSchema.safeParse(candidate);
    if (!result.success) {
      setGuardMessage(result.error.issues[0]?.message ?? 'That entry is not valid.');
    } else {
      setGuardMessage('Saved to the register (demo).');
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Overheads"
        lede="The cost of keeping the studio's lights on. Payroll never lives here; it enters through employment agreements so each dollar is counted once."
      />
      <LedgerTable
        caption="Overhead register"
        head={<tr><Th>Line</Th><Th>Category</Th><Th>Recurrence</Th><Th num>Amount</Th></tr>}
        foot={<tr><Td colSpan={3}>Monthly total</Td><Td num>{fmtMoneyWhole(monthly)}</Td></tr>}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>{r.description}</Td>
            <Td>{r.category}</Td>
            <Td>{r.recurrence}</Td>
            <Td num>{fmtMoneyWhole(r.amountMinor)}</Td>
          </tr>
        ))}
      </LedgerTable>

      <Card className="mt-5">
        <h2 className="display text-lg mb-2">Add a line</h2>
        <div className="flex gap-2 items-end flex-wrap">
          <label className="block flex-1 min-w-[240px]">
            <span className="block text-sm text-ink-muted mb-0.5">Description</span>
            <input
              className="w-full border border-line rounded-financial bg-raised px-3 py-2 text-base"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setGuardMessage(null); }}
              placeholder='Try "Design team salaries" to see the guard'
            />
          </label>
          <Button variant="primary" onClick={tryAdd} disabled={!description}>Add to register</Button>
        </div>
        {guardMessage && (
          <Banner tone={guardMessage.startsWith('Saved') ? 'positive' : 'critical'} className="mt-3">
            {guardMessage}
          </Banner>
        )}
      </Card>
    </div>
  );
}
