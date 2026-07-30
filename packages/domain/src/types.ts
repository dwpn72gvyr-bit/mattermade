// packages/domain/src/types.ts
// §5 Domain model. Types only: no logic, no I/O. Conventions (§3, §5):
// - ids are strings (cuid2 in the real backend, readable slugs in fixtures)
// - business dates are calendar dates in 'YYYY-MM-DD' (Asia/Singapore, §3)
// - storage timestamps are UTC ISO strings
// - money is integer minor units with an explicit currency; never floats
// - percentages are decimals (0.17 means 17%)
// Every entity carries id, createdAt, createdBy, updatedAt, updatedBy (§5
// conventions). [A] = audited on mutation; [D] = dated record, history never
// overwritten. Sensitivity classes per §7.

export type Id = string;
export type CalendarDate = string;   // 'YYYY-MM-DD'
export type IsoDateTime = string;    // UTC ISO 8601
export type YearMonth = string;      // 'YYYY-MM'
export type CurrencyCode = 'SGD' | 'USD' | (string & {});

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** §5 conventions: every entity has these five fields. */
export interface Entity {
  id: Id;
  createdAt: IsoDateTime;
  createdBy: Id;
  updatedAt: IsoDateTime;
  updatedBy: Id;
}

// ---------------------------------------------------------------------------
// §5.1 Identity and people
// ---------------------------------------------------------------------------

export type RoleKey =
  | 'founder'
  | 'creative_director'
  | 'account_director'
  | 'account_manager'
  | 'designer'
  | 'associate_creative_producer'
  | 'strategist'
  | 'producer';

export type SystemRole =
  | 'team_member'
  | 'project_lead'
  | 'people_manager'
  | 'finance_admin'
  | 'ops_admin'
  | 'leadership'
  | 'super_admin'
  | 'external_contributor'
  | 'auditor';

export interface NotificationPrefs {
  emailDigest: boolean;
  weeklySummary: boolean;
  /** Personal nudges are off by default (§ Stage C1); never routed to managers. */
  personalNudges: boolean;
}

export interface RoleGrant {           // [A]
  role: SystemRole;
  /** Additive scoping (§7). 'reports' scopes a people_manager to direct reports. */
  scope: { type: 'global' | 'project' | 'team' | 'reports'; ids?: Id[] };
  effectiveFrom: CalendarDate;
  effectiveTo?: CalendarDate;          // temporary grants expire automatically
}

export interface User extends Entity { // [A]
  personId?: Id;
  collaboratorId?: Id;
  email: string;
  status: 'invited' | 'active' | 'suspended';
  roleGrants: RoleGrant[];             // additive; see §7
  notificationPrefs: NotificationPrefs;
}

export interface Person extends Entity {
  name: string;
  title: string;
  roleKey: RoleKey;
  team?: string;
  managerId?: Id;
  seniority: string;
  employmentStatus: 'active' | 'departed';
  startDate: CalendarDate;
  endDate?: CalendarDate;
  location: 'SG' | (string & {});      // drives the public-holiday calendar
  skills: string[];
  photoUrl?: string;
}

export interface WorkSchedule extends Entity { // [D]
  personId: Id;
  effectiveFrom: CalendarDate;
  effectiveTo?: CalendarDate;
  daysPerWeek: number;
  hoursPerDay: number;
  weeklyHours: number;
}

export interface EmploymentAgreement extends Entity { // [A][D]  SENSITIVITY S1
  personId: Id;
  effectiveFrom: CalendarDate;
  effectiveTo?: CalendarDate;
  employmentType: 'full_time' | 'part_time' | 'contract';
  monthlySalaryMinor: number;
  currency: 'SGD';
  employerCpfRate: number;             // decimal, e.g. 0.17
  cpfMonthlyCeilingMinor: number;      // ordinary-wage ceiling; configurable, dated
  cpfAppliesToBonus: boolean;          // default true
  contractualBonusMonths: number;      // AWS / 13th month; excludes discretionary
  fixedAllowancesMonthlyMinor: number;
  benefitsAnnualMinor: number;         // insurance and similar
  annualLeaveDays: number;
  publicHolidayDays: number;
  expectedMedicalDays: number;
  productiveFactor: number;            // default 0.80
}

