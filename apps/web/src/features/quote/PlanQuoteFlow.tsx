// Plan & Quote workbench (§8.1, client direction items 7 and 8): one screen
// where particulars, structure, effort, externals, the price ladder and the
// scenarios sit together and respond to each other live. Every figure is
// computed by @oe/finance in the browser (R1), the same package that will
// compute it on the server. Approval freezes the chosen model as the project's
// baseline and hands the structure to staffing.

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  priceLadder, applyDiscount, buildScenario, toMinor,
  type PricingInputs, type Scenario,
} from '@oe/finance';
import { RATE_CARD, AVAILABLE_RATE_CARD } from '@oe/fixtures';
import { useAccount } from '../../stores/session';
import { getQuotations, getTemplates } from '../../api/queries';
import { convertQuoteToProject } from '../../api/projectOps';
import { todayStr } from '../../api/settings';
import { Banner, Button, Card, PageHeader, Stat, LedgerTable, Td, Th } from '../../components/ui';
import { fmtDate, fmtMoneyWhole, fmtPct } from '../../lib/format';

// The same six roles as the effort grid has always carried.
const ROLES: { key: string; label: string }[] = [
  { key: 'founder', label: 'Founder' },
  { key: 'creative_director', label: 'Creative director' },
  { key: 'account_director', label: 'Account director' },
  { key: 'account_manager', label: 'Account manager' },
  { key: 'designer', label: 'Designer' },
  { key: 'associate_creative_producer', label: 'Assoc. creative producer' },
];

// Overhead recovery basis (§6.6): monthly overhead 12,000 over the team's
// monthly productive hours (5 × 1,452.8 + 1,120 = 8,384 a year).
const OVERHEAD_PER_PRODUCTIVE_HOUR_MINOR = Math.round(12_000_00 / (8384 / 12));

// ---------------------------------------------------------------------------
// Structure: a PHASE is a named stage of the project; the SCOPE OF WORK is the
// hours each role carries inside that phase. The two are edited together but
// they are not the same thing, and the UI keeps them visually distinct.
// ---------------------------------------------------------------------------

type RoleHours = Record<string, number>;

interface PhaseRow {
  id: string;
  name: string;
  hours: RoleHours; // scope of work per role within the phase
}

let rowSeq = 0;
const nextId = (prefix: string) => `${prefix}-${++rowSeq}`;

interface StructureTemplate {
  key: string;
  label: string;
  phases: { name: string; hours: RoleHours }[];
}

// Six studio templates, defined here as activation presets (client direction,
// item 7). Applying one replaces the whole structure and its scope of work.
const LOCAL_TEMPLATES: StructureTemplate[] = [
  {
    key: 'standard_branding',
    label: 'Standard branding',
    phases: [
      { name: 'Discovery', hours: { founder: 8, creative_director: 12, account_director: 16 } },
      { name: 'Research', hours: { account_director: 24, associate_creative_producer: 20 } },
      { name: 'Strategy', hours: { founder: 12, creative_director: 32, account_director: 24 } },
      { name: 'Concept development', hours: { creative_director: 48, designer: 64, associate_creative_producer: 16 } },
      { name: 'Identity design', hours: { creative_director: 24, designer: 80 } },
      { name: 'Applications', hours: { designer: 60, associate_creative_producer: 20 } },
      { name: 'Guidelines', hours: { designer: 32, account_manager: 12 } },
      { name: 'Project management', hours: { account_director: 32, account_manager: 40 } },
    ],
  },
  {
    key: 'festival_creative',
    label: 'Festival creative',
    phases: [
      { name: 'Research', hours: { account_director: 24, associate_creative_producer: 24 } },
      { name: 'Curatorial concept', hours: { founder: 16, creative_director: 48 } },
      { name: 'Programme development', hours: { creative_director: 32, associate_creative_producer: 48 } },
      { name: 'Identity & communications', hours: { creative_director: 24, designer: 72 } },
      { name: 'Production planning', hours: { associate_creative_producer: 56, account_manager: 24 } },
      { name: 'Delivery', hours: { creative_director: 24, designer: 32, associate_creative_producer: 64 } },
      { name: 'Project management', hours: { account_director: 48, account_manager: 40 } },
    ],
  },
  {
    key: 'creative_direction',
    label: 'Creative direction',
    phases: [
      { name: 'Discovery', hours: { founder: 10, creative_director: 16 } },
      { name: 'Creative audit', hours: { creative_director: 24, designer: 12 } },
      { name: 'Direction setting', hours: { founder: 12, creative_director: 40 } },
      { name: 'Concept development', hours: { creative_director: 48, designer: 40 } },
      { name: 'Creative oversight', hours: { creative_director: 60 } },
      { name: 'Presentation', hours: { founder: 6, creative_director: 12, designer: 12 } },
      { name: 'Project management', hours: { account_manager: 32 } },
    ],
  },
  {
    key: 'design',
    label: 'Design',
    phases: [
      { name: 'Briefing', hours: { creative_director: 8, account_manager: 8 } },
      { name: 'Concept development', hours: { creative_director: 24, designer: 48 } },
      { name: 'Design development', hours: { designer: 80 } },
      { name: 'Revisions', hours: { creative_director: 8, designer: 32 } },
      { name: 'Artwork and handover', hours: { designer: 24, associate_creative_producer: 8 } },
      { name: 'Project management', hours: { account_manager: 24 } },
    ],
  },
  {
    key: 'production',
    label: 'Production',
    phases: [
      { name: 'Technical development', hours: { associate_creative_producer: 40, designer: 24 } },
      { name: 'Fabrication coordination', hours: { associate_creative_producer: 48 } },
      { name: 'Installation', hours: { associate_creative_producer: 40, designer: 16 } },
      { name: 'On-site support', hours: { associate_creative_producer: 32, account_manager: 16 } },
      { name: 'Documentation', hours: { designer: 16, associate_creative_producer: 8 } },
    ],
  },
  {
    key: 'rollout',
    label: 'Rollout',
    phases: [
      { name: 'Asset adaptation', hours: { designer: 48 } },
      { name: 'Channel rollout', hours: { designer: 32, account_manager: 24 } },
      { name: 'Guidelines handover', hours: { account_director: 8, designer: 12 } },
      { name: 'Support', hours: { account_manager: 16, designer: 8 } },
    ],
  },
];

