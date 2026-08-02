// In-memory working copy of the dataset. Two modes:
//  - Demo mode: the full fictional fixture dataset (12 projects, 12 months).
//  - Fresh mode (client direction, item 3): fictional projects, hours,
//    quotations and finances are switched off so the console can be tested
//    with real inputs. People, users, activity categories, templates and the
//    clause library remain, because they are the studio itself.
// Financial periods extend from the dataset window to the real current month
// (item 6): past months open, current month open, so day-to-day logging works
// on today's date.

import { fixtureDb, MONTHS as FIXTURE_MONTHS } from '@oe/fixtures';
import type {
  TimeEntry, Variation, FinancialPeriod, AuditRecord, Project, ProjectPhase,
  Quotation, DirectExpense, RevenueItem, Invoice, ExternalAgreement, Collaborator,
  ProjectTemplate,
} from '@oe/domain';
import { isFreshMode, currentMonth, todayStr } from './settings';

// ---------------------------------------------------------------------------
// App-side records that extend the domain (kept here until Stage B's schema).
// ---------------------------------------------------------------------------

export interface ProjectNote {
  id: string;
  projectId: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export type LeadStage = 'tofu' | 'mofu' | 'bofu' | 'converted' | 'parked';

export interface Lead {
  id: string;
  name: string;                 // opportunity name
  organisation: string;
  contactName?: string;
  contactEmail?: string;
  source?: string;
  serviceLine?: string;
  estFeeMinor?: number;
  probability?: number;         // decimal
  stage: LeadStage;
  nextStep?: string;
  nextStepDate?: string;
  notes: { at: string; by: string; body: string }[];
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  convertedProjectId?: string;
}

/** OE Verse profile fields the studio tracks (client direction, item 10). */
export interface VerseProfile {
  collaboratorId: string;
  website?: string;
  instagram?: string;
  email?: string;
  contactNo?: string;
  category?: string;
  capabilities: string[];
  engagement?: 'Full-time' | 'Freelance' | 'Short Stint' | 'Internship';
  notes?: string;
  ratesNote?: string;
  engagedBefore: boolean;
  craftRating?: number;         // 1..5
  personalityRating?: number;   // 1..5
}

export const VERSE_CATEGORIES = [
  'Design', 'Creative Strategist / Copywriter / Content Planner', 'Producer',
  'Marketing', 'Activations', 'Creative Strategy', 'Admin', 'Spatial Collaborators',
  'Interiors', 'Exhibitions', 'Translation', 'Transcreation',
] as const;

export const VERSE_CAPABILITIES = [
  'Account Management', 'Marketing', 'Strategy', 'Spatial/Experience Design',
  'Interior Design', 'Graphic Design', 'Art Direction', 'Branding', 'Content',
  'Animation', 'Motion Graphics', 'Photography', 'Social Media Content',
  'Editorial', 'Copywriting', 'Videography / Film', '3D Design', 'Video Editing',
  'Creative Direction', 'Installation Design', 'Product Design', 'Illustration',
  'Event / Experiences', 'Digital / UIUX', 'Packaging', 'Publication', 'Rendering',
] as const;

// ---------------------------------------------------------------------------
// Period scaffolding to the real current month.
// ---------------------------------------------------------------------------

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number) as [number, number];
  const [ey, em] = to.split('-').map(Number) as [number, number];
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** All months the console reasons over: the dataset window through today. */
export function activeMonths(): string[] {
  const first = isFreshMode() ? `${currentMonth().slice(0, 4)}-01` : FIXTURE_MONTHS[0]!;
  const from = first < currentMonth() ? first : currentMonth();
  return monthsBetween(from, currentMonth());
}

function scaffoldPeriods(existing: FinancialPeriod[]): FinancialPeriod[] {
  const byMonth = new Map(existing.map((p) => [p.yearMonth, p]));
  return activeMonths().map((ym) => {
    const found = byMonth.get(ym);
    if (found) return { ...found };
    return {
      id: `fp-${ym}`,
      createdAt: `${ym}-01T00:00:00Z`,
      createdBy: 'system',
      updatedAt: `${ym}-01T00:00:00Z`,
      updatedBy: 'system',
      yearMonth: ym,
      status: 'open',
      tieOut: 'green',
      tieOutDetail: {
        period: ym, expectedMinor: 0, allocatedMinor: 0, differenceMinor: 0,
        status: 'green', perPerson: [],
      },
    } as FinancialPeriod;
  });
}

// ---------------------------------------------------------------------------
// Seed OE Verse profiles for the fixture collaborators.
// ---------------------------------------------------------------------------

