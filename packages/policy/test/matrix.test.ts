// §7.1/§7.2 matrix: every role against every sensitive resource and field.
// Stage A2 acceptance (§11): a project lead cannot resolve any individual cost
// rate through any exported function; a team member cannot reach another
// person's entries; external contributors are hard-walled.

import { describe, it, expect } from 'vitest';
import {
  ALL_SYSTEM_ROLES, WRITE_ACTIONS, can, hasRole, serialiseWithPolicy,
  maskProjectBudget, sensitivityOf, type Resource,
} from '../src';
import { ASOF, OWNER, PROJECT_X, PROJECT_Y, actorAs, actorWithGrants, grant } from './helpers';

const otherTimeEntry: Resource = { type: 'timeEntry', ownerId: OWNER, projectId: PROJECT_X };
const otherSalary: Resource = { type: 'salary', personId: OWNER };
const otherCostRate: Resource = { type: 'costRate', personId: OWNER };
const otherAgreement: Resource = { type: 'employmentAgreement', personId: OWNER };
const companyFinance: Resource = { type: 'companyFinance' };
const externalAgreement: Resource = { type: 'externalAgreement' };
const projectX: Resource = { type: 'project', projectId: PROJECT_X };
const auditLog: Resource = { type: 'auditLog' };

describe('sensitivity table (§7.1)', () => {
  it('classifies the domain resources', () => {
    expect(sensitivityOf('person', 'salary')).toBe('S1');
    expect(sensitivityOf('person', 'costRate')).toBe('S1');
    expect(sensitivityOf('person', 'employmentAgreement')).toBe('S1');
    expect(sensitivityOf('company', 'pnl')).toBe('S2');
    expect(sensitivityOf('company', 'overheads')).toBe('S2');
    expect(sensitivityOf('company', 'operatingProfit')).toBe('S2');
    expect(sensitivityOf('timeEntry', 'minutes')).toBe('S3');
    expect(sensitivityOf('timeEntry', 'contextual')).toBe('S3');
    expect(sensitivityOf('personalInsight', 'anything')).toBe('S3');
    expect(sensitivityOf('externalAgreement', 'rate')).toBe('S4');
    expect(sensitivityOf('externalAgreement', 'fee')).toBe('S4');
    expect(sensitivityOf('project', 'name')).toBeUndefined();
  });
});

describe('team_member (§7.2)', () => {
  const tm = actorAs('team_member');
  it('cannot view another person\'s time entry', () => {
    expect(can(tm, 'view', otherTimeEntry, undefined, ASOF)).toMatchObject({ allow: false });
  });
  it('cannot view another person\'s salary, cost rate or agreement', () => {
    for (const r of [otherSalary, otherCostRate, otherAgreement]) {
      expect(can(tm, 'view', r, undefined, ASOF)).toMatchObject({ allow: false });
    }
  });
  it('sees company finance as narrative only, never figures (S2 masked hidden)', () => {
    expect(can(tm, 'view', companyFinance, 'pnl', ASOF)).toEqual({ allow: 'masked', as: 'hidden' });
    expect(can(tm, 'view', companyFinance, 'operatingProfit', ASOF)).toEqual({ allow: 'masked', as: 'hidden' });
  });
  it('cannot view unauthorised project financials', () => {
    expect(can(tm, 'view', projectX, 'budgetConsumedMinor', ASOF)).toMatchObject({ allow: false });
  });
  it('sees external agreement scope/status but never the rate (S4 default hidden)', () => {
    expect(can(tm, 'view', externalAgreement, 'status', ASOF)).toEqual({ allow: true });
    expect(can(tm, 'view', externalAgreement, 'rateMinor', ASOF)).toEqual({ allow: 'masked', as: 'hidden' });
  });
});

