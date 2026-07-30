// packages/policy/src/roles.ts
// §5.1 identity: SystemRole, RoleGrant, Actor. §7.2: roles are additive and
// scoped; holding project-lead on project X grants nothing on project Y.
// Pure: no clock. Grant expiry is evaluated against an explicit asOf (§3).

export type SystemRole =
  | 'team_member'
  | 'project_lead'
  | 'people_manager'
  | 'finance_admin'
  | 'ops_admin'
  | 'leadership'
  | 'super_admin'
  | 'external_contributor'
  | 'auditor';

/** All system roles, in §5.1 declaration order. Useful for matrix tests. */
export const ALL_SYSTEM_ROLES: readonly SystemRole[] = [
  'team_member', 'project_lead', 'people_manager', 'finance_admin', 'ops_admin',
  'leadership', 'super_admin', 'external_contributor', 'auditor',
];

/** Calendar date or ISO timestamp as a string ('YYYY-MM-DD' or full ISO).
 *  Compared lexicographically, which is correct for a consistent format. */
export type IsoDate = string;

export type GrantScopeType = 'global' | 'project' | 'team' | 'reports';

export interface GrantScope {
  type: GrantScopeType;
  /** Project ids for 'project'; person ids for 'team' and 'reports'. */
  ids?: string[];
}

export interface RoleGrant {           // §5.1 [A]
  role: SystemRole;
  scope: GrantScope;
  effectiveFrom: IsoDate;
  effectiveTo?: IsoDate;               // temporary grants expire automatically
}

export interface Actor {
  userId: string;
  personId?: string;
  grants: RoleGrant[];                 // additive; see §7.2
}

export interface HasRoleOptions {
  /** Evaluation instant, passed explicitly (no system clock in packages/policy). */
  asOf: IsoDate;
  /** Target project, matched against 'project'-scoped grants. */
  projectId?: string;
  /** Target person ids, matched against 'team'/'reports'-scoped grants
   *  (e.g. the owner of a time entry a people_manager wants totals for). */
  teamMemberIds?: string[];
}

/** §5.1: a grant is active when effectiveFrom <= asOf <= effectiveTo.
 *  An expired grant (effectiveTo < asOf) grants nothing (§7.2, auditor time-boxing). */
export function grantIsActive(grant: RoleGrant, asOf: IsoDate): boolean {
  if (grant.effectiveFrom > asOf) return false;
  if (grant.effectiveTo !== undefined && grant.effectiveTo < asOf) return false;
  return true;
}

/** Does this grant's scope cover the requested target? Fail-closed: a scoped
 *  grant covers nothing when the caller supplies no matching target (§7.2). */
export function scopeCovers(scope: GrantScope, opts: HasRoleOptions): boolean {
  switch (scope.type) {
    case 'global':
      return true;
    case 'project':
      return opts.projectId !== undefined
        && (scope.ids ?? []).includes(opts.projectId);
    case 'team':
    case 'reports': {
      const targets = opts.teamMemberIds ?? [];
      if (targets.length === 0) return false;
      const ids = scope.ids ?? [];
      return targets.every((id) => ids.includes(id));
    }
  }
}

/** §7.2: additive, scoped, expiring role check. True when the actor holds an
 *  active grant of `role` whose scope covers the requested target at `asOf`. */
export function hasRole(actor: Actor, role: SystemRole, opts: HasRoleOptions): boolean {
  return actor.grants.some(
    (g) => g.role === role && grantIsActive(g, opts.asOf) && scopeCovers(g.scope, opts),
  );
}

/** Grants active at asOf, regardless of scope target. */
export function activeGrants(actor: Actor, asOf: IsoDate): RoleGrant[] {
  return actor.grants.filter((g) => grantIsActive(g, asOf));
}

/** §7.2 external contributor hard wall: an actor is "internal" only while
 *  holding at least one active grant of a role other than external_contributor. */
export function hasActiveInternalGrant(actor: Actor, asOf: IsoDate): boolean {
  return actor.grants.some(
    (g) => g.role !== 'external_contributor' && grantIsActive(g, asOf),
  );
}
