# MASTER BUILD PROMPT
# OuterEdit Agency Intelligence Console
### Complete engineering brief, empty repository to production platform

**Version 1.0 · 29 July 2026 · Author: product & systems architecture, for OuterEdit Pte Ltd**

---

## 0 · How to use this document

Paste this document as your first message to Claude Code in an empty repository. It is self-sufficient: every rule, formula, type, permission and acceptance test needed to build the platform is contained here. If the folder `docs/spec/` exists (Phases 1 to 9 of the product specification), treat those files as the authoritative depth reference and this document as the operative instruction. Where they ever disagree, this document wins and you must log the discrepancy in `docs/DEVIATIONS.md`.

**Working agreement, applies to every stage:**

1. Work in **plan mode first** for each stage. Present the plan. Wait for approval. Then implement.
2. **One stage per branch, one commit per coherent step.** Never begin a stage before its predecessor's acceptance tests are green.
3. When something in this brief is ambiguous or appears wrong, **stop and ask**. Do not invent business logic. Financial and permission logic invented on the fly is the single most damaging failure mode available to you.
4. Maintain `docs/DEVIATIONS.md` (anything built differently from this brief, with reasoning) and `docs/DECISIONS.md` (architectural choices you made that were left open). Empty DEVIATIONS is the goal.
5. Never weaken a rule in section 2 to make code easier. If a rule makes implementation hard, the rule still wins, and you flag the difficulty.

---

## 1 · Mission and product identity

You are building an internal operating console for **OuterEdit**, a Singapore creative direction studio (roughly 6 to 15 internal people, plus an external collaborator network called **OE Verse**). The studio delivers brand strategy, brand identity, creative direction, campaigns, spatial activation, installation and exhibition design, experience design, placemaking, community engagement, cultural programming, festival development, and event design. Projects run from two weeks to fifteen months.

The console connects, in one continuous structure: project planning, quotation and financial modelling, whole-day time allocation, resource cost tracking, project profitability, company profitability, capacity planning, operational reporting, historical project intelligence and pricing intelligence.

**Two ideas carry the entire product.**

**Idea one: one language from promise to proof.** The structure created when estimating a project (phases, roles, hours) is the identical structure that time is recorded against, that costs land on, that forecasts run over, and that the retrospective compares. There is never one vocabulary for quotations and another for timesheets. Any design that forks these structures is wrong.

**Idea two: two ledgers, never blurred.** *Project profitability* is revenue minus costs directly attributable to that project. *Company profitability* is whether the aggregate gross profit from projects covers non-project payroll and company overheads. Both are always visible to those authorised, both always reconcile to each other, and each dollar of salary is counted exactly once across them.

