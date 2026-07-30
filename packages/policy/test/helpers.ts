// Shared fixtures for the §7 permission suites. One owner ('p-owner', whose
// data is under test) and one viewer ('p-viewer', who holds the role being
// tested), with scopes wide enough that any refusal is a rule, not a scoping
// accident.

import {
  type Actor, type GrantScope, type IsoDate, type RoleGrant, type SystemRole,
} from '../src';

export const ASOF: IsoDate = '2026-07-30';
export const OWNER = 'p-owner';
export const VIEWER = 'p-viewer';
export const PROJECT_X = 'proj-x';
export const PROJECT_Y = 'proj-y';

export function grant(
  role: SystemRole,
  scope: GrantScope = { type: 'global' },
  effectiveFrom: IsoDate = '2025-01-01',
  effectiveTo?: IsoDate,
): RoleGrant {
  return { role, scope, effectiveFrom, ...(effectiveTo !== undefined ? { effectiveTo } : {}) };
}

/** The widest sensible scope for each role when acting on OWNER / PROJECT_X:
 *  a lead scoped to the owner's project, a manager with the owner as a named
 *  direct report, everything else global. */
export function scopeFor(role: SystemRole): GrantScope {
  if (role === 'project_lead') return { type: 'project', ids: [PROJECT_X] };
  if (role === 'people_manager') return { type: 'reports', ids: [OWNER] };
  return { type: 'global' };
}

export function actorAs(role: SystemRole, personId: string = VIEWER): Actor {
  return { userId: `u-${personId}-${role}`, personId, grants: [grant(role, scopeFor(role))] };
}

export function actorWithGrants(grants: RoleGrant[], personId: string = VIEWER): Actor {
  return { userId: `u-${personId}`, personId, grants };
}

export const ownerActor: Actor = {
  userId: 'u-owner',
  personId: OWNER,
  grants: [grant('team_member')],
};
