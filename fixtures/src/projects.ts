// fixtures/src/projects.ts
// §10 seed projects: twelve projects including the five §6.9 worked examples
// (A to E), an overrunning active project, a USD project, an opportunity in
// estimating, one on hold, one lost and one pro bono. Baseline money figures
// are computed through @oe/finance (R1); the §6.9 hour tables are law (R2).

import type {
  Client, Project, ProjectPhase, ProjectTemplate, Deliverable, Milestone,
  Variation, DirectExpense, RevenueItem, Invoice, EstimateBaseline,
  Alert, Retrospective, Benchmark, CapacityAllocation, RoleKey, ServiceLine,
  CalendarDate,
} from '@oe/domain';
import { estInternalCostMinor, totalHours } from '@oe/finance';
import { stamp, dateAt, FIXTURE_TODAY } from './support';
import { RATE_CARD } from './people';
import { PERSON_IDS } from './people';

export const PROJECT_IDS = {
  a: 'prj-a', b: 'prj-b', c: 'prj-c', d: 'prj-d', e: 'prj-e', f: 'prj-f',
  g: 'prj-g', h: 'prj-h', i: 'prj-i', j: 'prj-j', k: 'prj-k', l: 'prj-l',
} as const;

// ---------------------------------------------------------------------------
// Clients (§10: generic fictional names only)
// ---------------------------------------------------------------------------

function client(id: string, name: string, country: string, industry: string, terms = 30): Client {
  return { ...stamp(id), name, country, industry, paymentTermsDays: terms };
}

export const CLIENTS: Client[] = [
  client('cli-meridian', 'Meridian Holdings', 'SG', 'Property'),
  client('cli-tidal', 'Tidal Arts Trust', 'SG', 'Arts and culture'),
  client('cli-lumen', 'Lumen City Council', 'SG', 'Public sector', 45),
  client('cli-ember', 'Ember Coffee Company', 'SG', 'Food and beverage', 14),
  client('cli-northwind', 'Northwind Retail Group', 'SG', 'Retail', 60),
  client('cli-kite', 'Kite Quarter Development', 'SG', 'Property'),
  client('cli-saltwater', 'Saltwater Atelier Inc', 'US', 'Fashion', 30),
  client('cli-civic', 'Civic Museum Board', 'SG', 'Arts and culture', 45),
  client('cli-harbourline', 'Harbourline Museum Trust', 'SG', 'Arts and culture', 45),
  client('cli-verdant', 'Verdant Walk Partners', 'SG', 'Property'),
  client('cli-auric', 'Auric Hotels', 'SG', 'Hospitality'),
  client('cli-youtharts', 'Youth Arts Network', 'SG', 'Non-profit', 30),
];

// ---------------------------------------------------------------------------
// §5.2 the four seed templates, phase lists verbatim
// ---------------------------------------------------------------------------

const BRANDING_PHASES = [
  'Discovery', 'Research', 'Strategy', 'Positioning', 'Concept development',
  'Identity design', 'Applications', 'Guidelines', 'Implementation',
  'Project management',
];
const SPATIAL_PHASES = [
  'Discovery', 'Site study', 'Experience strategy', 'Concept development',
  'Spatial design', 'Technical development', 'Fabrication coordination',
  'Installation', 'On-site support', 'Documentation', 'Project management',
];
const FESTIVAL_PHASES = [
  'Research', 'Strategic framing', 'Curatorial concept', 'Programme development',
  'Partnership development', 'Stakeholder engagement', 'Identity and communications',
  'Production planning', 'Delivery', 'Evaluation', 'Project management',
];
const STRATEGY_PHASES = [
  'Discovery', 'Research', 'Audience analysis', 'Strategic development',
  'Concept creation', 'Recommendations', 'Presentation', 'Refinement',
  'Project management',
];

function template(
  id: string, name: string, projectType: string, serviceLine: ServiceLine,
  phaseNames: string[], typical: Partial<Record<RoleKey, number>>,
): ProjectTemplate {
  return {
    ...stamp(id),
    name,
    projectType,
    serviceLine,
    phases: phaseNames.map((phaseName, i) => ({
      name: phaseName,
      order: i + 1,
      typicalHoursByRole: typical,
      deliverables: [],
    })),
  };
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  template('tpl-branding', 'Branding', 'branding', 'brand_identity', BRANDING_PHASES,
    { creative_director: 10, designer: 24, associate_creative_producer: 6 }),
  template('tpl-spatial', 'Spatial activation', 'spatial_activation', 'spatial_activation', SPATIAL_PHASES,
    { creative_director: 12, designer: 24, associate_creative_producer: 20, founder: 4 }),
  template('tpl-festival', 'Festival or cultural programme', 'festival', 'festival', FESTIVAL_PHASES,
    { creative_director: 30, account_director: 24, associate_creative_producer: 56, designer: 20, founder: 10 }),
  template('tpl-strategy', 'Creative strategy', 'creative_strategy', 'brand_strategy', STRATEGY_PHASES,
    { creative_director: 12, account_director: 10, designer: 8 }),
];

const TEMPLATE_PHASE_NAMES: Record<string, string[]> = {
  branding: BRANDING_PHASES,
  spatial: SPATIAL_PHASES,
  festival: FESTIVAL_PHASES,
  strategy: STRATEGY_PHASES,
};

// ---------------------------------------------------------------------------
// Baseline hour tables. A to E are §6.9 verbatim (R2).
// ---------------------------------------------------------------------------

