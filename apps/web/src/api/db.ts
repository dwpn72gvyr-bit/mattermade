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

/** A payment tranche: one slice of a project's fee, with the date we expect
 *  the money and the date it actually arrived (client direction, round G).
 *  Declared during project setup or while the work is still a lead, then kept
 *  honest as reality lands. */
export type TrancheStatus = 'expected' | 'invoiced' | 'paid' | 'late' | 'written_off';

export interface PaymentTranche {
  id: string;
  /** Set for a live project, or for a lead that has not converted yet. */
  projectId?: string;
  leadId?: string;
  label: string;                // "On signing", "On install", "On completion"
  amountMinor: number;
  expectedDate: string;         // when we expect the money
  actualDate?: string;          // when it actually arrived
  actualAmountMinor?: number;   // what actually arrived, if it differed
  status: TrancheStatus;
  /** Finance set this by hand because Xero could not be reconciled. */
  manualOverride?: boolean;
  note?: string;
  updatedAt: string;
  updatedBy: string;
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

/** OE Verse profile fields the studio tracks (client direction, item 10).
 *  Round F: categories and engagements are multi-value, and the profile keeps
 *  its own added/updated dates, stamped on save. */
export interface VerseProfile {
  collaboratorId: string;
  website?: string;
  instagram?: string;
  email?: string;
  contactNo?: string;
  categories: string[];
  capabilities: string[];
  engagements: string[];
  notes?: string;
  ratesNote?: string;
  engagedBefore: boolean;
  craftRating?: number;         // 1..5
  personalityRating?: number;   // 1..5
  addedAt?: string;             // ISO date, set on first save
  updatedAt?: string;           // ISO date, refreshed on every save
}

// Round F: the verse category and capability choice lists moved to the
// admin-extendable option lists in api/settings.ts ('verse_categories',
// 'verse_capabilities', 'verse_engagements').

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
  { collaboratorId: 'col-farhan', email: 'farhan@studio.example', categories: ['Design'], capabilities: ['Motion Graphics', 'Animation', 'Graphic Design'], engagements: ['Freelance'], engagedBefore: true, craftRating: 5, personalityRating: 4, notes: 'Also covers lighting documentation for spatial builds.' },
  { collaboratorId: 'col-nadia', email: 'nadia@curation.example', categories: ['Creative Strategy'], capabilities: ['Strategy', 'Editorial', 'Event / Experiences'], engagements: ['Freelance'], engagedBefore: true, craftRating: 4, personalityRating: 5 },
  { collaboratorId: 'col-teckheng', categories: ['Spatial Collaborators'], capabilities: ['Installation Design', 'Spatial/Experience Design'], engagements: ['Freelance'], engagedBefore: true, craftRating: 4, personalityRating: 4, notes: 'Workshop in Sungei Kadut; installs with own crew.' },
  { collaboratorId: 'col-aiko', website: 'https://studioarc.example', categories: ['Producer'], capabilities: ['Event / Experiences', 'Creative Direction'], engagements: ['Freelance'], engagedBefore: true, craftRating: 5, personalityRating: 5 },
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
    paymentTranches: [] as PaymentTranche[],
    leads: [] as Lead[],
    verseProfiles: (fresh ? [] : SEED_VERSE_PROFILES.map((v) => ({
      ...v,
      categories: [...v.categories],
      capabilities: [...v.capabilities],
      engagements: [...v.engagements],
    }))) as VerseProfile[],
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


/** Payment tranches for the demo dataset (round G): a simple, believable
 *  schedule per project so the cashflow view has something honest to show.
 *  Past dates settle as paid, near ones as invoiced, future ones as expected. */
function seedDemoTranches(): void {
  const today = todayStr();
  const shift = (date: string, days: number) =>
    new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

  for (const project of db.projects) {
    if (['cancelled'].includes(project.status)) continue;
    const fee = project.contractValueMinor ?? 0;
    if (fee <= 0) continue;
    const splits: { label: string; frac: number; frac_at: number }[] = [
      { label: 'On signing', frac: 0.3, frac_at: 0 },
      { label: 'At the midpoint', frac: 0.4, frac_at: 0.5 },
      { label: 'On completion', frac: 0.3, frac_at: 1 },
    ];
    let allocated = 0;
    splits.forEach((split, i) => {
      const amount = i === splits.length - 1
        ? fee - allocated
        : Math.round(fee * split.frac);
      allocated += amount;
      const start = Date.parse(`${project.startDate}T00:00:00Z`);
      const end = Date.parse(`${project.targetEndDate}T00:00:00Z`);
      const expectedDate = new Date(start + (end - start) * split.frac_at)
        .toISOString().slice(0, 10);
      // Invoices go out on the milestone; money tends to follow ~30 days later.
      const paidDate = shift(expectedDate, 32);
      const isPaid = paidDate < today;
      const isInvoiced = !isPaid && expectedDate <= today;
      const isLate = !isPaid && !isInvoiced ? false : false;
      db.paymentTranches.push({
        id: `tr-${project.id}-${i + 1}`,
        projectId: project.id,
        label: split.label,
        amountMinor: amount,
        expectedDate,
        ...(isPaid ? { actualDate: paidDate, actualAmountMinor: amount } : {}),
        status: isPaid ? 'paid' : isInvoiced ? 'invoiced' : 'expected',
        updatedAt: `${today}T02:00:00Z`,
        updatedBy: 'system',
      });
      void isLate;
    });
  }

  // Leads carry an expected schedule too, so a prospect's cashflow is visible
  // before it is won (client direction, round G).
  for (const lead of db.leads) {
    if (!lead.estFeeMinor || lead.stage === 'parked' || lead.stage === 'converted') continue;
    const start = shift(lead.nextStepDate ?? today, 30);
    [['On signing', 0.5, 0], ['On completion', 0.5, 120]].forEach(([label, frac, offset], i) => {
      db.paymentTranches.push({
        id: `tr-${lead.id}-${i + 1}`,
        leadId: lead.id,
        label: label as string,
        amountMinor: Math.round(lead.estFeeMinor! * (frac as number)),
        expectedDate: shift(start, offset as number),
        status: 'expected',
        updatedAt: `${today}T02:00:00Z`,
        updatedBy: 'system',
      });
    });
  }
}

// Seed the trail with the dataset's notable events (demo mode only).
if (!isFreshMode()) {
  seedRecentDemoEntries();
  seedDemoLeads();
  seedDemoTranches();
  audit({ actorUserId: 'usr-daniel', entityType: 'EmploymentAgreement', entityId: 'ea-mei-2', action: 'create', reason: 'Annual review adjustment', occurredAt: '2025-12-15T03:00:00Z' });
  audit({ actorUserId: 'usr-ryan', entityType: 'EmploymentAgreement', entityId: 'ea-mei-2', action: 'approve', reason: 'Second super admin confirmation', occurredAt: '2025-12-15T05:00:00Z' });
  audit({ actorUserId: 'usr-ryan', entityType: 'Variation', entityId: 'var-f-1', action: 'approve', occurredAt: '2026-04-14T06:00:00Z' });
  for (const p of fixtureDb.financialPeriods) {
    if (p.status === 'locked') {
      audit({ actorUserId: 'usr-daniel', entityType: 'FinancialPeriod', entityId: p.yearMonth, action: 'lock', occurredAt: `${p.yearMonth}-28T09:00:00Z` });
    }
  }
}