const SEED_VERSE_PROFILES: VerseProfile[] = [
  { collaboratorId: 'col-farhan', email: 'farhan@studio.example', category: 'Design', capabilities: ['Motion Graphics', 'Animation', 'Graphic Design'], engagement: 'Freelance', engagedBefore: true, craftRating: 5, personalityRating: 4, notes: 'Also covers lighting documentation for spatial builds.' },
  { collaboratorId: 'col-nadia', email: 'nadia@curation.example', category: 'Creative Strategy', capabilities: ['Strategy', 'Editorial', 'Event / Experiences'], engagement: 'Freelance', engagedBefore: true, craftRating: 4, personalityRating: 5 },
  { collaboratorId: 'col-teckheng', category: 'Spatial Collaborators', capabilities: ['Installation Design', 'Spatial/Experience Design'], engagement: 'Freelance', engagedBefore: true, craftRating: 4, personalityRating: 4, notes: 'Workshop in Sungei Kadut; installs with own crew.' },
  { collaboratorId: 'col-aiko', website: 'https://studioarc.example', category: 'Producer', capabilities: ['Event / Experiences', 'Creative Direction'], engagement: 'Freelance', engagedBefore: true, craftRating: 5, personalityRating: 5 },
];

// ---------------------------------------------------------------------------
// Build the working database.
// ---------------------------------------------------------------------------

function build() {
  const fresh = isFreshMode();
  return {
    // The studio itself: always present.
    people: [...fixtureDb.people],
    workSchedules: [...fixtureDb.workSchedules],
    employmentAgreements: [...fixtureDb.employmentAgreements],
    costRates: [...fixtureDb.costRates],
    sellRates: [...fixtureDb.sellRates],
    users: [...fixtureDb.users],
    activities: [...fixtureDb.activities],
    projectTemplates: fixtureDb.projectTemplates.map((t) => ({
      ...t,
      phases: t.phases.map((p) => ({ ...p, deliverables: [...p.deliverables] })),
    })) as ProjectTemplate[],
    clauses: [...fixtureDb.clauses],
    companyOverheads: fresh ? [] : [...fixtureDb.companyOverheads],

    // The fictional working data: switched off in fresh mode.
    clients: fresh ? [] : [...fixtureDb.clients],
    projects: (fresh ? [] : fixtureDb.projects.map((p) => ({ ...p }))) as Project[],
    phases: (fresh ? [] : fixtureDb.phases.map((p) => ({ ...p }))) as ProjectPhase[],
    deliverables: fresh ? [] : [...fixtureDb.deliverables],
    milestones: fresh ? [] : [...fixtureDb.milestones],
    variations: (fresh ? [] : [...fixtureDb.variations]) as Variation[],
    directExpenses: (fresh ? [] : [...fixtureDb.directExpenses]) as DirectExpense[],
    revenueItems: (fresh ? [] : [...fixtureDb.revenueItems]) as RevenueItem[],
    invoices: (fresh ? [] : [...fixtureDb.invoices]) as Invoice[],
    alerts: fresh ? [] : [...fixtureDb.alerts],
    retrospectives: fresh ? [] : [...fixtureDb.retrospectives],
    benchmarks: [...fixtureDb.benchmarks],
    capacityAllocations: fresh ? [] : [...fixtureDb.capacityAllocations],
    quotations: (fresh ? [] : fixtureDb.quotations.map((q) => ({ ...q }))) as Quotation[],
    collaborators: (fresh ? [] : [...fixtureDb.collaborators]) as Collaborator[],
    externalAgreements: (fresh ? [] : [...fixtureDb.externalAgreements]) as ExternalAgreement[],
    timeEntries: (fresh ? [] : [...fixtureDb.timeEntries]) as TimeEntry[],
    financialPeriods: scaffoldPeriods(fresh ? [] : (fixtureDb.financialPeriods as FinancialPeriod[])),

    // App-side collections.
    projectNotes: [] as ProjectNote[],
    leads: [] as Lead[],
    verseProfiles: (fresh ? [] : SEED_VERSE_PROFILES.map((v) => ({ ...v, capabilities: [...v.capabilities] }))) as VerseProfile[],
    auditRecords: [] as AuditRecord[],
  };
}

export const db = build();

let counter = 1000;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function nowIso(): string {
  return `${todayStr()}T12:00:00Z`;
}

/** Append-only audit trail (§7.5). There is no update or delete path. */
export function audit(rec: Omit<AuditRecord, 'id' | 'occurredAt'> & { occurredAt?: string }): void {
  db.auditRecords.push({
    id: newId('aud'),
    occurredAt: rec.occurredAt ?? new Date().toISOString(),
    ...rec,
  } as AuditRecord);
}

// ---------------------------------------------------------------------------
// Demo-mode recency (QA finding 5): the fixture window ends mid-2026, so in
// demo mode we lay deterministic entries across the last four weeks (excluding
// today) over the still-open projects, keeping ring walls, completeness and
// the current month's cockpit alive on any real date. §6.9 example projects
// stay untouched so their published figures hold.
// ---------------------------------------------------------------------------