export const BASELINE_HOURS: Record<string, Partial<Record<RoleKey, number>>> = {
  // §6.9 A: CD 60, Designer 180, ACP 40, Founder 10 (290 h)
  [PROJECT_IDS.a]: { creative_director: 60, designer: 180, associate_creative_producer: 40, founder: 10 },
  // §6.9 B: Founder 40, CD 160, Designer 320, ACP 260 (780 h)
  [PROJECT_IDS.b]: { founder: 40, creative_director: 160, designer: 320, associate_creative_producer: 260 },
  // §6.9 C: Founder 120, CD 400, AD 300, ACP 700, Designer 250 (1,770 h)
  [PROJECT_IDS.c]: { founder: 120, creative_director: 400, account_director: 300, associate_creative_producer: 700, designer: 250 },
  // §6.9 D: CD 20, Designer 45 (65 h)
  [PROJECT_IDS.d]: { creative_director: 20, designer: 45 },
  // §6.9 E baseline at approval: 900 hours costing 75,620.
  [PROJECT_IDS.e]: { founder: 60, creative_director: 250, account_director: 120, designer: 300, associate_creative_producer: 170 },
  // Kite Quarter: 840 baseline hours; actuals run well ahead (overrun demo).
  [PROJECT_IDS.f]: { creative_director: 160, account_director: 200, account_manager: 250, designer: 150, associate_creative_producer: 80 },
  [PROJECT_IDS.g]: { creative_director: 60, account_manager: 180, designer: 120, associate_creative_producer: 40 },
  [PROJECT_IDS.h]: { creative_director: 120, account_director: 150, account_manager: 160, designer: 100, associate_creative_producer: 70 },
  [PROJECT_IDS.j]: { account_director: 120, account_manager: 180 },
  [PROJECT_IDS.l]: { designer: 60, account_manager: 60, associate_creative_producer: 30 },
};

/** Split a role-hours table across n phases: even integer split, remainder to
 *  the earliest phases. Totals are preserved exactly. */
function splitAcrossPhases(
  roleHours: Partial<Record<RoleKey, number>>, n: number,
): Partial<Record<RoleKey, number>>[] {
  const out: Partial<Record<RoleKey, number>>[] = Array.from({ length: n }, () => ({}));
  for (const [role, total] of Object.entries(roleHours) as [RoleKey, number][]) {
    const base = Math.floor(total / n);
    const rem = total - base * n;
    for (let i = 0; i < n; i += 1) {
      const h = base + (i < rem ? 1 : 0);
      if (h > 0) out[i]![role] = h;
    }
  }
  return out;
}

interface PhaseSpec {
  key: string;               // short project key: 'a'..'l'
  projectId: string;
  templateKey: keyof typeof TEMPLATE_PHASE_NAMES;
  start: CalendarDate;
  end: CalendarDate;
  completed: boolean;
}

function buildPhases(spec: PhaseSpec): ProjectPhase[] {
  const names = TEMPLATE_PHASE_NAMES[spec.templateKey]!;
  const hours = BASELINE_HOURS[spec.projectId] ?? {};
  const split = splitAcrossPhases(hours, names.length);
  return names.map((name, i) => {
    const plannedStart = dateAt(spec.start, spec.end, i / names.length);
    const plannedEnd = dateAt(spec.start, spec.end, (i + 1) / names.length);
    const status = spec.completed || plannedEnd < FIXTURE_TODAY
      ? 'complete' as const
      : plannedStart <= FIXTURE_TODAY ? 'in_progress' as const : 'not_started' as const;
    return {
      ...stamp(`ph-${spec.key}-${i + 1}`),
      projectId: spec.projectId,
      name,
      order: i + 1,
      status,
      estHoursByRole: split[i]!,
      plannedStart,
      plannedEnd,
    };
  });
}

const PHASE_SPECS: PhaseSpec[] = [
  { key: 'a', projectId: PROJECT_IDS.a, templateKey: 'branding', start: '2025-07-01', end: '2025-08-31', completed: true },
  { key: 'b', projectId: PROJECT_IDS.b, templateKey: 'spatial', start: '2025-07-01', end: '2025-12-19', completed: true },
  { key: 'c', projectId: PROJECT_IDS.c, templateKey: 'festival', start: '2025-07-01', end: '2026-06-30', completed: false },
  { key: 'd', projectId: PROJECT_IDS.d, templateKey: 'branding', start: '2025-09-01', end: '2025-09-26', completed: true },
  { key: 'e', projectId: PROJECT_IDS.e, templateKey: 'branding', start: '2025-07-01', end: '2026-03-31', completed: true },
  { key: 'f', projectId: PROJECT_IDS.f, templateKey: 'spatial', start: '2026-02-02', end: '2026-10-30', completed: false },
  { key: 'g', projectId: PROJECT_IDS.g, templateKey: 'branding', start: '2026-04-01', end: '2026-08-31', completed: false },
  { key: 'h', projectId: PROJECT_IDS.h, templateKey: 'spatial', start: '2026-03-02', end: '2026-12-18', completed: false },
  { key: 'i', projectId: PROJECT_IDS.i, templateKey: 'strategy', start: '2026-09-01', end: '2027-08-31', completed: false },
  { key: 'j', projectId: PROJECT_IDS.j, templateKey: 'spatial', start: '2025-10-01', end: '2026-03-31', completed: false },
  { key: 'k', projectId: PROJECT_IDS.k, templateKey: 'branding', start: '2025-11-03', end: '2026-02-27', completed: false },
  { key: 'l', projectId: PROJECT_IDS.l, templateKey: 'strategy', start: '2026-01-05', end: '2026-02-27', completed: true },
];

export const PHASES: ProjectPhase[] = PHASE_SPECS.flatMap(buildPhases);

export function phasesOf(projectId: string): ProjectPhase[] {
  return PHASES.filter((p) => p.projectId === projectId);
}

// ---------------------------------------------------------------------------
// Baselines (R4: frozen at acceptance, immutable). All money through finance.
// ---------------------------------------------------------------------------

