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

// Seed the trail with the dataset's notable events (demo mode only).
if (!isFreshMode()) {
  audit({ actorUserId: 'usr-daniel', entityType: 'EmploymentAgreement', entityId: 'ea-mei-2', action: 'create', reason: 'Annual review adjustment', occurredAt: '2025-12-15T03:00:00Z' });
  audit({ actorUserId: 'usr-ryan', entityType: 'EmploymentAgreement', entityId: 'ea-mei-2', action: 'approve', reason: 'Second super admin confirmation', occurredAt: '2025-12-15T05:00:00Z' });
  audit({ actorUserId: 'usr-ryan', entityType: 'Variation', entityId: 'var-f-1', action: 'approve', occurredAt: '2026-04-14T06:00:00Z' });
  for (const p of fixtureDb.financialPeriods) {
    if (p.status === 'locked') {
      audit({ actorUserId: 'usr-daniel', entityType: 'FinancialPeriod', entityId: p.yearMonth, action: 'lock', occurredAt: `${p.yearMonth}-28T09:00:00Z` });
    }
  }
}
