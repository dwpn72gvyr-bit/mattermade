// fixtures/src/collaborators.ts
// §10 OE Verse: four collaborators covering the hourly, monthly retainer,
// fixed project fee and milestone models, one of them foreign-currency.
// Agreements record what OuterEdit pays (R9: mark-up is a pricing event and
// lives only in the quotation ladder).

import type { Collaborator, ExternalAgreement } from '@oe/domain';
import { stamp } from './support';
import { PROJECT_IDS } from './projects';

export const COLLABORATORS: Collaborator[] = [
  {
    ...stamp('col-farhan'),
    name: 'Farhan Idris',
    discipline: 'Motion and communications design',
    location: 'Singapore',
    country: 'SG',
    defaultCurrency: 'SGD',
    notes: 'Also covers lighting design documentation for spatial builds.',
  },
  {
    ...stamp('col-nadia'),
    name: 'Nadia Rahman',
    discipline: 'Curation',
    location: 'Singapore',
    country: 'SG',
    defaultCurrency: 'SGD',
  },
  {
    ...stamp('col-teckheng'),
    name: 'Teck Heng Works',
    discipline: 'Fabrication',
    location: 'Singapore',
    country: 'SG',
    defaultCurrency: 'SGD',
    notes: 'Workshop in Sungei Kadut; installs with own crew.',
  },
  {
    ...stamp('col-aiko'),
    name: 'Aiko Tanaka',
    discipline: 'Production partnership',
    location: 'Tokyo',
    country: 'JP',
    defaultCurrency: 'JPY',
    notes: 'Studio Arc production partner for festival staging.',
  },
];