function freezeBaseline(args: {
  key: string; projectId: string; quotationId: string; frozenAt: string;
  feeMinor: number; estExternalMinor: number; estExpenseMinor: number;
  /** Phase name that carries the external and expense estimate. */
  externalPhaseName?: string;
}): EstimateBaseline {
  const phases = phasesOf(args.projectId);
  const roleHours = BASELINE_HOURS[args.projectId] ?? {};
  // F1 (§6.5): estInternalCost from the §6.9 card at estimate date.
  const estInternal = estInternalCostMinor(roleHours as Record<string, number>, RATE_CARD);
  const estHours = totalHours(roleHours as Record<string, number>);
  const extIdx = Math.max(0, phases.findIndex((p) => p.name === args.externalPhaseName));
  return {
    frozenAt: args.frozenAt,
    frozenByUserId: 'usr-ryan',
    quotationId: args.quotationId,
    phases: phases.map((p, i) => ({
      phaseId: p.id,
      name: p.name,
      estHoursByRole: p.estHoursByRole,
      estInternalCostMinor: estInternalCostMinor(p.estHoursByRole as Record<string, number>, RATE_CARD),
      estExternalCostMinor: i === extIdx ? args.estExternalMinor : 0,
      estExpenseMinor: i === extIdx ? args.estExpenseMinor : 0,
    })),
    // §6.9 worked examples carry no contingency; the direct-cost figures are
    // published without it, and they are law (R2).
    contingencyPct: 0,
    targetGrossMarginPct: 0.5,
    overheadRecoveryMinor: 0,
    totals: {
      estHours,
      estInternalCostMinor: estInternal,
      estExternalCostMinor: args.estExternalMinor,
      estExpenseMinor: args.estExpenseMinor,
      // F4a with zero contingency (§6.5).
      estDirectCostMinor: estInternal + args.estExternalMinor + args.estExpenseMinor,
      estGrossProfitMinor: args.feeMinor - (estInternal + args.estExternalMinor + args.estExpenseMinor),
    },
  };
}

// ---------------------------------------------------------------------------
// The twelve projects
// ---------------------------------------------------------------------------

const TEAM_ALL = [
  PERSON_IDS.ryan, PERSON_IDS.sofia, PERSON_IDS.priya,
  PERSON_IDS.weiming, PERSON_IDS.mei, PERSON_IDS.daniel,
];