**What this product is not.** Not a timesheet in spirit. Not an employee-monitoring system, ever. Not a task manager (Monday.com, Figma and the studio's creative process stay where they are). Not the statutory accounting ledger (Xero remains authoritative). Not payroll or HR. Not client-facing.

**Tone.** The console should feel like a thoughtful studio manager who happens to be brilliant with numbers: warm, calm, precise, occasionally playful, never performing urgency, never shaming. It tells the truth about money plainly and the truth about people kindly.

---

## 2 · The ten non-negotiable rules

Violating any of these is a failed build regardless of how well the rest works.

**R1 · Single source of financial truth.** Every number displayed anywhere originates in `packages/finance`. No component, no resolver, no report, no fixture computes a cost, margin, rate or total independently. Each exported function carries a comment citing its section number in this document.

**R2 · The worked examples are law.** Section 6.9 contains five projects and one company month with exact expected outputs. These become automated tests. They must pass before any UI is built, and they must stay passing forever. If your implementation disagrees with a published figure, your implementation is wrong. Never edit an expected value to make a test pass.

**R3 · The single-count invariant.** For every person and every financial period:

```
EmploymentCost = ProjectLabourCost + NonProjectPayrollCost + UnallocatedPayrollCost ± ReconciliationAdjustment
```

Implement this as a runtime tie-out check, expose its status in the UI, and refuse to lock a financial period while it is red.

**R4 · Baseline freeze.** When a quotation is accepted, the estimate is snapshotted immutably. All later change flows through explicit, approved Variation records. Estimate-versus-actual always compares against baseline plus approved variations. There is no code path that edits an accepted baseline.

**R5 · Time sovereignty.** Only the person who recorded a time entry may edit it. Leads and administrators may comment, query and flag, never modify. There is no admin override in the API. Post-lock corrections create dated adjustment entries in the open period, never rewrites of history.

**R6 · Centralised, field-level permissions.** One `can()` policy engine implementing section 7. Components and resolvers never test roles directly. Masking happens server-side at the serialiser: a value the user may not see is never sent to the client in any form, including inside aggregates that would reveal it by subtraction.

**R7 · The non-surveillance boundary.** No screenshots, keystroke logging, idle detection, browser monitoring, leaderboards, per-person productivity scores, or any surface that compares individuals. Personal insights and contextual time categories (meals, commuting) are visible only to the person they belong to, with no override for any role. The data model must make these features awkward to add, not merely absent.

**R8 · Costing basis.** All recorded time is costed at the person's **cost per paid hour** on the entry's date. Loaded rates (per available hour, per productive hour) appear only in pricing and overhead analysis, never in costing. Contextual activities are never costed. This is what makes paid leave visible as a company cost without double-loading project hours.

**R9 · Mark-up is a pricing event.** External costs are recorded at what OuterEdit actually pays. The 20% default mark-up exists only in the quotation ladder. Never inflate a recorded cost.

**R10 · Voice discipline.** Use the microcopy in section 9.4 verbatim where a moment matches. Write new copy in the same register: no exclamation marks in warnings, no "you failed" or "you forgot", situations described rather than people blamed, no em dashes anywhere in user-facing text (use commas, full stops, parentheses or colons). Red is reserved for money and deadline realities, never applied to a person's behaviour.

---

## 3 · Architecture and stack

Build a real application from the start, with a mock transport that is later swapped for a real backend. Do not build a throwaway prototype.

**Frontend:** React 18, TypeScript (strict), Vite, TailwindCSS, Radix UI primitives, Recharts, Zustand (session, filters, date range), TanStack Query (server state), React Router, react-hook-form with Zod.

**Backend (from Stage B1):** Node 20, TypeScript, Fastify with tRPC (end-to-end type safety, no schema duplication), Prisma over **PostgreSQL 16**, Zod validation at every boundary.

**Shared packages:** the finance engine and the permission engine live in `packages/` and are imported by both client and server. They are pure TypeScript with zero framework dependencies and zero I/O. This is what allows the same tested logic to compute a preview in the browser and the authoritative figure on the server.

**Auth:** email plus password with argon2id and TOTP-capable sessions in B2; pluggable to an OIDC provider (WorkOS or Auth0) later. Session cookies, httpOnly, SameSite strict.

**Testing:** Vitest (unit and integration), Playwright (end-to-end journeys), plus a dedicated financial acceptance suite.

**Hosting target:** managed platform in `ap-southeast-1` (Singapore) for data residency. Fly.io or Render for the app, Neon or RDS for Postgres.

**Money:** all monetary values stored as **integer minor units** (cents) with an explicit currency code. Never floating point for money. All rounding is half-up at the final display or storage boundary only, with intermediate calculation at full precision. Percentages stored as decimals (0.55, not 55).

**Dates:** all timestamps UTC in storage; all business dates (`YYYY-MM-DD`) are calendar dates without timezone, evaluated in `Asia/Singapore`. A time entry belongs to a calendar date, not an instant.

---

## 4 · Repository layout

```
oe-console/
├─ CLAUDE.md                       # standing rules, read every session
├─ docs/
│  ├─ spec/                        # Phase 1-9 product specification (reference)
│  ├─ DEVIATIONS.md · DECISIONS.md · RUNBOOK.md
├─ packages/
│  ├─ finance/                     # THE financial engine (pure, tested, framework-free)
│  │  ├─ src/costRates.ts          # §6.2  rate derivation
│  │  ├─ src/allocation.ts         # §6.3  the single-count identity, buckets, tie-out
│  │  ├─ src/externalCosts.ts      # §6.4  commercial models, committed vs accrued
│  │  ├─ src/projectMetrics.ts     # §6.5  formulas F1-F18
│  │  ├─ src/overhead.ts           # §6.6
│  │  ├─ src/company.ts            # §6.7
│  │  ├─ src/revenue.ts            # §6.8  recognition
│  │  ├─ src/pricing.ts            # §6.10 the price ladder and scenarios
│  │  ├─ src/money.ts              # minor-unit arithmetic, rounding, currency
│  │  └─ test/                     # §6.9 worked examples + property tests
│  ├─ policy/                      # THE permission engine (pure, tested)
│  │  ├─ src/can.ts · roles.ts · sensitivity.ts · masking.ts
│  └─ domain/                      # shared types, enums, Zod schemas (§5)
├─ apps/
│  ├─ web/                         # React client
│  │  ├─ src/api/                  # transport: mock in Stage A, tRPC client in Stage B
│  │  ├─ src/components/           # design system (§9)
│  │  ├─ src/features/             # personal | projects | people | company | reports | admin
│  │  ├─ src/stores/ · src/routes/
│  └─ server/                      # Fastify + tRPC + Prisma (Stage B onward)
│     ├─ src/routers/ · src/services/ · src/audit/ · prisma/schema.prisma
└─ fixtures/                       # the seed dataset (§10), used by mock API, tests and DB seed
```

The `fixtures/` dataset is shared by the mock API, the test suite and the database seeder. One dataset, three consumers, so a demo, a test and a fresh database always agree.

---

## 5 · Domain model

Conventions: every entity has `id` (cuid2), `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. Entities marked **[A]** write to the audit trail on every mutation. Entities marked **[D]** are dated records where history is never overwritten.

### 5.1 Identity and people

```ts
type RoleKey = 'founder'|'creative_director'|'account_director'|'account_manager'|'designer'|'associate_creative_producer'|'strategist'|'producer';

type SystemRole = 'team_member'|'project_lead'|'people_manager'|'finance_admin'|'ops_admin'|'leadership'|'super_admin'|'external_contributor'|'auditor';

interface User {                       // [A]
  id; personId?; collaboratorId?; email; status:'invited'|'active'|'suspended';
  roleGrants: RoleGrant[];             // additive; see §7
  notificationPrefs: NotificationPrefs;
}

interface RoleGrant {                  // [A]
  role: SystemRole;
  scope: { type:'global'|'project'|'team'|'reports'; ids?: string[] };
  effectiveFrom: Date; effectiveTo?: Date;   // temporary grants expire automatically
}

interface Person {
  id; name; title; roleKey: RoleKey; team?: string; managerId?: string;
  seniority; employmentStatus:'active'|'departed'; startDate; endDate?;
  location:'SG'|string;                // drives the public-holiday calendar
  skills: string[]; photoUrl?;
}

interface WorkSchedule {               // [D]
  personId; effectiveFrom; effectiveTo?;
  daysPerWeek: number; hoursPerDay: number; weeklyHours: number;
}

interface EmploymentAgreement {        // [A][D]  SENSITIVITY S1
  personId; effectiveFrom; effectiveTo?;
  employmentType:'full_time'|'part_time'|'contract';
  monthlySalaryMinor: number; currency:'SGD';
  employerCpfRate: number;             // e.g. 0.17
  cpfMonthlyCeilingMinor: number;      // ordinary-wage ceiling; configurable, dated
  cpfAppliesToBonus: boolean;          // default true
  contractualBonusMonths: number;      // AWS / 13th month; excludes discretionary
  fixedAllowancesMonthlyMinor: number;
  benefitsAnnualMinor: number;         // insurance and similar
  annualLeaveDays: number; publicHolidayDays: number; expectedMedicalDays: number;
  productiveFactor: number;            // default 0.80
}

interface CostRate {                   // [A][D]  SENSITIVITY S1  (derived, never hand-typed)
  personId; effectiveFrom; effectiveTo?;
  paidHourRateMinor; availableHourRateMinor; productiveHourRateMinor;
  derivation: CostRateDerivation;      // full input snapshot, for provenance
  methodVersion: string;
}

interface SellRate {                   // [D]
  scope:{ type:'role'; roleKey: RoleKey } | { type:'person'; personId: string };
  effectiveFrom; effectiveTo?; rateMinor; currency;
}
```

### 5.2 Clients, projects, structure

```ts
type ProjectStatus = 'opportunity'|'estimating'|'quoted'|'negotiation'|'won'|'planning'|'active'|'on_hold'|'completed'|'financially_closed'|'archived'|'lost';

type ServiceLine = 'brand_strategy'|'brand_identity'|'creative_direction'|'campaign'|'spatial_activation'|'installation'|'exhibition'|'experience_design'|'placemaking'|'community_engagement'|'cultural_programming'|'festival'|'event_activation';

interface Client { id; name; clientGroupId?; country; industry?; paymentTermsDays; riskNotes?; }

interface Project {                    // [A] on financial fields
  id; code; name; clientId; projectType; serviceLine; status: ProjectStatus;
  leadId; teamIds: string[]; country; currency; probability?;
  contractValueMinor; startDate; targetEndDate; actualEndDate?;
  baseline?: EstimateBaseline;         // frozen at acceptance — see R4
  isProBono: boolean; discountAppliedPct?: number;
  riskFlags: RiskFlag[]; retrospectiveId?;
}

interface EstimateBaseline {           // immutable once written
  frozenAt; frozenByUserId; quotationId;
  phases: { phaseId; name; estHoursByRole: Record<RoleKey, number>;
            estInternalCostMinor; estExternalCostMinor; estExpenseMinor }[];
  contingencyPct; targetGrossMarginPct; overheadRecoveryMinor;
  totals: { estHours; estInternalCostMinor; estExternalCostMinor;
            estExpenseMinor; estDirectCostMinor; estGrossProfitMinor };
}

interface ProjectPhase {
  id; projectId; name; order; status;
  estHoursByRole: Record<RoleKey, number>;
  plannedStart; plannedEnd; actualStart?; actualEnd?;
  benchmarkRef?;                       // links to comparable historical phases
}

interface Deliverable { id; phaseId; name; status; estHours?; acceptedAt?; }

interface Variation {                  // [A]
  id; projectId; description; feeDeltaMinor; hoursDelta?;
  affectedPhaseIds: string[]; status:'draft'|'submitted'|'approved'|'rejected';
  approvedByUserId?; approvedAt?; raisedFromAlertId?;
}

interface Milestone { id; projectId; phaseId?; name; dueDate; status; isBillingTrigger; }

interface ProjectTemplate {            // master; copied, never linked
  id; name; projectType; serviceLine;
  phases: { name; order; typicalHoursByRole: Record<RoleKey,number>; deliverables: string[] }[];
}
```

Seed four templates exactly as specified: **Branding** (Discovery, Research, Strategy, Positioning, Concept development, Identity design, Applications, Guidelines, Implementation, Project management), **Spatial activation** (Discovery, Site study, Experience strategy, Concept development, Spatial design, Technical development, Fabrication coordination, Installation, On-site support, Documentation, Project management), **Festival or cultural programme** (Research, Strategic framing, Curatorial concept, Programme development, Partnership development, Stakeholder engagement, Identity and communications, Production planning, Delivery, Evaluation, Project management), **Creative strategy** (Discovery, Research, Audience analysis, Strategic development, Concept creation, Recommendations, Presentation, Refinement, Project management).

### 5.3 Time

```ts
type ActivityScope = 'project'|'company'|'personal';

interface Activity {                   // [A] on flag changes: they move money
  id; name; scope: ActivityScope; active: boolean;
  paid: boolean;                       // does the studio pay for this time
  costBearing: boolean;                // does it create a cost line
  productive: boolean;                 // productive vs contextual
  billable: boolean;
  countsTowardUtilisation: boolean;
  includedInProjectCosting: boolean;
}

interface TimeEntry {                  // [A] on edits after the entry date
  id; personId; date: CalendarDate; minutes: number;
  projectId?; phaseId?; deliverableId?; activityId;
  notes?; source:'manual'|'timer'|'copied'|'quick_parse';
  status:'draft'|'confirmed';
  lockedCostMinor?;                    // snapshotted when the period locks
  adjustsEntryId?;                     // set when this is a post-lock correction
}

interface DayCompletion { personId; date; scheduledMinutes; mappedMinutes; completedAt?; }

interface CapacityAllocation { id; personId; projectId; phaseId?; isoWeek; plannedHours; tentative; }
```

Seed activity categories with these flags (this table is the money model in miniature):

| Activity | scope | paid | costBearing | productive | billable | utilisation | projectCosted |
|---|---|---|---|---|---|---|---|
| Design, Strategy, Concept, Production, Client meeting, Revisions, Site visit | project | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Project management | project | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Business development, Marketing | company | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Company administration, Internal meeting | company | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Training, Internal research, Internal initiative, Culture and team | company | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Annual leave, Medical leave, Public holiday, Time in lieu taken | company | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Unpaid leave | company | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Break or meal, Commuting | personal | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Work-related travel | project | ✓ | ✓ | ✓ | configurable | ✓ | ✓ |

### 5.4 Commercial and financial

```ts
interface Quotation {                  // [A]; accepted versions immutable
  id; projectId; version; issuedDate; status:'draft'|'sent'|'accepted'|'superseded'|'declined';
  lineItems: QuotationLineItem[];
  subtotalMinor; gstRate; gstMinor; totalMinor;
  inclusions: string[]; exclusions: string[]; clauseIds: string[];
  periodOfEngagement; validUntil;
  pricing: PricingSnapshot;            // the full ladder as computed (§6.10)
}

interface QuotationLineItem { id; quotationId; order; description; linkedPhaseIds: string[];
                              estimatedDuration?; amountMinor; isOptional; }

interface Clause { id; key; title; body; category:'amendments'|'working_files'|'scope'|'look_and_feel'|'terms'; }
```

Seed the clause library from OuterEdit's existing quotation practice, including: three rounds of amendments included at no extra charge where the request does not substantially alter scope, nature or purpose and where final approval has not been given; release of editable working files at 20% of cost; look-and-feel conceptual-stage scope limits; sample-application clarification.

```ts
type ExternalModel = 'hourly'|'daily'|'monthly_retainer'|'fixed_project'|'fixed_phase'|'fixed_deliverable'|'milestone';

interface Collaborator { id; name; discipline; location; country; defaultCurrency; notes?; }

interface ExternalAgreement {          // [A]  SENSITIVITY S4
  id; collaboratorId; projectIds: string[]; model: ExternalModel;
  rateMinor?; feeMinor?; currency; sgdRateAtCommitment; committedAt?;
  attribution: { type:'single_project' } | { type:'percentage'; splits:{projectId;pct}[] }
             | { type:'recorded_time' } | { type:'phase'; phaseId } ;
  accrualPolicy:'milestone'|'straight_line'|'on_completion';
  milestones?: { name; amountMinor; phaseId?; status; acceptedAt? }[];
  expensesReimbursable: boolean; startDate; endDate?; status; documents: string[];
}

interface DirectExpense {              // [A]
  id; projectId; phaseId?; category:'fabrication'|'production'|'travel'|'software'|'licence'|'other';
  description; supplierName?; collaboratorId?; amountMinor; currency; sgdRate; date;
  state:'planned'|'committed'|'actual'; receiptUrl?; approvedByUserId?;
}

interface RevenueItem {                // [A]
  id; projectId; type:'fee'|'milestone'|'retainer_period'|'variation'|'deposit';
  amountMinor; currency; plannedDate;
  recognitionTrigger:'milestone_accepted'|'phase_complete'|'straight_line'|'as_delivered';
  recognisedAt?; invoiceId?; weight?;
}

interface Invoice { id; projectId; number; issuedDate; amountMinor; gstMinor; currency;
                    status:'draft'|'sent'|'paid'|'overdue'|'written_off'; paidDate?; }

interface CompanyOverhead {            // [A]  SENSITIVITY S2
  id; category:'rental'|'accounting'|'insurance'|'software'|'legal'|'banking'|'marketing'
      |'business_development'|'equipment'|'general_travel'|'training'|'company_admin'|'fx'|'other';
  description; amountMinor; currency; recurrence:'monthly'|'annual'|'one_off';
  effectiveFrom; effectiveTo?; department?; forecastMinor?; paymentStatus;
}
// Guard: this table may never contain payroll. Reject on write with a clear message.

interface FinancialPeriod {            // [A]
  yearMonth: string;                   // 'YYYY-MM'
  status:'open'|'soft_closed'|'locked';
  tieOut:'green'|'amber'|'red'; tieOutDetail: TieOutReport;
  lockedByUserId?; lockedAt?; reopenReason?;
}

interface AuditRecord {                // append-only; no update or delete path exists
  id; actorUserId; occurredAt; entityType; entityId; field?;
  oldValue?: Json; newValue?: Json; reason?; ipHash?; sessionId?;
  action:'create'|'update'|'delete'|'approve'|'export'|'lock'|'reopen'|'view_sensitive';
}
```

### 5.5 Intelligence

```ts
interface Retrospective { id; projectId; whatOverran; whyNotes; clientFactors;
                          pricingLesson; wouldQuoteAgainAtMinor?; authorUserId; completedAt; }

interface Benchmark {                  // emitted at financial closure
  id; projectId; projectType; serviceLine; feeBand; durationBand;
  phaseActuals: { name; estHours; actHours; variancePct }[];
  roleMix: Record<RoleKey, number>; revisionCount; variationCount;
  quotedMarginPct; achievedMarginPct; profitPerInternalHourMinor;
  tags: ('pro_bono'|'discounted'|'cancelled'|'historical_import')[];
}

interface Alert { id; type: AlertType; severity:'info'|'watch'|'attention';
                  subjectType; subjectId; firedAt; state:'open'|'acknowledged'|'resolved';
                  evidence: Json; suggestedAction?; }
```

---

## 6 · The financial engine

This section is the specification for `packages/finance`. Implement it exactly. Every function is pure: inputs in, numbers out, no database access, no dates from the system clock (pass `asOf` explicitly, because reproducibility matters more than convenience).

### 6.1 Vocabulary (use these names in code; no synonyms anywhere)

Contract value · approved variation · total approved fee · contracted revenue · invoiced revenue · recognised revenue · collected cash · direct internal labour cost · direct external cost · direct expense · total direct project cost · gross profit · gross margin · third-party margin (legacy display lens) · contribution after overhead recovery · profit per internal labour hour · effective realised hourly revenue · cost per paid hour · cost per available hour · cost per productive hour · sell rate · non-project payroll cost · unallocated payroll cost · company operating overhead · operating profit · break-even revenue · budget consumed · hours consumed · forecast cost at completion · estimate-at-completion variance · unbilled effort · write-off · utilisation · committed cost.

### 6.2 Cost-rate derivation

```
annualEmploymentCost =
    12 × monthlySalary
  + contractualBonusMonths × monthlySalary
  + employerCpf                          // = cpfRate × min(monthlySalary, cpfMonthlyCeiling) × 12
                                         //   + (cpfAppliesToBonus ? cpfRate × bonusAmount : 0)
  + 12 × fixedAllowancesMonthly
  + benefitsAnnual

paidHours      = weeklyHours × 52
availableHours = paidHours − (annualLeaveDays + publicHolidayDays + expectedMedicalDays) × hoursPerDay
productiveHours= availableHours × productiveFactor

costPerPaidHour       = annualEmploymentCost ÷ paidHours          // COSTING basis (R8)
costPerAvailableHour  = annualEmploymentCost ÷ availableHours     // PRICING floor basis
costPerProductiveHour = annualEmploymentCost ÷ productiveHours    // OVERHEAD-RECOVERY basis
```

Discretionary bonuses are excluded (they would retroactively distort project costs; they land in company costs when paid). Training spend is overhead, not employment cost.

**Canonical unit test (must pass exactly):** monthly salary SGD 5,000; CPF 17% with a non-binding ceiling and applying to bonus; contractual bonus 1 month; allowances 0; benefits 1,200 per year; 40 hours per week; 18 annual leave days, 11 public holidays, 4 expected medical days, 8-hour day, productive factor 0.80.

```
annual = 60,000 + 5,000 + 0.17 × 65,000 + 0 + 1,200 = 77,250.00
paidHours = 2,080          → costPerPaidHour       = 37.14
availableHours = 1,816     → costPerAvailableHour  = 42.54
productiveHours = 1,452.8  → costPerProductiveHour = 53.17
```

**Rate history:** a salary change creates a new dated agreement (the previous one auto-ends the day before) and a new derived rate. Prior rates are immutable. Every time entry resolves the rate effective on its own date. Mid-month changes pro-rate that month's employment cost by calendar days. On period lock, computed costs are snapshotted onto the entries.

### 6.3 Time and payroll allocation

Implement the identity from R3. Bucket assignment by activity flags:

- `scope='project'` and `includedInProjectCosting` → **project labour cost** on that project and phase.
- `scope='company'` and `paid` and `costBearing` → **non-project payroll**, sub-bucketed by activity (business development, administration, training, leave, and so on).
- `scope='personal'` or `paid=false` → **no cost anywhere**. Recorded for the individual's own reflection.
- Scheduled paid hours with no entry → **unallocated payroll**.

Edge cases, implement all of them:

- **Overtime (salaried).** Cost recorded hours at the standard rate so projects show true effort. This over-attributes against fixed payroll, so compute a period-level negative `ReconciliationAdjustment` labelled "absorbed overtime" that ties the total back to contractual payroll. Project costs tell the truth about effort; the company P&L tells the truth about cash; over-servicing stops being invisible.
- **Unpaid leave** reduces that period's employment cost pro-rata and shrinks scheduled hours so unallocated does not inflate.
- **Public holidays** auto-populate from the Singapore calendar per the person's location; editable if worked.
- **Time in lieu:** overtime may bank lieu hours (configurable 1:1); lieu taken is a paid leave category.
- **Part-time and varied schedules** flow from the dated `WorkSchedule`; nothing in the identity assumes 40 hours.
- **Post-lock corrections** create adjustment entries in the current open period referencing the original. Both are visible; neither is rewritten.

`computeTieOut(personId, period)` returns `{ expected, allocated, difference, status }` where status is green within 0.5%, amber within 2%, red beyond.

### 6.4 External cost logic

Three states: **planned** (estimate), **committed** (agreement signed, owed regardless of invoicing), **actual** (invoiced or paid). Two questions per cost: which project and phase, and which period.

| Model | Measurement | Project/phase attribution | Period attribution |
|---|---|---|---|
| Hourly | hours × rate | phase worked | month worked |
| Daily | days × rate | as assigned | month worked |
| Monthly retainer | fixed monthly fee | single project, fixed percentage split, or recorded-time share | each retainer month |
| Fixed project fee | total fee, committed at signing | whole project, optional phase split | milestone-else-straight-line |
| Fixed phase fee | fee per phase | that phase | straight-line across phase, or on completion |
| Fixed deliverable fee | fee per deliverable | the deliverable's phase | on acceptance |
| Milestone | fee per milestone | linked phases | on milestone acceptance |
| Reimbursable expenses | actuals with receipts | phase incurred | month incurred |

**Critical distinction to implement:** for *forecast at completion*, a committed fixed fee counts in full from the day it is signed. For *period reporting*, it accrues per the accrual policy. A freelancer finishing early changes no cost; remaining accrual simply recognises on completion.

**Currency:** capture the SGD rate at commitment and again at invoice. The difference posts to a company FX overhead line. Project views may show project currency; all company views are SGD.

### 6.5 Project formulas

`B` denotes the frozen baseline plus approved variations.

```
F1   estInternalCost      = Σ (estHours[role][phase] × costPerPaidHour(role, estimateDate))
F2   actInternalCost      = Σ (entry.minutes/60 × costPerPaidHour(entry.person, entry.date))
                            over entries where activity.includedInProjectCosting
F3a  estExternalCost      = Σ planned external lines
F3b  actExternalCost      = Σ committed-or-actual per §6.4
F4a  estDirectCost        = F1 + F3a + estExpenses + contingency
F4b  actDirectCost        = F2 + F3b + actExpenses
F5a  estGrossProfit       = contractValue(B) − F4a
F5b  actGrossProfit       = recognisedRevenue − F4b
F6   grossMargin          = grossProfit ÷ revenue
F7   effectiveHourlyRev   = recognisedRevenue ÷ actInternalHours
F8   profitPerInternalHr  = actGrossProfit ÷ actInternalHours
F9   budgetConsumedPct    = F4b ÷ F4a(B)
F10  hoursConsumedPct     = actInternalHours ÷ estInternalHours(B)      // overall, per phase, per role
F11  ETC                  = Σ(remainingEstHours × burnFactor × rate)
                            + remainingCommittedExternal + remainingPlannedExpenses
     burnFactor           = (actHours ÷ progressPct) ÷ (estHours ÷ 1.0), clamped [0.5, 3.0]
                            lead may override per phase with a recorded reason
F12  FCAC                 = F4b + F11
F13a forecastGrossProfit  = totalApprovedFee − F12
F13b forecastGrossMargin  = F13a ÷ totalApprovedFee
F14  eacVariance          = F12 − F4a(B)
F15  originalVsVariations = contractValue ∥ Σ approvedVariations       // always displayed side by side
F16  unbilledEffort       = (T&M: unbilled hours × sellRate)
                          + (fixed fee: out-of-scope hours with no variation × sellRate)
F17  writeOff             = uncollectable recognised revenue + formally abandoned unbilled effort
F18  contributionAfterOH  = actGrossProfit − (overheadPerProductiveHour × actInternalHours)
                            // ANALYTICAL LENS ONLY; must render with an explicit label
```

Also expose the legacy display lens so existing intuition transfers:
`thirdPartyMargin = (revenue − externalCosts − contingency) ÷ revenue` (OuterEdit's historic "Margin 1", target band 60 to 70%), alongside gross margin (historic "True Margin", target band 50 to 60%).

### 6.6 Overhead

```
monthlyOverhead           = Σ overhead register for month (annual ÷ 12, one-off in its month)
overheadPerAvailableHour  = monthlyOverhead ÷ Σ team available hours
overheadPerProductiveHour = monthlyOverhead ÷ Σ team productive hours     // default pricing lens
overheadPctOfDirectLabour = monthlyOverhead ÷ Σ project labour cost
overheadPctOfRevenue      = monthlyOverhead ÷ recognised revenue
monthlyRecoveryTarget     = monthlyOverhead + monthlyNonProjectPayroll
```

Every UI surface showing an overhead-allocated figure carries the label "analytical view". Allocated overhead is never aggregated into company operating profit.

### 6.7 Company

```
totalProjectGrossProfit(P)  = Σ actGrossProfit across projects, recognised basis
nonProjectPayroll(P)        = §6.3 bucket 2
unallocatedPayroll(P)       = §6.3 bucket 3
overhead(P)                 = §6.6
operatingProfit(P)          = totalProjectGrossProfit + otherIncome
                              − nonProjectPayroll − unallocatedPayroll − overhead
                              ± reconciliationAdjustments
operatingMargin             = operatingProfit ÷ recognisedRevenue
overheadCoverage            = totalProjectGrossProfit ÷ (nonProjectPayroll + unallocatedPayroll + overhead)
breakEvenRevenue            = (nonProjectPayroll + unallocatedPayroll + overhead) ÷ averageGrossMargin
forecastYearEnd             = ytdOperatingProfit + Σ forecast months (weighted pipeline − planned costs)
cashRunway                  = cashBalance ÷ average monthly net outflow      // only when cash data exists
```

Salaries enter this model through exactly one door: the allocation identity. The project share sits inside gross profit; the remainder appears as non-project and unallocated payroll. The overhead register is structurally forbidden from containing payroll. Assert this monthly with `runTieOut(period)`.

### 6.8 Revenue recognition

Four lenses, each with an exclusive purpose: **contracted** (pipeline and pricing ceiling), **recognised** (all profitability reporting), **invoiced** (accounting alignment and receivables), **collected** (cash and runway).

Release 1 recognition rules: fixed fee recognises on milestone or phase completion marked by finance, weighted by quotation line-item values; retainers straight-line monthly; time-and-materials as delivered; deposits are a liability until earned; variations recognise like their parent structure. Release 2 upgrades fixed-fee to effort-based percentage of completion (hours consumed ÷ forecast hours), which is more honest mid-phase. Build the recognition strategy behind an interface so this upgrade is a new strategy class, not a rewrite.

### 6.9 Acceptance fixtures (these become `packages/finance/test/workedExamples.test.ts`)

Shared rate card. **Cost per hour:** Founder 127, Creative Director 130, Account Director 100, Account Manager 60, Designer 50, Associate Creative Producer 50. **Sell per hour:** 320, 235, 200, 120, 110, 110.

**A · Two-month branding project.** Fee 38,000. No external. Hours: CD 60, Designer 180, ACP 40, Founder 10 (290 total).
Expect: internal cost **20,070**, gross profit **17,930**, gross margin **47.2%**, profit per internal hour **61.83**, effective hourly revenue **131.03**.

**B · Six-month spatial activation.** Fee 180,000. External: fabricator fixed project fee 65,000 (milestone accrual), lighting designer fixed phase fee 8,000, travel and materials 7,000 (external total 80,000). Hours: Founder 40, CD 160, Designer 320, ACP 260 (780 total).
Expect: internal cost **54,880**, direct cost **134,880**, gross profit **45,120**, margin **25.1%**, profit per internal hour **57.85**.

**C · Twelve-month festival development.** Fee 420,000. External: curator retainer 4,000 × 12 = 48,000, production partner milestones 120,000, comms designer fixed 25,000, expenses 30,000 (223,000 total). Hours: Founder 120, CD 400, AD 300, ACP 700, Designer 250 (1,770 total).
Expect: internal cost **144,740**, direct cost **367,740**, gross profit **52,260**, margin **12.4%**, profit per internal hour **29.53**, profit per month **4,355**.

**D · Small fast-turnaround brand sprint.** Fee 12,000. Hours: CD 20, Designer 45 (65 total).
Expect: internal cost **4,850**, gross profit **7,150**, margin **59.6%**, profit per internal hour **110.00**.

**E · High-value project that becomes loss-making.** Fee 250,000 (after a 15% discount to win).
Baseline at approval: internal 900 hours costing 75,620, external committed 95,000, expenses 18,000 → estimated direct cost **188,620**, estimated gross profit **61,380** (24.6%).
Actual: seven revision rounds against three included, five-month extension, no variation raised. Hours: Founder 100, CD 450, AD 200, Designer 500, ACP 400 (1,650 total); expenses crept to 25,000.
Expect: actual internal cost **136,200**, actual direct cost **256,200**, gross profit **−6,200**, margin **−2.5%**, profit per internal hour **−3.76**, and the legacy third-party margin lens showing **52%**.
This last pair is the most important assertion in the suite: the legacy lens reads comfortable while the project is losing money. Write the test with a comment saying so.

**F · Company month tie-out.** Project labour costed into projects 38,000; non-project payroll 21,000; unallocated 2,300; total payroll per agreements **61,300** (must tie exactly). Overheads: rent 6,500, software 1,800, insurance 400, accounting 800, marketing 1,200, miscellaneous 1,300 = **12,000**. Recognised revenue 96,000; project gross profit 34,500.
Expect: operating profit **−800**, overhead coverage **0.98**, tie-out status **green**.
The reading this encodes: every project made money and the studio still lost 800 dollars. That visibility gap is the reason this platform exists.

Add property-based tests alongside: allocation always ties within tolerance for random schedules and entries; no rate is ever resolved from outside its effective window; gross margin is scale-invariant; and no permission-masked field ever appears in a serialised payload.

### 6.10 Pricing ladder

```
1  effort         est hours by role × phase
2  internalCost   Σ hours × costPerPaidHour
3  loadedCheck    Σ hours × costPerAvailableHour        (displayed as the leave-carrying floor)
4  externalCost   Σ external lines at agreed or estimated fees
5  externalSell   externalCost × (1 + externalMarkUpPct)     default 0.20
6  expenses       fabrication, travel, production, licences
7  contingency    contingencyPct × (2 + 4 + 6)               default 0.10
8  overheadRec    overheadPerProductiveHour × est internal hours   (analytical layer)
9  price          recommendedPrice = totalCost(2+4+6+7+8) ÷ (1 − targetGrossMarginPct)
                  // margin applied ON PRICE, not on cost: a 50% target means price = 2 × cost
```

Three floors, always displayed together:

```
negotiationFloor = direct costs only (2 + 4 + 6 + 7)     below this the project destroys cash
minimumSafePrice = negotiationFloor + overheadRecovery   below this it does not pay its share of the studio
recommendedPrice = step 9
```

Sensitivity levers, each rendered as a live delta on price, margin and profit per hour: **discount** (absorbed entirely by margin; hard confirmation required when it breaches minimum safe price), **additional revisions** (default +12% of the affected phase's hours per round beyond the three included), **duration extension** (adds the project's monthly project-management run rate, scales time-based external costs, and dilutes profit per month), **delayed client decisions** (duration extension plus a context-switching factor on remaining phases), **staffing mix** (recompute steps 2 and 3 with a different role blend).

Scenarios: every estimate holds four sharing one structure, **Best**, **Expected**, **High-effort**, **Reduced-scope**. Expected is always the approval baseline. The comparison view shows fee, cost, gross profit, margin, profit per hour and profit per month for each.

---

## 7 · Permissions, privacy and governance

### 7.1 Sensitivity classes

| Class | Data | Full access | Everyone else sees |
|---|---|---|---|
| **S1** Remuneration | salaries, agreements, individual cost rates, CPF, benefits | finance_admin, super_admin | project budget consumed as aggregate money and percentage, computed from rates without disclosing them |
| **S2** Company finance | company P&L, overheads, operating profit, client pricing strategy | finance_admin, leadership, super_admin | narrative only, no figures |
| **S3** Personal time | individual entries, notes, contextual categories, leave detail, personal insights | the individual | lead: project-scoped hours only; manager: daily and weekly totals and gaps; leadership: aggregates. **Contextual categories and personal insights: the individual alone, no exceptions** |
| **S4** External commercial | OE Verse rates, agreements, contracts | finance_admin, ops_admin, leadership | scope, deliverables and status; rate visibility per agreement, default hidden |

**Aggregation floor:** any aggregate that would reveal an individual by subtraction must contain at least 3 people, else it renders as a range or rolls up a level. For project budget views the floor is 2 contributors, with a percentage-only fallback below that. This matters acutely at OuterEdit's size.

### 7.2 Role capabilities

**Team member:** own profile, own time (full sovereignty), own week, own insights, own expected hours, assigned projects with permitted fields. Cannot see other people's time, salaries, cost rates, company profitability, or unauthorised project financials.

**Project lead** (scoped per project): project health, estimate versus actual hours, phase consumption, team hours on their project, forecasts, variations, phase and deliverable management, project notes. Explicitly **not** salaries or individual cost rates. Budget appears as consumption, never as rates.

**People manager** (scoped to named direct reports): reports' weekly totals, gaps, workload distribution, capacity, leave calendar. Never remuneration. Never personal notes or contextual categories.

**Finance administrator:** salaries, cost rates, sell rates, OE Verse rates and agreements, overheads, revenue, invoices, expenses, financial periods, locking, reconciliation, financial reports and exports.

**Operations administrator:** people profiles excluding remuneration, templates, activity categories, time rules, project setup, assignments.

**Leadership:** all dashboards and reports including company P&L, portfolio profitability, capacity; approves quotations and variations. Sees masked people-cost aggregates by default. Remuneration detail only with an additional finance or super-admin grant.

**Super administrator:** everything, plus permissions, financial assumptions, audit trail and period reopening. Minimum two people. Super-admin actions are audit-logged identically to everyone else's.

**External contributor** (Stage E): own assignments, own submissions, own contractual terms. Hard-walled; no internal directory, no other collaborators' data.

**Read-only auditor:** view and export on granted scopes plus the audit trail, time-boxed by grant expiry, no writes anywhere.

Roles are **additive and scoped**. One person is commonly team member plus project lead plus leadership. Holding project-lead on project X grants nothing on project Y. A person's own daily experience is identical regardless of seniority.

### 7.3 The engine

```ts
can(actor: Actor, action: Action, resource: Resource, field?: string): Decision
type Action = 'view'|'create'|'edit'|'delete'|'approve'|'export'|'configure'|'invite'|'assign'|'close'|'reopen';
type Decision = { allow: true } | { allow: false; reason: string }
              | { allow: 'masked'; as: 'aggregate'|'range'|'percentage'|'hidden' };
```

Rules: the API serialiser applies `can()` to every field before the response leaves the server, so a masked value never reaches the browser. Navigation is **subtractive**: modules a user cannot access are absent, not greyed out. Report definitions are filtered by available fields, so a forbidden report is unbuildable rather than merely blocked. Scheduled reports re-evaluate the recipient's permissions at send time.

### 7.4 Approvals (deliberately few)

**No approval on time.** Time is trusted. Leads may comment and query; nobody else may edit. This is the single strongest anti-timesheet signal in the product, and it is a rule, not a default.

Approvals that do exist: post-lock time adjustment (finance); quotation issue and acceptance (leadership); variation (leadership, and the scope-creep alert pre-drafts it); cost-rate or salary change (finance enters, second super admin confirms); external engagement (finance or operations, plus leadership above 10,000); expense above 500 (lead for relevance, finance for payment); project closure (lead declares, finance closes, retrospective required first); period lock (finance); period reopen (super admin with a mandatory reason).

### 7.5 Audit

Append-only. No update or delete path exists in code, including for super admins. Records: salary and agreement changes, cost and sell rate changes, time edits after the entry's own date and all post-lock adjustments, baseline and variation changes, permission and reporting-relationship changes, expense, revenue and invoice mutations, recognition marks, closures, locks and reopens, **exports of any S1 or S2 report**, and dispute flags with their resolutions. Reason text is mandatory for reopens, rate changes and adjustments.

### 7.6 Employee rights, implemented as features

Every person can view everything stored about them including who viewed which class of their data; correct their own time until lock and request adjustments after; comment on any of their own records; raise a dispute flag that routes to operations and super admin and cannot be dismissed silently (5 working day visible service level); export their complete personal data unaided.

Ship the privacy page at launch, in the navigation, shown during onboarding. Use this text:

> **Why we ask you to map your time.** So OuterEdit prices projects honestly, protects you from chronic over-servicing, staffs projects fairly, and builds the stability that funds salaries, bonuses and growth. Your time makes the argument that a timeline was unrealistic, so you do not have to.
>
> **Who sees what.** You see everything of yours. Your project lead sees hours recorded on their project. Your manager sees your weekly totals and gaps, never your notes. Finance sees costed totals. Nobody but you ever sees your breaks, meals, commute, or personal insights.
>
> **What it is used for.** Project costing, fair pricing, capacity planning, company financial health.
>
> **What it will never be used for.** Ranking people. Performance scores. Surveillance. There are no screenshots, no keystroke logging, no idle tracking, and no leaderboards, and the system is built so they cannot be quietly added.
>
> **Corrections.** Edit freely until a month closes. After that, corrections are recorded as dated adjustments so history stays honest.
>
> **Retention.** Time and project records are kept as long-term business records. Your personal contextual entries are yours, and you can delete them at any time.

---

## 8 · Modules and screens

Six areas, about 58 screens. Release 1 covers roughly 44.

**Personal:** sign in · home · today (time entry) · week · calendar allocation · personal activity history · insights · my projects · my capacity (R2) · profile · notification preferences · help and privacy.

**Projects:** portfolio · project overview · Plan & Quote (particulars, structure, effort, externals, price, scenarios, approval) · phases and deliverables · team and resourcing · project time · project expenses · external collaborators · revenue and invoices · project profitability (finance) · budget health (lead, masked) · forecast at completion · risks and variations · retrospective · archive.

**People and resourcing:** directory · employee profile (General, Employment†, Remuneration†, Cost rates†, Sell rates, Capacity, Skills, Assignments, History†, Access†; † finance and super admin only) · capacity planner (R2) · team view (R2) · OE Verse directory · collaborator profile · external agreement editor · external availability (R2).

**Company:** cockpit · revenue · project contribution · non-project labour · overheads · operating profit · cash view (R3) · service-line analysis (R2) · client analysis (R2) · company time allocation · historical trends (R2).

**Reports:** fixed core library (R1) · report builder (R2) · benchmarks (R3) · pricing intelligence (R4).

**Administration:** project templates · phase templates · activity categories with behaviour flags · time rules · financial settings (GST 9%, currency, financial year, CPF parameters) · overhead categories · permissions and roles · financial periods with lock and reopen · audit log · data import and export · integrations (R3).

### 8.1 The screens that carry the product

**Today (time entry).** The two-minute daily ritual, and the highest-stakes screen in the build. Primary interaction is **activity rows**: a cascading picker (project → phase → activity, limited to the person's assignments with a "find another project" escape), a duration control with 15-minute steppers, optional notes. Supporting affordances: favourites as chips, copy yesterday, copy last week, recent entries, an optional timer, keyboard-first entry for power users, and a completion ring. Offer a timeline-block view as an alternative for calendar-minded people, and a quick-parse input ("2.5 identity design sys, 30m studio meeting") that resolves into visible, editable rows rather than committing silently. Contextual rows (lunch, commute) render with a quiet "recorded for you, not counted as cost" note. An incomplete day is a gap, never an error state.

**Project overview (lead).** Three health cards: budget consumed against timeline elapsed, hours consumed against timeline elapsed, forecast margin against target. Then contract value with variations shown alongside, milestones, team, risk flags, and the two primary actions: log a variation, update forecast.

**Estimate versus actual.** Per phase and per role: estimated hours, actual hours, remaining (editable by the lead with a reason), cost consumed as a bar with a schedule-elapsed tick mark, forecast, and a benchmark note in the margin when comparable history exists.

**Plan & Quote.** A seven-step flow (particulars, structure, effort, externals, price, scenarios, approval) with the effort grid and the price ladder as the two anchor surfaces. The ladder shows every layer from section 6.10 with the three floors, the recommended price, the actual quote with its resulting margin, and the legacy lenses beneath. Acceptance freezes the baseline.

**Company cockpit.** One page that reads like a monthly account: recognised revenue, project gross profit, non-project payroll, unallocated payroll, overheads, operating profit, coverage ratio, tie-out badge, year-end forecast with a range, capacity summary, weighted pipeline, and a short "needs attention" list. Every figure drills to its inputs.

**Portfolio profitability.** A sortable table (tables are the honest chart here): fee, actual cost, gross profit, margin, profit per internal hour, hours variance, forecast, risk. Sortable by every column, with a comparison drawer for two or more projects.

---

## 9 · Design system and voice

### 9.1 Direction: "Studio Ledger"

Warm paper editorial. The dignity of a beautifully kept account book, rendered in contemporary type. Deliberately unlike every commercial time-tracking product: no dark trading-terminal aesthetic, no rainbow dashboard, no gamified chrome.

**Two temperatures, one system.** Personal surfaces run slightly warmer and rounder (completion ring, favourite chips, reflection cards). Financial surfaces run slightly tighter and cooler (tabular figures, ruled dividers, restrained accent use). Same tokens, different density and radius scales.

### 9.2 Tokens

```
Surface   paper #FAF8F4 · raised #FFFFFF · sunken #F1EDE6
Ink       primary #2B2B2B · muted #6E6A64 · faint #8A8A8A
Line      #D9D4CC
Accent    studio green #3D5A4C
Semantic  positive #4E7A52 · caution #B98A2E · critical #A5432E · info #3E5C7A
Data      8-step categorical series, all AA against paper, distinguishable in greyscale
Grid      8pt spacing; 12 columns desktop ≥1200, 8 tablet, 4 mobile; content max 1360px
Type      editorial serif for display ≥21px; UI grotesk for everything else;
          tabular-lining numerals mandatory for all money and hours
Scale     12 / 13 / 15 / 17 / 21 / 28 / 36
Radius    personal 8px · financial 4px
Motion    150-250ms settle transitions; the completion ring eases; nothing bounces for attention;
          honour prefers-reduced-motion by keeping state changes and dropping animation
```

### 9.3 Data visualisation

Estimate versus actual is paired horizontal bars with a schedule-elapsed tick, and it is a single reusable component because it appears everywhere. Budget burn is a progress bar with the contingency zone marked and threshold ticks at 85 and 100%. Profitability is a waterfall (fee → costs → gross profit). Margin is a bullet chart against the target band. Overhead coverage is a ratio with a trend sparkline, never a speedometer. Time allocation is stacked horizontal bars with a fixed category order and colour. Capacity uses fill density plus icons rather than a red-green heatmap. Forecasts are a solid actual line with a dashed forecast and a band. Historical comparison uses small multiples, not overlays.

Rules: direct labels beat legends; every chart has a table view; colour is never the sole encoding; every chart carries a screen-reader summary sentence ("Identity design: 118 of 160 hours used, timeline 55 percent elapsed").

### 9.4 Microcopy (use verbatim where the moment matches)

| Moment | Copy |
|---|---|
| Missing time | "Wednesday still has 1.5 hours unmapped. Two taps and it's done." |
| Completed day | "That's your day mapped. Thanks for keeping the picture whole." |
| Partial day | "You've mapped 6.5 of 8 hours. The rest can wait until you have a minute." |
| Over-capacity week | "Next week is looking heavier than your schedule allows. Might be worth a word with Ryan before it lands on you." |
| Phase running hot | "Identity design is using hours faster than planned, 74 percent used at 55 percent of the timeline. Here's where they're going." |
| Forecast drift | "If the current pace holds, this project lands at 48 percent margin against a 55 percent target. The forecast updates as the picture changes." |
| Personal insight | "Your deepest work this month happened on days with one project, not three. Something to protect where you can." |
| Manager nudge (aggregate only) | "About a day of last week is still unmapped across the team. A gentle nudge in stand-up usually does it." |
| Time correction saved | "Updated. Corrections keep the record honest, never hesitate." |
| Locked period | "June is closed, so this entry is preserved as it was. You can request an adjustment and finance will take it from there." |
| First run | "Welcome. This console exists so we price fairly, protect your time, and build a studio that lasts. Your part takes about two minutes a day. Here's the whole deal, plainly." |
| Empty portfolio | "No projects here yet. The first one you add starts the studio's memory." |
| Empty insights | "Your insights will appear after your first mapped week. They're only ever visible to you." |
| Save failed | "That didn't save. The fault is ours, and your entry is kept safely right here. Try again in a moment." |
| Permission denied | "This area isn't part of your access. If it should be, Ryan or the ops team can grant it." |
| Coverage shortfall (leadership) | "July's project profit covered 98 percent of running costs, the first shortfall in five months. Forecast recovers in August." |

### 9.5 Engagement rules

Permitted: gentle private completion streaks that forgive lapses silently, week-mapping progress, one calm daily reminder at a user-chosen time that stops once the day completes, small completion moments, skippable reflection prompts, studio-wide completion shown collectively without names, collective milestones, a tone dial (warm / neutral / minimal), restrained seasonal touches.

Forbidden permanently, and the data model should make them awkward: leaderboards, any per-person comparison surface, shaming states, red for normal human behaviour, productivity scores, badges and points, variable-reward loops, public comparison of working hours.

### 9.6 Accessibility

WCAG 2.2 AA throughout. Full keyboard path for time entry (this is the power-user route and must be genuinely fast). Focus order equals reading order with a visible focus ring. Touch targets at least 44px. Serif display only at 21px and above. All colour pairs contrast-checked including caution on paper. Status is never colour alone: chips carry an icon and a word.

---

## 10 · Seed dataset

One dataset in `fixtures/`, consumed by the mock API, the tests and the database seeder. All fictional. No real salaries, no real client names beyond generic ones.

**People (6 internal)** on the section 6.9 rate card: a founder and executive creative director, a creative director, an account director, an account manager, a designer, an associate creative producer. Varied schedules including one four-day week. Employment agreements with dated histories, including one person who receives a raise mid-dataset so the rate-history behaviour is demonstrable.

**OE Verse (4 collaborators)** covering hourly, monthly retainer, fixed project fee and milestone models, one of them foreign-currency.

**Projects (12)**, including: three active, one of which is trending to overrun with hours consumed at least 15 points ahead of schedule elapsed; the highly profitable small sprint (example D); the high-value loss-maker (example E) complete with its seven revision rounds and absent variation; a six-month spatial activation (B); a twelve-month festival (C); a two-month branding project (A); one opportunity in estimating; one on hold; one lost; one pro bono. One project denominated in USD.

**Time entries** across 12 months for all six people, realistic in shape: fuller in delivery-heavy months, containing leave, public holidays, business development spikes, a two-day gap for one person (scenario 9), and contextual entries. The dataset must reconcile: run the tie-out for every month and fix the data until every month is green.

**Overheads** per the register in section 5.4, sized so that one month lands just under break-even exactly as fixture F specifies.

**Demo accounts** for the role switcher: Mei (team member), Ryan (project lead + leadership + super admin, demonstrating additive roles), Priya (people manager), Daniel (finance administrator), Sofia (leadership only), Wei Ming (team member who is also a project lead on one project). Switching account re-renders navigation subtractively and re-masks every figure on screen. This is the single most persuasive demonstration in the product; make it instant and complete.

---

## 11 · Build stages

Each stage: plan first, implement after approval, acceptance tests green before moving on. Stages A0 to A8 produce a fully navigable application on mock data. Stages B produce the real backend. Stages C harden for pilot. Stages D and E extend.

### Stage A0 · Foundation
Monorepo (pnpm workspaces), Vite React app, Tailwind with the section 9.2 tokens as CSS variables, Radix primitives, router, Zustand session store with the six demo accounts, and `CLAUDE.md` at the root restating section 2. Also `docs/DEVIATIONS.md` and `docs/DECISIONS.md`.
**Accept:** app boots, role switcher present, tokens visible in a `/styleguide` route.

### Stage A1 · Financial engine
`packages/finance` complete per section 6, with `packages/finance/src/money.ts` implementing minor-unit arithmetic first. Then the worked-example suite and property tests.
**Accept:** every figure in section 6.9 matches exactly, including the canonical rate derivation in 6.2 and the tie-out in fixture F. No UI exists yet, and that is correct.

### Stage A2 · Permission engine
`packages/policy` per section 7, with the masking resolver and the aggregation floors.
**Accept:** unit tests prove a project lead cannot resolve any individual cost rate through any exported function or any combination of aggregate queries; a team member cannot reach another person's entries; contextual categories and personal insights are unreachable by every role other than the owner.

### Stage A3 · Domain and mock API
`packages/domain` types and Zod schemas; `fixtures/` dataset per section 10; `apps/web/src/api` mock transport with realistic latency and error injection, with function signatures identical to the future tRPC procedures.
**Accept:** every fixture month ties out green; fixtures load through the mock API; a seeded random failure surfaces the error state rather than a crash.

### Stage A4 · Design system
Shell (sidebar, utility bar, breadcrumbs, tabs, date-range picker, ⌘K palette, notification tray), cards, tables with sticky headers and footer totals, the chart set from 9.3, drawers, modals, forms, toasts, banners, empty states, the `<Masked>` renderer, and mobile patterns.
**Accept:** `/styleguide` renders every component in default, hover, focus, disabled, loading, error and masked states; axe reports no violations; keyboard traversal is complete.

### Stage A5 · Personal experience
Home, Today, Week, calendar allocation view, personal history, insights (light), profile, notification preferences, privacy page with the section 7.6 text.
**Accept:** a full day can be mapped in under two minutes with a mouse and under 45 seconds by keyboard; copy yesterday works; contextual rows never appear in any cost; an unmapped day shows a gap and no error styling anywhere; mobile entry works one-thumbed.

### Stage A6 · Project experience
Portfolio, overview, estimate versus actual, phase detail, project time, expenses, external collaborators, revenue and invoices, project financials (finance) and budget health (lead, masked), forecast editor with burn-factor ETC, variations, risks, retrospective, close checklist.
**Accept:** the same project renders correctly and differently for lead, finance and team member; example E's project reproduces its published figures on screen; the close checklist refuses closure without a retrospective.

### Stage A7 · Plan & Quote
The seven-step flow, effort grid, external lines with mark-up, contingency, overhead recovery, target margin, the three floors, discount slider with live margin erosion and minimum-safe confirmation, four scenarios, quotation versioning with the clause library and GST, acceptance and baseline freeze.
**Accept:** ladder figures match `packages/finance/pricing` exactly; a discount breaching minimum safe price requires explicit confirmation; accepting a quotation writes an immutable baseline and no code path can modify it afterwards.

### Stage A8 · People, OE Verse, Company, Reports, Admin
People directory and profile with the rate timeline and the new-agreement flow; OE Verse directory and agreement editor covering all seven commercial models; company cost register with the payroll guard; cockpit; company time allocation; the fixed report library; administration screens including periods, locking and the audit log.
**Accept:** a salary change creates a new dated agreement and rate while prior-period costs stay unchanged; an attempt to edit a past agreement is refused with the plain-language message; the overhead register rejects a payroll-like entry; period lock is blocked while tie-out is red.

### Stage A9 · States, responsive, scenarios
Every empty, loading, success, warning, risk, error, permission-denied, locked-period and archived state. Responsive passes. Reduced motion. Chart table-views and screen-reader summaries. Then walk the 18 scenarios in `docs/spec/Phase-9` and record results in `docs/prototype-scenario-checklist.md`.
**Accept:** every scenario either demonstrates in the UI or is documented as backend-dependent with the stage that will deliver it.

### Stage B1 · Backend and database
Prisma schema from section 5, Postgres, tRPC routers mirroring the mock API one for one, the finance and policy packages imported server-side as the authoritative computation, seeding from `fixtures/`, migrations.
**Accept:** the web app runs unchanged against the real backend by swapping the transport module only; every acceptance test from A1 to A9 still passes; server-computed figures match client previews exactly.

### Stage B2 · Auth, audit, periods
Sessions with argon2id, password reset, invitations, role grants with expiry; the append-only audit table with no update or delete path; export logging for S1 and S2; financial period locking with cost snapshotting; the post-lock adjustment flow; the tie-out job.
**Accept:** an attempt to update or delete an audit row fails at the database level, not merely in application code; locking a period snapshots costs and freezes them; a post-lock correction produces linked adjustment entries visible in both periods.

### Stage B3 · Hardening
Field-level masking enforced at the serialiser with a test that inspects raw payloads; rate limiting; CSRF; security headers; application-layer encryption for S1 fields with restricted key access; backups with a documented restore test; structured logging with sensitive-field redaction; error tracking; `docs/RUNBOOK.md`.
**Accept:** a penetration checklist passes, including an explicit test that no masked value appears anywhere in a raw HTTP response; a restore from backup succeeds in a clean environment.

### Stage C1 · Pilot readiness
CSV importers with dry-run preview for people, rates, projects and historical summaries; the complete data export; onboarding flow with the privacy page; notification delivery (in-app plus email digest, personal nudges off by default except the weekly summary); staging and production environments in `ap-southeast-1`.
**Accept:** OuterEdit's real people and rates import cleanly; a person can export their own complete record; no notification path exists that emails a manager about an individual's missing time.

### Stage D · Release 2 depth
Full personal insights; capacity planner; the forecast-at-completion engine; scenario and discount modelling maturity; report builder with saved and scheduled reports; the full cockpit with year-end forecast; service-line and client analysis; people-manager views; the retrospective variance pack; auditor role; effort-based revenue recognition as a new strategy class.

### Stage E · Release 3 connection and Release 4 intelligence
Xero integration behind an anti-corruption layer (invoices, payments, overhead actuals, plus a recognised-versus-Xero reconciliation view); Google Calendar read-only entry suggestions; Slack and email reminders; SSO; external contributor portal; historical backfill tagged and excluded from tie-outs; then the benchmark engine, the pricing recommendation interface with visible evidence and sample size, overrun early-warning models, and what-if modelling (one more hire, no new work won, reduced overhead).

**Gate on Stage E intelligence:** pricing recommendations must not ship until at least 15 closed benchmarked projects exist. Below a sample of 3 for any comparison, show the raw comparable projects instead of a derived range. Every recommendation displays its sample size and spread, and records when the user prices against it so the retrospective can learn.

---

## 12 · Testing strategy

**Financial acceptance suite** (`packages/finance/test`): section 6.9 fixtures with exact expected values, plus property tests for the allocation identity, rate-window resolution, scale invariance and rounding. This suite is a required status check; a red suite blocks everything.

**Permission suite** (`packages/policy/test`): a matrix test asserting every role against every sensitive field, plus adversarial tests attempting to derive S1 values through aggregate arithmetic, and a serialiser test that inspects raw JSON payloads for masked values.

**Integration** (server): tie-out behaviour, period lock and reopen, baseline immutability, audit completeness, adjustment linkage.

**End-to-end** (Playwright): the journeys in `docs/spec/Phase-4` §3, at minimum J1 (map a full day), J2 (correct yesterday), J4 (lead checks an overrunning phase), J7 (salary change preserving history), J9 (project from template), J10 (monthly profitability review), J13 (close a project).

**Accessibility:** axe on every route in CI, plus a manual keyboard pass on time entry each stage.

**Performance budget:** time entry interactive under 1.5 seconds on a mid-range phone over 4G; cockpit renders 12 months of data under 2 seconds; any single report query under 800ms at 50 projects and 200,000 time entries.

---

## 13 · Definition of done, per release

**Release 1 (pilot MVP) is done when:** the financial and permission suites are green; the six demo journeys run end to end against the real backend; OuterEdit's real people, rates and active projects are imported; a month can be locked with a green tie-out; the privacy page is live; the audit trail is immutable and complete; time entry is measurably under two minutes; and a full data export works. Deliberately excluded from Release 1 and not to be built: capacity planner, report builder, integrations, external portal, pricing intelligence, automated forecast beyond the manual assumption editor.

**Every release is done when:** DEVIATIONS.md is empty or every entry is explicitly accepted; the README covers setup, demo accounts, architecture and limitations; and no formula or role check exists anywhere outside `packages/finance` and `packages/policy`.

---

## 14 · Anti-patterns to refuse

Do not simplify a formula to make coding easier, and do not adjust a published expected value to make a test pass. Do not add an admin override for editing another person's time. Do not compute a financial figure in a component, a resolver or a fixture. Do not send a masked value to the client and hide it in CSS. Do not add a per-person productivity metric, a comparison view, or anything that ranks people, even if it seems analytically useful. Do not use red for a person's normal behaviour. Do not introduce a second vocabulary for a metric that already has a name in section 6.1. Do not build Release 2 features while Release 1 is unfinished, however tempting the adjacency. Do not use em dashes in user-facing text.

---

## 15 · Open items requiring the client's answer

Ask before you need them, and do not guess: the current CPF employer rate, ordinary-wage ceiling and whether contributions apply to the annual wage supplement; whether the annual wage supplement is contractual; the financial year end; the operating-margin health target; approval thresholds (proposed 500 for expenses, 10,000 for external engagements); the two named super administrators; and whether leadership should see individual remuneration by default (proposed: no, it requires a separate finance grant).

---

*Prepared as the operative build instruction for the OuterEdit Agency Intelligence Console. The product specification in `docs/spec/` (Phases 1 to 9, plus the consolidated FINAL-SPECIFICATION) is the depth reference behind every rule stated here.*
