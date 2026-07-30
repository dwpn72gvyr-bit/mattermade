// §5.1/§7.2: temporary grants expire automatically. An expired grant
// (effectiveTo < asOf) grants nothing; a not-yet-effective grant grants
// nothing. asOf is always passed explicitly (no clock in packages/policy).

import { describe, it, expect } from 'vitest';
import { can, grantIsActive, hasRole, type Resource } from '../src';
import { ASOF, OWNER, PROJECT_X, actorWithGrants, grant } from './helpers';

const projectX: Resource = { type: 'project', projectId: PROJECT_X };
const entry: Resource = { type: 'timeEntry', ownerId: OWNER, projectId: PROJECT_X };

describe('grant expiry (§5.1)', () => {
  const expiredLead = actorWithGrants([
    grant('project_lead', { type: 'project', ids: [PROJECT_X] }, '2025-01-01', '2026-01-31'),
  ]);

  it('an expired project_lead grant grants nothing', () => {
    expect(can(expiredLead, 'view', projectX, 'budgetConsumedMinor', ASOF)).toMatchObject({ allow: false });
    expect(can(expiredLead, 'view', entry, undefined, ASOF)).toMatchObject({ allow: false });
    expect(can(expiredLead, 'edit', projectX, undefined, ASOF)).toMatchObject({ allow: false });
    expect(hasRole(expiredLead, 'project_lead', { asOf: ASOF, projectId: PROJECT_X })).toBe(false);
  });

  it('the same grant works inside its window', () => {
    const within = '2025-06-15';
    expect(can(expiredLead, 'view', projectX, 'budgetConsumedMinor', within)).toEqual({ allow: 'masked', as: 'aggregate' });
    expect(hasRole(expiredLead, 'project_lead', { asOf: within, projectId: PROJECT_X })).toBe(true);
  });

  it('the boundary day itself is still active; the day after is not', () => {
    const g = grant('project_lead', { type: 'project', ids: [PROJECT_X] }, '2025-01-01', '2026-01-31');
    expect(grantIsActive(g, '2026-01-31')).toBe(true);
    expect(grantIsActive(g, '2026-02-01')).toBe(false);
    expect(grantIsActive(g, '2024-12-31')).toBe(false);
  });

  it('a not-yet-effective grant grants nothing', () => {
    const future = actorWithGrants([grant('finance_admin', { type: 'global' }, '2027-01-01')]);
    expect(can(future, 'view', { type: 'salary', personId: OWNER }, undefined, ASOF)).toMatchObject({ allow: false });
  });

  it('an auditor grant is time-boxed by its expiry (§7.2)', () => {
    const auditor = actorWithGrants([grant('auditor', { type: 'global' }, '2026-01-01', '2026-06-30')]);
    expect(can(auditor, 'view', { type: 'auditLog' }, undefined, '2026-06-01')).toEqual({ allow: true });
    expect(can(auditor, 'view', { type: 'auditLog' }, undefined, ASOF)).toMatchObject({ allow: false });
    expect(can(auditor, 'export', { type: 'companyFinance' }, undefined, ASOF)).toMatchObject({ allow: false });
  });
});