export const PROJECTS: Project[] = [
  {
    // §6.9 A. Two-month branding project, fee 38,000, no external.
    ...stamp(PROJECT_IDS.a),
    code: 'OE-2501', name: 'Meridian Rebrand', clientId: 'cli-meridian',
    projectType: 'branding', serviceLine: 'brand_identity', status: 'completed',
    leadId: 'usr-ryan',
    teamIds: [PERSON_IDS.ryan, PERSON_IDS.sofia, PERSON_IDS.mei, PERSON_IDS.daniel],
    country: 'SG', currency: 'SGD', contractValueMinor: 3_800_000,
    startDate: '2025-07-01', targetEndDate: '2025-08-31', actualEndDate: '2025-08-29',
    baseline: freezeBaseline({
      key: 'a', projectId: PROJECT_IDS.a, quotationId: 'qtn-a',
      frozenAt: '2025-06-20T02:00:00Z', feeMinor: 3_800_000,
      estExternalMinor: 0, estExpenseMinor: 0,
    }),
    isProBono: false, riskFlags: [],
  },
  {
    // §6.9 B. Six-month spatial activation, fee 180,000, external 80,000.
    ...stamp(PROJECT_IDS.b),
    code: 'OE-2502', name: 'Tidal Pavilion', clientId: 'cli-tidal',
    projectType: 'spatial_activation', serviceLine: 'spatial_activation', status: 'completed',
    leadId: 'usr-sofia', teamIds: [PERSON_IDS.ryan, PERSON_IDS.sofia, PERSON_IDS.mei, PERSON_IDS.daniel],
    country: 'SG', currency: 'SGD', contractValueMinor: 18_000_000,
    startDate: '2025-07-01', targetEndDate: '2025-12-31', actualEndDate: '2025-12-19',
    baseline: freezeBaseline({
      key: 'b', projectId: PROJECT_IDS.b, quotationId: 'qtn-b',
      frozenAt: '2025-06-24T02:00:00Z', feeMinor: 18_000_000,
      // Fabricator 65,000 + lighting designer 8,000 external; 7,000 travel and
      // materials as expenses (§6.9 B: external total 80,000).
      estExternalMinor: 7_300_000, estExpenseMinor: 700_000,
      externalPhaseName: 'Fabrication coordination',
    }),
    isProBono: false, riskFlags: [],
  },
  {
    // §6.9 C. Twelve-month festival development, fee 420,000.
    ...stamp(PROJECT_IDS.c),
    code: 'OE-2503', name: 'Lumen Festival', clientId: 'cli-lumen',
    projectType: 'festival', serviceLine: 'festival', status: 'active',
    leadId: 'usr-ryan', teamIds: TEAM_ALL,
    country: 'SG', currency: 'SGD', contractValueMinor: 42_000_000,
    startDate: '2025-07-01', targetEndDate: '2026-06-30',
    baseline: freezeBaseline({
      key: 'c', projectId: PROJECT_IDS.c, quotationId: 'qtn-c',
      frozenAt: '2025-06-18T02:00:00Z', feeMinor: 42_000_000,
      // Curator retainer 48,000 + production partner 120,000 + comms designer
      // 25,000 external; 30,000 expenses (§6.9 C: 223,000 total).
      estExternalMinor: 19_300_000, estExpenseMinor: 3_000_000,
      externalPhaseName: 'Production planning',
    }),
    isProBono: false, riskFlags: [],
  },
  {
    // §6.9 D. Small fast-turnaround brand sprint, fee 12,000.
    ...stamp(PROJECT_IDS.d),
    code: 'OE-2504', name: 'Ember Sprint', clientId: 'cli-ember',
    projectType: 'branding', serviceLine: 'brand_identity', status: 'completed',
    leadId: 'usr-sofia', teamIds: [PERSON_IDS.sofia, PERSON_IDS.mei],
    country: 'SG', currency: 'SGD', contractValueMinor: 1_200_000,
    startDate: '2025-09-01', targetEndDate: '2025-09-26', actualEndDate: '2025-09-26',
    baseline: freezeBaseline({
      key: 'd', projectId: PROJECT_IDS.d, quotationId: 'qtn-d',
      frozenAt: '2025-08-22T02:00:00Z', feeMinor: 1_200_000,
      estExternalMinor: 0, estExpenseMinor: 0,
    }),
    isProBono: false, riskFlags: [],
  },
  {
    // §6.9 E. High-value project that becomes loss-making: fee 250,000 after a
    // 15% discount, seven revision rounds against three included, a five-month
    // extension, and no variation raised. The legacy lens reads 52% while the
    // project loses money; that gap is the reason this platform exists.
    ...stamp(PROJECT_IDS.e),
    code: 'OE-2505', name: 'Northwind Flagship', clientId: 'cli-northwind',
    projectType: 'branding', serviceLine: 'brand_identity', status: 'completed',
    leadId: 'usr-ryan', teamIds: TEAM_ALL,
    country: 'SG', currency: 'SGD', contractValueMinor: 25_000_000,
    startDate: '2025-07-01', targetEndDate: '2025-10-31', actualEndDate: '2026-03-31',
    baseline: freezeBaseline({
      key: 'e', projectId: PROJECT_IDS.e, quotationId: 'qtn-e',
      frozenAt: '2025-06-27T02:00:00Z', feeMinor: 25_000_000,
      estExternalMinor: 9_500_000, estExpenseMinor: 1_800_000,
      externalPhaseName: 'Implementation',
    }),
    isProBono: false, discountAppliedPct: 0.15,
    riskFlags: [
      { key: 'revision_overrun', label: 'Seven revision rounds against three included', severity: 'attention', raisedAt: '2025-11-14' },
      { key: 'missing_variation', label: 'Scope grew with no variation raised', severity: 'attention', raisedAt: '2025-12-05' },
      { key: 'margin_erosion', label: 'Forecast margin below zero', severity: 'attention', raisedAt: '2026-01-16' },
    ],
    retrospectiveId: 'ret-e',
  },
  {
    // Active and trending to overrun: hours consumed run well ahead of the
    // timeline (§10: at least 15 points ahead of schedule elapsed).
    ...stamp(PROJECT_IDS.f),
    code: 'OE-2601', name: 'Kite Quarter Placemaking', clientId: 'cli-kite',
    projectType: 'spatial_activation', serviceLine: 'placemaking', status: 'active',
    leadId: 'usr-ryan', teamIds: TEAM_ALL,
    country: 'SG', currency: 'SGD', contractValueMinor: 16_500_000,
    startDate: '2026-02-02', targetEndDate: '2026-10-30',
    baseline: freezeBaseline({
      key: 'f', projectId: PROJECT_IDS.f, quotationId: 'qtn-f',
      frozenAt: '2026-01-23T02:00:00Z', feeMinor: 16_500_000,
      estExternalMinor: 2_000_000, estExpenseMinor: 500_000,
      externalPhaseName: 'Fabrication coordination',
    }),
    isProBono: false,
    riskFlags: [
      { key: 'overrun_trend', label: 'Hours consumed ahead of timeline', severity: 'attention', raisedAt: '2026-06-12' },
    ],
  },
  {
    // The USD-denominated project (§10). Wei Ming's single project lead.
    ...stamp(PROJECT_IDS.g),
    code: 'OE-2602', name: 'Saltwater Atelier Identity', clientId: 'cli-saltwater',
    projectType: 'branding', serviceLine: 'brand_identity', status: 'active',
    leadId: 'usr-weiming',
    teamIds: [PERSON_IDS.sofia, PERSON_IDS.weiming, PERSON_IDS.mei],
    country: 'US', currency: 'USD', contractValueMinor: 6_000_000,
    startDate: '2026-04-01', targetEndDate: '2026-08-31',
    baseline: freezeBaseline({
      key: 'g', projectId: PROJECT_IDS.g, quotationId: 'qtn-g',
      frozenAt: '2026-03-20T02:00:00Z', feeMinor: 6_000_000,
      estExternalMinor: 0, estExpenseMinor: 0,
    }),
    isProBono: false, riskFlags: [],
  },
  {
    // Third healthy active project.
    ...stamp(PROJECT_IDS.h),
    code: 'OE-2603', name: 'Civic Commons Exhibition', clientId: 'cli-civic',
    projectType: 'exhibition', serviceLine: 'exhibition', status: 'active',
    leadId: 'usr-sofia',
    teamIds: [PERSON_IDS.sofia, PERSON_IDS.weiming, PERSON_IDS.mei, PERSON_IDS.daniel],
    country: 'SG', currency: 'SGD', contractValueMinor: 9_000_000,
    startDate: '2026-03-02', targetEndDate: '2026-12-18',
    baseline: freezeBaseline({
      key: 'h', projectId: PROJECT_IDS.h, quotationId: 'qtn-h',
      frozenAt: '2026-02-20T02:00:00Z', feeMinor: 9_000_000,
      estExternalMinor: 900_000, estExpenseMinor: 200_000,
      externalPhaseName: 'Technical development',
    }),
    isProBono: false, riskFlags: [],
  },
  {
    // Opportunity in estimating with a draft quotation (§10): the Plan & Quote
    // demo and preemptive forecasting subject. No baseline until acceptance.
    ...stamp(PROJECT_IDS.i),
    code: 'OE-2604', name: 'Harbourline Museum', clientId: 'cli-harbourline',
    projectType: 'creative_strategy', serviceLine: 'experience_design', status: 'estimating',
    leadId: 'usr-ryan', teamIds: [PERSON_IDS.ryan, PERSON_IDS.sofia, PERSON_IDS.priya],
    country: 'SG', currency: 'SGD', probability: 0.6, contractValueMinor: 26_500_000,
    startDate: '2026-09-01', targetEndDate: '2027-08-31',
    isProBono: false, riskFlags: [],
  },
  {
    // On hold since January 2026; one invoice sits overdue.
    ...stamp(PROJECT_IDS.j),
    code: 'OE-2510', name: 'Verdant Walk', clientId: 'cli-verdant',
    projectType: 'spatial_activation', serviceLine: 'placemaking', status: 'on_hold',
    leadId: 'usr-priya', teamIds: [PERSON_IDS.priya, PERSON_IDS.weiming],
    country: 'SG', currency: 'SGD', contractValueMinor: 4_500_000,
    startDate: '2025-10-01', targetEndDate: '2026-03-31',
    baseline: freezeBaseline({
      key: 'j', projectId: PROJECT_IDS.j, quotationId: 'qtn-j',
      frozenAt: '2025-09-19T02:00:00Z', feeMinor: 4_500_000,
      estExternalMinor: 0, estExpenseMinor: 0,
    }),
    isProBono: false,
    riskFlags: [
      { key: 'client_pause', label: 'Client paused the programme pending funding', severity: 'watch', raisedAt: '2026-01-09' },
    ],
  },
  {
    // Lost at quotation.
    ...stamp(PROJECT_IDS.k),
    code: 'OE-2511', name: 'Auric Hotels Identity', clientId: 'cli-auric',
    projectType: 'branding', serviceLine: 'brand_identity', status: 'lost',
    leadId: 'usr-ryan', teamIds: [PERSON_IDS.ryan, PERSON_IDS.sofia],
    country: 'SG', currency: 'SGD', probability: 0, contractValueMinor: 9_500_000,
    startDate: '2025-11-03', targetEndDate: '2026-02-27',
    isProBono: false, riskFlags: [],
  },
  {
    // Pro bono (§10). Fee zero; effort is real and visible.
    ...stamp(PROJECT_IDS.l),
    code: 'OE-2512', name: 'Open Studio Youth Programme', clientId: 'cli-youtharts',
    projectType: 'creative_strategy', serviceLine: 'community_engagement', status: 'completed',
    leadId: 'usr-priya',
    teamIds: [PERSON_IDS.weiming, PERSON_IDS.mei, PERSON_IDS.daniel],
    country: 'SG', currency: 'SGD', contractValueMinor: 0,
    startDate: '2026-01-05', targetEndDate: '2026-02-27', actualEndDate: '2026-02-27',
    baseline: freezeBaseline({
      key: 'l', projectId: PROJECT_IDS.l, quotationId: 'qtn-l',
      frozenAt: '2025-12-15T02:00:00Z', feeMinor: 0,
      estExternalMinor: 0, estExpenseMinor: 0,
    }),
    isProBono: true, riskFlags: [],
  },
];

