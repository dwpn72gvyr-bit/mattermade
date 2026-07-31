# OuterEdit Agency Intelligence Console
## Phase 8 — Interactive Prototype: Architecture & Build Plan

**Version 1.0 · 29 July 2026 · Status: For review**
This phase specifies the prototype and provides the complete Claude Code development prompt (companion file `CLAUDE-CODE-BUILD-PROMPT.md`). A clickable low-fi wireframe (`OE-Console-Wireframe-Prototype.html`) accompanies the spec for immediate navigation/flow validation before the coded prototype exists.

---

## 1. Stack recommendation (and why)

**React 18 + TypeScript + Vite** — fastest iteration loop, typed data models end-to-end, the ecosystem a future implementation partner will expect. **Tailwind CSS + a headless component layer (Radix primitives)** — implements the Phase 7 design system as tokens without fighting a themed kit; avoids looking like every dashboard template (a stated requirement). **Recharts** for the Phase 7 §5 chart set (paired bars, bullet, waterfall, slope) — declarative, composable, accessible-labelable. **Zustand** for app state (role simulation, date range, filters) — minimal ceremony. **Mock API layer**: a `src/api/` module with async functions over local JSON fixtures + latency simulation, mirroring a future REST/tRPC backend one-for-one so the backend swap is a transport change, not a rewrite. **No backend, no auth service** in the prototype: role-based simulated accounts via a switcher. **Vitest** for the financial-engine tests (the Phase 2 worked examples). Deployable as a static bundle (Vercel/Netlify/local).

## 2. File & component structure

```
oe-console/
├─ CLAUDE.md                    ← standing brief for Claude Code sessions
├─ docs/spec/                   ← Phases 1–9 + CUMULATIVE-SPEC (this corpus)
├─ src/
│  ├─ lib/
│  │  ├─ finance/               ← THE financial engine (only place formulas live)
│  │  │  ├─ costRates.ts        (§2 Phase 2: paid/available/productive derivation)
│  │  │  ├─ allocation.ts       (§3: allocation identity, buckets, tie-out)
│  │  │  ├─ externalCosts.ts    (§4: models, committed/accrued)
│  │  │  ├─ projectMetrics.ts   (§5: formulas 5.1–5.18)
│  │  │  ├─ overhead.ts (§6) · company.ts (§7) · revenue.ts (§8) · pricing.ts (§9)
│  │  │  └─ __tests__/workedExamples.test.ts   ← Phase 2 §10 A–E + tie-out, exact figures
│  │  ├─ permissions/
│  │  │  ├─ policy.ts           ← single field-level policy module (Phase 3)
│  │  │  ├─ roles.ts · masking.ts (◐ renderers: aggregate/range/hidden)
│  │  ├─ dates.ts · money.ts (SGD formatting, tabular)
│  ├─ api/                      ← mock transport (swappable)
│  ├─ data/                     ← fixtures: people, projects, entries, overheads, 12-mo history
│  ├─ stores/                   ← session (role), dateRange, filters
│  ├─ components/               ← design system (shell, cards, tables, charts, entry widgets)
│  ├─ features/
│  │  ├─ personal/ (home, today, week, insights)
│  │  ├─ projects/ (portfolio, overview, planQuote, delivery, financials)
│  │  ├─ people/ (directory, profile, oeVerse)
│  │  ├─ company/ (cockpit, costs, timeAllocation)
│  │  ├─ reports/ · admin/
│  └─ App.tsx (router, role-aware nav)
```

Code standards (binding): no duplicated business logic — every displayed number calls `lib/finance`; every visibility decision calls `lib/permissions/policy`; complex calculations commented with their Phase 2 section reference; typed models in `src/types` mirror the Phase 1 entity map; accessible controls per Phase 7 §6; responsive per Phase 5 §G.

## 3. Data model (core types, abbreviated)

```ts
type Role = 'team_member'|'project_lead'|'people_manager'|'finance_admin'|'ops_admin'|'leadership'|'super_admin';
interface Person { id; name; title; team; managerId?; scheduleHoursPerWeek; startDate; skills[] }
interface EmploymentAgreement { personId; effectiveFrom; effectiveTo?; monthlySalary; employerCpfRate; cpfCeiling; annualBonusMonths; benefitsMonthly; leaveDays; publicHolidays; expectedMedicalDays; productiveFactor }
interface CostRate { personId; effectiveFrom; paidHourRate; availableHourRate; productiveHourRate; derivation }
interface Project { id; code; name; clientId; type; serviceLine; status; leadId; currency; contractValue; probability?; baseline?: EstimateSnapshot; variations: Variation[]; proBono? }
interface Phase { projectId; name; order; estHoursByRole: Record<RoleKey,number>; plannedStart; plannedEnd; status }
interface Activity { id; name; scope:'project'|'company'|'personal'; paid; costBearing; productive; billable; countsUtilisation; projectCosted }
interface TimeEntry { personId; date; minutes; projectId?; phaseId?; activityId; notes?; status:'draft'|'confirmed'; lockedCost? }
interface ExternalAgreement { collaboratorId; projectIds[]; model:'hourly'|'daily'|'retainer'|'fixed_project'|'fixed_phase'|'fixed_deliverable'|'milestone'; fee; currency; sgdRate; attribution; milestones?[] }
interface OverheadItem { category; amount; recurrence:'monthly'|'annual'|'oneoff'; effectiveFrom; effectiveTo? }
interface RevenueItem { projectId; type; amount; recognitionTrigger; state:{contracted;recognised;invoiced;collected} }
interface FinancialPeriod { yearMonth; status:'open'|'locked'; tieOut:'green'|'amber'|'red' }
```