/** Full input snapshot for provenance (§5.1: derived, never hand-typed). */
export interface CostRateDerivation {
  annualEmploymentCostMinor: number;
  paidHours: number;
  availableHours: number;
  productiveHours: number;
  inputs?: Json;
}

export interface CostRate extends Entity { // [A][D]  SENSITIVITY S1
  personId: Id;
  effectiveFrom: CalendarDate;
  effectiveTo?: CalendarDate;
  paidHourRateMinor: number;           // COSTING basis (R8)
  availableHourRateMinor: number;      // PRICING floor basis
  productiveHourRateMinor: number;     // OVERHEAD-RECOVERY basis
  derivation: CostRateDerivation;
  methodVersion: string;
}

export interface SellRate extends Entity { // [D]
  scope:
    | { type: 'role'; roleKey: RoleKey }
    | { type: 'person'; personId: Id };
  effectiveFrom: CalendarDate;
  effectiveTo?: CalendarDate;
  rateMinor: number;
  currency: CurrencyCode;
}

// ---------------------------------------------------------------------------
// §5.2 Clients, projects, structure
// ---------------------------------------------------------------------------

export type ProjectStatus =
  | 'opportunity' | 'estimating' | 'quoted' | 'negotiation' | 'won'
  | 'planning' | 'active' | 'on_hold' | 'completed' | 'financially_closed'
  | 'archived' | 'lost';

export type ServiceLine =
  | 'brand_strategy' | 'brand_identity' | 'creative_direction' | 'campaign'
  | 'spatial_activation' | 'installation' | 'exhibition' | 'experience_design'
  | 'placemaking' | 'community_engagement' | 'cultural_programming'
  | 'festival' | 'event_activation';

export interface Client extends Entity {
  name: string;
  clientGroupId?: Id;
  country: string;
  industry?: string;
  paymentTermsDays: number;
  riskNotes?: string;
}

export interface RiskFlag {
  key: string;
  label: string;
  severity: 'info' | 'watch' | 'attention';
  raisedAt: CalendarDate;
}

export interface EstimateBaselinePhase {
  phaseId: Id;
  name: string;
  estHoursByRole: Partial<Record<RoleKey, number>>;
  estInternalCostMinor: number;
  estExternalCostMinor: number;
  estExpenseMinor: number;
}

export interface EstimateBaseline {    // immutable once written (R4)
  frozenAt: IsoDateTime;
  frozenByUserId: Id;
  quotationId: Id;
  phases: EstimateBaselinePhase[];
  contingencyPct: number;
  targetGrossMarginPct: number;
  overheadRecoveryMinor: number;
  totals: {
    estHours: number;
    estInternalCostMinor: number;
    estExternalCostMinor: number;
    estExpenseMinor: number;
    estDirectCostMinor: number;
    estGrossProfitMinor: number;
  };
}

export interface Project extends Entity { // [A] on financial fields
  code: string;
  name: string;
  clientId: Id;
  projectType: string;
  serviceLine: ServiceLine;
  status: ProjectStatus;
  leadId: Id;
  teamIds: Id[];
  country: string;
  currency: CurrencyCode;
  probability?: number;                // decimal, opportunity weighting
  contractValueMinor: number;
  startDate: CalendarDate;
  targetEndDate: CalendarDate;
  actualEndDate?: CalendarDate;
  baseline?: EstimateBaseline;         // frozen at acceptance — see R4
  isProBono: boolean;
  discountAppliedPct?: number;
  riskFlags: RiskFlag[];
  retrospectiveId?: Id;
}

export type PhaseStatus = 'not_started' | 'in_progress' | 'complete';