// ---------------------------------------------------------------------------
// Deliverables (sample rows)
// ---------------------------------------------------------------------------

export const DELIVERABLES: Deliverable[] = [
  { ...stamp('dlv-a-1'), phaseId: 'ph-a-6', name: 'Logo suite', status: 'accepted', estHours: 40, acceptedAt: '2025-08-15' },
  { ...stamp('dlv-a-2'), phaseId: 'ph-a-6', name: 'Typography and colour system', status: 'accepted', estHours: 30, acceptedAt: '2025-08-15' },
  { ...stamp('dlv-a-3'), phaseId: 'ph-a-8', name: 'Brand guidelines', status: 'accepted', estHours: 24, acceptedAt: '2025-08-29' },
  { ...stamp('dlv-b-1'), phaseId: 'ph-b-5', name: 'Pavilion spatial design package', status: 'accepted', estHours: 120, acceptedAt: '2025-10-24' },
  { ...stamp('dlv-f-1'), phaseId: 'ph-f-4', name: 'Wayfinding concept', status: 'in_progress', estHours: 60 },
  { ...stamp('dlv-c-1'), phaseId: 'ph-c-7', name: 'Festival identity toolkit', status: 'delivered', estHours: 80 },
];

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export const MILESTONES: Milestone[] = [
  { ...stamp('ms-b-1'), projectId: PROJECT_IDS.b, phaseId: 'ph-b-7', name: 'Fabrication complete', dueDate: '2025-11-28', status: 'accepted', isBillingTrigger: true },
  { ...stamp('ms-b-2'), projectId: PROJECT_IDS.b, phaseId: 'ph-b-8', name: 'Installation complete', dueDate: '2025-12-15', status: 'accepted', isBillingTrigger: true },
  { ...stamp('ms-c-1'), projectId: PROJECT_IDS.c, phaseId: 'ph-c-3', name: 'Curatorial concept approved', dueDate: '2025-10-15', status: 'accepted', isBillingTrigger: true },
  { ...stamp('ms-c-2'), projectId: PROJECT_IDS.c, phaseId: 'ph-c-9', name: 'Programme launch', dueDate: '2026-05-30', status: 'accepted', isBillingTrigger: true },
  { ...stamp('ms-c-3'), projectId: PROJECT_IDS.c, phaseId: 'ph-c-9', name: 'Festival delivery', dueDate: '2026-06-26', status: 'reached', isBillingTrigger: false },
  { ...stamp('ms-e-1'), projectId: PROJECT_IDS.e, phaseId: 'ph-e-5', name: 'Concept approval', dueDate: '2025-09-12', status: 'accepted', isBillingTrigger: true },
  { ...stamp('ms-e-2'), projectId: PROJECT_IDS.e, phaseId: 'ph-e-9', name: 'Final delivery', dueDate: '2026-03-27', status: 'accepted', isBillingTrigger: true },
  { ...stamp('ms-f-1'), projectId: PROJECT_IDS.f, phaseId: 'ph-f-4', name: 'Concept sign-off', dueDate: '2026-03-31', status: 'accepted', isBillingTrigger: true },
  { ...stamp('ms-f-2'), projectId: PROJECT_IDS.f, phaseId: 'ph-f-7', name: 'Fabrication start', dueDate: '2026-07-15', status: 'pending', isBillingTrigger: true },
];

