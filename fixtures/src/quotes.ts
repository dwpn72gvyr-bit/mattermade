// fixtures/src/quotes.ts
// §5.4 quotations for the seed projects. Every ladder figure in a pricing
// snapshot is computed by @oe/finance priceLadder (R1); GST is 9%. Accepted
// versions are immutable and are the source of each project's frozen baseline
// (R4).

import type { Quotation, QuotationLineItem, RoleKey } from '@oe/domain';
import { priceLadder, roundHalfUp } from '@oe/finance';
import { stamp } from './support';
import { RATE_CARD, AVAILABLE_RATE_CARD } from './people';
import { BASELINE_HOURS, PROJECT_IDS } from './projects';

const GST_RATE = 0.09;

/** Overhead-recovery lens for pricing (§6.10 step 8): the studio's overhead
 *  per productive hour, held constant across the demo dataset. */
const OVERHEAD_PER_PRODUCTIVE_HOUR_MINOR = 1_500;

function snapshot(estHoursByRole: Partial<Record<RoleKey, number>>, externalMinor: number, expensesMinor: number) {
  const ladder = priceLadder({
    estHoursByRole: estHoursByRole as Record<string, number>,
    paidRatesMinor: RATE_CARD,
    availableRatesMinor: AVAILABLE_RATE_CARD,
    externalCostMinor: externalMinor,
    externalMarkUpPct: 0.2,
    expensesMinor,
    contingencyPct: 0.1,
    overheadPerProductiveHourMinor: OVERHEAD_PER_PRODUCTIVE_HOUR_MINOR,
    targetGrossMarginPct: 0.5,
  });
  return {
    estHours: ladder.estHours,
    internalCostMinor: ladder.internalCostMinor,
    loadedCheckMinor: ladder.loadedCheckMinor,
    externalCostMinor: ladder.externalCostMinor,
    externalSellMinor: ladder.externalSellMinor,
    expensesMinor: ladder.expensesMinor,
    contingencyMinor: ladder.contingencyMinor,
    overheadRecoveryMinor: ladder.overheadRecoveryMinor,
    totalCostMinor: ladder.totalCostMinor,
    negotiationFloorMinor: ladder.negotiationFloorMinor,
    minimumSafePriceMinor: ladder.minimumSafePriceMinor,
    recommendedPriceMinor: ladder.recommendedPriceMinor,
    externalMarkUpPct: 0.2,
    contingencyPct: 0.1,
    targetGrossMarginPct: 0.5,
  };
}

interface QuoteSpec {
  id: string;
  projectId: string;
  version: number;
  issuedDate: string;
  status: Quotation['status'];
  currency?: string;
  estHoursByRole: Partial<Record<RoleKey, number>>;
  externalMinor: number;
  expensesMinor: number;
  periodOfEngagement: string;
  validUntil: string;
  lines: [description: string, amountMinor: number, linkedPhaseIds?: string[]][];
  inclusions?: string[];
  exclusions?: string[];
}

function quotation(spec: QuoteSpec): Quotation {
  const lineItems: QuotationLineItem[] = spec.lines.map(([description, amountMinor, linkedPhaseIds], i) => ({
    id: `${spec.id}-li-${i + 1}`,
    quotationId: spec.id,
    order: i + 1,
    description,
    linkedPhaseIds: linkedPhaseIds ?? [],
    amountMinor,
    isOptional: false,
  }));
  const subtotalMinor = lineItems.reduce((s, li) => s + li.amountMinor, 0);
  const gstMinor = roundHalfUp(subtotalMinor * GST_RATE);
  return {
    ...stamp(spec.id),
    projectId: spec.projectId,
    version: spec.version,
    issuedDate: spec.issuedDate,
    status: spec.status,
    lineItems,
    subtotalMinor,
    gstRate: GST_RATE,
    gstMinor,
    totalMinor: subtotalMinor + gstMinor,
    currency: spec.currency ?? 'SGD',
    inclusions: spec.inclusions ?? ['Three rounds of amendments per deliverable'],
    exclusions: spec.exclusions ?? ['Print production', 'Media buying', 'Third-party licensing beyond listed items'],
    clauseIds: ['cls-amendments', 'cls-working-files', 'cls-look-and-feel', 'cls-sample-application', 'cls-terms-payment'],
    periodOfEngagement: spec.periodOfEngagement,
    validUntil: spec.validUntil,
    pricing: snapshot(spec.estHoursByRole, spec.externalMinor, spec.expensesMinor),
  };
}

