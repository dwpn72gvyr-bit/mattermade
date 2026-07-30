// R7 non-surveillance boundary: contextual time categories and personal
// insights are visible only to the person they belong to, with no override
// for any role. Iterates ALL roles and ALL actions, super_admin included.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ALL_ACTIONS, ALL_SYSTEM_ROLES, can, serialiseWithPolicy, type Resource } from '../src';
import { ASOF, OWNER, PROJECT_X, actorAs, actorWithGrants, grant, scopeFor, ownerActor } from './helpers';

const contextualEntry: Resource = { type: 'timeEntry', ownerId: OWNER, contextual: true };
const insight: Resource = { type: 'personalInsight', ownerId: OWNER };

describe('R7: contextual categories are the owner\'s alone, no exceptions', () => {
  it.each(ALL_SYSTEM_ROLES)('%s gets nothing, for any action', (role) => {
    const actor = actorAs(role);
    for (const action of ALL_ACTIONS) {
      const d = can(actor, action, contextualEntry, undefined, ASOF);
      expect(d.allow).toBe(false);
    }
  });

  it('the owner sees and manages their own contextual entries', () => {
    for (const action of ['view', 'create', 'edit', 'delete', 'export'] as const) {
      expect(can(ownerActor, action, contextualEntry, undefined, ASOF)).toEqual({ allow: true });
    }
  });

  it('a project-scoped contextual entry is still unreachable by the project lead', () => {
    const lead = actorAs('project_lead');
    const d = can(lead, 'view', { type: 'timeEntry', ownerId: OWNER, projectId: PROJECT_X, contextual: true }, undefined, ASOF);
    expect(d.allow).toBe(false);
  });
});

describe('R7: personal insights are the owner\'s alone, no exceptions', () => {
  it.each(ALL_SYSTEM_ROLES)('%s gets nothing, for any action', (role) => {
    const actor = actorAs(role);
    for (const action of ALL_ACTIONS) {
      const d = can(actor, action, insight, undefined, ASOF);
      expect(d.allow).toBe(false);
    }
  });

  it('no combination of grants reaches an insight (property)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...ALL_SYSTEM_ROLES), { minLength: 1, maxLength: ALL_SYSTEM_ROLES.length }),
        fc.constantFrom(...ALL_ACTIONS),
        (roles, action) => {
          const actor = actorWithGrants(roles.map((r) => grant(r, scopeFor(r))));
          return can(actor, action, insight, undefined, ASOF).allow === false;
        },
      ),
    );
  });

  it('the owner keeps their insights', () => {
    for (const action of ['view', 'create', 'edit', 'delete', 'export'] as const) {
      expect(can(ownerActor, action, insight, undefined, ASOF)).toEqual({ allow: true });
    }
  });

  it('serialising an insight for any non-owner returns null, never a partial object', () => {
    const payload = { ownerId: OWNER, pattern: 'deep work before 11am', score: 87654321 };
    for (const role of ALL_SYSTEM_ROLES) {
      const out = serialiseWithPolicy(actorAs(role), insight, payload, ASOF);
      expect(out).toBeNull();
    }
  });
});
