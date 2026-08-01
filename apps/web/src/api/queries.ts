// Mock API procedures. Signatures mirror the future tRPC procedures (§11 A3);
// every money figure comes from @oe/finance via ./metrics (R1); every access
// decision comes from @oe/policy (R6). Screens never compute or authorise.

import { can, type Actor, type MaskKind } from '@oe/policy';
import type { TimeEntry, Project, YearMonth, CalendarDate } from '@oe/domain';
import { SG_PUBLIC_HOLIDAYS } from '@oe/fixtures';
import { todayStr } from './settings';
import { activityById } from './timeMath';
import { activeMonths } from './db';
import { call } from './transport';
import { db, newId, audit } from './db';
import { actorFor } from './actor';
import type { DemoAccount } from './demoAccounts';
import {
  computeProjectMetrics, phaseEstimateVsActual, companyMonthMetrics,
  scheduleElapsedPct, type ProjectMetrics,
} from './metrics';

export type Maskable<T> = { value: T } | { maskedAs: MaskKind };

function maskable<T>(actor: Actor, resource: Parameters<typeof can>[2], field: string | undefined, value: T, asOf: string): Maskable<T> {
  const d = can(actor, 'view', resource, field, asOf);
  if (d.allow === true) return { value };
  if (d.allow === 'masked') return { maskedAs: d.as };
  return { maskedAs: 'hidden' };
}

const dow = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

function isWorkday(personId: string, date: CalendarDate): boolean {
  const s = db.workSchedules.find((w) => w.personId === personId);
  const d = dow(date);
  if (!s) return d >= 1 && d <= 5;
  return s.daysPerWeek === 4 ? d >= 1 && d <= 4 : d >= 1 && d <= 5;
}

function scheduledMinutes(personId: string, date: CalendarDate): number {
  if (!isWorkday(personId, date)) return 0;
  const s = db.workSchedules.find((w) => w.personId === personId);
  return (s?.hoursPerDay ?? 8) * 60;
}

function periodOf(date: CalendarDate): YearMonth {
  return date.slice(0, 7);
}

function periodStatus(date: CalendarDate): 'open' | 'soft_closed' | 'locked' {
  const p = db.financialPeriods.find((fp) => fp.yearMonth === periodOf(date));
  return p?.status ?? 'open';
}

export interface DayEntryView {
  id: string;
  minutes: number;
  activityId: string;
  activityName: string;
  scope: string;
  contextual: boolean;
  costed: boolean;
  projectId?: string;
  projectName?: string;
  phaseId?: string;
  phaseName?: string;
  notes?: string;
  status: string;
}

function entryView(e: TimeEntry): DayEntryView {
  const a = activityById(e.activityId)!;
  const project = e.projectId ? db.projects.find((p) => p.id === e.projectId) : undefined;
  const phase = e.phaseId ? db.phases.find((p) => p.id === e.phaseId) : undefined;
  return {
    id: e.id,
    minutes: e.minutes,
    activityId: e.activityId,
    activityName: a.name,
    scope: a.scope,
    contextual: a.scope === 'personal',
    costed: a.costBearing,
    projectId: e.projectId,
    projectName: project?.name,
    phaseId: e.phaseId,
    phaseName: phase?.name,
    notes: e.notes,
    status: e.status,
  };
}

// ---------------------------------------------------------------------------
// Personal (§8: Today, Week, History, Insights)
// ---------------------------------------------------------------------------

export function getDay(account: DemoAccount, date: CalendarDate) {
  return call('personal.day', () => {
    const entries = db.timeEntries
      .filter((e) => e.personId === account.personId && e.date === date)
      .map(entryView);
    const mappedPaid = entries.filter((e) => !e.contextual).reduce((s, e) => s + e.minutes, 0);
    return {
      date,
      entries,
      scheduledMinutes: scheduledMinutes(account.personId, date),
      mappedPaidMinutes: mappedPaid,
      publicHoliday: SG_PUBLIC_HOLIDAYS[date],
      periodStatus: periodStatus(date),
      isWorkday: isWorkday(account.personId, date),
    };
  });
}