// ---------------------------------------------------------------------------
// Variations. One active project carries them (Kite Quarter). Project E has
// none by design: that absence is its story (§6.9 E).
// ---------------------------------------------------------------------------

export const VARIATIONS: Variation[] = [
  {
    ...stamp('var-f-1', 'usr-ryan'),
    projectId: PROJECT_IDS.f,
    description: 'Additional wayfinding suite for the north precinct',
    feeDeltaMinor: 1_500_000,
    hoursDelta: 60,
    affectedPhaseIds: ['ph-f-5', 'ph-f-7'],
    status: 'approved',
    approvedByUserId: 'usr-ryan',
    approvedAt: '2026-05-04',
    raisedFromAlertId: 'al-f-overrun',
  },
  {
    ...stamp('var-f-2', 'usr-ryan'),
    projectId: PROJECT_IDS.f,
    description: 'Extended community consultation round',
    feeDeltaMinor: 800_000,
    hoursDelta: 40,
    affectedPhaseIds: ['ph-f-3'],
    status: 'draft',
  },
];

// ---------------------------------------------------------------------------
// Direct expenses (§5.4 states: planned, committed, actual)
// ---------------------------------------------------------------------------

export const DIRECT_EXPENSES: DirectExpense[] = [
  // §6.9 B: 7,000 travel and materials.
  { ...stamp('dx-b-1', 'usr-daniel'), projectId: PROJECT_IDS.b, phaseId: 'ph-b-8', category: 'travel', description: 'Install week travel and materials', amountMinor: 700_000, currency: 'SGD', sgdRate: 1, date: '2025-11-14', state: 'actual' },
  // §6.9 C: 30,000 expenses across the year.
  { ...stamp('dx-c-1', 'usr-daniel'), projectId: PROJECT_IDS.c, phaseId: 'ph-c-8', category: 'production', description: 'Programme staging equipment', amountMinor: 1_200_000, currency: 'SGD', sgdRate: 1, date: '2025-12-05', state: 'actual' },
  { ...stamp('dx-c-2', 'usr-daniel'), projectId: PROJECT_IDS.c, phaseId: 'ph-c-6', category: 'travel', description: 'Stakeholder roadshow travel', amountMinor: 1_000_000, currency: 'SGD', sgdRate: 1, date: '2026-03-10', state: 'actual' },
  { ...stamp('dx-c-3', 'usr-daniel'), projectId: PROJECT_IDS.c, phaseId: 'ph-c-7', category: 'licence', description: 'Festival content licences', amountMinor: 800_000, currency: 'SGD', sgdRate: 1, date: '2026-05-22', state: 'actual' },
  // §6.9 E: expenses crept from 18,000 baseline to 25,000 actual.
  { ...stamp('dx-e-1', 'usr-daniel'), projectId: PROJECT_IDS.e, phaseId: 'ph-e-9', category: 'production', description: 'Flagship launch production', amountMinor: 1_500_000, currency: 'SGD', sgdRate: 1, date: '2025-11-21', state: 'actual' },
  { ...stamp('dx-e-2', 'usr-daniel'), projectId: PROJECT_IDS.e, phaseId: 'ph-e-9', category: 'travel', description: 'Regional store visits during extension', amountMinor: 1_000_000, currency: 'SGD', sgdRate: 1, date: '2026-01-16', state: 'actual' },
  // Kite Quarter.
  { ...stamp('dx-f-1', 'usr-daniel'), projectId: PROJECT_IDS.f, phaseId: 'ph-f-7', category: 'production', description: 'Prototype hoarding graphics', amountMinor: 300_000, currency: 'SGD', sgdRate: 1, date: '2026-05-12', state: 'committed' },
  { ...stamp('dx-f-2', 'usr-daniel'), projectId: PROJECT_IDS.f, phaseId: 'ph-f-2', category: 'travel', description: 'Site study travel', amountMinor: 150_000, currency: 'SGD', sgdRate: 1, date: '2026-04-21', state: 'actual' },
  // Civic Commons, still ahead.
  { ...stamp('dx-h-1', 'usr-daniel'), projectId: PROJECT_IDS.h, phaseId: 'ph-h-6', category: 'production', description: 'Exhibition material samples', amountMinor: 200_000, currency: 'SGD', sgdRate: 1, date: '2026-08-01', state: 'planned' },
];

// ---------------------------------------------------------------------------
// Revenue items (§6.8: recognised is the profitability lens) and invoices
// ---------------------------------------------------------------------------