function seedRecentDemoEntries(): void {
  const today = todayStr();
  const activityId = (name: string) => db.activities.find((a) => a.name === name)?.id;
  const projectWork = activityId('Design');
  const pm = activityId('Project management');
  const bd = activityId('Business development');
  const internal = activityId('Internal meeting');
  if (!projectWork || !pm || !bd || !internal) return;

  const openProjects = db.projects.filter(
    (p) => p.status === 'active' && p.targetEndDate >= today && !p.baseline,
  );

  for (const person of db.people) {
    const schedule = db.workSchedules.find((w) => w.personId === person.id);
    const hoursPerDay = schedule?.hoursPerDay ?? 8;
    const fourDay = schedule?.daysPerWeek === 4;
    const mine = openProjects.filter((p) => (p.teamIds ?? []).includes(person.id));
    const cursor = new Date(`${today}T00:00:00Z`);
    for (let back = 1; back <= 28; back += 1) {
      const d = new Date(cursor.getTime() - back * 86_400_000);
      const date = d.toISOString().slice(0, 10);
      const dow = d.getUTCDay();
      const workday = fourDay ? dow >= 1 && dow <= 4 : dow >= 1 && dow <= 5;
      if (!workday) continue;
      if (db.timeEntries.some((e) => e.personId === person.id && e.date === date)) continue;
      const total = hoursPerDay * 60;
      const isBdPerson = person.roleKey === 'founder' || person.roleKey === 'creative_director';
      const companyAct = isBdPerson ? bd : internal;
      const project = mine[(back + person.id.length) % Math.max(1, mine.length)];
      const push = (minutes: number, actId: string, projectId?: string) => {
        if (minutes <= 0) return;
        db.timeEntries.push({
          id: `te-recent-${person.id}-${date}-${actId}`,
          createdAt: `${date}T10:00:00Z`, createdBy: 'system',
          updatedAt: `${date}T10:00:00Z`, updatedBy: 'system',
          personId: person.id, date, minutes, activityId: actId,
          ...(projectId ? { projectId } : {}),
          source: 'manual', status: 'confirmed',
        } as TimeEntry);
      };
      if (project) {
        const projMinutes = Math.round((total * 0.7) / 15) * 15;
        push(projMinutes, back % 3 === 0 ? pm : projectWork, project.id);
        push(total - projMinutes, companyAct);
      } else {
        push(total, companyAct);
      }
    }
  }
}

function seedDemoLeads(): void {
  const mk = (
    id: string, name: string, organisation: string, stage: LeadStage,
    estFee: number, probability: number, nextStep: string, daysOut: number,
    serviceLine: string,
  ): Lead => {
    const base = new Date(`${todayStr()}T00:00:00Z`);
    const nextDate = new Date(base.getTime() + daysOut * 86_400_000).toISOString().slice(0, 10);
    return {
      id, name, organisation, stage,
      estFeeMinor: estFee * 100, probability,
      nextStep, nextStepDate: nextDate,
      serviceLine,
      notes: [{ at: `${todayStr()}T02:00:00Z`, by: 'Ryan Tan', body: 'Logged from the demo seed.' }],
      ownerUserId: 'usr-ryan',
      createdAt: `${todayStr()}T02:00:00Z`,
      updatedAt: `${todayStr()}T02:00:00Z`,
    };
  };
  db.leads.push(
    mk('lead-demo-1', 'Riverfront Night Market identity', 'Riveredge Collective', 'tofu', 45_000, 0.2, 'Coffee with the programme director', 6, 'brand_identity'),
    mk('lead-demo-2', 'Wellness quarter placemaking study', 'Cedar Health Group', 'tofu', 120_000, 0.25, 'Send credentials deck', 3, 'placemaking'),
    mk('lead-demo-3', 'Annual report and campaign refresh', 'Meridian Institute', 'mofu', 60_000, 0.45, 'Scope workshop, their office', 8, 'campaign'),
    mk('lead-demo-4', 'Heritage gallery experience design', 'Straits Heritage Board', 'bofu', 240_000, 0.65, 'Proposal presented; decision expected', 12, 'exhibition'),
    mk('lead-demo-5', 'Boutique hotel rebrand', 'Auric Hotels', 'parked', 95_000, 0.1, 'Revisit after their renovation budget lands', 60, 'brand_identity'),
  );
}

// Seed the trail with the dataset's notable events (demo mode only).
if (!isFreshMode()) {
  seedRecentDemoEntries();
  seedDemoLeads();
  audit({ actorUserId: 'usr-daniel', entityType: 'EmploymentAgreement', entityId: 'ea-mei-2', action: 'create', reason: 'Annual review adjustment', occurredAt: '2025-12-15T03:00:00Z' });
  audit({ actorUserId: 'usr-ryan', entityType: 'EmploymentAgreement', entityId: 'ea-mei-2', action: 'approve', reason: 'Second super admin confirmation', occurredAt: '2025-12-15T05:00:00Z' });
  audit({ actorUserId: 'usr-ryan', entityType: 'Variation', entityId: 'var-f-1', action: 'approve', occurredAt: '2026-04-14T06:00:00Z' });
  for (const p of fixtureDb.financialPeriods) {
    if (p.status === 'locked') {
      audit({ actorUserId: 'usr-daniel', entityType: 'FinancialPeriod', entityId: p.yearMonth, action: 'lock', occurredAt: `${p.yearMonth}-28T09:00:00Z` });
    }
  }
}
