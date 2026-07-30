// packages/domain/src/schemas.ts
// Zod schemas for the entities that cross the API boundary (§5, Stage A3).
// Validation only: no money is computed here (R1). Percentages are decimals,
// money is integer minor units, calendar dates are 'YYYY-MM-DD' strings (§3).

import { z } from 'zod';

// --- shared scalars ---------------------------------------------------------

export const idSchema = z.string().min(1);
export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Calendar dates are YYYY-MM-DD strings');
export const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Periods are YYYY-MM strings');
export const isoDateTimeSchema = z.string().min(1);
export const currencySchema = z.string().min(3).max(3);
/** Money is integer minor units, never floats (§3). */
export const minorUnitsSchema = z.number().int();
/** Percentages are decimals (§3): 0.09 means 9%. */
export const decimalPctSchema = z.number().min(-1).max(1);

/** §5 conventions: every entity has id + audit stamps. */
export const entityBaseSchema = z.object({
  id: idSchema,
  createdAt: isoDateTimeSchema,
  createdBy: idSchema,
  updatedAt: isoDateTimeSchema,
  updatedBy: idSchema,
});

export const roleKeySchema = z.enum([
  'founder', 'creative_director', 'account_director', 'account_manager',
  'designer', 'associate_creative_producer', 'strategist', 'producer',
]);

export const hoursByRoleSchema = z.record(roleKeySchema, z.number().nonnegative());

// --- §5.3 time --------------------------------------------------------------

export const activityScopeSchema = z.enum(['project', 'company', 'personal']);

export const activitySchema = entityBaseSchema.extend({
  name: z.string().min(1),
  scope: activityScopeSchema,
  active: z.boolean(),
  paid: z.boolean(),
  costBearing: z.boolean(),
  productive: z.boolean(),
  billable: z.boolean(),
  countsTowardUtilisation: z.boolean(),
  includedInProjectCosting: z.boolean(),
});

export const timeEntrySchema = entityBaseSchema.extend({
  personId: idSchema,
  date: calendarDateSchema,
  // Negative or zero durations are invalid; corrections are dated adjustment
  // entries (§6.3), never negative time.
  minutes: z.number().int().positive(),
  projectId: idSchema.optional(),
  phaseId: idSchema.optional(),
  deliverableId: idSchema.optional(),
  activityId: idSchema,
  notes: z.string().optional(),
  source: z.enum(['manual', 'timer', 'copied', 'quick_parse']),
  status: z.enum(['draft', 'confirmed']),
  lockedCostMinor: minorUnitsSchema.optional(),
  adjustsEntryId: idSchema.optional(),
});

// --- §5.1 employment --------------------------------------------------------

export const employmentAgreementSchema = entityBaseSchema.extend({
  personId: idSchema,
  effectiveFrom: calendarDateSchema,
  effectiveTo: calendarDateSchema.optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract']),
  monthlySalaryMinor: minorUnitsSchema.nonnegative(),
  currency: z.literal('SGD'),
  employerCpfRate: decimalPctSchema,
  cpfMonthlyCeilingMinor: minorUnitsSchema.nonnegative(),
  cpfAppliesToBonus: z.boolean(),
  contractualBonusMonths: z.number().nonnegative(),
  fixedAllowancesMonthlyMinor: minorUnitsSchema.nonnegative(),
  benefitsAnnualMinor: minorUnitsSchema.nonnegative(),
  annualLeaveDays: z.number().nonnegative(),
  publicHolidayDays: z.number().nonnegative(),
  expectedMedicalDays: z.number().nonnegative(),
  productiveFactor: z.number().positive().max(1),
});

// --- §5.2 projects ----------------------------------------------------------

export const projectStatusSchema = z.enum([
  'opportunity', 'estimating', 'quoted', 'negotiation', 'won', 'planning',
  'active', 'on_hold', 'completed', 'financially_closed', 'archived', 'lost',
]);

export const serviceLineSchema = z.enum([
  'brand_strategy', 'brand_identity', 'creative_direction', 'campaign',
  'spatial_activation', 'installation', 'exhibition', 'experience_design',
  'placemaking', 'community_engagement', 'cultural_programming', 'festival',
  'event_activation',
]);

export const riskFlagSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  severity: z.enum(['info', 'watch', 'attention']),
  raisedAt: calendarDateSchema,
});

