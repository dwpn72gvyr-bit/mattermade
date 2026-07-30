// packages/policy/src/can.ts
// §7.3 THE permission engine (R6: centralised, field-level permissions).
// One can() implementing the §7.1 sensitivity table and §7.2 role capabilities.
// Components and resolvers never test roles directly; the serialiser applies
// can() to every field before a response leaves the server.
// Pure: no I/O, no clock. Grant expiry needs an explicit asOf; when asOf is
// omitted every grant-based capability fails closed (ownership rules still apply).

import {
  type Actor, type IsoDate, type SystemRole,
  hasRole, hasActiveInternalGrant,
} from './roles';
import { sensitivityOf } from './sensitivity';

export type Action =
  | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
  | 'configure' | 'invite' | 'assign' | 'close' | 'reopen';

export const ALL_ACTIONS: readonly Action[] = [
  'view', 'create', 'edit', 'delete', 'approve', 'export',
  'configure', 'invite', 'assign', 'close', 'reopen',
];

/** Actions that mutate state. Everything except view and export. */
export const WRITE_ACTIONS: readonly Action[] = [
  'create', 'edit', 'delete', 'approve', 'configure', 'invite', 'assign', 'close', 'reopen',
];

export type MaskKind = 'aggregate' | 'range' | 'percentage' | 'hidden';

export type Decision =
  | { allow: true }
  | { allow: false; reason: string }
  | { allow: 'masked'; as: MaskKind };

export type Resource =
  | { type: 'timeEntry'; ownerId: string; projectId?: string; contextual?: boolean }
  | { type: 'personalInsight'; ownerId: string }
  | { type: 'employmentAgreement'; personId: string }
  | { type: 'salary'; personId: string }
  | { type: 'costRate'; personId: string }
  | { type: 'companyFinance' }
  | { type: 'externalAgreement'; rateVisible?: boolean }
  | { type: 'project'; projectId: string }
  | { type: 'person'; personId: string }
  | { type: 'auditLog' }
  | { type: 'period'; yearMonth?: string };

const ALLOW: Decision = { allow: true };
const deny = (reason: string): Decision => ({ allow: false, reason });
const masked = (as: MaskKind): Decision => ({ allow: 'masked', as });

const isRead = (action: Action): boolean => action === 'view' || action === 'export';

/** timeEntry fields nobody but the owner ever sees (§7.1 S3, §7.6 privacy page:
 *  "your manager sees your weekly totals and gaps, never your notes"). */
const TIME_ENTRY_PRIVATE_FIELDS: readonly string[] = ['notes', 'contextual'];

/** project fields that are S1-adjacent: individual rates never surface to a
 *  lead in any form (§7.2 "explicitly not salaries or individual cost rates"). */
const PROJECT_RATE_FIELDS: readonly string[] = ['costRate', 'costRates', 'rates', 'memberRates'];

/** project fields that are budget/cost figures: a lead sees consumption as a
 *  masked aggregate or percentage, never rates (§7.1 S1 "everyone else" column). */
const PROJECT_BUDGET_FIELDS: readonly string[] = [
  'budget', 'budgetMinor', 'budgetConsumed', 'budgetConsumedMinor', 'budgetConsumedPct',
  'actualCost', 'actualCostMinor', 'labourCostMinor', 'grossProfitMinor', 'marginPct',
  'forecastCostMinor', 'profitability',
];

/** companyFinance fields that are people-cost aggregates: leadership sees these
 *  masked by default; detail needs an additional finance/super-admin grant (§7.2). */
const COMPANY_PEOPLE_COST_FIELDS: readonly string[] = [
  'peopleCosts', 'peopleCostsMinor', 'payroll', 'payrollMinor', 'employmentCosts', 'employmentCostsMinor',
];

/**
 * §7.3 the engine: can(actor, action, resource, field?) → Decision.
 *
 * `asOf` is the evaluation instant for grant expiry (§5.1). packages/policy has
 * no clock, so callers pass it explicitly; when omitted, grant-based
 * capabilities fail closed and only ownership-based rights remain.
 */