export const QUOTATIONS: Quotation[] = [
  quotation({
    id: 'qtn-a', projectId: PROJECT_IDS.a, version: 1, issuedDate: '2025-06-10', status: 'accepted',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.a]!, externalMinor: 0, expensesMinor: 0,
    periodOfEngagement: 'July to August 2025', validUntil: '2025-06-30',
    lines: [
      ['Discovery, strategy and positioning', 1_200_000, ['ph-a-1', 'ph-a-2', 'ph-a-3', 'ph-a-4']],
      ['Identity design and applications', 2_000_000, ['ph-a-5', 'ph-a-6', 'ph-a-7']],
      ['Guidelines and implementation support', 600_000, ['ph-a-8', 'ph-a-9', 'ph-a-10']],
    ],
  }),
  quotation({
    id: 'qtn-b', projectId: PROJECT_IDS.b, version: 2, issuedDate: '2025-06-17', status: 'accepted',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.b]!, externalMinor: 7_300_000, expensesMinor: 700_000,
    periodOfEngagement: 'July to December 2025', validUntil: '2025-07-04',
    lines: [
      ['Experience strategy and spatial concept', 6_000_000, ['ph-b-1', 'ph-b-2', 'ph-b-3', 'ph-b-4']],
      ['Spatial and technical design', 4_800_000, ['ph-b-5', 'ph-b-6']],
      ['Fabrication, installation and on-site support', 7_200_000, ['ph-b-7', 'ph-b-8', 'ph-b-9', 'ph-b-10', 'ph-b-11']],
    ],
  }),
  quotation({
    id: 'qtn-c', projectId: PROJECT_IDS.c, version: 1, issuedDate: '2025-06-06', status: 'accepted',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.c]!, externalMinor: 19_300_000, expensesMinor: 3_000_000,
    periodOfEngagement: 'July 2025 to June 2026', validUntil: '2025-06-27',
    lines: [
      ['Research, framing and curatorial concept', 9_000_000, ['ph-c-1', 'ph-c-2', 'ph-c-3']],
      ['Programme, partnership and stakeholder development', 12_000_000, ['ph-c-4', 'ph-c-5', 'ph-c-6']],
      ['Identity, communications and production', 15_000_000, ['ph-c-7', 'ph-c-8']],
      ['Delivery and evaluation', 6_000_000, ['ph-c-9', 'ph-c-10', 'ph-c-11']],
    ],
  }),
  quotation({
    id: 'qtn-d', projectId: PROJECT_IDS.d, version: 1, issuedDate: '2025-08-20', status: 'accepted',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.d]!, externalMinor: 0, expensesMinor: 0,
    periodOfEngagement: 'September 2025', validUntil: '2025-08-29',
    lines: [['Brand sprint: positioning and identity refresh', 1_200_000]],
  }),
  quotation({
    id: 'qtn-e', projectId: PROJECT_IDS.e, version: 3, issuedDate: '2025-06-20', status: 'accepted',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.e]!, externalMinor: 9_500_000, expensesMinor: 1_800_000,
    periodOfEngagement: 'July to October 2025', validUntil: '2025-07-04',
    inclusions: ['Three rounds of amendments per deliverable', 'Flagship launch support'],
    lines: [
      ['Brand strategy and concept', 8_000_000, ['ph-e-1', 'ph-e-2', 'ph-e-3', 'ph-e-4', 'ph-e-5']],
      ['Identity design and applications', 11_000_000, ['ph-e-6', 'ph-e-7']],
      ['Guidelines, implementation and launch', 6_000_000, ['ph-e-8', 'ph-e-9', 'ph-e-10']],
    ],
  }),
  quotation({
    id: 'qtn-f', projectId: PROJECT_IDS.f, version: 1, issuedDate: '2026-01-16', status: 'accepted',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.f]!, externalMinor: 2_000_000, expensesMinor: 500_000,
    periodOfEngagement: 'February to October 2026', validUntil: '2026-01-30',
    lines: [
      ['Site study and experience strategy', 4_500_000, ['ph-f-1', 'ph-f-2', 'ph-f-3']],
      ['Concept and spatial design', 6_000_000, ['ph-f-4', 'ph-f-5', 'ph-f-6']],
      ['Fabrication coordination and delivery', 6_000_000, ['ph-f-7', 'ph-f-8', 'ph-f-9', 'ph-f-10', 'ph-f-11']],
    ],
  }),
  quotation({
    id: 'qtn-g', projectId: PROJECT_IDS.g, version: 1, issuedDate: '2026-03-13', status: 'accepted',
    currency: 'USD',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.g]!, externalMinor: 0, expensesMinor: 0,
    periodOfEngagement: 'April to August 2026', validUntil: '2026-03-27',
    exclusions: ['US trademark searches', 'Print production'],
    lines: [
      ['Identity strategy and design', 4_200_000, ['ph-g-1', 'ph-g-2', 'ph-g-3', 'ph-g-4', 'ph-g-5', 'ph-g-6']],
      ['Applications and guidelines', 1_800_000, ['ph-g-7', 'ph-g-8', 'ph-g-9', 'ph-g-10']],
    ],
  }),
  quotation({
    id: 'qtn-h', projectId: PROJECT_IDS.h, version: 1, issuedDate: '2026-02-13', status: 'accepted',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.h]!, externalMinor: 900_000, expensesMinor: 200_000,
    periodOfEngagement: 'March to December 2026', validUntil: '2026-02-27',
    lines: [
      ['Exhibition strategy and concept', 3_600_000, ['ph-h-1', 'ph-h-2', 'ph-h-3', 'ph-h-4']],
      ['Design, technical development and delivery', 5_400_000, ['ph-h-5', 'ph-h-6', 'ph-h-7', 'ph-h-8', 'ph-h-9', 'ph-h-10', 'ph-h-11']],
    ],
  }),
  quotation({
    // Draft for the estimating opportunity: the Plan & Quote demo subject.
    id: 'qtn-i', projectId: PROJECT_IDS.i, version: 1, issuedDate: '2026-06-19', status: 'draft',
    estHoursByRole: { founder: 50, creative_director: 200, account_director: 180, designer: 220, associate_creative_producer: 150 },
    externalMinor: 4_000_000, expensesMinor: 1_500_000,
    periodOfEngagement: 'September 2026 to August 2027', validUntil: '2026-07-31',
    lines: [
      ['Audience research and strategic development', 9_500_000],
      ['Experience concept and creative direction', 11_000_000],
      ['Recommendations, presentation and refinement', 6_000_000],
    ],
  }),
  quotation({
    id: 'qtn-j', projectId: PROJECT_IDS.j, version: 1, issuedDate: '2025-09-12', status: 'accepted',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.j]!, externalMinor: 0, expensesMinor: 0,
    periodOfEngagement: 'October 2025 to March 2026', validUntil: '2025-09-30',
    lines: [
      ['Placemaking strategy and engagement', 2_700_000, ['ph-j-1', 'ph-j-2', 'ph-j-3']],
      ['Concept and design development', 1_800_000, ['ph-j-4', 'ph-j-5']],
    ],
  }),
  quotation({
    // Declined: the lost pitch.
    id: 'qtn-k', projectId: PROJECT_IDS.k, version: 2, issuedDate: '2025-10-17', status: 'declined',
    estHoursByRole: { creative_director: 90, account_director: 40, designer: 210, associate_creative_producer: 60 },
    externalMinor: 0, expensesMinor: 300_000,
    periodOfEngagement: 'November 2025 to February 2026', validUntil: '2025-11-07',
    lines: [
      ['Hotel brand identity programme', 8_000_000],
      ['Signage and collateral system', 1_500_000],
    ],
  }),
  quotation({
    // Pro bono: a zero-fee accepted quotation keeps the baseline honest about
    // the effort being given, not sold.
    id: 'qtn-l', projectId: PROJECT_IDS.l, version: 1, issuedDate: '2025-12-12', status: 'accepted',
    estHoursByRole: BASELINE_HOURS[PROJECT_IDS.l]!, externalMinor: 0, expensesMinor: 0,
    periodOfEngagement: 'January to February 2026', validUntil: '2025-12-31',
    inclusions: ['Mentoring sessions', 'Programme identity toolkit'],
    exclusions: ['Production costs'],
    lines: [['Youth programme creative support, pro bono', 0]],
  }),
];