// The creative strategy structure the flow has always opened with.
const INITIAL_PHASES: { name: string; hours: RoleHours }[] = [
  { name: 'Discovery', hours: { founder: 8, creative_director: 16, account_director: 20, designer: 8 } },
  { name: 'Research', hours: { account_director: 30, designer: 20, associate_creative_producer: 24 } },
  { name: 'Audience analysis', hours: { account_director: 24, associate_creative_producer: 20 } },
  { name: 'Strategic development', hours: { founder: 16, creative_director: 40, account_director: 30 } },
  { name: 'Concept creation', hours: { creative_director: 60, designer: 80, associate_creative_producer: 30 } },
  { name: 'Recommendations', hours: { founder: 8, creative_director: 24, account_director: 16 } },
  { name: 'Presentation', hours: { founder: 6, creative_director: 12, account_director: 10, designer: 16 } },
  { name: 'Refinement', hours: { creative_director: 20, designer: 30 } },
  { name: 'Project management', hours: { account_director: 40, associate_creative_producer: 30 } },
];

function makePhases(src: { name: string; hours: RoleHours }[]): PhaseRow[] {
  return src.map((p) => ({ id: nextId('ph'), name: p.name, hours: { ...p.hours } }));
}

// ---------------------------------------------------------------------------
// Externals: an itemised list of collaborators and suppliers at what OuterEdit
// pays (§6.10 step 4). Mark-up exists only in the ladder (R9).
// ---------------------------------------------------------------------------

type FeeModel = 'fixed' | 'hourly' | 'daily' | 'retainer';

interface ExternalRow {
  id: string;
  name: string;   // collaborator or supplier
  role: string;   // e.g. Motion designer
  model: FeeModel;
  qty: number;    // hours, days or months where the model is time-based
  feeSGD: number; // fee per unit, or the fixed fee
}

const FEE_MODELS: { key: FeeModel; label: string; unit?: string }[] = [
  { key: 'fixed', label: 'Fixed fee' },
  { key: 'hourly', label: 'Hourly', unit: 'hours' },
  { key: 'daily', label: 'Daily', unit: 'days' },
  { key: 'retainer', label: 'Retainer', unit: 'months' },
];

/** Assemble the ladder's step 4 input from a row: unit fee × quantity at what
 *  OuterEdit pays. This is input assembly, not pricing; the mark-up is applied
 *  only by priceLadder (R1, R9). */
function externalRowCostMinor(row: ExternalRow): number {
  const unit = toMinor(row.feeSGD || 0);
  return row.model === 'fixed' ? unit : Math.round(unit * Math.max(0, row.qty || 0));
}

const INITIAL_EXTERNALS: ExternalRow[] = [
  { id: nextId('ext'), name: 'Studio partner', role: 'Motion designer', model: 'fixed', qty: 1, feeSGD: 18_000 },
  { id: nextId('ext'), name: 'Print supplier', role: 'Production', model: 'fixed', qty: 1, feeSGD: 12_000 },
];

function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

const inputCls = 'border border-line rounded-financial bg-raised px-2 py-1 text-base';