export const EXTERNAL_AGREEMENTS: ExternalAgreement[] = [
  {
    // §6.9 B: fabricator fixed project fee 65,000, milestone accrual.
    ...stamp('ea-b-fab', 'usr-daniel'),
    collaboratorId: 'col-teckheng',
    projectIds: [PROJECT_IDS.b],
    model: 'fixed_project',
    feeMinor: 6_500_000,
    currency: 'SGD',
    sgdRateAtCommitment: 1,
    committedAt: '2025-07-04',
    attribution: { type: 'single_project' },
    accrualPolicy: 'milestone',
    milestones: [
      { name: 'Fabrication complete', amountMinor: 3_000_000, phaseId: 'ph-b-7', status: 'accepted', acceptedAt: '2025-10-31' },
      { name: 'Installation complete', amountMinor: 3_500_000, phaseId: 'ph-b-8', status: 'accepted', acceptedAt: '2025-12-15' },
    ],
    expensesReimbursable: false,
    startDate: '2025-07-04',
    endDate: '2025-12-19',
    status: 'completed',
    documents: ['tidal-pavilion-fabrication-agreement.pdf'],
  },
  {
    // §6.9 B: lighting designer fixed phase fee 8,000.
    ...stamp('ea-b-light', 'usr-daniel'),
    collaboratorId: 'col-farhan',
    projectIds: [PROJECT_IDS.b],
    model: 'fixed_phase',
    feeMinor: 800_000,
    currency: 'SGD',
    sgdRateAtCommitment: 1,
    committedAt: '2025-08-15',
    attribution: { type: 'phase', phaseId: 'ph-b-6' },
    accrualPolicy: 'on_completion',
    expensesReimbursable: false,
    startDate: '2025-08-18',
    endDate: '2025-11-14',
    status: 'completed',
    documents: [],
  },
  {
    // §6.9 C: curator monthly retainer 4,000 x 12 = 48,000.
    ...stamp('ea-c-curator', 'usr-daniel'),
    collaboratorId: 'col-nadia',
    projectIds: [PROJECT_IDS.c],
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
    documents: ['lumen-curator-retainer.pdf'],
  },
  {
    // §6.9 C: production partner milestones totalling SGD 120,000. Foreign
    // currency: yen amounts, SGD rate captured at commitment (§6.4). Fixture
    // convention: JPY amounts are stored x100 like every other minor unit, so
    // the 0.01 commitment rate converts minor yen to minor SGD.
    ...stamp('ea-c-prod', 'usr-daniel'),
    collaboratorId: 'col-aiko',
    projectIds: [PROJECT_IDS.c],
    model: 'milestone',
    currency: 'JPY',
    sgdRateAtCommitment: 0.01,
    committedAt: '2025-07-18',
    attribution: { type: 'single_project' },
    accrualPolicy: 'milestone',
    milestones: [
      { name: 'Staging design package', amountMinor: 400_000_000, phaseId: 'ph-c-8', status: 'accepted', acceptedAt: '2025-09-26' },
      { name: 'Production build', amountMinor: 400_000_000, phaseId: 'ph-c-8', status: 'accepted', acceptedAt: '2026-01-30' },
      { name: 'Festival delivery', amountMinor: 400_000_000, phaseId: 'ph-c-9', status: 'accepted', acceptedAt: '2026-05-29' },
    ],
    expensesReimbursable: true,
    startDate: '2025-07-18',
    endDate: '2026-06-30',
    status: 'active',
    documents: ['lumen-production-partnership.pdf'],
  },
  {
    // §6.9 C: communications designer fixed fee 25,000.
    ...stamp('ea-c-comms', 'usr-daniel'),
    collaboratorId: 'col-farhan',
    projectIds: [PROJECT_IDS.c],
    model: 'fixed_project',
    feeMinor: 2_500_000,
    currency: 'SGD',
    sgdRateAtCommitment: 1,
    committedAt: '2025-09-12',
    attribution: { type: 'single_project' },
    accrualPolicy: 'straight_line',
    expensesReimbursable: false,
    startDate: '2025-10-01',
    endDate: '2026-02-27',
    status: 'completed',
    documents: [],
  },
  {
    // §6.9 E: external production commitment of 95,000.
    ...stamp('ea-e-prod', 'usr-daniel'),
    collaboratorId: 'col-teckheng',
    projectIds: [PROJECT_IDS.e],
    model: 'fixed_project',
    feeMinor: 9_500_000,
    currency: 'SGD',
    sgdRateAtCommitment: 1,
    committedAt: '2025-07-11',
    attribution: { type: 'single_project' },
    accrualPolicy: 'milestone',
    milestones: [
      { name: 'Flagship fit-out package', amountMinor: 5_000_000, phaseId: 'ph-e-9', status: 'accepted', acceptedAt: '2025-10-31' },
      { name: 'Rollout production', amountMinor: 4_500_000, phaseId: 'ph-e-9', status: 'accepted', acceptedAt: '2026-01-30' },
    ],
    expensesReimbursable: false,
    startDate: '2025-07-11',
    endDate: '2026-03-31',
    status: 'completed',
    documents: [],
  },
  {
    // Hourly model (§10): motion designer at SGD 90 per hour on the
    // exhibition, hours recorded per month worked (§6.4).
    ...stamp('ea-h-motion', 'usr-daniel'),
    collaboratorId: 'col-farhan',
    projectIds: [PROJECT_IDS.h],
    model: 'hourly',
    rateMinor: 9_000,
    currency: 'SGD',
    sgdRateAtCommitment: 1,
    committedAt: '2026-03-27',
    attribution: { type: 'single_project' },
    accrualPolicy: 'straight_line',
    expensesReimbursable: false,
    startDate: '2026-04-01',
    status: 'active',
    documents: [],
  },
  {
    // Kite Quarter wayfinding fabrication, committed but not yet invoiced.
    ...stamp('ea-f-fab', 'usr-daniel'),
    collaboratorId: 'col-teckheng',
    projectIds: [PROJECT_IDS.f],
    model: 'fixed_project',
    feeMinor: 2_000_000,
    currency: 'SGD',
    sgdRateAtCommitment: 1,
    committedAt: '2026-05-15',
    attribution: { type: 'single_project' },
    accrualPolicy: 'straight_line',
    expensesReimbursable: false,
    startDate: '2026-05-18',
    endDate: '2026-09-30',
    status: 'committed',
    documents: [],
  },
];

/** Hours worked per period for the hourly agreement above (§6.4 measurement:
 *  hours x rate, month worked). Kept beside the agreement so the mock API can
 *  serve it without inventing numbers. */
export const HOURLY_UNITS_BY_PERIOD: Record<string, Record<string, number>> = {
  'ea-h-motion': { '2026-04': 30, '2026-05': 40, '2026-06': 30 },
};