export interface SaveEntryInput {
  id?: string;
  date: CalendarDate;
  minutes: number;
  activityId: string;
  projectId?: string;
  phaseId?: string;
  notes?: string;
}

export function saveEntry(account: DemoAccount, input: SaveEntryInput) {
  return call('personal.saveEntry', () => {
    const actor = actorFor(account);
    const decision = can(
      actor,
      input.id ? 'edit' : 'create',
      { type: 'timeEntry', ownerId: account.personId },
      undefined,
      todayStr(),
    );
    if (decision.allow !== true) {
      throw new Error('Only you can shape your own record.');
    }
    if (periodStatus(input.date) === 'locked') {
      // §9.4 locked-period copy is rendered by the UI; the API refuses plainly.
      throw new Error('period_locked');
    }
    if (input.minutes <= 0 || input.minutes > 24 * 60) throw new Error('invalid_minutes');
    if (!activityById(input.activityId)) throw new Error('unknown_activity');

    if (input.id) {
      const existing = db.timeEntries.find((e) => e.id === input.id);
      if (!existing || existing.personId !== account.personId) throw new Error('not_yours');
      const before = { minutes: existing.minutes, activityId: existing.activityId };
      Object.assign(existing, {
        minutes: input.minutes,
        activityId: input.activityId,
        projectId: input.projectId,
        phaseId: input.phaseId,
        notes: input.notes,
        updatedAt: `${todayStr()}T12:00:00Z`,
        updatedBy: account.userId,
      });
      if (existing.date !== todayStr()) {
        audit({ actorUserId: account.userId, entityType: 'TimeEntry', entityId: existing.id, action: 'update', oldValue: before, newValue: { minutes: input.minutes, activityId: input.activityId } });
      }
      return entryView(existing);
    }

    const existing = db.timeEntries.find(
      (e) =>
        e.personId === account.personId &&
        e.date === input.date &&
        e.activityId === input.activityId &&
        e.projectId === input.projectId &&
        e.phaseId === input.phaseId,
    );
    if (existing) {
      existing.minutes += input.minutes;
      existing.updatedAt = `${todayStr()}T12:00:00Z`;
      existing.updatedBy = account.userId;
      return entryView(existing);
    }

    const entry: TimeEntry = {
      id: newId('te'),
      createdAt: `${todayStr()}T12:00:00Z`,
      createdBy: account.userId,
      updatedAt: `${todayStr()}T12:00:00Z`,
      updatedBy: account.userId,
      personId: account.personId,
      date: input.date,
      minutes: input.minutes,
      activityId: input.activityId,
      projectId: input.projectId,
      phaseId: input.phaseId,
      notes: input.notes,
      source: 'manual',
      status: 'confirmed',
    };
    db.timeEntries.push(entry);
    return entryView(entry);
  });
}

export function deleteEntry(account: DemoAccount, entryId: string) {
  return call('personal.deleteEntry', () => {
    const idx = db.timeEntries.findIndex((e) => e.id === entryId);
    if (idx === -1) return { ok: true };
    const entry = db.timeEntries[idx]!;
    if (entry.personId !== account.personId) throw new Error('Only you can shape your own record.');
    if (periodStatus(entry.date) === 'locked') throw new Error('period_locked');
    db.timeEntries.splice(idx, 1);
    return { ok: true };
  });
}

