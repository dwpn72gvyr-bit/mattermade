// Project lifecycle operations: creation and editing by the super admin or
// operations director, team assignment, project notes, and conversion of an
// approved estimate or a won lead into a live project (client directions
// items 4, 5, 8, 15).

import type { Project, ProjectPhase } from '@oe/domain';
import { call } from './transport';
import { db, newId, nowIso, type ProjectNote } from './db';
import { optionList, todayStr } from './settings';
import type { DemoAccount } from './demoAccounts';

function canManageProjects(account: DemoAccount): boolean {
  return ['super_admin', 'ops_admin', 'leadership'].some((r) => account.roles.includes(r));
}

export interface ProjectInput {
  id?: string;
  name: string;
  clientName: string;
  /** Primary service line (the first selected), kept for domain compatibility. */
  serviceLine: string;
  /** Round F: the full multi-select. Stored on the db object; the domain
   *  Project type stays unchanged. */
  serviceLines?: string[];
  currency?: string;
  contractValueMinor?: number;
  startDate: string;
  targetEndDate: string;
  leadUserId?: string;
  teamPersonIds: string[];
  status?: Project['status'];
  phases?: { id?: string; name: string; estHoursByRole?: Record<string, number> }[];
}

/** Projects carry the full service-line list alongside the domain type's
 *  single primary line (round F). */
type ProjectWithLines = Project & { serviceLines?: string[] };

function ensureClient(name: string, createdBy: string): string {
  const existing = db.clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const id = newId('cli');
  db.clients.push({
    id, createdAt: nowIso(), createdBy, updatedAt: nowIso(), updatedBy: createdBy,
    name, country: 'SG', paymentTermsDays: 30,
  } as (typeof db.clients)[number]);
  return id;
}

function dateAt(start: string, end: string, frac: number): string {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  const f = Math.min(1, Math.max(0, frac));
  return new Date(a + (b - a) * f).toISOString().slice(0, 10);
}

function buildPhases(projectId: string, input: ProjectInput, createdBy: string): ProjectPhase[] {
  const names = (input.phases?.length ? input.phases : [{ name: 'Delivery' }]);
  return names.map((p, i) => ({
    id: newId('ph'),
    createdAt: nowIso(), createdBy, updatedAt: nowIso(), updatedBy: createdBy,
    projectId,
    name: p.name,
    order: i + 1,
    status: 'not_started' as const,
    estHoursByRole: p.estHoursByRole ?? {},
    plannedStart: dateAt(input.startDate, input.targetEndDate, i / names.length),
    plannedEnd: dateAt(input.startDate, input.targetEndDate, (i + 1) / names.length),
  }));
}

/** Reconcile an existing project's phases with the editor's list (round F):
 *  rows keep their identity by id, so recorded hours stay attached; order
 *  follows the editor (drag reorder); new rows become new phases; removed
 *  rows go unless time has already landed on them, in which case they keep
 *  their history and settle to the end of the list. */
function syncPhases(p: Project, input: ProjectInput, by: string): void {
  const phases = input.phases ?? [];
  const current = db.phases.filter((ph) => ph.projectId === p.id);
  const kept = new Set<string>();
  phases.forEach((ip, i) => {
    const found = ip.id ? current.find((ph) => ph.id === ip.id) : undefined;
    if (found) {
      found.name = ip.name;
      found.order = i + 1;
      if (ip.estHoursByRole) found.estHoursByRole = ip.estHoursByRole;
      found.updatedAt = nowIso();
      found.updatedBy = by;
      kept.add(found.id);
    } else {
      const ph: ProjectPhase = {
        id: newId('ph'),
        createdAt: nowIso(), createdBy: by, updatedAt: nowIso(), updatedBy: by,
        projectId: p.id,
        name: ip.name,
        order: i + 1,
        status: 'not_started',
        estHoursByRole: ip.estHoursByRole ?? {},
        plannedStart: dateAt(input.startDate, input.targetEndDate, i / phases.length),
        plannedEnd: dateAt(input.startDate, input.targetEndDate, (i + 1) / phases.length),
      };
      db.phases.push(ph);
      kept.add(ph.id);
    }
  });
  const hasTime = (phaseId: string) => db.timeEntries.some((te) => te.phaseId === phaseId);
  db.phases = db.phases.filter(
    (ph) => ph.projectId !== p.id || kept.has(ph.id) || hasTime(ph.id),
  );
  let tail = phases.length;
  for (const ph of db.phases) {
    if (ph.projectId === p.id && !kept.has(ph.id)) { tail += 1; ph.order = tail; }
  }
}