describe('project_lead cannot resolve any individual cost rate (§7.2, stage A2 acceptance)', () => {
  const lead = actorAs('project_lead');
  it('can() denies S1 resources for view, export and every field name tried', () => {
    for (const action of ['view', 'export'] as const) {
      for (const field of [undefined, 'paidHourRateMinor', 'salary', 'derivation']) {
        expect(can(lead, action, otherCostRate, field, ASOF)).toMatchObject({ allow: false });
        expect(can(lead, action, otherSalary, field, ASOF)).toMatchObject({ allow: false });
        expect(can(lead, action, otherAgreement, field, ASOF)).toMatchObject({ allow: false });
      }
    }
  });
  it('serialiseWithPolicy returns null for a cost-rate payload; the value appears nowhere', () => {
    const payload = { personId: OWNER, paidHourRateMinor: 78901234, availableHourRateMinor: 78901299 };
    const out = serialiseWithPolicy(lead, otherCostRate, payload, ASOF);
    expect(out).toBeNull();
    expect(JSON.stringify(out ?? {})).not.toContain('78901234');
  });
  it('project rate fields are denied outright, never masked', () => {
    for (const field of ['costRates', 'rates', 'memberRates']) {
      expect(can(lead, 'view', projectX, field, ASOF)).toMatchObject({ allow: false });
    }
  });
  it('sees budget as masked aggregate money and percentage, never rates (§7.1 S1)', () => {
    expect(can(lead, 'view', projectX, 'budgetConsumedMinor', ASOF)).toEqual({ allow: 'masked', as: 'aggregate' });
    expect(can(lead, 'view', projectX, 'budgetConsumedPct', ASOF)).toEqual({ allow: 'masked', as: 'percentage' });
  });
  it('a single-contributor budget view degrades to a coarse percentage (§7.1 floor 2)', () => {
    const view = maskProjectBudget([{ personId: OWNER, amountMinor: 43_210_00 }], 100_000_00);
    expect(view.kind).toBe('percentage');
    expect(JSON.stringify(view)).not.toContain('4321000');
  });
  it('project-lead on project X grants nothing on project Y (§7.2 scoping)', () => {
    expect(can(lead, 'view', { type: 'project', projectId: PROJECT_Y }, 'budgetConsumedMinor', ASOF))
      .toMatchObject({ allow: false });
    expect(can(lead, 'view', { type: 'timeEntry', ownerId: OWNER, projectId: PROJECT_Y }, undefined, ASOF))
      .toMatchObject({ allow: false });
    expect(can(lead, 'edit', { type: 'project', projectId: PROJECT_Y }, undefined, ASOF))
      .toMatchObject({ allow: false });
  });
  it('team hours on their project appear as aggregate only', () => {
    expect(can(lead, 'view', otherTimeEntry, undefined, ASOF)).toEqual({ allow: 'masked', as: 'aggregate' });
    expect(can(lead, 'view', otherTimeEntry, 'notes', ASOF)).toMatchObject({ allow: false });
  });
});

describe('people_manager (§7.2)', () => {
  const pm = actorAs('people_manager');
  it('sees a named report\'s time as aggregate totals only', () => {
    expect(can(pm, 'view', otherTimeEntry, undefined, ASOF)).toEqual({ allow: 'masked', as: 'aggregate' });
  });
  it('never notes, never contextual, never remuneration', () => {
    expect(can(pm, 'view', otherTimeEntry, 'notes', ASOF)).toMatchObject({ allow: false });
    expect(can(pm, 'view', { ...otherTimeEntry, contextual: true }, undefined, ASOF)).toMatchObject({ allow: false });
    expect(can(pm, 'view', otherSalary, undefined, ASOF)).toMatchObject({ allow: false });
    expect(can(pm, 'view', otherCostRate, undefined, ASOF)).toMatchObject({ allow: false });
  });
  it('is scoped to named direct reports: an unlisted person is invisible', () => {
    const stranger: Resource = { type: 'timeEntry', ownerId: 'p-stranger' };
    expect(can(pm, 'view', stranger, undefined, ASOF)).toMatchObject({ allow: false });
  });
});