export function copyDay(account: DemoAccount, from: CalendarDate, to: CalendarDate) {
  return call('personal.copyDay', () => {
    const scheduled = scheduledMinutes(account.personId, to);
    const alreadyMapped = db.timeEntries
      .filter((e) => e.personId === account.personId && e.date === to)
      .filter((e) => activityById(e.activityId)!.scope !== 'personal')
      .reduce((s, e) => s + e.minutes, 0);
    if (scheduled > 0 && alreadyMapped >= scheduled) {
      return { skipped: true as const, entries: [] };
    }
    const source = db.timeEntries.filter(
      (e) => e.personId === account.personId && e.date === from,
    );
    const created: TimeEntry[] = source
      .filter((e) => activityById(e.activityId)!.scope !== 'personal')
      .map((e) => ({
        ...e,
        id: newId('te'),
        date: to,
        source: 'copied' as const,
        createdAt: `${todayStr()}T12:00:00Z`,
        createdBy: account.userId,
      }));
    db.timeEntries.push(...created);
    return { skipped: false as const, entries: created.map(entryView) };
  });
}

export function getWeek(account: DemoAccount, monday: CalendarDate) {
  return call('personal.week', () => {
    const start = new Date(`${monday}T00:00:00Z`);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      const entries = db.timeEntries
        .filter((e) => e.personId === account.personId && e.date === d)
        .map(entryView);
      return {
        date: d,
        scheduledMinutes: scheduledMinutes(account.personId, d),
        mappedPaidMinutes: entries.filter((e) => !e.contextual).reduce((s, e) => s + e.minutes, 0),
        entries,
      };
    });
    return { monday, days };
  });
}

export function getMonthEntries(account: DemoAccount, month: YearMonth) {
  return call('personal.month', () =>
    db.timeEntries
      .filter((e) => e.personId === account.personId && e.date.startsWith(month))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => ({ ...entryView(e), date: e.date })),
  );
}

export function getInsights(account: DemoAccount) {
  return call('personal.insights', () => {
    // S3: personal insights belong to the owner alone (R7). The mock computes
    // them here and nowhere else; no other procedure exposes them.
    const mine = db.timeEntries.filter((e) => e.personId === account.personId);
    const byDay = new Map<string, { projects: Set<string>; minutes: number }>();
    for (const e of mine) {
      const a = activityById(e.activityId)!;
      if (!a.includedInProjectCosting) continue;
      const d = byDay.get(e.date) ?? { projects: new Set<string>(), minutes: 0 };
      if (e.projectId) d.projects.add(e.projectId);
      d.minutes += e.minutes;
      byDay.set(e.date, d);
    }
    const focusDays = [...byDay.values()].filter((d) => d.projects.size === 1 && d.minutes >= 300).length;
    const fragmentedDays = [...byDay.values()].filter((d) => d.projects.size >= 3).length;
    const projectMinutes = mine
      .filter((e) => activityById(e.activityId)!.includedInProjectCosting)
      .reduce((s, e) => s + e.minutes, 0);
    const companyMinutes = mine
      .filter((e) => { const a = activityById(e.activityId)!; return a.scope === 'company' && a.productive; })
      .reduce((s, e) => s + e.minutes, 0);
    const leaveMinutes = mine
      .filter((e) => { const a = activityById(e.activityId)!; return a.scope === 'company' && !a.productive && a.paid; })
      .reduce((s, e) => s + e.minutes, 0);
    return { focusDays, fragmentedDays, projectMinutes, companyMinutes, leaveMinutes, mappedDays: byDay.size };
  });
}

export function getFavourites(account: DemoAccount) {
  return call('personal.favourites', () => {
    const counts = new Map<string, { activityId: string; projectId?: string; n: number }>();
    for (const e of db.timeEntries.filter((x) => x.personId === account.personId)) {
      const a = activityById(e.activityId)!;
      if (a.scope === 'personal') continue;
      const key = `${e.activityId}|${e.projectId ?? ''}`;
      const cur = counts.get(key) ?? { activityId: e.activityId, projectId: e.projectId, n: 0 };
      cur.n += 1;
      counts.set(key, cur);
    }
    return [...counts.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, 5)
      .map((c) => ({
        activityId: c.activityId,
        activityName: activityById(c.activityId)!.name,
        projectId: c.projectId,
        projectName: c.projectId ? db.projects.find((p) => p.id === c.projectId)?.name : undefined,
      }));
  });
}

