// R6: masking happens server-side at the serialiser. A value the user may not
// see is never sent to the client in any form, including inside aggregates
// that would reveal it by subtraction. Raw JSON inspection throughout: the
// forbidden number must not appear anywhere in the serialised output.

import { describe, it, expect } from 'vitest';
import {
  can, maskAggregate, maskDecisionToView, serialiseWithPolicy, type Resource,
} from '../src';
import { ASOF, OWNER, PROJECT_X, actorAs, ownerActor } from './helpers';

describe('serialiseWithPolicy strips, never nulls-with-hint (R6)', () => {
  it('a cost-rate payload serialised for a project lead is null; the rate appears nowhere', () => {
    const resource: Resource = { type: 'costRate', personId: OWNER };
    const payload = { personId: OWNER, paidHourRateMinor: 91827364, methodVersion: '6.2-v1' };
    const out = serialiseWithPolicy(actorAs('project_lead'), resource, payload, ASOF);
    expect(out).toBeNull();
    expect(JSON.stringify({ out })).not.toContain('91827364');
  });

  it('an external agreement keeps scope/status and loses the rate for a team member (S4 default hidden)', () => {
    const resource: Resource = { type: 'externalAgreement' };
    const payload = { status: 'active', deliverables: 'motion design, 3 assets', rateMinor: 64748291, feeMinor: 55443322 };
    const out = serialiseWithPolicy(actorAs('team_member'), resource, payload, ASOF);
    expect(out).toEqual({ status: 'active', deliverables: 'motion design, 3 assets' });
    const json = JSON.stringify(out);
    expect(json).not.toContain('64748291');
    expect(json).not.toContain('55443322');
    expect(Object.keys(out ?? {})).not.toContain('rateMinor'); // stripped, not nulled
  });

  it('the same agreement shows its rate to finance_admin', () => {
    const resource: Resource = { type: 'externalAgreement' };
    const payload = { status: 'active', rateMinor: 64748291 };
    expect(serialiseWithPolicy(actorAs('finance_admin'), resource, payload, ASOF))
      .toEqual({ status: 'active', rateMinor: 64748291 });
  });

  it('a project payload loses budget and rate fields for its lead, keeps the rest', () => {
    const resource: Resource = { type: 'project', projectId: PROJECT_X };
    const payload = { name: 'Gallery identity', budgetConsumedMinor: 73829145, costRates: { [OWNER]: 12345678 } };
    const out = serialiseWithPolicy(actorAs('project_lead'), resource, payload, ASOF);
    expect(out).toEqual({ name: 'Gallery identity' });
    const json = JSON.stringify(out);
    expect(json).not.toContain('73829145');
    expect(json).not.toContain('12345678');
  });

  it('another person\'s time entry serialises to nothing usable for a people manager', () => {
    const resource: Resource = { type: 'timeEntry', ownerId: OWNER, projectId: PROJECT_X };
    const payload = { minutes: 480, notes: 'therapy appointment at 3pm', activityId: 'design' };
    const out = serialiseWithPolicy(actorAs('people_manager'), resource, payload, ASOF);
    expect(out).not.toBeNull();
    expect(JSON.stringify(out)).not.toContain('therapy');
    expect(Object.keys(out ?? {})).not.toContain('notes');
    expect(Object.keys(out ?? {})).not.toContain('minutes'); // masked → stripped; aggregates come from maskAggregate
  });

  it('the owner receives their entry intact', () => {
    const resource: Resource = { type: 'timeEntry', ownerId: OWNER, projectId: PROJECT_X };
    const payload = { minutes: 480, notes: 'therapy appointment at 3pm', activityId: 'design' };
    expect(serialiseWithPolicy(ownerActor, resource, payload, ASOF)).toEqual(payload);
  });
});

describe('adversarial subtraction (§7.1)', () => {
  it('an aggregate of 2 people\'s costs is never returned as a number', () => {
    const a = 4_111_11;
    const b = 2_888_88;
    const view = maskAggregate([
      { personId: 'p1', amountMinor: a },
      { personId: 'p2', amountMinor: b },
    ]);
    expect(view.kind).not.toBe('value');
    const json = JSON.stringify(view);
    expect(json).not.toContain(String(a + b)); // the total is not recoverable
    expect(json).not.toContain(String(a));     // nor either addend
    expect(json).not.toContain(String(b));
  });

  it('a 3-person aggregate minus a 2-person aggregate cannot isolate the third person', () => {
    const three = maskAggregate([
      { personId: 'p1', amountMinor: 4_111_11 },
      { personId: 'p2', amountMinor: 2_888_88 },
      { personId: 'p3', amountMinor: 3_333_33 },
    ]);
    const two = maskAggregate([
      { personId: 'p1', amountMinor: 4_111_11 },
      { personId: 'p2', amountMinor: 2_888_88 },
    ]);
    expect(three.kind).toBe('value');
    expect(two.kind).toBe('range'); // subtraction only bounds p3, never pins it
  });
});

describe('maskDecisionToView (UI Masked renderer contract)', () => {
  it('maps the three decision shapes', () => {
    expect(maskDecisionToView({ allow: true })).toEqual({ visible: true });
    expect(maskDecisionToView({ allow: 'masked', as: 'aggregate' }))
      .toEqual({ visible: false, masked: true, as: 'aggregate' });
    expect(maskDecisionToView({ allow: false, reason: 'x' }))
      .toEqual({ visible: false, masked: false });
  });

  it('round-trips a live decision', () => {
    const d = can(actorAs('project_lead'), 'view', { type: 'project', projectId: PROJECT_X }, 'budgetConsumedPct', ASOF);
    expect(maskDecisionToView(d)).toEqual({ visible: false, masked: true, as: 'percentage' });
  });
});