export interface ProjectPhase extends Entity {
  projectId: Id;
  name: string;
  order: number;
  status: PhaseStatus;
  estHoursByRole: Partial<Record<RoleKey, number>>;
  plannedStart: CalendarDate;
  plannedEnd: CalendarDate;
  actualStart?: CalendarDate;
  actualEnd?: CalendarDate;
  benchmarkRef?: Id;                   // links to comparable historical phases
}

export interface Deliverable extends Entity {
  phaseId: Id;
  name: string;
  status: 'planned' | 'in_progress' | 'delivered' | 'accepted';
  estHours?: number;
  acceptedAt?: CalendarDate;
}

export interface Variation extends Entity { // [A]
  projectId: Id;
  description: string;
  feeDeltaMinor: number;
  hoursDelta?: number;
  affectedPhaseIds: Id[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approvedByUserId?: Id;
  approvedAt?: CalendarDate;
  raisedFromAlertId?: Id;
}

export interface Milestone extends Entity {
  projectId: Id;
  phaseId?: Id;
  name: string;
  dueDate: CalendarDate;
  status: 'pending' | 'reached' | 'accepted' | 'missed';
  isBillingTrigger: boolean;
}

export interface ProjectTemplate extends Entity { // master; copied, never linked
  name: string;
  projectType: string;
  serviceLine: ServiceLine;
  phases: {
    name: string;
    order: number;
    typicalHoursByRole: Partial<Record<RoleKey, number>>;
    deliverables: string[];
  }[];
}

// ---------------------------------------------------------------------------
// §5.3 Time
// ---------------------------------------------------------------------------

export type ActivityScope = 'project' | 'company' | 'personal';

export interface Activity extends Entity { // [A] on flag changes: they move money
  name: string;
  scope: ActivityScope;
  active: boolean;
  paid: boolean;                       // does the studio pay for this time
  costBearing: boolean;                // does it create a cost line
  productive: boolean;                 // productive vs contextual
  billable: boolean;
  countsTowardUtilisation: boolean;
  includedInProjectCosting: boolean;
}

export interface TimeEntry extends Entity { // [A] on edits after the entry date
  personId: Id;
  date: CalendarDate;
  minutes: number;
  projectId?: Id;
  phaseId?: Id;
  deliverableId?: Id;
  activityId: Id;
  notes?: string;
  source: 'manual' | 'timer' | 'copied' | 'quick_parse';
  status: 'draft' | 'confirmed';
  lockedCostMinor?: number;            // snapshotted when the period locks
  adjustsEntryId?: Id;                 // set when this is a post-lock correction
}

export interface DayCompletion extends Entity {
  personId: Id;
  date: CalendarDate;
  scheduledMinutes: number;
  mappedMinutes: number;
  completedAt?: IsoDateTime;
}

export interface CapacityAllocation extends Entity {
  personId: Id;
  projectId: Id;
  phaseId?: Id;
  isoWeek: string;                     // e.g. '2026-W28'
  plannedHours: number;
  tentative: boolean;
}

// ---------------------------------------------------------------------------
// §5.4 Commercial and financial
// ---------------------------------------------------------------------------

/** The full pricing ladder as computed (§6.10), snapshotted onto quotations. */
export interface PricingSnapshot {
  estHours: number;
  internalCostMinor: number;
  loadedCheckMinor: number;
  externalCostMinor: number;
  externalSellMinor: number;
  expensesMinor: number;
  contingencyMinor: number;
  overheadRecoveryMinor: number;
  totalCostMinor: number;
  negotiationFloorMinor: number;
  minimumSafePriceMinor: number;
  recommendedPriceMinor: number;
  externalMarkUpPct: number;
  contingencyPct: number;
  targetGrossMarginPct: number;
}

export interface QuotationLineItem {
  id: Id;
  quotationId: Id;
  order: number;
  description: string;
  linkedPhaseIds: Id[];
  estimatedDuration?: string;
  amountMinor: number;
  isOptional: boolean;
}

export interface Quotation extends Entity { // [A]; accepted versions immutable
  projectId: Id;
  version: number;
  issuedDate: CalendarDate;
  status: 'draft' | 'sent' | 'accepted' | 'superseded' | 'declined';
  lineItems: QuotationLineItem[];
  subtotalMinor: number;
  gstRate: number;                     // decimal, e.g. 0.09
  gstMinor: number;
  totalMinor: number;
  currency: CurrencyCode;
  inclusions: string[];
  exclusions: string[];
  clauseIds: Id[];
  periodOfEngagement: string;
  validUntil: CalendarDate;
  pricing: PricingSnapshot;            // the full ladder as computed (§6.10)
}

export interface Clause extends Entity {
  key: string;
  title: string;
  body: string;
  category: 'amendments' | 'working_files' | 'scope' | 'look_and_feel' | 'terms';
}

export type ExternalModel =
  | 'hourly' | 'daily' | 'monthly_retainer' | 'fixed_project'
  | 'fixed_phase' | 'fixed_deliverable' | 'milestone';

export interface Collaborator extends Entity {
  name: string;
  discipline: string;
  location: string;
  country: string;
  defaultCurrency: CurrencyCode;
  notes?: string;
}

export type ExternalAttribution =
  | { type: 'single_project' }
  | { type: 'percentage'; splits: { projectId: Id; pct: number }[] }
  | { type: 'recorded_time' }
  | { type: 'phase'; phaseId: Id };

export interface ExternalAgreementMilestone {
  name: string;
  amountMinor: number;
  phaseId?: Id;
  status: 'pending' | 'accepted';
  acceptedAt?: CalendarDate;
}

export interface ExternalAgreement extends Entity { // [A]  SENSITIVITY S4
  collaboratorId: Id;
  projectIds: Id[];
  model: ExternalModel;
  rateMinor?: number;                  // hourly and daily models
  feeMinor?: number;                   // fixed models; retainer monthly fee
  currency: CurrencyCode;
  sgdRateAtCommitment: number;         // 1 for SGD (§6.4 currency)
  committedAt?: CalendarDate;
  attribution: ExternalAttribution;
  accrualPolicy: 'milestone' | 'straight_line' | 'on_completion';
  milestones?: ExternalAgreementMilestone[];
  expensesReimbursable: boolean;
  startDate: CalendarDate;
  endDate?: CalendarDate;
  status: 'draft' | 'committed' | 'active' | 'completed' | 'terminated';
  documents: string[];
}

export interface DirectExpense extends Entity { // [A]
  projectId: Id;
  phaseId?: Id;
  category: 'fabrication' | 'production' | 'travel' | 'software' | 'licence' | 'other';
  description: string;
  supplierName?: string;
  collaboratorId?: Id;
  amountMinor: number;
  currency: CurrencyCode;
  sgdRate: number;                     // 1 for SGD
  date: CalendarDate;
  state: 'planned' | 'committed' | 'actual';
  receiptUrl?: string;
  approvedByUserId?: Id;
}

export type RecognitionTrigger =
  | 'milestone_accepted' | 'phase_complete' | 'straight_line' | 'as_delivered';

export interface RevenueItem extends Entity { // [A]
  projectId: Id;
  type: 'fee' | 'milestone' | 'retainer_period' | 'variation' | 'deposit';
  amountMinor: number;
  currency: CurrencyCode;
  plannedDate: CalendarDate;
  recognitionTrigger: RecognitionTrigger;
  recognisedAt?: CalendarDate;
  invoiceId?: Id;
  weight?: number;
  /** straight_line window (§6.8). */
  startPeriod?: YearMonth;
  endPeriod?: YearMonth;
}

export interface Invoice extends Entity {
  projectId: Id;
  number: string;
  issuedDate: CalendarDate;
  amountMinor: number;
  gstMinor: number;
  currency: CurrencyCode;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'written_off';
  paidDate?: CalendarDate;
}

export type OverheadCategory =
  | 'rental' | 'accounting' | 'insurance' | 'software' | 'legal' | 'banking'
  | 'marketing' | 'business_development' | 'equipment' | 'general_travel'
  | 'training' | 'company_admin' | 'fx' | 'other';

// Guard: this table may never contain payroll. Reject on write with a clear
// message (§5.4; enforced by the Zod schema and by packages/finance).
export interface CompanyOverhead extends Entity { // [A]  SENSITIVITY S2
  category: OverheadCategory;
  description: string;
  amountMinor: number;
  currency: CurrencyCode;
  recurrence: 'monthly' | 'annual' | 'one_off';
  effectiveFrom: CalendarDate;
  effectiveTo?: CalendarDate;
  department?: string;
  forecastMinor?: number;
  paymentStatus: 'planned' | 'paid' | 'overdue';
  /** For one_off lines: the period the cost lands in (§6.6). */
  oneOffPeriod?: YearMonth;
}

export type TieOutStatus = 'green' | 'amber' | 'red';

export interface TieOutReportLine {
  personId: Id;
  expectedMinor: number;
  allocatedMinor: number;
  differenceMinor: number;
  status: TieOutStatus;
}

export interface TieOutReport {
  period: YearMonth;
  expectedMinor: number;
  allocatedMinor: number;
  differenceMinor: number;
  status: TieOutStatus;
  perPerson: TieOutReportLine[];
}

export interface FinancialPeriod extends Entity { // [A]
  yearMonth: YearMonth;
  status: 'open' | 'soft_closed' | 'locked';
  tieOut: TieOutStatus;
  tieOutDetail: TieOutReport;
  lockedByUserId?: Id;
  lockedAt?: IsoDateTime;
  reopenReason?: string;
}

export interface AuditRecord {
  // Append-only; no update or delete path exists (§5.4). It stamps itself, so
  // it carries only its own id and occurrence facts, never updatedAt/updatedBy.
  id: Id;
  actorUserId: Id;
  occurredAt: IsoDateTime;
  entityType: string;
  entityId: Id;
  field?: string;
  oldValue?: Json;
  newValue?: Json;
  reason?: string;
  ipHash?: string;
  sessionId?: string;
  action:
    | 'create' | 'update' | 'delete' | 'approve' | 'export'
    | 'lock' | 'reopen' | 'view_sensitive';
}

// ---------------------------------------------------------------------------
// §5.5 Intelligence
// ---------------------------------------------------------------------------

export interface Retrospective extends Entity {
  projectId: Id;
  whatOverran: string;
  whyNotes: string;
  clientFactors: string;
  pricingLesson: string;
  wouldQuoteAgainAtMinor?: number;
  authorUserId: Id;
  completedAt: CalendarDate;
}

export interface Benchmark extends Entity { // emitted at financial closure
  projectId: Id;
  projectType: string;
  serviceLine: ServiceLine;
  feeBand: string;
  durationBand: string;
  phaseActuals: { name: string; estHours: number; actHours: number; variancePct: number }[];
  roleMix: Partial<Record<RoleKey, number>>;
  revisionCount: number;
  variationCount: number;
  quotedMarginPct: number;
  achievedMarginPct: number;
  profitPerInternalHourMinor: number;
  tags: ('pro_bono' | 'discounted' | 'cancelled' | 'historical_import')[];
}

export type AlertType =
  | 'overrun_trend' | 'margin_erosion' | 'budget_consumed' | 'missing_variation'
  | 'invoice_overdue' | 'unmapped_time' | 'period_tie_out' | 'external_commitment';

export interface Alert extends Entity {
  type: AlertType;
  severity: 'info' | 'watch' | 'attention';
  subjectType: string;
  subjectId: Id;
  firedAt: IsoDateTime;
  state: 'open' | 'acknowledged' | 'resolved';
  evidence: Json;
  suggestedAction?: string;
}
