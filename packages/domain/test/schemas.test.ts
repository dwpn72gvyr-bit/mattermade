// packages/domain/test/schemas.test.ts
// Stage A3 schema checks: the §5.4 payroll guard on the overhead register,
// round-trips for valid entities, and rejection of impossible time.

import { describe, it, expect } from 'vitest';
import {
  activitySchema,
  companyOverheadSchema,
  employmentAgreementSchema,
  projectSchema,
  quotationSchema,
  timeEntrySchema,
  variationSchema,
  directExpenseSchema,
  externalAgreementSchema,
  financialPeriodSchema,
} from '../src/schemas';

const stamp = {
  id: 'test-id',
  createdAt: '2025-07-01T00:00:00Z',
  createdBy: 'usr-test',
  updatedAt: '2025-07-01T00:00:00Z',
  updatedBy: 'usr-test',
};

const validOverhead = {
  ...stamp,
  category: 'rental' as const,
  description: 'Studio rent, Tanjong Pagar',
  amountMinor: 650_000,
  currency: 'SGD',
  recurrence: 'monthly' as const,
  effectiveFrom: '2025-07-01',
  paymentStatus: 'paid' as const,
};

describe('§5.4 overhead payroll guard', () => {
  it('accepts a genuine overhead line', () => {
    expect(companyOverheadSchema.safeParse(validOverhead).success).toBe(true);
  });

  it.each([
    'Designer salary top-up',
    'Monthly payroll processing run',
    'Casual wages for event crew',
    'Employer CPF contribution',
    'Year-end bonus pool',
  ])('rejects a payroll-like description: %s', (description) => {
    const result = companyOverheadSchema.safeParse({ ...validOverhead, description });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Salaries and payroll never live in the overhead register. They enter through employment agreements so each dollar is counted once.',
      );
    }
  });
});