/** Assignments for the cascading picker: the person's projects first, with a
 *  "find another project" escape (§8.1). */
export function getAssignments(account: DemoAccount) {
  return call('personal.assignments', () => {
    const assigned = db.projects.filter(
      (p) =>
        (p.teamIds ?? []).includes(account.personId) ||
        account.leadProjectIds.includes(p.id) ||
        p.leadId === account.userId ||
        p.createdBy === account.userId,
    );
    const open = (p: Project) => !['archived', 'lost', 'financially_closed', 'completed'].includes(p.status);
    return {
      assigned: assigned.filter(open).map((p) => ({ id: p.id, name: p.name, code: p.code })),
      all: db.projects.filter(open).map((p) => ({ id: p.id, name: p.name, code: p.code })),
      activities: db.activities.filter((a) => a.active !== false),
      phasesByProject: Object.fromEntries(
        db.projects.map((p) => [
          p.id,
          db.phases
            .filter((ph) => ph.projectId === p.id)
            .sort((a, b) => a.order - b.order)
            .map((ph) => ({ id: ph.id, name: ph.name, status: ph.status })),
        ]),
      ),
    };
  });
}

// ---------------------------------------------------------------------------
// Projects (§8: portfolio, overview, project financials)
// ---------------------------------------------------------------------------

export interface PortfolioRow {
  project: Project;
  metrics: ProjectMetrics;
  fee: Maskable<number>;
  actualCost: Maskable<number>;
  grossProfit: Maskable<number>;
  margin: Maskable<number>;
  profitPerHour: Maskable<number>;
  visibleAsLead: boolean;
}

export function getPortfolio(account: DemoAccount) {
  return call('projects.portfolio', () => {
    if (account.isExternal) throw new Error('not_allowed'); // hard wall (§7.2)
    const actor = actorFor(account);
    const seesAll = ['leadership', 'finance_admin', 'ops_admin', 'super_admin'].some((r) =>
      account.roles.includes(r),
    );
    const visible = db.projects.filter(
      (p) =>
        seesAll ||
        account.leadProjectIds.includes(p.id) ||
        (p.teamIds ?? []).includes(account.personId),
    );
    return visible.map((p): PortfolioRow => {
      const metrics = computeProjectMetrics(p);
      const res = { type: 'project' as const, projectId: p.id };
      // §7.2: contract value is visible to the project's lead, leadership and
      // finance; a plain team member sees no project money at all.
      const feeVisible = seesAll || account.leadProjectIds.includes(p.id);
      return {
        project: p,
        metrics,
        fee: feeVisible
          ? { value: metrics.totalApprovedFeeMinor }
          : { maskedAs: 'hidden' },
        actualCost: maskable(actor, res, 'actualCostMinor', metrics.actDirectCostMinor, todayStr()),
        grossProfit: maskable(actor, res, 'grossProfitMinor', metrics.grossProfitMinor, todayStr()),
        margin: maskable(actor, res, 'marginPct', metrics.grossMargin, todayStr()),
        profitPerHour: maskable(actor, res, 'profitability', metrics.profitPerInternalHourMinor, todayStr()),
        visibleAsLead: account.leadProjectIds.includes(p.id),
      };
    });
  });
}