export const REVENUE_ITEMS: RevenueItem[] = [
  { ...stamp('rv-a-1', 'usr-daniel'), projectId: PROJECT_IDS.a, type: 'fee', amountMinor: 1_900_000, currency: 'SGD', plannedDate: '2025-07-31', recognitionTrigger: 'phase_complete', recognisedAt: '2025-07-31', invoiceId: 'inv-a-1' },
  { ...stamp('rv-a-2', 'usr-daniel'), projectId: PROJECT_IDS.a, type: 'fee', amountMinor: 1_900_000, currency: 'SGD', plannedDate: '2025-08-29', recognitionTrigger: 'phase_complete', recognisedAt: '2025-08-29', invoiceId: 'inv-a-2' },
  { ...stamp('rv-b-1', 'usr-daniel'), projectId: PROJECT_IDS.b, type: 'milestone', amountMinor: 4_500_000, currency: 'SGD', plannedDate: '2025-08-29', recognitionTrigger: 'milestone_accepted', recognisedAt: '2025-08-29', invoiceId: 'inv-b-1' },
  { ...stamp('rv-b-2', 'usr-daniel'), projectId: PROJECT_IDS.b, type: 'milestone', amountMinor: 4_500_000, currency: 'SGD', plannedDate: '2025-10-31', recognitionTrigger: 'milestone_accepted', recognisedAt: '2025-10-31', invoiceId: 'inv-b-2' },
  { ...stamp('rv-b-3', 'usr-daniel'), projectId: PROJECT_IDS.b, type: 'milestone', amountMinor: 6_000_000, currency: 'SGD', plannedDate: '2025-11-28', recognitionTrigger: 'milestone_accepted', recognisedAt: '2025-11-28', invoiceId: 'inv-b-2' },
  { ...stamp('rv-b-4', 'usr-daniel'), projectId: PROJECT_IDS.b, type: 'milestone', amountMinor: 3_000_000, currency: 'SGD', plannedDate: '2025-12-19', recognitionTrigger: 'milestone_accepted', recognisedAt: '2025-12-19', invoiceId: 'inv-b-2' },
  // C recognises straight-line across its twelve retainer-like months.
  { ...stamp('rv-c-1', 'usr-daniel'), projectId: PROJECT_IDS.c, type: 'fee', amountMinor: 42_000_000, currency: 'SGD', plannedDate: '2026-06-30', recognitionTrigger: 'straight_line', startPeriod: '2025-07', endPeriod: '2026-06' },
  { ...stamp('rv-d-1', 'usr-daniel'), projectId: PROJECT_IDS.d, type: 'fee', amountMinor: 1_200_000, currency: 'SGD', plannedDate: '2025-09-26', recognitionTrigger: 'as_delivered', recognisedAt: '2025-09-26', invoiceId: 'inv-d-1' },
  { ...stamp('rv-e-1', 'usr-daniel'), projectId: PROJECT_IDS.e, type: 'milestone', amountMinor: 10_000_000, currency: 'SGD', plannedDate: '2025-09-12', recognitionTrigger: 'milestone_accepted', recognisedAt: '2025-09-12', invoiceId: 'inv-e-1' },
  { ...stamp('rv-e-2', 'usr-daniel'), projectId: PROJECT_IDS.e, type: 'milestone', amountMinor: 7_500_000, currency: 'SGD', plannedDate: '2025-12-19', recognitionTrigger: 'milestone_accepted', recognisedAt: '2025-12-19', invoiceId: 'inv-e-2' },
  { ...stamp('rv-e-3', 'usr-daniel'), projectId: PROJECT_IDS.e, type: 'milestone', amountMinor: 7_500_000, currency: 'SGD', plannedDate: '2026-03-27', recognitionTrigger: 'milestone_accepted', recognisedAt: '2026-03-27', invoiceId: 'inv-e-3' },
  { ...stamp('rv-f-1', 'usr-daniel'), projectId: PROJECT_IDS.f, type: 'milestone', amountMinor: 4_000_000, currency: 'SGD', plannedDate: '2026-03-31', recognitionTrigger: 'milestone_accepted', recognisedAt: '2026-03-31', invoiceId: 'inv-f-1' },
  { ...stamp('rv-f-2', 'usr-daniel'), projectId: PROJECT_IDS.f, type: 'milestone', amountMinor: 4_000_000, currency: 'SGD', plannedDate: '2026-05-29', recognitionTrigger: 'milestone_accepted', recognisedAt: '2026-05-29', invoiceId: 'inv-f-2' },
  { ...stamp('rv-f-3', 'usr-daniel'), projectId: PROJECT_IDS.f, type: 'milestone', amountMinor: 8_500_000, currency: 'SGD', plannedDate: '2026-09-30', recognitionTrigger: 'milestone_accepted' },
  { ...stamp('rv-f-4', 'usr-daniel'), projectId: PROJECT_IDS.f, type: 'variation', amountMinor: 1_500_000, currency: 'SGD', plannedDate: '2026-09-30', recognitionTrigger: 'milestone_accepted' },
  { ...stamp('rv-g-1', 'usr-daniel'), projectId: PROJECT_IDS.g, type: 'milestone', amountMinor: 2_500_000, currency: 'USD', plannedDate: '2026-05-15', recognitionTrigger: 'milestone_accepted', recognisedAt: '2026-05-15', invoiceId: 'inv-g-1' },
  { ...stamp('rv-g-2', 'usr-daniel'), projectId: PROJECT_IDS.g, type: 'milestone', amountMinor: 3_500_000, currency: 'USD', plannedDate: '2026-08-31', recognitionTrigger: 'milestone_accepted' },
  { ...stamp('rv-h-1', 'usr-daniel'), projectId: PROJECT_IDS.h, type: 'milestone', amountMinor: 3_000_000, currency: 'SGD', plannedDate: '2026-05-08', recognitionTrigger: 'milestone_accepted', recognisedAt: '2026-05-08', invoiceId: 'inv-h-1' },
  { ...stamp('rv-h-2', 'usr-daniel'), projectId: PROJECT_IDS.h, type: 'milestone', amountMinor: 6_000_000, currency: 'SGD', plannedDate: '2026-09-30', recognitionTrigger: 'milestone_accepted' },
  { ...stamp('rv-j-1', 'usr-daniel'), projectId: PROJECT_IDS.j, type: 'milestone', amountMinor: 1_500_000, currency: 'SGD', plannedDate: '2025-12-12', recognitionTrigger: 'milestone_accepted', recognisedAt: '2025-12-12', invoiceId: 'inv-j-1' },
  { ...stamp('rv-j-2', 'usr-daniel'), projectId: PROJECT_IDS.j, type: 'milestone', amountMinor: 3_000_000, currency: 'SGD', plannedDate: '2026-03-31', recognitionTrigger: 'milestone_accepted' },
];

function invoice(
  id: string, projectId: string, number: string, issuedDate: CalendarDate,
  amountMinor: number, gstMinor: number, status: Invoice['status'],
  paidDate?: CalendarDate, currency = 'SGD',
): Invoice {
  return {
    ...stamp(id, 'usr-daniel'), projectId, number, issuedDate, amountMinor,
    gstMinor, currency, status, ...(paidDate ? { paidDate } : {}),
  };
}