export function can(
  actor: Actor,
  action: Action,
  resource: Resource,
  field?: string,
  asOf?: IsoDate,
): Decision {
  const has = (role: SystemRole, target: { projectId?: string; teamMemberIds?: string[] } = {}): boolean =>
    asOf !== undefined && hasRole(actor, role, { ...target, asOf });

  // §7.2 external contributors are hard-walled; an actor with no active
  // internal grant reaches nothing beyond what they own outright.
  const internal = asOf !== undefined && hasActiveInternalGrant(actor, asOf);

  const ownerId =
    resource.type === 'timeEntry' || resource.type === 'personalInsight'
      ? resource.ownerId
      : resource.type === 'employmentAgreement' || resource.type === 'salary'
        || resource.type === 'costRate' || resource.type === 'person'
        ? resource.personId
        : undefined;
  const isOwner = actor.personId !== undefined && actor.personId === ownerId;

  switch (resource.type) {
    // ── S3 · Personal time ────────────────────────────────────────────────
    case 'timeEntry': {
      // §7.4: no approval on time exists, for anyone, including the owner.
      if (action === 'approve') {
        return deny('Time is trusted. No approval step exists on time (§7.4).');
      }
      // R7: contextual categories are the individual's alone, no exceptions,
      // no override for any role, super_admin included.
      if (resource.contextual === true && !isOwner) {
        return deny('Contextual time is visible only to the person it belongs to, with no override for any role (R7, §7.1 S3).');
      }
      if (isOwner) {
        // R5 full sovereignty over one's own time; §7.6 export unaided.
        if (isRead(action) || action === 'create' || action === 'edit' || action === 'delete') return ALLOW;
        return deny('No rule grants this action on a time entry (§7, fail closed).');
      }
      // R5: only the person who recorded an entry may create, edit or delete
      // it. There is no admin override in the API, super_admin included.
      if (!isRead(action)) {
        return deny('Only the person who recorded a time entry may change it. There is no admin override (R5, §7.4).');
      }
      // Reads by non-owners. Notes never leave the owner (§7.1 S3, §7.6).
      if (field !== undefined && TIME_ENTRY_PRIVATE_FIELDS.includes(field)) {
        return deny('Personal notes and contextual detail belong to the individual alone (§7.1 S3).');
      }
      if (has('super_admin')) return ALLOW;                       // §7.2 everything but the carve-outs above
      if (has('project_lead', { projectId: resource.projectId })) return masked('aggregate'); // project-scoped hours only
      if (has('people_manager', { teamMemberIds: [resource.ownerId] })) return masked('aggregate'); // totals and gaps
      if (has('finance_admin')) return masked('aggregate');       // costed totals (§7.6)
      if (has('leadership')) return masked('aggregate');          // aggregates (§7.1 S3)
      if (has('auditor', { projectId: resource.projectId }) || has('auditor')) return masked('aggregate');
      return deny('Another person\'s time is not visible at this scope (§7.1 S3).');
    }

    case 'personalInsight': {
      // R7: personal insights are visible only to the person they belong to,
      // with no override for any role, super_admin included.
      if (isOwner) {
        if (isRead(action) || action === 'create' || action === 'edit' || action === 'delete') return ALLOW;
        return deny('No rule grants this action on a personal insight (§7, fail closed).');
      }
      return deny('Personal insights are visible only to the person they belong to, with no override for any role (R7, §7.1 S3).');
    }

    // ── S1 · Remuneration ─────────────────────────────────────────────────
    case 'employmentAgreement':
    case 'salary':
    case 'costRate': {
      if (isRead(action)) {
        if (isOwner) return ALLOW;                                // §7.6: everyone sees everything stored about them
        if (has('finance_admin') || has('super_admin')) return ALLOW; // §7.1 S1 full access
        if (has('auditor')) return ALLOW;                         // §7.2 read-only auditor, granted scope, time-boxed
        return deny('Remuneration detail is limited to finance_admin and super_admin (§7.1 S1).');
      }
      if (has('finance_admin') || has('super_admin')) return ALLOW; // §7.4: finance enters, second super admin confirms
      return deny('Remuneration changes are limited to finance_admin and super_admin (§7.1 S1, §7.4).');
    }

    // ── S2 · Company finance ──────────────────────────────────────────────
    case 'companyFinance': {
      if (isRead(action)) {
        const peopleCosts = field !== undefined && COMPANY_PEOPLE_COST_FIELDS.includes(field);
        if (has('finance_admin') || has('super_admin')) return ALLOW;
        if (has('leadership')) {
          // §7.2: leadership sees masked people-cost aggregates by default;
          // remuneration detail requires an additional finance/super-admin grant.
          return peopleCosts ? masked('aggregate') : ALLOW;
        }
        if (has('auditor')) return ALLOW;
        if (internal) return masked('hidden');                    // §7.1 S2: narrative only, no figures
        return deny('Company finance is not reachable from outside the studio (§7.1 S2, §7.2).');
      }
      if (action === 'configure' || action === 'edit' || action === 'create' || action === 'delete') {
        if (has('finance_admin') || has('super_admin')) return ALLOW;
        return deny('Company finance is administered by finance_admin and super_admin (§7.2).');
      }
      return deny('No rule grants this action on company finance (§7, fail closed).');
    }

    // ── S4 · External commercial ──────────────────────────────────────────
    case 'externalAgreement': {
      if (isRead(action)) {
        const rateField = field !== undefined && sensitivityOf('externalAgreement', field) === 'S4';
        if (rateField) {
          if (has('finance_admin') || has('ops_admin') || has('leadership') || has('super_admin')) return ALLOW;
          if (has('auditor')) return ALLOW;
          if (internal) {
            // §7.1 S4: rate visibility per agreement, default hidden.
            return resource.rateVisible === true ? ALLOW : masked('hidden');
          }
          return deny('OE Verse rates are not reachable from outside the studio (§7.1 S4).');
        }
        // Scope, deliverables and status are visible to the studio (§7.1 S4).
        if (internal) return ALLOW;
        return deny('External agreements are not reachable from outside the studio (§7.2).');
      }
      if (action === 'approve') {
        // §7.4: external engagement is approved by finance or operations,
        // plus leadership above 10,000.
        if (has('finance_admin') || has('ops_admin') || has('leadership') || has('super_admin')) return ALLOW;
        return deny('External engagements are approved by finance, operations or leadership (§7.4).');
      }
      if (has('finance_admin') || has('ops_admin') || has('super_admin')) return ALLOW;
      return deny('External agreements are managed by finance_admin and ops_admin (§7.2).');
    }

    // ── Projects ──────────────────────────────────────────────────────────
    case 'project': {
      const lead = has('project_lead', { projectId: resource.projectId });
      if (isRead(action)) {
        if (field !== undefined && PROJECT_RATE_FIELDS.includes(field)) {
          // §7.2: a lead never resolves an individual cost rate, in any form.
          if (has('finance_admin') || has('super_admin')) return ALLOW;
          if (has('auditor', { projectId: resource.projectId }) || has('auditor')) return ALLOW;
          return deny('Individual cost rates never surface outside finance_admin and super_admin (§7.1 S1, §7.2).');
        }
        if (field !== undefined && PROJECT_BUDGET_FIELDS.includes(field)) {
          if (has('finance_admin') || has('super_admin') || has('leadership')) return ALLOW;
          if (has('auditor', { projectId: resource.projectId }) || has('auditor')) return ALLOW;
          if (lead) {
            // §7.1 S1: budget consumed as aggregate money and percentage,
            // computed from rates without disclosing them.
            return field.endsWith('Pct') || field === 'profitability'
              ? masked('percentage')
              : masked('aggregate');
          }
          return deny('Project financials are not visible at this scope (§7.2).');
        }
        // Non-financial project detail: visible inside the studio; navigation
        // is subtractive above this layer (§7.3).
        if (internal) return ALLOW;
        return deny('Projects are not reachable from outside the studio (§7.2).');
      }
      switch (action) {
        case 'edit':
        case 'assign':
          if (lead || has('ops_admin') || has('super_admin')) return ALLOW;
          return deny('Project management belongs to the project lead and operations (§7.2).');
        case 'create':
          if (has('ops_admin') || has('leadership') || has('super_admin')) return ALLOW;
          return deny('Project setup belongs to operations (§7.2).');
        case 'approve':
          // §7.4: quotation issue/acceptance and variations are leadership approvals.
          if (has('leadership') || has('super_admin')) return ALLOW;
          return deny('Quotations and variations are approved by leadership (§7.4).');
        case 'close':
          // §7.4: the lead declares closure, finance closes financially.
          if (lead || has('finance_admin') || has('super_admin')) return ALLOW;
          return deny('Closure is declared by the lead and completed by finance (§7.4).');
        case 'reopen':
          if (has('super_admin')) return ALLOW;
          return deny('Reopening is a super_admin action with a mandatory reason (§7.4).');
        case 'delete':
          if (has('super_admin')) return ALLOW;
          return deny('Projects are archived, not deleted, except by super_admin (§7.2).');
        default:
          return deny('No rule grants this action on a project (§7, fail closed).');
      }
    }

    // ── People ────────────────────────────────────────────────────────────
    case 'person': {
      const s1Field = field !== undefined && sensitivityOf('person', field) === 'S1';
      if (isRead(action)) {
        if (isOwner) return ALLOW;                                // §7.6
        if (s1Field) {
          if (has('finance_admin') || has('super_admin')) return ALLOW;
          if (has('auditor')) return ALLOW;
          return deny('Remuneration detail is limited to finance_admin and super_admin (§7.1 S1).');
        }
        if (internal) return ALLOW;                               // directory (§8)
        return deny('The internal directory is not reachable from outside the studio (§7.2).');
      }
      if (action === 'invite') {
        if (has('ops_admin') || has('super_admin')) return ALLOW;
        return deny('Invitations are an operations action (§7.2).');
      }
      if (s1Field) {
        if (has('finance_admin') || has('super_admin')) return ALLOW;
        return deny('Remuneration changes are limited to finance_admin and super_admin (§7.1 S1).');
      }
      if (isOwner && action === 'edit') return ALLOW;             // own profile
      if (has('ops_admin') || has('super_admin')) return ALLOW;   // profiles excluding remuneration (§7.2)
      return deny('People profiles are managed by operations (§7.2).');
    }

    // ── Governance ────────────────────────────────────────────────────────
    case 'auditLog': {
      if (isRead(action)) {
        if (has('super_admin')) return ALLOW;                     // §7.2
        if (has('auditor')) return ALLOW;                         // §7.2, time-boxed by grant expiry
        return deny('The audit trail is visible to super_admin and auditors only (§7.2).');
      }
      // §7.5: append-only; no update or delete path exists in code,
      // including for super admins.
      return deny('The audit trail is append-only. No update or delete path exists, including for super_admin (§7.5).');
    }

    case 'period': {
      if (isRead(action)) {
        if (has('finance_admin') || has('leadership') || has('super_admin')) return ALLOW;
        if (has('auditor')) return ALLOW;
        return deny('Financial periods are a finance surface (§7.2).');
      }
      switch (action) {
        case 'close':                                             // period lock (§7.4)
          if (has('finance_admin') || has('super_admin')) return ALLOW;
          return deny('Period lock is a finance action (§7.4).');
        case 'reopen':                                            // §7.4: super admin, mandatory reason
          if (has('super_admin')) return ALLOW;
          return deny('Period reopen is a super_admin action with a mandatory reason (§7.4).');
        case 'edit':
        case 'configure':
        case 'create':
          if (has('finance_admin') || has('super_admin')) return ALLOW;
          return deny('Financial periods are administered by finance (§7.2).');
        default:
          return deny('No rule grants this action on a financial period (§7, fail closed).');
      }
    }
  }
}