describe('valid entities parse', () => {
  it('TimeEntry', () => {
    const parsed = timeEntrySchema.safeParse({
      ...stamp,
      personId: 'per-mei',
      date: '2026-06-15',
      minutes: 90,
      projectId: 'prj-f',
      activityId: 'act-design',
      source: 'manual',
      status: 'confirmed',
    });
    expect(parsed.success).toBe(true);
  });

  it('Activity', () => {
    const parsed = activitySchema.safeParse({
      ...stamp,
      name: 'Design',
      scope: 'project',
      active: true,
      paid: true,
      costBearing: true,
      productive: true,
      billable: true,
      countsTowardUtilisation: true,
      includedInProjectCosting: true,
    });
    expect(parsed.success).toBe(true);
  });

  it('EmploymentAgreement', () => {
    const parsed = employmentAgreementSchema.safeParse({
      ...stamp,
      personId: 'per-mei',
      effectiveFrom: '2026-01-01',
      employmentType: 'full_time',
      monthlySalaryMinor: 740_300,
      currency: 'SGD',
      employerCpfRate: 0.17,
      cpfMonthlyCeilingMinor: 740_000,
      cpfAppliesToBonus: true,
      contractualBonusMonths: 1,
      fixedAllowancesMonthlyMinor: 0,
      benefitsAnnualMinor: 180_000,
      annualLeaveDays: 18,
      publicHolidayDays: 11,
      expectedMedicalDays: 4,
      productiveFactor: 0.8,
    });
    expect(parsed.success).toBe(true);
  });

  it('Project', () => {
    const parsed = projectSchema.safeParse({
      ...stamp,
      code: 'OE-2501',
      name: 'Meridian Rebrand',
      clientId: 'cli-meridian',
      projectType: 'branding',
      serviceLine: 'brand_identity',
      status: 'completed',
      leadId: 'usr-ryan',
      teamIds: ['per-mei', 'per-sofia'],
      country: 'SG',
      currency: 'SGD',
      contractValueMinor: 3_800_000,
      startDate: '2025-07-01',
      targetEndDate: '2025-08-31',
      actualEndDate: '2025-08-29',
      isProBono: false,
      riskFlags: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('Variation, DirectExpense, ExternalAgreement, FinancialPeriod', () => {
    expect(
      variationSchema.safeParse({
        ...stamp,
        projectId: 'prj-f',
        description: 'Additional wayfinding suite',
        feeDeltaMinor: 1_500_000,
        hoursDelta: 60,
        affectedPhaseIds: ['ph-f-5'],
        status: 'approved',
        approvedByUserId: 'usr-ryan',
        approvedAt: '2026-05-04',
      }).success,
    ).toBe(true);

    expect(
      directExpenseSchema.safeParse({
        ...stamp,
        projectId: 'prj-b',
        category: 'travel',
        description: 'Site travel and materials',
        amountMinor: 700_000,
        currency: 'SGD',
        sgdRate: 1,
        date: '2025-11-14',
        state: 'actual',
      }).success,
    ).toBe(true);

    expect(
      externalAgreementSchema.safeParse({
        ...stamp,
        collaboratorId: 'col-nadia',
        projectIds: ['prj-c'],
        model: 'monthly_retainer',
        feeMinor: 400_000,
        currency: 'SGD',
        sgdRateAtCommitment: 1,
        committedAt: '2025-06-20',
        attribution: { type: 'single_project' },
        accrualPolicy: 'straight_line',
        expensesReimbursable: false,
        startDate: '2025-07-01',
        endDate: '2026-06-30',
        status: 'active',
        documents: [],
      }).success,
    ).toBe(true);

    expect(
      financialPeriodSchema.safeParse({
        ...stamp,
        yearMonth: '2026-06',
        status: 'open',
        tieOut: 'green',
        tieOutDetail: {
          period: '2026-06',
          expectedMinor: 6_130_000,
          allocatedMinor: 6_130_000,
          differenceMinor: 0,
          status: 'green',
          perPerson: [],
        },
      }).success,
    ).toBe(true);
  });

  it('Quotation', () => {
    const parsed = quotationSchema.safeParse({
      ...stamp,
      projectId: 'prj-a',
      version: 1,
      issuedDate: '2025-06-10',
      status: 'accepted',
      lineItems: [
        {
          id: 'qli-1',
          quotationId: 'test-id',
          order: 1,
          description: 'Brand identity development',
          linkedPhaseIds: [],
          amountMinor: 3_800_000,
          isOptional: false,
        },
      ],
      subtotalMinor: 3_800_000,
      gstRate: 0.09,
      gstMinor: 342_000,
      totalMinor: 4_142_000,
      currency: 'SGD',
      inclusions: ['Three rounds of amendments'],
      exclusions: ['Print production'],
      clauseIds: ['cls-amendments'],
      periodOfEngagement: 'July to August 2025',
      validUntil: '2025-06-30',
      pricing: {
        estHours: 290,
        internalCostMinor: 2_007_000,
        loadedCheckMinor: 2_299_000,
        externalCostMinor: 0,
        externalSellMinor: 0,
        expensesMinor: 0,
        contingencyMinor: 200_700,
        overheadRecoveryMinor: 435_000,
        totalCostMinor: 2_642_700,
        negotiationFloorMinor: 2_207_700,
        minimumSafePriceMinor: 2_642_700,
        recommendedPriceMinor: 5_285_400,
        externalMarkUpPct: 0.2,
        contingencyPct: 0.1,
        targetGrossMarginPct: 0.5,
      },
    });
    expect(parsed.success).toBe(true);
  });
});

describe('impossible time rejects', () => {
  it('a TimeEntry with negative minutes rejects', () => {
    const parsed = timeEntrySchema.safeParse({
      ...stamp,
      personId: 'per-mei',
      date: '2026-06-15',
      minutes: -60,
      activityId: 'act-design',
      source: 'manual',
      status: 'confirmed',
    });
    expect(parsed.success).toBe(false);
  });

  it('a TimeEntry with zero minutes rejects', () => {
    const parsed = timeEntrySchema.safeParse({
      ...stamp,
      personId: 'per-mei',
      date: '2026-06-15',
      minutes: 0,
      activityId: 'act-design',
      source: 'manual',
      status: 'confirmed',
    });
    expect(parsed.success).toBe(false);
  });
});