describe('finance_admin (§7.2): full S1 and S2', () => {
  const fa = actorAs('finance_admin');
  it('views and edits salaries, cost rates and agreements', () => {
    for (const r of [otherSalary, otherCostRate, otherAgreement]) {
      expect(can(fa, 'view', r, undefined, ASOF)).toEqual({ allow: true });
      expect(can(fa, 'edit', r, undefined, ASOF)).toEqual({ allow: true });
      expect(can(fa, 'export', r, undefined, ASOF)).toEqual({ allow: true });
    }
  });
  it('views company finance and locks periods', () => {
    expect(can(fa, 'view', companyFinance, 'pnl', ASOF)).toEqual({ allow: true });
    expect(can(fa, 'close', { type: 'period', yearMonth: '2026-06' }, undefined, ASOF)).toEqual({ allow: true });
  });
  it('cannot reopen a period (super_admin only, §7.4)', () => {
    expect(can(fa, 'reopen', { type: 'period', yearMonth: '2026-06' }, undefined, ASOF)).toMatchObject({ allow: false });
  });
});

describe('leadership (§7.2): S2 yes, S1 masked/denied', () => {
  const lead = actorAs('leadership');
  it('sees company P&L and dashboards', () => {
    expect(can(lead, 'view', companyFinance, 'pnl', ASOF)).toEqual({ allow: true });
    expect(can(lead, 'view', projectX, 'grossProfitMinor', ASOF)).toEqual({ allow: true });
  });
  it('people-cost aggregates are masked by default', () => {
    expect(can(lead, 'view', companyFinance, 'peopleCostsMinor', ASOF)).toEqual({ allow: 'masked', as: 'aggregate' });
  });
  it('remuneration detail requires an additional finance/super-admin grant', () => {
    expect(can(lead, 'view', otherSalary, undefined, ASOF)).toMatchObject({ allow: false });
    expect(can(lead, 'view', otherCostRate, undefined, ASOF)).toMatchObject({ allow: false });
    const leadPlusFinance = actorWithGrants([grant('leadership'), grant('finance_admin')]);
    expect(can(leadPlusFinance, 'view', otherSalary, undefined, ASOF)).toEqual({ allow: true });
  });
  it('approves quotations and variations', () => {
    expect(can(lead, 'approve', projectX, undefined, ASOF)).toEqual({ allow: true });
  });
});

describe('ops_admin (§7.2)', () => {
  const ops = actorAs('ops_admin');
  it('manages people profiles excluding remuneration', () => {
    expect(can(ops, 'edit', { type: 'person', personId: OWNER }, 'title', ASOF)).toEqual({ allow: true });
    expect(can(ops, 'edit', { type: 'person', personId: OWNER }, 'salary', ASOF)).toMatchObject({ allow: false });
    expect(can(ops, 'view', { type: 'person', personId: OWNER }, 'salary', ASOF)).toMatchObject({ allow: false });
  });
  it('sees OE Verse rates (S4)', () => {
    expect(can(ops, 'view', externalAgreement, 'rateMinor', ASOF)).toEqual({ allow: true });
  });
});

describe('auditor (§7.2): view and export only, no writes anywhere', () => {
  const auditor = actorAs('auditor');
  it('views and exports the audit trail and granted scopes', () => {
    expect(can(auditor, 'view', auditLog, undefined, ASOF)).toEqual({ allow: true });
    expect(can(auditor, 'export', auditLog, undefined, ASOF)).toEqual({ allow: true });
    expect(can(auditor, 'view', companyFinance, 'pnl', ASOF)).toEqual({ allow: true });
    expect(can(auditor, 'view', otherCostRate, undefined, ASOF)).toEqual({ allow: true });
  });
  it('never writes, on any resource', () => {
    const resources: Resource[] = [
      otherTimeEntry, otherSalary, otherCostRate, otherAgreement, companyFinance,
      externalAgreement, projectX, { type: 'person', personId: OWNER }, auditLog,
      { type: 'period', yearMonth: '2026-06' },
    ];
    for (const resource of resources) {
      for (const action of WRITE_ACTIONS) {
        expect(can(auditor, action, resource, undefined, ASOF)).toMatchObject({ allow: false });
      }
    }
  });
});

