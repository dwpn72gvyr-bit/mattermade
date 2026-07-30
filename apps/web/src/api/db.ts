// In-memory working copy of the fixture dataset. Mutations (time entries,
// variations, period locks, quotation acceptance) act on this copy so the demo
// is fully interactive while the fixtures stay pristine.

import { fixtureDb } from '@oe/fixtures';
import type { TimeEntry, Variation, FinancialPeriod, AuditRecord } from '@oe/domain';

export const db = {
  ...fixtureDb,
  timeEntries: [...fixtureDb.timeEntries] as TimeEntry[],
  variations: [...fixtureDb.variations] as Variation[],
  financialPeriods: fixtureDb.financialPeriods.map((p) => ({ ...p })) as FinancialPeriod[],
  auditRecords: [] as AuditRecord[],
};

let counter = 1000;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

/** Append-only audit trail (§7.5). There is no update or delete path. */
export function audit(rec: Omit<AuditRecord, 'id' | 'occurredAt'> & { occurredAt?: string }): void {
  db.auditRecords.push({
    id: newId('aud'),
    occurredAt: rec.occurredAt ?? new Date().toISOString(),
    ...rec,
  } as AuditRecord);
}

// Seed the trail with the dataset's own notable events so the audit screen has
// history from day one (salary change, locks, variation approval).
audit({ actorUserId: 'usr-daniel', entityType: 'EmploymentAgreement', entityId: 'ea-mei-2', action: 'create', reason: 'Annual review adjustment', occurredAt: '2025-12-15T03:00:00Z' });
audit({ actorUserId: 'usr-ryan', entityType: 'EmploymentAgreement', entityId: 'ea-mei-2', action: 'approve', reason: 'Second super admin confirmation', occurredAt: '2025-12-15T05:00:00Z' });
audit({ actorUserId: 'usr-ryan', entityType: 'Variation', entityId: 'var-f-1', action: 'approve', occurredAt: '2026-04-14T06:00:00Z' });
for (const p of fixtureDb.financialPeriods) {
  if (p.status === 'locked') {
    audit({ actorUserId: 'usr-daniel', entityType: 'FinancialPeriod', entityId: p.yearMonth, action: 'lock', occurredAt: `${p.yearMonth}-28T09:00:00Z` });
  }
}