export const estimateBaselineSchema = z.object({
  frozenAt: isoDateTimeSchema,
  frozenByUserId: idSchema,
  quotationId: idSchema,
  phases: z.array(
    z.object({
      phaseId: idSchema,
      name: z.string().min(1),
      estHoursByRole: hoursByRoleSchema,
      estInternalCostMinor: minorUnitsSchema,
      estExternalCostMinor: minorUnitsSchema,
      estExpenseMinor: minorUnitsSchema,
    }),
  ),
  contingencyPct: decimalPctSchema,
  targetGrossMarginPct: decimalPctSchema,
  overheadRecoveryMinor: minorUnitsSchema,
  totals: z.object({
    estHours: z.number().nonnegative(),
    estInternalCostMinor: minorUnitsSchema,
    estExternalCostMinor: minorUnitsSchema,
    estExpenseMinor: minorUnitsSchema,
    estDirectCostMinor: minorUnitsSchema,
    estGrossProfitMinor: minorUnitsSchema,
  }),
});

export const projectSchema = entityBaseSchema.extend({
  code: z.string().min(1),
  name: z.string().min(1),
  clientId: idSchema,
  projectType: z.string().min(1),
  serviceLine: serviceLineSchema,
  status: projectStatusSchema,
  leadId: idSchema,
  teamIds: z.array(idSchema),
  country: z.string().min(1),
  currency: currencySchema,
  probability: z.number().min(0).max(1).optional(),
  contractValueMinor: minorUnitsSchema,
  startDate: calendarDateSchema,
  targetEndDate: calendarDateSchema,
  actualEndDate: calendarDateSchema.optional(),
  baseline: estimateBaselineSchema.optional(),
  isProBono: z.boolean(),
  discountAppliedPct: decimalPctSchema.optional(),
  riskFlags: z.array(riskFlagSchema),
  retrospectiveId: idSchema.optional(),
});

export const variationSchema = entityBaseSchema.extend({
  projectId: idSchema,
  description: z.string().min(1),
  feeDeltaMinor: minorUnitsSchema,
  hoursDelta: z.number().optional(),
  affectedPhaseIds: z.array(idSchema),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']),
  approvedByUserId: idSchema.optional(),
  approvedAt: calendarDateSchema.optional(),
  raisedFromAlertId: idSchema.optional(),
});

// --- §5.4 commercial --------------------------------------------------------

export const pricingSnapshotSchema = z.object({
  estHours: z.number().nonnegative(),
  internalCostMinor: minorUnitsSchema,
  loadedCheckMinor: minorUnitsSchema,
  externalCostMinor: minorUnitsSchema,
  externalSellMinor: minorUnitsSchema,
  expensesMinor: minorUnitsSchema,
  contingencyMinor: minorUnitsSchema,
  overheadRecoveryMinor: minorUnitsSchema,
  totalCostMinor: minorUnitsSchema,
  negotiationFloorMinor: minorUnitsSchema,
  minimumSafePriceMinor: minorUnitsSchema,
  recommendedPriceMinor: minorUnitsSchema,
  externalMarkUpPct: decimalPctSchema,
  contingencyPct: decimalPctSchema,
  targetGrossMarginPct: decimalPctSchema,
});

export const quotationLineItemSchema = z.object({
  id: idSchema,
  quotationId: idSchema,
  order: z.number().int().nonnegative(),
  description: z.string().min(1),
  linkedPhaseIds: z.array(idSchema),
  estimatedDuration: z.string().optional(),
  amountMinor: minorUnitsSchema,
  isOptional: z.boolean(),
});

export const quotationSchema = entityBaseSchema.extend({
  projectId: idSchema,
  version: z.number().int().positive(),
  issuedDate: calendarDateSchema,
  status: z.enum(['draft', 'sent', 'accepted', 'superseded', 'declined']),
  lineItems: z.array(quotationLineItemSchema),
  subtotalMinor: minorUnitsSchema,
  gstRate: decimalPctSchema,
  gstMinor: minorUnitsSchema,
  totalMinor: minorUnitsSchema,
  currency: currencySchema,
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  clauseIds: z.array(idSchema),
  periodOfEngagement: z.string().min(1),
  validUntil: calendarDateSchema,
  pricing: pricingSnapshotSchema,
});

export const externalAttributionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('single_project') }),
  z.object({
    type: z.literal('percentage'),
    splits: z.array(z.object({ projectId: idSchema, pct: z.number().min(0).max(1) })),
  }),
  z.object({ type: z.literal('recorded_time') }),
  z.object({ type: z.literal('phase'), phaseId: idSchema }),
]);