export function getProject(account: DemoAccount, projectId: string) {
  return call('projects.detail', () => {
    if (account.isExternal) throw new Error('not_allowed'); // hard wall (§7.2)
    const actor = actorFor(account);
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) throw new Error('not_found');
    const metrics = computeProjectMetrics(p);
    const phases = phaseEstimateVsActual(projectId);
    const res = { type: 'project' as const, projectId };
    const isFinance = ['finance_admin', 'super_admin'].some((r) => account.roles.includes(r));
    const isLeadHere = account.leadProjectIds.includes(projectId);
    const seesMoney = isFinance || account.roles.includes('leadership');

    return {
      project: p,
      client: db.clients.find((c) => c.id === p.clientId),
      metrics,
      phases,
      team: db.people.filter((per) => (p.teamIds ?? []).includes(per.id)),
      milestones: db.milestones.filter((m) => m.projectId === projectId),
      variations: db.variations.filter((v) => v.projectId === projectId),
      alerts: db.alerts.filter((a) => a.subjectId === projectId),
      retrospective: db.retrospectives.find((r) => r.projectId === projectId),
      expenses: seesMoney || isLeadHere
        ? db.directExpenses.filter((x) => x.projectId === projectId)
        : [],
      externals: db.externalAgreements
        .filter((a) => a.projectIds.includes(projectId))
        .map((a) => {
          const rateVisible = can(actor, 'view', { type: 'externalAgreement' }, 'rate', todayStr());
          const collaborator = db.collaborators.find((c) => c.id === a.collaboratorId);
          return {
            id: a.id,
            collaboratorName: collaborator?.name ?? 'Collaborator',
            discipline: collaborator?.discipline,
            model: a.model,
            status: a.status,
            currency: a.currency,
            fee: rateVisible.allow === true
              ? { value: a.feeMinor ?? a.rateMinor ?? 0 }
              : ({ maskedAs: 'hidden' } as Maskable<number>),
          };
        }),
      revenue: seesMoney
        ? db.revenueItems.filter((r) => r.projectId === projectId)
        : [],
      invoices: seesMoney ? db.invoices.filter((i) => i.projectId === projectId) : [],
      quotation: db.quotations.find((q) => q.projectId === projectId),
      access: {
        seesMoney,
        isFinance,
        isLeadHere,
        fee: maskable(actor, res, 'fee', metrics.totalApprovedFeeMinor, todayStr()),
        budgetConsumed: metrics.budgetConsumedPct,
        canLogVariation: isLeadHere || account.roles.includes('leadership'),
      },
    };
  });
}

export function submitVariation(account: DemoAccount, input: {
  projectId: string; description: string; feeDeltaMinor: number; hoursDelta?: number;
}) {
  return call('projects.submitVariation', () => {
    const allowed = account.leadProjectIds.includes(input.projectId) ||
      account.roles.includes('leadership');
    if (!allowed) throw new Error('not_allowed');
    const v = {
      id: newId('var'),
      createdAt: `${todayStr()}T12:00:00Z`,
      createdBy: account.userId,
      updatedAt: `${todayStr()}T12:00:00Z`,
      updatedBy: account.userId,
      projectId: input.projectId,
      description: input.description,
      feeDeltaMinor: input.feeDeltaMinor,
      hoursDelta: input.hoursDelta,
      affectedPhaseIds: [],
      status: 'submitted' as const,
    };
    db.variations.push(v);
    audit({ actorUserId: account.userId, entityType: 'Variation', entityId: v.id, action: 'create' });
    return v;
  });
}

export function approveVariation(account: DemoAccount, variationId: string) {
  return call('projects.approveVariation', () => {
    if (!account.roles.includes('leadership')) throw new Error('not_allowed');
    const v = db.variations.find((x) => x.id === variationId);
    if (!v) throw new Error('not_found');
    v.status = 'approved';
    v.approvedByUserId = account.userId;
    v.approvedAt = `${todayStr()}T12:00:00Z`;
    audit({ actorUserId: account.userId, entityType: 'Variation', entityId: v.id, action: 'approve' });
    return v;
  });
}

// ---------------------------------------------------------------------------
// Company (§8: cockpit, overheads, time allocation, periods)
// ---------------------------------------------------------------------------

function requireCompanyFinance(account: DemoAccount) {
  const actor = actorFor(account);
  const d = can(actor, 'view', { type: 'companyFinance' }, undefined, todayStr());
  if (d.allow !== true) throw new Error('not_allowed');
}

export function getCockpit(account: DemoAccount, month: YearMonth) {
  return call('company.cockpit', () => {
    requireCompanyFinance(account);
    return companyMonthMetrics(month);
  });
}