## 4. Permissions model (prototype)

`can(user, action, resource, field?)` — one function, policy-table-driven from the Phase 3 matrix; components never test roles directly. Masked rendering via `<Masked value sensitivity>` which resolves to full / aggregate / range / `$ ·····` / absent. Demo accounts (switcher in the utility bar): **Mei (team member) · Ryan (lead + leadership + super admin — demonstrates additive roles) · Priya (people manager) · Daniel (finance admin) · Sofia (leadership only) · Admin (super admin).** Switching roles re-renders nav subtractively and re-masks every figure — the demo's core trick.

## 5. Financial-calculation module

Implements Phase 2 verbatim; **`workedExamples.test.ts` asserts the exact published figures** (A: internal $20,070, GP $17,930, GM 47.2%, $/h $61.83 · B: $54,880/$45,120/25.1%/$57.85 · C: $144,740/$52,260/12.4%/$29.53 · D: $4,850/$7,150/59.6%/$110.00 · E: $136,200, GP −$6,200, GM −2.5%, $/h −$3.76, Margin-1 52% · month tie-out $61,300 = 38,000+21,000+2,300, OP −$800, coverage 0.98). The financial logic may not be simplified to ease coding — if a formula is hard, the formula wins.

## 6. Mock data requirements

≥10 fictional projects across types: 3 active (one trending to overrun with hours% − schedule% ≥ 15), completed set incl. the highly-profitable small sprint (D) and the high-value loss-maker (E, with its revision history), one opportunity, one on-hold; 6 internal people on the Phase 2 rate card + 4 OE Verse collaborators covering hourly/retainer/fixed/milestone models; overhead register per Phase 5 §E4; 12 months of history (entries, recognition events, monthly rollups) so trends and the cockpit are alive. SGD default; one project in USD (capture-rate conversion). No real names, salaries or clients.

## 7. Required prototype flows

Team member: sign-in (account pick) → home → enter today (row model + favourites + copy yesterday) → edit entry → complete day → week → one insight. Lead: assigned projects → project → phase health → est-vs-actual → resource view → adjust FCAC assumptions. Admin: add person → configure employment cost (watch rates derive) → add OEV collaborator → project from template → phases → estimated hours → external costs → target margin (price ladder reacts). Leadership: cockpit → change period → drill time allocation → portfolio → sort by profit/hour → service lines → open project from report. Behaviours: filtering, sorting, drill-down, date-range, empty states, warnings, permission-restricted states, responsive layouts, editable forms, confirmations, representative errors (save-fail with preserved input; locked-period).

## 8. Setup, test scenarios, limitations

Setup: `npm i && npm run dev` (Node 20+); `npm test` runs the financial acceptance suite — **the suite must pass before any UI work is accepted.** Test scenarios: the 18 Phase 9 scenarios each get a demo path or a documented "backend-only, out of prototype scope" note. Known limitations (declared, not discovered): no persistence (refresh resets, or localStorage-free in-memory per session), no real auth, no integrations, recognition simplified to milestone marks, single-user simulation (no concurrency), audit trail rendered from fixtures.

## 9. Recommendations for production development

Keep `lib/finance` and `lib/permissions` as extractable packages — they become the backend's core (same TS, run on Node). Replace `src/api` mocks with a typed client (tRPC/OpenAPI) against the Phase 9 production architecture. Prototype components carry the design system into production; screens get rebuilt against real data contracts, not copy-pasted.

## 10. Decisions requiring approval

1. Stack as specified (React/TS/Vite/Tailwind/Radix/Recharts/Zustand/Vitest). *(Recommended.)*
2. Worked-examples test suite as the acceptance gate for the financial engine. *(Recommended — the single highest-leverage control in the build.)*
3. Demo-account cast incl. multi-role Ryan. *(Recommended.)*
4. Prototype excludes persistence/auth/integrations by design. *(Recommended.)*

---
*Cumulative spec updated to v0.8. Companion: CLAUDE-CODE-BUILD-PROMPT.md.*