describe('external_contributor (§7.2): hard-walled', () => {
  const ext = actorAs('external_contributor', 'p-external');
  it('reaches nothing internal, denied outright rather than masked', () => {
    const resources: Resource[] = [
      otherTimeEntry, otherSalary, otherCostRate, otherAgreement, companyFinance,
      externalAgreement, projectX, { type: 'person', personId: OWNER }, auditLog,
      { type: 'period', yearMonth: '2026-06' }, { type: 'personalInsight', ownerId: OWNER },
    ];
    for (const resource of resources) {
      const d = can(ext, 'view', resource, undefined, ASOF);
      expect(d.allow).toBe(false);
    }
  });
  it('keeps sovereignty over their own time', () => {
    expect(can(ext, 'edit', { type: 'timeEntry', ownerId: 'p-external' }, undefined, ASOF)).toEqual({ allow: true });
  });
});

describe('super_admin (§7.2): everything except the R5/R7 carve-outs', () => {
  const sa = actorAs('super_admin');
  it('views S1 and S2 and administers governance', () => {
    expect(can(sa, 'view', otherSalary, undefined, ASOF)).toEqual({ allow: true });
    expect(can(sa, 'view', companyFinance, 'pnl', ASOF)).toEqual({ allow: true });
    expect(can(sa, 'view', auditLog, undefined, ASOF)).toEqual({ allow: true });
    expect(can(sa, 'reopen', { type: 'period', yearMonth: '2026-06' }, undefined, ASOF)).toEqual({ allow: true });
  });
  it('cannot edit another person\'s time entry (R5: no override path)', () => {
    expect(can(sa, 'edit', otherTimeEntry, undefined, ASOF)).toMatchObject({ allow: false });
  });
  it('cannot reach another person\'s contextual time or personal insights (R7)', () => {
    expect(can(sa, 'view', { ...otherTimeEntry, contextual: true }, undefined, ASOF)).toMatchObject({ allow: false });
    expect(can(sa, 'view', { type: 'personalInsight', ownerId: OWNER }, undefined, ASOF)).toMatchObject({ allow: false });
  });
  it('cannot update or delete the audit trail (§7.5 append-only)', () => {
    expect(can(sa, 'edit', auditLog, undefined, ASOF)).toMatchObject({ allow: false });
    expect(can(sa, 'delete', auditLog, undefined, ASOF)).toMatchObject({ allow: false });
  });
});

describe('fail closed', () => {
  it('an actor with no grants can do nothing to others\' data', () => {
    const nobody = actorWithGrants([]);
    expect(can(nobody, 'view', otherTimeEntry, undefined, ASOF)).toMatchObject({ allow: false });
    expect(can(nobody, 'view', companyFinance, undefined, ASOF)).toMatchObject({ allow: false });
  });
  it('omitting asOf fails closed for every grant-based capability', () => {
    for (const role of ALL_SYSTEM_ROLES) {
      const d = can(actorAs(role), 'view', companyFinance, 'pnl');
      expect(d.allow).toBe(false);
    }
  });
  it('hasRole demands a matching scope target', () => {
    const lead = actorAs('project_lead');
    expect(hasRole(lead, 'project_lead', { asOf: ASOF, projectId: PROJECT_X })).toBe(true);
    expect(hasRole(lead, 'project_lead', { asOf: ASOF, projectId: PROJECT_Y })).toBe(false);
    expect(hasRole(lead, 'project_lead', { asOf: ASOF })).toBe(false);
  });
});