export function getCockpitTrend(account: DemoAccount) {
  return call('company.trend', () => {
    requireCompanyFinance(account);
    return activeMonths().map((m) => {
      const c = companyMonthMetrics(m);
      return {
        period: m,
        recognisedRevenueMinor: c.recognisedRevenueMinor,
        operatingProfitMinor: c.operatingProfitMinor,
        projectGrossProfitMinor: c.projectGrossProfitMinor,
        overheadCoverage: c.overheadCoverage,
      };
    });
  });
}

export function getOverheads(account: DemoAccount) {
  return call('company.overheads', () => {
    requireCompanyFinance(account);
    return db.companyOverheads;
  });
}

export function getTimeAllocationView(account: DemoAccount) {
  return call('company.timeAllocation', () => {
    requireCompanyFinance(account);
    // Aggregate only, fixed category order (§9.3); no per-person surfaces (R7).
    return activeMonths().map((m) => {
      const c = companyMonthMetrics(m);
      const projectLabour = c.perProject.reduce((s, x) => s + x.labour, 0);
      return {
        period: m,
        projectLabourMinor: projectLabour,
        nonProjectByActivity: c.nonProjectByActivity,
        unallocatedMinor: c.unallocatedPayrollMinor,
      };
    });
  });
}

export function getPeriods(account: DemoAccount) {
  return call('company.periods', () => {
    const isFinance = ['finance_admin', 'super_admin'].some((r) => account.roles.includes(r));
    if (!isFinance && !account.roles.includes('ops_admin')) throw new Error('not_allowed');
    return db.financialPeriods;
  });
}

export function lockPeriod(account: DemoAccount, yearMonth: YearMonth) {
  return call('company.lockPeriod', () => {
    if (!account.roles.includes('finance_admin') && !account.roles.includes('super_admin')) {
      throw new Error('not_allowed');
    }
    const p = db.financialPeriods.find((x) => x.yearMonth === yearMonth);
    if (!p) throw new Error('not_found');
    if (p.tieOut === 'red') throw new Error('tie_out_red'); // R3: refuse while red
    p.status = 'locked';
    p.lockedByUserId = account.userId;
    p.lockedAt = `${todayStr()}T12:00:00Z`;
    audit({ actorUserId: account.userId, entityType: 'FinancialPeriod', entityId: yearMonth, action: 'lock' });
    return p;
  });
}

export function reopenPeriod(account: DemoAccount, yearMonth: YearMonth, reason: string) {
  return call('company.reopenPeriod', () => {
    if (!account.roles.includes('super_admin')) throw new Error('not_allowed');
    if (!reason.trim()) throw new Error('reason_required'); // §7.4 mandatory reason
    const p = db.financialPeriods.find((x) => x.yearMonth === yearMonth);
    if (!p) throw new Error('not_found');
    p.status = 'open';
    p.reopenReason = reason;
    audit({ actorUserId: account.userId, entityType: 'FinancialPeriod', entityId: yearMonth, action: 'reopen', reason });
    return p;
  });
}

// ---------------------------------------------------------------------------
// People and OE Verse (§8)
// ---------------------------------------------------------------------------

export function getDirectory(account: DemoAccount) {
  return call('people.directory', () => {
    if (account.isExternal) throw new Error('not_allowed'); // hard wall (§7.2)
    return db.people.map((p) => ({
      id: p.id, name: p.name, title: p.title, team: p.team, roleKey: p.roleKey,
      skills: p.skills, employmentStatus: p.employmentStatus,
    }));
  });
}