/** Create or update a project. Team and lead assignment included (item 4). */
export function saveProject(account: DemoAccount, input: ProjectInput) {
  return call('projects.save', () => {
    if (!canManageProjects(account)) throw new Error('not_allowed');

    if (input.id) {
      const p = db.projects.find((x) => x.id === input.id);
      if (!p) throw new Error('not_found');
      Object.assign(p, {
        name: input.name,
        serviceLine: input.serviceLine as Project['serviceLine'],
        clientId: ensureClient(input.clientName, account.userId),
        contractValueMinor: input.contractValueMinor ?? p.contractValueMinor,
        currency: input.currency ?? p.currency,
        startDate: input.startDate,
        targetEndDate: input.targetEndDate,
        leadId: input.leadUserId ?? p.leadId,
        teamIds: input.teamPersonIds,
        status: input.status ?? p.status,
        updatedAt: nowIso(),
        updatedBy: account.userId,
      });
      (p as ProjectWithLines).serviceLines = input.serviceLines ?? [input.serviceLine];
      if (input.phases?.length) syncPhases(p, input, account.userId);
      return p;
    }

    const id = newId('prj');
    const project: Project = {
      id, createdAt: nowIso(), createdBy: account.userId,
      updatedAt: nowIso(), updatedBy: account.userId,
      code: `OE-${todayStr().slice(2, 4)}${String(db.projects.length + 1).padStart(2, '0')}`,
      name: input.name,
      clientId: ensureClient(input.clientName, account.userId),
      projectType: input.serviceLine,
      serviceLine: input.serviceLine as Project['serviceLine'],
      status: input.status ?? 'planning',
      leadId: input.leadUserId ?? account.userId,
      teamIds: input.teamPersonIds,
      country: 'SG',
      currency: input.currency ?? 'SGD',
      contractValueMinor: input.contractValueMinor ?? 0,
      startDate: input.startDate,
      targetEndDate: input.targetEndDate,
      isProBono: false,
      riskFlags: [],
      serviceLines: input.serviceLines ?? [input.serviceLine],
    } as Project;
    db.projects.push(project);
    db.phases.push(...buildPhases(id, input, account.userId));
    return project;
  });
}

/** Project notes: the team's running record of progress for the admin to read
 *  as the project moves (item 5). Any assigned person, the lead, leadership or
 *  admin may write; everyone on the project may read. */
export function getProjectNotes(account: DemoAccount, projectId: string) {
  return call('projects.notes', () =>
    db.projectNotes
      .filter((n) => n.projectId === projectId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  );
}

export function addProjectNote(account: DemoAccount, projectId: string, body: string) {
  return call('projects.addNote', () => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) throw new Error('not_found');
    const onTeam = (p.teamIds ?? []).includes(account.personId);
    const allowed = onTeam || account.leadProjectIds.includes(projectId) ||
      canManageProjects(account) || account.roles.includes('finance_admin');
    if (!allowed) throw new Error('not_allowed');
    if (!body.trim()) throw new Error('empty_note');
    const note: ProjectNote = {
      id: newId('note'),
      projectId,
      authorUserId: account.userId,
      authorName: account.name,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };
    db.projectNotes.push(note);
    return note;
  });
}

export function getPeopleOptions(account: DemoAccount) {
  return call('projects.peopleOptions', () => ({
    people: db.people.map((p) => ({ id: p.id, name: p.name, title: p.title })),
    users: db.users.map((u) => ({ id: u.id, email: u.email })),
    serviceLines: optionList('service_lines'),
  }));
}

/** Approve-and-convert (client direction, item 8): an approved estimate turns
 *  into a live project carrying its structure and fee, ready for staffing. */
export function convertQuoteToProject(account: DemoAccount, args: {
  quotationId: string;
  name: string;
  clientName: string;
  serviceLine: string;
  feeMinor: number;
  startDate: string;
  targetEndDate: string;
  phases: { name: string; estHoursByRole?: Record<string, number> }[];
}) {
  return call('quotes.convert', () => {
    if (!canManageProjects(account)) throw new Error('not_allowed');
    const q = db.quotations.find((x) => x.id === args.quotationId);
    if (q) q.status = 'accepted';
    const existing = q ? db.projects.find((p) => p.id === q.projectId) : undefined;
    if (existing && ['estimating', 'opportunity', 'quoted', 'negotiation'].includes(existing.status)) {
      existing.status = 'planning';
      existing.contractValueMinor = args.feeMinor;
      existing.updatedAt = nowIso();
      existing.updatedBy = account.userId;
      const hasPhases = db.phases.some((ph) => ph.projectId === existing.id);
      if (!hasPhases) {
        db.phases.push(...buildPhases(existing.id, {
          name: existing.name, clientName: args.clientName, serviceLine: args.serviceLine,
          startDate: args.startDate, targetEndDate: args.targetEndDate,
          teamPersonIds: existing.teamIds ?? [], phases: args.phases,
        }, account.userId));
      }
      return existing;
    }
    const id = newId('prj');
    const project = {
      id, createdAt: nowIso(), createdBy: account.userId,
      updatedAt: nowIso(), updatedBy: account.userId,
      code: `OE-${todayStr().slice(2, 4)}${String(db.projects.length + 1).padStart(2, '0')}`,
      name: args.name,
      clientId: ensureClient(args.clientName, account.userId),
      projectType: args.serviceLine,
      serviceLine: args.serviceLine,
      status: 'planning',
      leadId: account.userId,
      teamIds: [],
      country: 'SG',
      currency: 'SGD',
      contractValueMinor: args.feeMinor,
      startDate: args.startDate,
      targetEndDate: args.targetEndDate,
      isProBono: false,
      riskFlags: [],
    } as Project;
    db.projects.push(project);
    db.phases.push(...buildPhases(id, {
      name: args.name, clientName: args.clientName, serviceLine: args.serviceLine,
      startDate: args.startDate, targetEndDate: args.targetEndDate,
      teamPersonIds: [], phases: args.phases,
    }, account.userId));
    return project;
  });
}
