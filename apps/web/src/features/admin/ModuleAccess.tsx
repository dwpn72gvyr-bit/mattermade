// Module access (client direction, item 14): the super admin decides who holds
// Plan & Quote, the Directory, the OE Verse and Business Development.
// Navigation stays subtractive: withdrawn modules simply vanish.

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from '../../stores/session';
import { getModuleAccess, updateModuleAccess } from '../../api/adminApi';
import type { ModuleKey } from '../../api/settings';
import { Banner, LedgerTable, PageHeader, Td, Th } from '../../components/ui';

const MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'plan_quote', label: 'Plan & Quote' },
  { key: 'directory', label: 'Directory' },
  { key: 'verse', label: 'OE Verse' },
  { key: 'bizdev', label: 'Business development' },
];

export default function ModuleAccess() {
  const account = useAccount();
  const qc = useQueryClient();
  const table = useQuery({
    queryKey: ['module-access', account.userId],
    queryFn: () => getModuleAccess(account),
  });
  const update = useMutation({
    mutationFn: (args: { userId: string; module: ModuleKey; allowed: boolean }) =>
      updateModuleAccess(account, args.userId, args.module, args.allowed),
    onMutate: async (args) => {
      // Optimistic flip so the box answers the click immediately.
      await qc.cancelQueries({ queryKey: ['module-access', account.userId] });
      qc.setQueryData<Awaited<ReturnType<typeof getModuleAccess>>>(
        ['module-access', account.userId],
        (rows) =>
          rows?.map((r) =>
            r.userId === args.userId
              ? { ...r, access: { ...r.access, [args.module]: args.allowed } }
              : r,
          ),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['module-access'] }),
  });

  if (table.isError) {
    return <Banner tone="info">Module access sits with the super admin alone.</Banner>;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Module access"
        lede="Who holds the working modules. Roles set the default; your word here overrides it. A module withdrawn disappears from that person's navigation entirely."
      />
      <LedgerTable
        caption="Module access by person"
        head={
          <tr>
            <Th>Person</Th>
            {MODULES.map((m) => <Th key={m.key}>{m.label}</Th>)}
          </tr>
        }
      >
        {(table.data ?? []).map((row) => (
          <tr key={row.userId}>
            <Td>
              <span className="font-medium">{row.name}</span>
              <div className="text-xs text-ink-faint">
                {row.roles.filter((r) => r !== 'team_member').join(', ').replace(/_/g, ' ') || 'team member'}
              </div>
            </Td>
            {MODULES.map((m) => (
              <Td key={m.key}>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#3D5A4C]"
                  aria-label={`${row.name}: ${m.label}`}
                  checked={row.access[m.key]}
                  onChange={(e) => update.mutate({ userId: row.userId, module: m.key, allowed: e.target.checked })}
                />
              </Td>
            ))}
          </tr>
        ))}
      </LedgerTable>
      <p className="text-xs text-ink-faint mt-3">
        Personal areas, time sovereignty and the privacy boundary are not configurable here or
        anywhere. Sensitive financial fields stay governed by the permission engine regardless
        of module access.
      </p>
    </div>
  );
}
