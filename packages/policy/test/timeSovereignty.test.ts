// R5 time sovereignty: only the person who recorded a time entry may edit it.
// No role, including super_admin, gets create/edit/delete on another person's
// time. There is no override path, and no combination of grants opens one.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ALL_SYSTEM_ROLES, can, type Action, type Resource } from '../src';
import { ASOF, OWNER, PROJECT_X, actorAs, actorWithGrants, grant, scopeFor, ownerActor } from './helpers';

const entry: Resource = { type: 'timeEntry', ownerId: OWNER, projectId: PROJECT_X };
const TIME_WRITE_ACTIONS: readonly Action[] = ['create', 'edit', 'delete'];

describe('R5: no role can modify another person\'s time entry', () => {
  it.each(ALL_SYSTEM_ROLES)('%s cannot create, edit or delete it', (role) => {
    const actor = actorAs(role);
    for (const action of TIME_WRITE_ACTIONS) {
      const d = can(actor, action, entry, undefined, ASOF);
      expect(d.allow).toBe(false);
    }
  });

  it('no combination of grants opens an override path (property)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...ALL_SYSTEM_ROLES), { minLength: 1, maxLength: ALL_SYSTEM_ROLES.length }),
        fc.constantFrom(...TIME_WRITE_ACTIONS),
        (roles, action) => {
          const actor = actorWithGrants(roles.map((r) => grant(r, scopeFor(r))));
          const d = can(actor, action, entry, undefined, ASOF);
          return d.allow === false;
        },
      ),
    );
  });

  it('nobody, owner included, approves time (§7.4: time is trusted)', () => {
    expect(can(ownerActor, 'approve', entry, undefined, ASOF)).toMatchObject({ allow: false });
    for (const role of ALL_SYSTEM_ROLES) {
      expect(can(actorAs(role), 'approve', entry, undefined, ASOF)).toMatchObject({ allow: false });
    }
  });

  it('the owner keeps full sovereignty', () => {
    for (const action of ['view', 'create', 'edit', 'delete', 'export'] as const) {
      expect(can(ownerActor, action, entry, undefined, ASOF)).toEqual({ allow: true });
    }
  });

  it('leads and managers may view aggregate forms only, never allow:true on the raw entry write path', () => {
    const lead = actorAs('project_lead');
    const manager = actorAs('people_manager');
    expect(can(lead, 'view', entry, undefined, ASOF)).toEqual({ allow: 'masked', as: 'aggregate' });
    expect(can(manager, 'view', entry, undefined, ASOF)).toEqual({ allow: 'masked', as: 'aggregate' });
  });
});