export function getPerson(account: DemoAccount, personId: string) {
  return call('people.person', () => {
    if (account.isExternal) throw new Error('not_allowed'); // hard wall (§7.2)
    const actor = actorFor(account);
    const person = db.people.find((p) => p.id === personId);
    if (!person) throw new Error('not_found');
    const agreementsAllowed =
      can(actor, 'view', { type: 'employmentAgreement', personId }, undefined, todayStr()).allow === true;
    const ratesAllowed =
      can(actor, 'view', { type: 'costRate', personId }, undefined, todayStr()).allow === true;
    return {
      person,
      schedule: db.workSchedules.find((w) => w.personId === personId),
      sellRates: db.sellRates,
      // S1: agreements and rates only for finance/super admin; absent otherwise,
      // not nulled (masking by omission at the serialiser, R6).
      agreements: agreementsAllowed
        ? db.employmentAgreements.filter((a) => a.personId === personId)
        : undefined,
      costRates: ratesAllowed
        ? db.costRates.filter((r) => r.personId === personId)
        : undefined,
      access: { agreementsAllowed, ratesAllowed },
    };
  });
}

export function getVerse(account: DemoAccount) {
  return call('people.verse', () => {
    const actor = actorFor(account);
    if (account.isExternal) throw new Error('not_allowed');
    const rateVisible = can(actor, 'view', { type: 'externalAgreement' }, 'rate', todayStr()).allow === true;
    return db.collaborators.map((c) => ({
      collaborator: c,
      agreements: db.externalAgreements
        .filter((a) => a.collaboratorId === c.id)
        .map((a) => ({
          id: a.id,
          model: a.model,
          status: a.status,
          projectIds: a.projectIds,
          currency: a.currency,
          startDate: a.startDate,
          endDate: a.endDate,
          fee: rateVisible
            ? ({ value: a.feeMinor ?? a.rateMinor ?? 0 } as Maskable<number>)
            : ({ maskedAs: 'hidden' } as Maskable<number>),
        })),
    }));
  });
}

/** OE Verse portal (external contributor): own agreements and assignments only. */
export function getMyVerseWork(account: DemoAccount) {
  return call('verse.portal', () => {
    if (!account.isExternal) throw new Error('not_allowed');
    const agreements = db.externalAgreements.filter((a) => a.collaboratorId === account.personId);
    return {
      collaborator: db.collaborators.find((c) => c.id === account.personId),
      agreements,
      projects: db.projects
        .filter((p) => agreements.some((a) => a.projectIds.includes(p.id)))
        .map((p) => ({ id: p.id, name: p.name, status: p.status })), // scope only, no financials
    };
  });
}

// ---------------------------------------------------------------------------
// Admin (§8)
// ---------------------------------------------------------------------------

export function getActivities(account: DemoAccount) {
  return call('admin.activities', () => db.activities);
}

export function getTemplates(account: DemoAccount) {
  return call('admin.templates', () => db.projectTemplates);
}

export function getAudit(account: DemoAccount) {
  return call('admin.audit', () => {
    const actor = actorFor(account);
    const d = can(actor, 'view', { type: 'auditLog' }, undefined, todayStr());
    if (d.allow !== true) throw new Error('not_allowed');
    return [...db.auditRecords].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  });
}

export function getQuotations(account: DemoAccount) {
  return call('quotes.list', () => {
    const allowed = ['leadership', 'finance_admin', 'project_lead', 'super_admin'].some((r) =>
      account.roles.includes(r),
    );
    if (!allowed) throw new Error('not_allowed');
    return db.quotations.map((q) => {
      const project = db.projects.find((p) => p.id === q.projectId);
      return {
        quotation: q,
        project,
        clientName: project ? db.clients.find((c) => c.id === project.clientId)?.name : undefined,
      };
    });
  });
}

export function acceptQuotation(account: DemoAccount, quotationId: string) {
  return call('quotes.accept', () => {
    if (!account.roles.includes('leadership')) throw new Error('not_allowed');
    const q = db.quotations.find((x) => x.id === quotationId);
    if (!q) throw new Error('not_found');
    if (q.status === 'accepted') throw new Error('already_accepted'); // R4: immutable
    q.status = 'accepted';
    audit({ actorUserId: account.userId, entityType: 'Quotation', entityId: q.id, action: 'approve' });
    return q;
  });
}



/** Months the console reasons over (dataset window through the real today). */
export const MONTHS = activeMonths();