function Chevron(props: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"
      className={`transition-transform duration-settle ${props.open ? 'rotate-90' : ''}`}>
      <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Compact figure for the sticky summary bar. */
function BarStat(props: { label: string; value: React.ReactNode; tone?: 'default' | 'critical' | 'positive' }) {
  const tone = { default: 'text-ink', critical: 'text-critical', positive: 'text-positive' }[props.tone ?? 'default'];
  return (
    <div className="min-w-0">
      <div className="text-xs text-ink-muted whitespace-nowrap">{props.label}</div>
      <div className={`tabular text-base font-medium whitespace-nowrap ${tone}`}>{props.value}</div>
    </div>
  );
}

export default function PlanQuoteFlow() {
  const { quoteId = '' } = useParams();
  const navigate = useNavigate();
  const account = useAccount();
  const qc = useQueryClient();
  const quotes = useQuery({ queryKey: ['quotations', account.userId], queryFn: () => getQuotations(account) });
  const templates = useQuery({ queryKey: ['templates', account.userId], queryFn: () => getTemplates(account) });
  const record = quotes.data?.find((q) => q.quotation.id === quoteId);

  // Structure and scope of work
  const [phases, setPhases] = useState<PhaseRow[]>(() => makePhases(INITIAL_PHASES));
  const [openPhaseIds, setOpenPhaseIds] = useState<Set<string>>(new Set());
  const [structureEdited, setStructureEdited] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<StructureTemplate | null>(null);

  // Externals and expenses
  const [externals, setExternals] = useState<ExternalRow[]>(INITIAL_EXTERNALS);
  const [expenses, setExpenses] = useState(12_000);
  const [markUpPct, setMarkUpPct] = useState(0.2);

  // Ladder levers
  const [contingencyPct, setContingencyPct] = useState(0.1);
  const [targetMargin, setTargetMargin] = useState(0.5);
  const [discountPct, setDiscountPct] = useState(0);
  const [confirmedBreach, setConfirmedBreach] = useState(false);
  const [openLadderRows, setOpenLadderRows] = useState<Set<number>>(new Set());

  // Scenarios and approval
  const [durationMonths, setDurationMonths] = useState(12);
  const [chosenModelId, setChosenModelId] = useState<string>('model');

  const hoursByRole = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const phase of phases) {
      for (const [role, h] of Object.entries(phase.hours)) {
        totals[role] = (totals[role] ?? 0) + (h || 0);
      }
    }
    return totals;
  }, [phases]);

  const externalCostMinor = useMemo(
    () => externals.reduce((s, r) => s + externalRowCostMinor(r), 0),
    [externals],
  );

  const inputs: PricingInputs = useMemo(() => ({
    estHoursByRole: hoursByRole,
    paidRatesMinor: RATE_CARD,
    availableRatesMinor: AVAILABLE_RATE_CARD,
    externalCostMinor,
    externalMarkUpPct: markUpPct,
    expensesMinor: toMinor(expenses),
    contingencyPct,
    overheadPerProductiveHourMinor: OVERHEAD_PER_PRODUCTIVE_HOUR_MINOR,
    targetGrossMarginPct: targetMargin,
  }), [hoursByRole, externalCostMinor, expenses, contingencyPct, markUpPct, targetMargin]);

  const ladder = useMemo(() => priceLadder(inputs), [inputs]);
  const discounted = useMemo(() => applyDiscount(ladder, discountPct), [ladder, discountPct]);
  const breach = discounted.breachesMinimumSafe;

  // Per-role cost lines for the ladder expansions: each line is a single-role
  // ladder so the figures still come from @oe/finance (R1), never from local
  // arithmetic.
  const roleLines = useMemo(() =>
    ROLES.filter((r) => (hoursByRole[r.key] ?? 0) > 0).map((r) => {
      const hours = hoursByRole[r.key] ?? 0;
      const single = priceLadder({
        ...inputs,
        estHoursByRole: { [r.key]: hours },
        externalCostMinor: 0,
        expensesMinor: 0,
      });
      return {
        key: r.key, label: r.label, hours,
        internalMinor: single.internalCostMinor,
        loadedMinor: single.loadedCheckMinor,
      };
    }),
  [inputs, hoursByRole]);

  // Per-row external sell lines: a zero-effort ladder per row so the marked-up
  // figure comes from priceLadder (R1, R9).
  const externalSellLines = useMemo(() =>
    externals.map((row) => {
      const costMinor = externalRowCostMinor(row);
      const single = priceLadder({
        ...inputs, estHoursByRole: {}, externalCostMinor: costMinor, expensesMinor: 0,
      });
      return { row, costMinor, sellMinor: single.externalSellMinor };
    }),
  [externals, inputs]);

  // Five models on one structure: the four scenarios plus the current levers.
  const modelRows = useMemo(() => {
    const scale = (f: number): PricingInputs => ({
      ...inputs,
      estHoursByRole: Object.fromEntries(Object.entries(hoursByRole).map(([r, h]) => [r, h * f])),
    });
    const price = (i: PricingInputs) => priceLadder(i).recommendedPriceMinor;
    const months = (n: number) => Math.max(1, n);
    const rows: { id: string; scenario: Scenario; note?: string }[] = [
      {
        id: 'model', note: 'current levers and discount',
        scenario: buildScenario('expected', 'Your model', inputs, discounted.quotedPriceMinor, months(durationMonths)),
      },
      { id: 'best', scenario: buildScenario('best', 'Best', scale(0.85), price(scale(0.85)), months(durationMonths - 1)) },
      { id: 'expected', scenario: buildScenario('expected', 'Expected', inputs, ladder.recommendedPriceMinor, months(durationMonths)) },
      { id: 'high_effort', scenario: buildScenario('high_effort', 'High-effort', scale(1.25), discounted.quotedPriceMinor, months(durationMonths + 2)) },
      { id: 'reduced_scope', scenario: buildScenario('reduced_scope', 'Reduced-scope', scale(0.7), price(scale(0.7)), months(durationMonths - 2)) },
    ];
    return rows;
  }, [inputs, hoursByRole, ladder.recommendedPriceMinor, discounted.quotedPriceMinor, durationMonths]);

  const chosen = modelRows.find((m) => m.id === chosenModelId) ?? modelRows[0]!;

  const canApprove = ['super_admin', 'ops_admin', 'leadership'].some((r) => account.roles.includes(r));
  const q = record?.quotation;
  const accepted = q?.status === 'accepted';

  const convert = useMutation({
    mutationFn: () => {
      const start = todayStr();
      return convertQuoteToProject(account, {
        quotationId: quoteId,
        name: record?.project?.name ?? 'New engagement',
        clientName: record?.clientName ?? 'Client',
        serviceLine: record?.project?.serviceLine ?? 'creative_direction',
        feeMinor: chosen.scenario.quote.quotedPriceMinor,
        startDate: start,
        targetEndDate: addMonths(start, chosen.scenario.durationMonths),
        phases: phases.map((p) => ({ name: p.name, estHoursByRole: { ...p.hours } })),
      });
    },
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      navigate(`/projects/${project.id}`);
    },
  });

  // ---- structure editing -------------------------------------------------

  const markEdited = () => setStructureEdited(true);

  const updatePhase = (id: string, fn: (p: PhaseRow) => PhaseRow) => {
    setPhases((prev) => prev.map((p) => (p.id === id ? fn(p) : p)));
    markEdited();
  };

  const addPhase = () => {
    const p: PhaseRow = { id: nextId('ph'), name: 'New phase', hours: {} };
    setPhases((prev) => [...prev, p]);
    setOpenPhaseIds((prev) => new Set(prev).add(p.id));
    markEdited();
  };

  const removePhase = (id: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== id));
    markEdited();
  };

  const togglePhase = (id: string) => {
    setOpenPhaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const applyTemplate = (t: StructureTemplate) => {
    setPhases(makePhases(t.phases));
    setOpenPhaseIds(new Set());
    setStructureEdited(false);
    setPendingTemplate(null);
  };

  const requestTemplate = (t: StructureTemplate) => {
    if (structureEdited) setPendingTemplate(t);
    else applyTemplate(t);
  };

  const fixtureTemplates: StructureTemplate[] = useMemo(() =>
    (templates.data ?? []).map((t) => ({
      key: t.id,
      label: t.name,
      phases: [...t.phases]
        .sort((a, b) => a.order - b.order)
        .map((p) => ({ name: p.name, hours: { ...p.typicalHoursByRole } as RoleHours })),
    })),
  [templates.data]);

  // ---- externals editing -------------------------------------------------

  const updateExternal = (id: string, patch: Partial<ExternalRow>) => {
    setExternals((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addExternal = () => {
    setExternals((prev) => [
      ...prev,
      { id: nextId('ext'), name: '', role: '', model: 'fixed', qty: 1, feeSGD: 0 },
    ]);
  };

  const removeExternal = (id: string) => {
    setExternals((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleLadderRow = (i: number) => {
    setOpenLadderRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  // ---- ladder rows with expansions ---------------------------------------

  const ladderRows: {
    n: number;
    label: React.ReactNode;
    amount: React.ReactNode;
    amountClass?: string;
    detail: React.ReactNode;
  }[] = [
    {
      n: 1,
      label: '1 · Effort',
      amount: `${ladder.estHours} hours`,
      detail: (
        <div className="space-y-0.5">
          <p className="text-ink-muted mb-1">Total estimated hours across {phases.length} phases, by role.</p>
          {roleLines.map((r) => (
            <div key={r.key} className="flex justify-between">
              <span>{r.label}</span><span className="tabular">{r.hours}h</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 2,
      label: '2 · Internal cost (cost per paid hour)',
      amount: fmtMoneyWhole(ladder.internalCostMinor),
      detail: (
        <div className="space-y-0.5">
          <p className="text-ink-muted mb-1">Each role's hours at its cost per paid hour (R8).</p>
          {roleLines.map((r) => (
            <div key={r.key} className="flex justify-between">
              <span>{r.label} · {r.hours}h × {fmtMoneyWhole(RATE_CARD[r.key] ?? 0)}/h</span>
              <span className="tabular">{fmtMoneyWhole(r.internalMinor)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 3,
      label: '3 · Loaded check (the leave-carrying floor)',
      amount: fmtMoneyWhole(ladder.loadedCheckMinor),
      amountClass: 'text-ink-muted',
      detail: (
        <div className="space-y-0.5">
          <p className="text-ink-muted mb-1">
            The same hours at the available-hour rate, which carries leave and public holidays.
            A reference layer, not a price.
          </p>
          {roleLines.map((r) => (
            <div key={r.key} className="flex justify-between">
              <span>{r.label} · {r.hours}h × {fmtMoneyWhole(AVAILABLE_RATE_CARD[r.key] ?? 0)}/h</span>
              <span className="tabular">{fmtMoneyWhole(r.loadedMinor)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 4,
      label: '4 · External cost',
      amount: fmtMoneyWhole(ladder.externalCostMinor),
      detail: (
        <div className="space-y-0.5">
          <p className="text-ink-muted mb-1">Itemised collaborators and suppliers, at what OuterEdit pays.</p>
          {externalSellLines.length === 0 && <p>No external rows yet.</p>}
          {externalSellLines.map(({ row, costMinor }) => (
            <div key={row.id} className="flex justify-between">
              <span>{row.name || 'Unnamed'} · {row.role || 'Role to confirm'}</span>
              <span className="tabular">{fmtMoneyWhole(costMinor)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 5,
      label: `5 · External sell (+${fmtPct(markUpPct, 0)})`,
      amount: fmtMoneyWhole(ladder.externalSellMinor),
      detail: (
        <div className="space-y-0.5">
          <p className="text-ink-muted mb-1">
            Each external row with the {fmtPct(markUpPct, 0)} mark-up applied. Mark-up is a
            pricing event; it never enters recorded costs (R9).
          </p>
          {externalSellLines.map(({ row, sellMinor }) => (
            <div key={row.id} className="flex justify-between">
              <span>{row.name || 'Unnamed'} · {row.role || 'Role to confirm'}</span>
              <span className="tabular">{fmtMoneyWhole(sellMinor)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: 6,
      label: '6 · Expenses',
      amount: fmtMoneyWhole(ladder.expensesMinor),
      detail: (
        <div className="flex justify-between">
          <span>Travel, production and licences, at cost</span>
          <span className="tabular">{fmtMoneyWhole(ladder.expensesMinor)}</span>
        </div>
      ),
    },
    {
      n: 7,
      label: (
        <span>
          7 · Contingency{' '}
          <input type="range" min={0} max={0.25} step={0.05} value={contingencyPct}
            onChange={(e) => setContingencyPct(Number(e.target.value))}
            className="w-24 align-middle mx-1" aria-label="Contingency percent" />
          <span className="tabular">{fmtPct(contingencyPct, 0)}</span>
        </span>
      ),
      amount: fmtMoneyWhole(ladder.contingencyMinor),
      detail: (
        <div className="space-y-0.5">
          <p className="text-ink-muted mb-1">
            Formula: {fmtPct(contingencyPct, 0)} × (internal cost + external cost + expenses).
          </p>
          <div className="flex justify-between"><span>Internal cost</span><span className="tabular">{fmtMoneyWhole(ladder.internalCostMinor)}</span></div>
          <div className="flex justify-between"><span>External cost</span><span className="tabular">{fmtMoneyWhole(ladder.externalCostMinor)}</span></div>
          <div className="flex justify-between"><span>Expenses</span><span className="tabular">{fmtMoneyWhole(ladder.expensesMinor)}</span></div>
          <div className="flex justify-between font-medium border-t border-line pt-0.5 mt-1">
            <span>Contingency at {fmtPct(contingencyPct, 0)}</span>
            <span className="tabular">{fmtMoneyWhole(ladder.contingencyMinor)}</span>
          </div>
        </div>
      ),
    },
    {
      n: 8,
      label: (
        <span>
          8 · Overhead recovery <span className="text-xs text-ink-faint">(analytical view)</span>
        </span>
      ),
      amount: fmtMoneyWhole(ladder.overheadRecoveryMinor),
      detail: (
        <div className="space-y-0.5">
          <p className="text-ink-muted mb-1">
            The studio's overhead per productive hour, applied to every estimated hour so the
            project carries its share of the roof.
          </p>
          <div className="flex justify-between">
            <span>{ladder.estHours}h × {fmtMoneyWhole(OVERHEAD_PER_PRODUCTIVE_HOUR_MINOR)}/h</span>
            <span className="tabular">{fmtMoneyWhole(ladder.overheadRecoveryMinor)}</span>
          </div>
        </div>
      ),
    },
    {
      n: 9,
      label: (
        <span>
          9 · Target margin on price{' '}
          <input type="range" min={0.2} max={0.65} step={0.05} value={targetMargin}
            onChange={(e) => setTargetMargin(Number(e.target.value))}
            className="w-24 align-middle mx-1" aria-label="Target margin percent" />
          <span className="tabular">{fmtPct(targetMargin, 0)}</span>
        </span>
      ),
      amount: fmtMoneyWhole(ladder.recommendedPriceMinor),
      amountClass: 'font-medium',
      detail: (
        <div className="space-y-0.5">
          <p className="text-ink-muted mb-1">
            Margin is applied on price, not on cost: recommended price = total cost ÷ (1 − {fmtPct(targetMargin, 0)}).
            At a 50% target, price is twice cost.
          </p>
          <div className="flex justify-between"><span>Total cost (2 + 4 + 6 + 7 + 8)</span><span className="tabular">{fmtMoneyWhole(ladder.totalCostMinor)}</span></div>
          <div className="flex justify-between font-medium border-t border-line pt-0.5 mt-1">
            <span>Recommended price</span>
            <span className="tabular">{fmtMoneyWhole(ladder.recommendedPriceMinor)}</span>
          </div>
        </div>
      ),
    },
  ];

  const modelBreachBlocks = chosen.id === 'model' && breach && !confirmedBreach;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Plan & Quote' }, { label: record?.project?.name ?? 'Estimate' }]}
        title={record?.project?.name ?? 'Estimate'}
        lede="One language from promise to proof: everything on this page responds to everything else, so the shape of the work and the shape of the price are always in view together."
      />

      {/* Slim sticky summary: the inter-reliance of the numbers, always visible. */}
      <div className="sticky top-0 z-20 mb-5">
        <div className="bg-raised/95 backdrop-blur border border-line rounded-financial px-4 py-2 flex flex-wrap items-center gap-x-8 gap-y-1 shadow-sm">
          <BarStat label="Total hours" value={`${ladder.estHours}h`} />
          <BarStat label="Recommended price" value={fmtMoneyWhole(ladder.recommendedPriceMinor)} />
          <BarStat label="Modelled fee" value={fmtMoneyWhole(discounted.quotedPriceMinor)} />
          <BarStat
            label="Margin"
            value={fmtPct(discounted.grossMargin)}
            tone={discounted.grossMargin < 0.2 ? 'critical' : 'positive'}
          />
          {breach && (
            <span className="text-xs text-critical">Below the minimum safe price</span>
          )}
        </div>
      </div>

      {accepted && (
        <Banner tone="info" className="mb-4">
          This quotation is accepted and its baseline is frozen. The workbench below stays live
          as a modelling sandbox; the binding figures are the issued totals in the approval card.
        </Banner>
      )}

      <div className="space-y-5">
        {/* ---------------------------------------------------- Particulars */}
        <Card as="section">
          <h2 className="display text-lg mb-3">Particulars</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Client" value={record?.clientName ?? 'To be confirmed'} />
            <Stat label="Service line" value={record?.project?.serviceLine.replace(/_/g, ' ') ?? 'To be confirmed'} />
            <Stat label="Window" value={record?.project ? `${fmtDate(record.project.startDate)} to ${fmtDate(record.project.targetEndDate)}` : 'To be confirmed'} />
            <Stat
              label="Duration"
              value={
                <span className="flex items-center gap-2">
                  <input
                    type="number" min={1} max={24}
                    className={`w-16 ${inputCls} tabular`}
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Duration in months"
                  />
                  months
                </span>
              }
            />
          </div>
          <p className="text-sm text-ink-muted mt-3">
            Probability {Math.round((record?.project?.probability ?? 0.6) * 100)}%. A weighted
            view of this fee flows into the company pipeline the moment the estimate is saved.
          </p>
        </Card>

        {/* -------------------------------------------- Structure & Effort */}
        <Card as="section">
          <h2 className="display text-lg mb-1">Structure &amp; effort</h2>
          <p className="text-sm text-ink-muted mb-3 max-w-3xl">
            A phase is a named stage of the project; the scope of work is the hours each role
            carries inside it. Open a phase to shape its scope. The estimate, the time entries,
            the costs and the retrospective will all share whatever structure leaves this screen.
          </p>

          <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Structure templates">
            {[...LOCAL_TEMPLATES, ...fixtureTemplates].map((t) => (
              <Button key={t.key} size="sm" variant="secondary" onClick={() => requestTemplate(t)}>
                {t.label}
              </Button>
            ))}
          </div>

          {pendingTemplate && (
            <Banner tone="caution" className="mb-3">
              Applying "{pendingTemplate.label}" replaces the current phases and their scope of
              work, including your edits.
              <span className="flex gap-2 mt-2">
                <Button size="sm" variant="primary" onClick={() => applyTemplate(pendingTemplate)}>
                  Replace the structure
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setPendingTemplate(null)}>
                  Keep what I have
                </Button>
              </span>
            </Banner>
          )}

          <ol className="space-y-1.5">
            {phases.map((phase, idx) => {
              const open = openPhaseIds.has(phase.id);
              const phaseTotal = Object.values(phase.hours).reduce((s, h) => s + (h || 0), 0);
              return (
                <li key={phase.id} className="border border-line rounded-financial bg-raised">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      onClick={() => togglePhase(phase.id)}
                      aria-expanded={open}
                      aria-label={`${open ? 'Collapse' : 'Expand'} scope of work for ${phase.name}`}
                      className="text-ink-muted hover:text-ink p-1"
                    >
                      <Chevron open={open} />
                    </button>
                    <span className="text-xs text-ink-faint tabular w-5">{idx + 1}</span>
                    <input
                      value={phase.name}
                      onChange={(e) => updatePhase(phase.id, (p) => ({ ...p, name: e.target.value }))}
                      aria-label={`Phase ${idx + 1} name`}
                      className="flex-1 min-w-0 bg-transparent border-b border-transparent focus:border-line focus:outline-none text-base py-0.5"
                    />
                    <span className="tabular text-sm text-ink-muted whitespace-nowrap">{phaseTotal}h</span>
                    <Button size="sm" variant="quiet" onClick={() => removePhase(phase.id)}
                      aria-label={`Remove phase ${phase.name}`}>
                      Remove
                    </Button>
                  </div>
                  {open && (
                    <div className="border-t border-line px-3 py-2.5 bg-sunken/40">
                      <div className="text-xs text-ink-muted mb-2">
                        Scope of work within this phase: hours by role.
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                        {ROLES.map((r) => (
                          <label key={r.key} className="block">
                            <span className="block text-xs text-ink-muted mb-0.5">{r.label}</span>
                            <input
                              type="number" min={0}
                              aria-label={`${phase.name}, ${r.label} hours`}
                              className={`w-full ${inputCls} text-right tabular`}
                              value={phase.hours[r.key] ?? ''}
                              placeholder="0"
                              onChange={(e) =>
                                updatePhase(phase.id, (p) => ({
                                  ...p,
                                  hours: { ...p.hours, [r.key]: Math.max(0, Number(e.target.value) || 0) },
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="flex items-center justify-between mt-3">
            <Button size="sm" variant="secondary" onClick={addPhase}>Add phase</Button>
            <div className="text-sm text-ink-muted">
              Total <span className="tabular font-medium text-ink">{ladder.estHours}h</span> across{' '}
              <span className="tabular">{phases.length}</span> phases
            </div>
          </div>
        </Card>

        {/* --------------------------------------------------- Externals */}
        <Card as="section">
          <h2 className="display text-lg mb-1">Externals</h2>
          <p className="text-sm text-ink-muted mb-3 max-w-3xl">
            Collaborators and suppliers, itemised at what OuterEdit pays. The mark-up below is a
            pricing event applied only in the ladder, never a recorded cost.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-ink-muted">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Collaborator or supplier</th>
                  <th className="text-left px-2 py-1.5 font-medium">Role</th>
                  <th className="text-left px-2 py-1.5 font-medium">Fee model</th>
                  <th className="text-right px-2 py-1.5 font-medium">Quantity</th>
                  <th className="text-right px-2 py-1.5 font-medium">Fee (SGD)</th>
                  <th className="text-right px-2 py-1.5 font-medium">Line cost</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {externals.map((row) => {
                  const modelDef = FEE_MODELS.find((m) => m.key === row.model);
                  return (
                    <tr key={row.id}>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.name}
                          placeholder="Name"
                          aria-label="Collaborator or supplier name"
                          className={`w-full min-w-[9rem] ${inputCls}`}
                          onChange={(e) => updateExternal(row.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.role}
                          placeholder="e.g. Motion designer"
                          aria-label="Collaborator role"
                          className={`w-full min-w-[9rem] ${inputCls}`}
                          onChange={(e) => updateExternal(row.id, { role: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={row.model}
                          aria-label="Fee model"
                          className={inputCls}
                          onChange={(e) => updateExternal(row.id, { model: e.target.value as FeeModel })}
                        >
                          {FEE_MODELS.map((m) => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {row.model === 'fixed' ? (
                          <span className="text-ink-faint text-xs">n/a</span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <input
                              type="number" min={0}
                              value={row.qty}
                              aria-label={`Quantity in ${modelDef?.unit ?? 'units'}`}
                              className={`w-16 ${inputCls} text-right tabular`}
                              onChange={(e) => updateExternal(row.id, { qty: Math.max(0, Number(e.target.value) || 0) })}
                            />
                            <span className="text-xs text-ink-muted">{modelDef?.unit}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number" min={0}
                          value={row.feeSGD}
                          aria-label={row.model === 'fixed' ? 'Fixed fee in SGD' : `Fee per ${modelDef?.unit?.replace(/s$/, '') ?? 'unit'} in SGD`}
                          className={`w-24 ${inputCls} text-right tabular`}
                          onChange={(e) => updateExternal(row.id, { feeSGD: Math.max(0, Number(e.target.value) || 0) })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right tabular font-medium whitespace-nowrap">
                        {fmtMoneyWhole(externalRowCostMinor(row))}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Button size="sm" variant="quiet" onClick={() => removeExternal(row.id)}
                          aria-label={`Remove ${row.name || 'external row'}`}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-line font-medium">
                <tr>
                  <td className="px-2 py-1.5" colSpan={5}>External cost, what OuterEdit pays (ladder step 4)</td>
                  <td className="px-2 py-1.5 text-right tabular">{fmtMoneyWhole(ladder.externalCostMinor)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 mt-3">
            <Button size="sm" variant="secondary" onClick={addExternal}>Add external</Button>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Expenses: travel, production, licences (SGD)</span>
              <input type="number" min={0} className={`w-36 ${inputCls} tabular`}
                value={expenses} onChange={(e) => setExpenses(Math.max(0, Number(e.target.value) || 0))} />
            </label>
            <label className="block">
              <span className="block text-sm text-ink-muted mb-0.5">Mark-up on external sell</span>
              <input type="range" min={0} max={0.4} step={0.05} value={markUpPct}
                onChange={(e) => setMarkUpPct(Number(e.target.value))} className="w-56 align-middle" />
              <span className="tabular ml-2">{fmtPct(markUpPct, 0)}</span>
            </label>
            <div className="text-sm text-ink-muted">
              External sell at mark-up: <span className="tabular text-ink font-medium">{fmtMoneyWhole(ladder.externalSellMinor)}</span>
            </div>
          </div>
        </Card>

        {/* ------------------------------------------------- Price ladder */}
        <section className="grid lg:grid-cols-[1fr_320px] gap-5">
          <Card>
            <h2 className="display text-lg mb-1">The price ladder</h2>
            <p className="text-sm text-ink-muted mb-3">
              Open a row to see the inputs behind it.
            </p>
            <LedgerTable
              caption="Price ladder, §6.10"
              head={<tr><Th className="w-8" /><Th>Layer</Th><Th num>Amount</Th></tr>}
            >
              {ladderRows.map((row) => {
                const open = openLadderRows.has(row.n);
                return (
                  <React.Fragment key={row.n}>
                    <tr>
                      <Td className="w-8">
                        <button
                          onClick={() => toggleLadderRow(row.n)}
                          aria-expanded={open}
                          aria-label={`${open ? 'Collapse' : 'Expand'} ladder row ${row.n}`}
                          className="text-ink-muted hover:text-ink p-1"
                        >
                          <Chevron open={open} />
                        </button>
                      </Td>
                      <Td>{row.label}</Td>
                      <Td num className={row.amountClass}>{row.amount}</Td>
                    </tr>
                    {open && (
                      <tr className="bg-sunken/40">
                        <Td />
                        <Td colSpan={2}>
                          <div className="text-sm max-w-xl">{row.detail}</div>
                        </Td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </LedgerTable>
          </Card>

          <div className="space-y-3">
            <Card className="space-y-2">
              <Stat label="Negotiation floor" value={fmtMoneyWhole(ladder.negotiationFloorMinor)} sub="below this the project destroys cash" tone="critical" />
              <Stat label="Minimum safe price" value={fmtMoneyWhole(ladder.minimumSafePriceMinor)} sub="below this it does not pay its share of the studio" tone="caution" />
              <Stat label="Recommended price" value={fmtMoneyWhole(ladder.recommendedPriceMinor)} sub={`at ${fmtPct(targetMargin, 0)} margin on price`} tone="positive" />
            </Card>
            <Card>
              <div className="text-sm text-ink-muted mb-1">Discount lever</div>
              <input type="range" min={0} max={0.6} step={0.01} value={discountPct}
                onChange={(e) => { setDiscountPct(Number(e.target.value)); setConfirmedBreach(false); }}
                className="w-full" aria-label="Discount percent" />
              <div className="flex justify-between text-sm mt-1">
                <span className="tabular">{fmtPct(discountPct, 0)} discount</span>
                <span className="tabular font-medium">{fmtMoneyWhole(discounted.quotedPriceMinor)}</span>
              </div>
              <div className="text-sm mt-2 space-y-0.5">
                <div className="flex justify-between"><span className="text-ink-muted">Resulting margin</span><span className={`tabular ${discounted.grossMargin < 0.2 ? 'text-critical' : ''}`}>{fmtPct(discounted.grossMargin)}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Profit per hour</span><span className="tabular">{(discounted.profitPerHourMinor / 100).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Profit per month</span><span className="tabular">{fmtMoneyWhole(Math.round(discounted.grossProfitMinor / durationMonths))}</span></div>
              </div>
              {breach && !confirmedBreach && (
                <Banner tone="critical" className="mt-3">
                  This discount takes the price below the minimum safe price. The project would
                  not pay its share of the studio.
                  <Button variant="danger" size="sm" className="mt-2" onClick={() => setConfirmedBreach(true)}>
                    I understand, keep the discount
                  </Button>
                </Banner>
              )}
              {breach && confirmedBreach && (
                <Banner tone="caution" className="mt-3">Breach acknowledged. It stays visible in the approval card.</Banner>
              )}
            </Card>
          </div>
        </section>

        {/* --------------------------------------- Scenarios & Approval */}
        <Card as="section">
          <h2 className="display text-lg mb-1">Scenarios &amp; approval</h2>
          <p className="text-sm text-ink-muted mb-3 max-w-3xl">
            Five models on one structure. Pick the one to take forward; approval converts it
            into the project's baseline.
          </p>
          <LedgerTable
            caption="Scenario comparison and model choice"
            head={<tr><Th className="w-10">Take</Th><Th>Model</Th><Th num>Fee</Th><Th num>Cost</Th><Th num>Gross profit</Th><Th num>Margin</Th><Th num>Profit/hr</Th><Th num>Profit/mo</Th><Th num>Months</Th></tr>}
          >
            {modelRows.map(({ id, scenario: s, note }) => {
              const isModel = id === 'model';
              const selected = chosenModelId === id;
              return (
                <tr key={id} className={selected ? 'bg-accent/5' : ''}>
                  <Td>
                    <input
                      type="radio"
                      name="chosen-model"
                      checked={selected}
                      onChange={() => setChosenModelId(id)}
                      aria-label={`Take ${s.label} forward`}
                    />
                  </Td>
                  <Td className={isModel || selected ? 'font-medium' : ''}>
                    {s.label}
                    {isModel && <span className="text-xs text-accent block">{note}</span>}
                  </Td>
                  <Td num>{fmtMoneyWhole(s.quote.quotedPriceMinor)}</Td>
                  <Td num>{fmtMoneyWhole(s.ladder.negotiationFloorMinor)}</Td>
                  <Td num className={s.quote.grossProfitMinor < 0 ? 'text-critical' : ''}>{fmtMoneyWhole(s.quote.grossProfitMinor)}</Td>
                  <Td num>{fmtPct(s.quote.grossMargin)}</Td>
                  <Td num>{(s.quote.profitPerHourMinor / 100).toFixed(2)}</Td>
                  <Td num>{fmtMoneyWhole(s.profitPerMonthMinor)}</Td>
                  <Td num>{s.durationMonths}</Td>
                </tr>
              );
            })}
          </LedgerTable>
          <p className="text-xs text-ink-faint mt-2">
            Your model carries the current levers and discount. High-effort assumes 25 percent
            more hours at that same fee; that margin is the one to be able to live with.
          </p>

          <div className="border-t border-line mt-4 pt-4 space-y-4">
            {q && (
              <div className="grid grid-cols-3 gap-4">
                <Stat label={`Issued v${q.version} subtotal`} value={fmtMoneyWhole(q.subtotalMinor)} />
                <Stat label="Issued GST" value={fmtMoneyWhole(q.gstMinor)} />
                <Stat label="Issued total" value={fmtMoneyWhole(q.totalMinor)} sub={q.status} />
              </div>
            )}

            {breach && (
              <Banner tone="critical">
                Your model sits below the minimum safe price and carries an acknowledged breach.
              </Banner>
            )}

            <Banner tone="info">
              Approving freezes the chosen model as the project's baseline: its fee, phases and
              scope of work become the structure the project is delivered, staffed and measured
              against. Later change flows only through approved variations.
            </Banner>

            <div className="text-sm text-ink-muted">
              Standard clauses attach on issue: three rounds of amendments included, working files
              at 20 percent of cost, look-and-feel scope limits, sample-application clarification.
            </div>

            {accepted ? (
              <Banner tone="positive">
                Accepted. The estimate is frozen as the baseline; change now flows only through
                approved variations.
              </Banner>
            ) : canApprove ? (
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="primary"
                  onClick={() => convert.mutate()}
                  disabled={convert.isPending || modelBreachBlocks}
                >
                  Approve and convert to project
                </Button>
                <span className="text-sm text-ink-muted">
                  Taking forward <span className="font-medium text-ink">{chosen.scenario.label}</span> at{' '}
                  <span className="tabular text-ink">{fmtMoneyWhole(chosen.scenario.quote.quotedPriceMinor)}</span> over{' '}
                  <span className="tabular">{chosen.scenario.durationMonths}</span> months.
                </span>
              </div>
            ) : (
              <Banner tone="info">Approval sits with leadership or the operations team.</Banner>
            )}

            {convert.isError && (
              <Banner tone="critical">
                {String((convert.error as Error).message) === 'not_allowed'
                  ? 'Approval is not part of your access.'
                  : "That didn't save. Try again in a moment."}
              </Banner>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