export const externalAgreementSchema = entityBaseSchema.extend({
  collaboratorId: idSchema,
  projectIds: z.array(idSchema),
  model: z.enum([
    'hourly', 'daily', 'monthly_retainer', 'fixed_project',
    'fixed_phase', 'fixed_deliverable', 'milestone',
  ]),
  rateMinor: minorUnitsSchema.optional(),
  feeMinor: minorUnitsSchema.optional(),
  currency: currencySchema,
  sgdRateAtCommitment: z.number().positive(),
  committedAt: calendarDateSchema.optional(),
  attribution: externalAttributionSchema,
  accrualPolicy: z.enum(['milestone', 'straight_line', 'on_completion']),
  milestones: z
    .array(
      z.object({
        name: z.string().min(1),
        amountMinor: minorUnitsSchema,
        phaseId: idSchema.optional(),
        status: z.enum(['pending', 'accepted']),
        acceptedAt: calendarDateSchema.optional(),
      }),
    )
    .optional(),
  expensesReimbursable: z.boolean(),
  startDate: calendarDateSchema,
  endDate: calendarDateSchema.optional(),
  status: z.enum(['draft', 'committed', 'active', 'completed', 'terminated']),
  documents: z.array(z.string()),
});

export const directExpenseSchema = entityBaseSchema.extend({
  projectId: idSchema,
  phaseId: idSchema.optional(),
  category: z.enum(['fabrication', 'production', 'travel', 'software', 'licence', 'other']),
  description: z.string().min(1),
  supplierName: z.string().optional(),
  collaboratorId: idSchema.optional(),
  amountMinor: minorUnitsSchema,
  currency: currencySchema,
  sgdRate: z.number().positive(),
  date: calendarDateSchema,
  state: z.enum(['planned', 'committed', 'actual']),
  receiptUrl: z.string().optional(),
  approvedByUserId: idSchema.optional(),
});

// §5.4 guard: the overhead register may never contain payroll. Salaries enter
// the model through exactly one door, the allocation identity (§6.7, R3).
const PAYROLL_PATTERN = /salar|payroll|wage|cpf|bonus/i;

export const companyOverheadSchema = entityBaseSchema
  .extend({
    category: z.enum([
      'rental', 'accounting', 'insurance', 'software', 'legal', 'banking',
      'marketing', 'business_development', 'equipment', 'general_travel',
      'training', 'company_admin', 'fx', 'other',
    ]),
    description: z.string().min(1),
    amountMinor: minorUnitsSchema,
    currency: currencySchema,
    recurrence: z.enum(['monthly', 'annual', 'one_off']),
    effectiveFrom: calendarDateSchema,
    effectiveTo: calendarDateSchema.optional(),
    department: z.string().optional(),
    forecastMinor: minorUnitsSchema.optional(),
    paymentStatus: z.enum(['planned', 'paid', 'overdue']),
    oneOffPeriod: yearMonthSchema.optional(),
  })
  .refine(
    (o) => !PAYROLL_PATTERN.test(o.description) && !PAYROLL_PATTERN.test(o.category),
    {
      message:
        'Salaries and payroll never live in the overhead register. They enter through employment agreements so each dollar is counted once.',
    },
  );

// --- §5.4 periods -----------------------------------------------------------

export const tieOutStatusSchema = z.enum(['green', 'amber', 'red']);

export const tieOutReportSchema = z.object({
  period: yearMonthSchema,
  expectedMinor: minorUnitsSchema,
  allocatedMinor: minorUnitsSchema,
  differenceMinor: minorUnitsSchema,
  status: tieOutStatusSchema,
  perPerson: z.array(
    z.object({
      personId: idSchema,
      expectedMinor: minorUnitsSchema,
      allocatedMinor: minorUnitsSchema,
      differenceMinor: minorUnitsSchema,
      status: tieOutStatusSchema,
    }),
  ),
});

export const financialPeriodSchema = entityBaseSchema.extend({
  yearMonth: yearMonthSchema,
  status: z.enum(['open', 'soft_closed', 'locked']),
  tieOut: tieOutStatusSchema,
  tieOutDetail: tieOutReportSchema,
  lockedByUserId: idSchema.optional(),
  lockedAt: isoDateTimeSchema.optional(),
  reopenReason: z.string().optional(),
});
