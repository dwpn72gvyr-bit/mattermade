// Administration operations added in the enhancement round: day-mapping
// completeness (item 12), module access grants (item 14), and editable
// project templates with sub-tier phases (item 11b).

import type { ProjectTemplate } from '@oe/domain';
import { call } from './transport';
import { db, newId, nowIso } from './db';
import { todayStr } from './settings';
import { completenessFor, isWorkday } from './timeMath';
import { moduleAccessTable, setModuleAccess, type ModuleKey } from './settings';
import type { DemoAccount } from './demoAccounts';
import { demoAccounts } from './demoAccounts';

function requireAdmin(account: DemoAccount): void {
  if (!['super_admin', 'ops_admin', 'people_manager'].some((r) => account.roles.includes(r))) {
    throw new Error('not_allowed');
  }
}

/** Recent scheduled workdays (excluding today, which is still in motion). */
function recentWorkdays(count: number): string[] {
  const days: string[] = [];
  const cursor = new Date(`${todayStr()}T00:00:00Z`);
  while (days.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const d = cursor.toISOString().slice(0, 10);
    const dow = cursor.getUTCDay();
    if (dow >= 1 && dow <= 5) days.push(d);
  }
  return days.reverse();
}

/** Completeness view (client direction, item 12): who has mapped their
 *  scheduled day and who is short, so gentle reminders can be sent. Gaps and
 *  totals only; notes and personal categories stay unreachable (R7).
 *  DEVIATIONS.md #2 records the client's instruction for per-person view. */
export function getCompleteness(account: DemoAccount) {
  return call('admin.completeness', () => {
    requireAdmin(account);
    const days = recentWorkdays(5);
    const rows = completenessFor(days).map((r) => ({
      ...r,
      days: r.days.map((d) => ({
        ...d,
        scheduled: isWorkday(r.personId, d.date),
      })),
      completePct: r.scheduledMinutes === 0 ? 1 : r.mappedMinutes / r.scheduledMinutes,
    }));
    return { days, rows };
  });
}

export function getModuleAccess(account: DemoAccount) {
  return call('admin.moduleAccess', () => {
    if (!account.roles.includes('super_admin')) throw new Error('not_allowed');
    return demoAccounts
      .filter((a) => !a.isExternal)
      .map((a) => ({
        userId: a.userId,
        name: a.name,
        roles: a.roles,
        access: moduleAccessTable(a.userId, a.roles),
      }));
  });
}

export function updateModuleAccess(
  account: DemoAccount,
  userId: string,
  module: ModuleKey,
  allowed: boolean,
) {
  return call('admin.updateModuleAccess', () => {
    if (!account.roles.includes('super_admin')) throw new Error('not_allowed');
    setModuleAccess(userId, module, allowed);
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Editable templates (item 11b): add, edit, delete; phase headers and
// sub-tier phases (a phase named "Delivery / On-site" nests visually).
// ---------------------------------------------------------------------------

export interface TemplateInput {
  id?: string;
  name: string;
  serviceLine: string;
  phases: { name: string; deliverables?: string[] }[];
}

function canEditTemplates(account: DemoAccount): boolean {
  return ['super_admin', 'ops_admin'].some((r) => account.roles.includes(r));
}

export function saveTemplate(account: DemoAccount, input: TemplateInput) {
  return call('admin.saveTemplate', () => {
    if (!canEditTemplates(account)) throw new Error('not_allowed');
    if (input.id) {
      const t = db.projectTemplates.find((x) => x.id === input.id);
      if (!t) throw new Error('not_found');
      t.name = input.name;
      t.serviceLine = input.serviceLine as ProjectTemplate['serviceLine'];
      t.phases = input.phases.map((p, i) => ({
        name: p.name, order: i + 1, typicalHoursByRole: {}, deliverables: p.deliverables ?? [],
      }));
      return t;
    }
    const t: ProjectTemplate = {
      id: newId('tpl'),
      createdAt: nowIso(), createdBy: account.userId,
      updatedAt: nowIso(), updatedBy: account.userId,
      name: input.name,
      projectType: input.serviceLine,
      serviceLine: input.serviceLine as ProjectTemplate['serviceLine'],
      phases: input.phases.map((p, i) => ({
        name: p.name, order: i + 1, typicalHoursByRole: {}, deliverables: p.deliverables ?? [],
      })),
    } as ProjectTemplate;
    db.projectTemplates.push(t);
    return t;
  });
}

export function deleteTemplate(account: DemoAccount, templateId: string) {
  return call('admin.deleteTemplate', () => {
    if (!canEditTemplates(account)) throw new Error('not_allowed');
    const idx = db.projectTemplates.findIndex((t) => t.id === templateId);
    if (idx >= 0) db.projectTemplates.splice(idx, 1);
    return { ok: true };
  });
}
