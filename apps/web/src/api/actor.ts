// DemoAccount → policy Actor. The single place session identity becomes
// permission-engine input (R6: components never test roles directly).

import type { Actor, RoleGrant } from '@oe/policy';
import type { DemoAccount } from './demoAccounts';

const FROM = '2024-07-01';

export function actorFor(account: DemoAccount): Actor {
  const grants: RoleGrant[] = [];
  for (const role of account.roles) {
    if (role === 'project_lead') {
      grants.push({
        role,
        scope: { type: 'project', ids: account.leadProjectIds },
        effectiveFrom: FROM,
      } as RoleGrant);
    } else if (role === 'people_manager') {
      grants.push({
        role,
        scope: { type: 'team', ids: account.reportPersonIds },
        effectiveFrom: FROM,
      } as RoleGrant);
    } else {
      grants.push({ role, scope: { type: 'global' }, effectiveFrom: FROM } as RoleGrant);
    }
  }
  return { userId: account.userId, personId: account.personId, grants } as Actor;
}
