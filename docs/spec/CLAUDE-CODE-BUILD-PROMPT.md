# Claude Code Build Prompt — OuterEdit Agency Intelligence Console (Prototype)

*Use: open Claude Code in the repo root (which contains `/docs/spec/` with Phases 1–9 and CUMULATIVE-SPEC.md), paste this prompt, and work stage by stage. Approve each stage's plan before implementation. This prompt is self-sufficient for orientation but the spec corpus is authoritative — when in doubt, the spec wins.*

---

You are building an interactive front-end prototype of the **OuterEdit Agency Intelligence Console**: an internal operating console for a Singapore creative studio that connects quotation planning, project delivery tracking, humane time allocation, project profitability, company profitability and pricing intelligence. It must feel like a thoughtful studio instrument, never a timesheet or surveillance dashboard.

**Authoritative sources, in order:** `docs/spec/CUMULATIVE-SPEC.md` (canonical decisions) → `docs/spec/Phase-2-Financial-Model-and-Profitability-Logic.md` (all formulas) → `docs/spec/Phase-3…` (permissions/masking) → `docs/spec/Phase-5…` (screen layouts) → `docs/spec/Phase-7…` (visual system, microcopy) → `docs/spec/Phase-8-Prototype-Architecture.md` (stack, structure, mock data, flows).

## Hard rules (violating any of these is a failed build)

1. **Single source of financial truth.** Every displayed number comes from `src/lib/finance/`. No component, fixture or report computes margins, costs or totals independently. Each finance function carries a comment citing its Phase 2 section.
2. **The worked examples are the acceptance gate.** Before building any UI, implement `src/lib/finance` and make `workedExamples.test.ts` pass with the EXACT figures in Phase 2 §10 (e.g. Example A internal cost $20,070, GP $17,930; Example E GP −$6,200 with legacy Margin-1 lens showing 52%; monthly tie-out $61,300 with operating profit −$800 and coverage 0.98). Do not adjust the spec's numbers to fit your implementation; fix the implementation.
3. **Single-count invariant.** EmploymentCost(period) = ProjectLabour + NonProjectPayroll + UnallocatedPayroll ± ReconciliationAdjustment. Implement the tie-out check; the cockpit displays its status.
4. **Baseline freeze.** Estimates snapshot at approval; variations are explicit records; est-vs-actual always compares against baseline + variations.
5. **Centralised permissions.** One `can(user, action, resource, field?)` policy module implementing the Phase 3 matrix; components never check roles directly. Masked values render as aggregate / range / `$ ·····` / absent — never as fetchable-but-hidden data.
6. **Non-surveillance boundary.** No leaderboards, no per-person productivity comparisons, no punitive language anywhere. Personal insights and contextual time categories render only for the account that owns them. Use the Phase 7 §4 microcopy verbatim where moments match; write new copy in the same voice (no em dashes; no exclamation-mark warnings; situations described, never people blamed).
7. **Costing basis:** cost-per-paid-hour for all recorded time; loaded rates appear only in the pricing ladder. Contextual activities (meals, commute) are never costed. The 20% external mark-up is a pricing event, never a cost.

## Stack & structure

React 18 + TypeScript + Vite · Tailwind + Radix primitives (implement Phase 7 §6 tokens: warm paper surface, ink text, single accent, semantic amber/critical, tabular numerals, 8pt grid) · Recharts · Zustand · Vitest. File structure and typed models exactly per Phase 8 §2–3. Mock API layer in `src/api/` over `src/data/` fixtures with ~200ms simulated latency; API function signatures must be backend-swappable.

## Build stages (plan-then-build each; do not merge stages)

**Stage 0 — Scaffold & CLAUDE.md.** Vite app, Tailwind tokens, folder skeleton, router, role store with the six demo accounts (Mei team member · Ryan lead+leadership+super admin · Priya people manager · Daniel finance · Sofia leadership · Admin super). Write `CLAUDE.md` summarising rules 1–7 for future sessions.
**Stage 1 — Financial engine + tests.** `lib/finance` per Phase 2 §§2–9; the worked-examples suite green. Also: rate derivation from employment agreements, dated-rate resolution, committed-vs-accrued external costs, price ladder with three floors and scenario deltas.
**Stage 2 — Permissions & masking.** Policy module per Phase 3 matrix + `<Masked>` renderer + subtractive navigation. Unit-test: lead cannot resolve any individual cost rate through any exported function.
**Stage 3 — Mock data.** Phase 8 §6 dataset: 10+ projects (include the overrun-trending one, the $12k sprint, the $250k loss-maker with revision history), 6 staff on the published rate card, 4 OE Verse models, overhead register, 12 months of history. Fixtures must reconcile: run the tie-out per month and fix data until green.
**Stage 4 — Personal experience.** Home, Today (row-model entry: cascading project→phase→activity picker, duration steppers, favourites, copy-yesterday, completion ring, draft/confirm), Week grid, one insight card. Two-minute completion must be genuinely achievable; keyboard-first entry path.
**Stage 5 — Project experience.** Portfolio (sortable incl. profit/hour), Overview (three health cards, amber logic), Est-vs-actual (paired bars + schedule tick), Phase detail, Forecast assumptions editor (burn-factor ETC visible), Variations, lead-masked Financials vs finance-full Financials.
**Stage 6 — Plan & Quote.** Stepper flow; effort grid; external lines with mark-up; contingency; overhead recovery; price ladder with floors; target-GM recommended price; discount slider with live margin erosion and min-safe warning; scenario tabs; quotation version list; approval→baseline freeze.
**Stage 7 — People, OE Verse, Company.** Directory + profile (rate timeline, new-agreement flow demonstrating historical preservation), OE Verse cards + agreement editor, Company costs register (payroll-entry guard), Cockpit (Phase 5 §F1 exactly, tie-out badge, drill-through), Company time allocation, Portfolio comparison drawer.
**Stage 8 — States & polish.** Empty/loading/error/locked-period/permission states with Phase 7 copy; responsive passes (entry on mobile, cockpit read-only mobile); reduced-motion; chart table-views and SR summaries; the 18 Phase 9 scenarios walked and checklisted in `docs/prototype-scenario-checklist.md`.

## Definition of done

`npm test` green (financial suite + permission tests) · all Phase 8 §7 flows demonstrable per role · role switch re-masks and re-navigates correctly · no formula or role check outside the two lib modules · README with setup, accounts, and known limitations (no persistence, no auth, no integrations, milestone-simplified recognition) · a `docs/DEVIATIONS.md` listing anything where you had to depart from spec, with reasons — empty is the goal.

Work in plan mode at each stage; present the plan; implement after approval; keep commits per stage.