export const INVOICES: Invoice[] = [
  invoice('inv-a-1', PROJECT_IDS.a, 'OE-INV-25071', '2025-07-31', 1_900_000, 171_000, 'paid', '2025-08-21'),
  invoice('inv-a-2', PROJECT_IDS.a, 'OE-INV-25082', '2025-08-29', 1_900_000, 171_000, 'paid', '2025-09-25'),
  invoice('inv-b-1', PROJECT_IDS.b, 'OE-INV-25083', '2025-08-29', 4_500_000, 405_000, 'paid', '2025-09-30'),
  invoice('inv-b-2', PROJECT_IDS.b, 'OE-INV-25124', '2025-12-19', 13_500_000, 1_215_000, 'paid', '2026-01-30'),
  invoice('inv-c-1', PROJECT_IDS.c, 'OE-INV-25091', '2025-09-30', 10_500_000, 945_000, 'paid', '2025-11-14'),
  invoice('inv-c-2', PROJECT_IDS.c, 'OE-INV-26011', '2026-01-30', 10_500_000, 945_000, 'paid', '2026-03-13'),
  invoice('inv-c-3', PROJECT_IDS.c, 'OE-INV-26051', '2026-05-29', 10_500_000, 945_000, 'sent'),
  invoice('inv-d-1', PROJECT_IDS.d, 'OE-INV-25092', '2025-09-26', 1_200_000, 108_000, 'paid', '2025-10-08'),
  invoice('inv-e-1', PROJECT_IDS.e, 'OE-INV-25093', '2025-09-12', 10_000_000, 900_000, 'paid', '2025-11-07'),
  invoice('inv-e-2', PROJECT_IDS.e, 'OE-INV-25125', '2025-12-19', 7_500_000, 675_000, 'paid', '2026-02-13'),
  invoice('inv-e-3', PROJECT_IDS.e, 'OE-INV-26031', '2026-03-27', 7_500_000, 675_000, 'paid', '2026-05-22'),
  invoice('inv-f-1', PROJECT_IDS.f, 'OE-INV-26032', '2026-03-31', 4_000_000, 360_000, 'paid', '2026-04-28'),
  invoice('inv-f-2', PROJECT_IDS.f, 'OE-INV-26052', '2026-05-29', 4_000_000, 360_000, 'sent'),
  invoice('inv-g-1', PROJECT_IDS.g, 'OE-INV-26053', '2026-05-15', 2_500_000, 0, 'sent', undefined, 'USD'),
  invoice('inv-h-1', PROJECT_IDS.h, 'OE-INV-26054', '2026-05-08', 3_000_000, 270_000, 'sent'),
  invoice('inv-j-1', PROJECT_IDS.j, 'OE-INV-25126', '2025-12-12', 1_500_000, 135_000, 'overdue'),
];

// ---------------------------------------------------------------------------
// Alerts, retrospectives, benchmarks, capacity
// ---------------------------------------------------------------------------

export const ALERTS: Alert[] = [
  {
    ...stamp('al-f-overrun'),
    type: 'overrun_trend', severity: 'attention',
    subjectType: 'project', subjectId: PROJECT_IDS.f,
    firedAt: '2026-06-12T01:00:00Z', state: 'open',
    evidence: { hoursConsumedPct: 0.74, timelineElapsedPct: 0.55 },
    suggestedAction: 'Review remaining phase estimates and raise a variation where scope has grown.',
  },
  {
    ...stamp('al-e-margin'),
    type: 'margin_erosion', severity: 'attention',
    subjectType: 'project', subjectId: PROJECT_IDS.e,
    firedAt: '2026-01-16T01:00:00Z', state: 'resolved',
    evidence: { forecastGrossMargin: -0.025, revisionRounds: 7, includedRounds: 3 },
    suggestedAction: 'The retrospective captures what this project should teach the next quotation.',
  },
  {
    ...stamp('al-j-invoice'),
    type: 'invoice_overdue', severity: 'watch',
    subjectType: 'project', subjectId: PROJECT_IDS.j,
    firedAt: '2026-01-30T01:00:00Z', state: 'open',
    evidence: { invoiceId: 'inv-j-1', daysOverdue: 140 },
  },
];

export const RETROSPECTIVES: Retrospective[] = [
  {
    ...stamp('ret-e', 'usr-ryan'),
    projectId: PROJECT_IDS.e,
    whatOverran: 'Identity design and implementation absorbed seven revision rounds against three included. Designer hours reached 500 against 300 baselined.',
    whyNotes: 'Approval authority sat two levels above our day-to-day contact, and each round reopened earlier decisions. No variation was raised while goodwill carried the relationship.',
    clientFactors: 'Delayed decisions, shifting stakeholders, discount agreed at the start compressed the buffer.',
    pricingLesson: 'Price revision rounds explicitly and raise the variation on round four. The legacy third-party margin read 52% while the project lost money; only the gross margin lens told the truth.',
    wouldQuoteAgainAtMinor: 32_500_000,
    authorUserId: 'usr-ryan',
    completedAt: '2026-04-15',
  },
];

// Benchmarks are emitted at financial closure (§5.5). Nothing in the window is
// financially closed yet, so the register starts empty.
export const BENCHMARKS: Benchmark[] = [];

export const CAPACITY_ALLOCATIONS: CapacityAllocation[] = [
  { ...stamp('cap-1'), personId: PERSON_IDS.mei, projectId: PROJECT_IDS.f, phaseId: 'ph-f-5', isoWeek: '2026-W28', plannedHours: 24, tentative: false },
  { ...stamp('cap-2'), personId: PERSON_IDS.weiming, projectId: PROJECT_IDS.g, phaseId: 'ph-g-6', isoWeek: '2026-W28', plannedHours: 30, tentative: false },
  { ...stamp('cap-3'), personId: PERSON_IDS.daniel, projectId: PROJECT_IDS.f, phaseId: 'ph-f-7', isoWeek: '2026-W29', plannedHours: 20, tentative: true },
  { ...stamp('cap-4'), personId: PERSON_IDS.sofia, projectId: PROJECT_IDS.h, phaseId: 'ph-h-4', isoWeek: '2026-W28', plannedHours: 16, tentative: false },
];
