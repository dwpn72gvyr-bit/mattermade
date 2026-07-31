# OuterEdit Agency Intelligence Console — Cumulative Product Specification

**v1.0 · 29 July 2026 · Maintained across Phases 1–9.**
This document is the single source of truth for agreed product logic. Each phase updates it. Detailed phase deliverables live alongside it; this file holds the canonical, condensed state.

---

## Status

| Phase | Deliverable | Status |
|---|---|---|
| 1 · Product definition & system architecture | Phase-1-Product-Definition-and-System-Architecture.md | **Delivered — awaiting approval of 10 decisions** |
| 2 · Financial model & profitability logic | Phase-2-Financial-Model-and-Profitability-Logic.md | **Delivered — awaiting approval of 10 decisions** |
| 3 · Roles, privacy, permissions, governance | Phase-3-Roles-Privacy-Permissions-Governance.md | **Delivered** |
| 4 · Information architecture & user journeys | Phase-4-Information-Architecture-and-User-Journeys.md | **Delivered** |
| 5 · Low-fidelity wireframes | Phase-5-Low-Fidelity-Wireframes.md + OE-Console-Wireframe-Prototype.html | **Delivered** |
| 6 · Reporting & decision intelligence | Phase-6-Reporting-and-Decision-Intelligence.md | **Delivered** |
| 7 · Visual language & engagement | Phase-7-Visual-Language-and-Engagement.md | **Delivered** |
| 8 · Interactive prototype + Claude Code prompt | Phase-8-Prototype-Architecture.md + CLAUDE-CODE-BUILD-PROMPT.md | **Delivered** (coded prototype: next step via Claude Code) |
| 9 · Validation, pilot & production roadmap | Phase-9-Validation-Pilot-Production-Roadmap.md | **Delivered** |
| Consolidation | FINAL-SPECIFICATION.md | **Delivered** |

## Canonical definitions established in Phase 1

- **Vision:** the studio's shared memory and financial nervous system; an operating console, not a timesheet, PM tool, or accounting package.
- **Core loop:** Estimate → Quote → Plan → Deliver → Track → Forecast → Review → Learn → better pricing, on one shared structure (phases × roles × hours).
- **Two ledgers:** project profitability (direct costs only) and company profitability (aggregate gross profit vs. non-project payroll + overheads) — connected, never blurred; overhead allocation is an analytical lens only.
- **Single-count invariant:** each period's employment cost is split across recorded paid activities; a dollar is either project cost or company cost, never both.
- **12 product principles** (Phase 1 §2) including non-surveillance as a product boundary and "the employee gets more back than they give."
- **Six module areas:** Personal (Home, My Time, My Week, My Insights) · Projects (Projects, Plan & Quote, Delivery, Project Financials) · People & Capacity (People, OE Verse, Capacity) · Company Finance (Company Costs, Company Financials) · Intelligence (Reports, Pricing Intelligence) · Platform (Templates, Administration, Settings, Integrations).
- **~30 entities** defined (Phase 1 §5), with dated rates, frozen estimate baselines, snapshot-on-lock costing, and an immutable audit trail.
- **11-stage lifecycle** Opportunity → Historical benchmark (Phase 1 §6); baseline freezes at approval; closure locks numbers.
- **Roadmap:** R1 flywheel MVP → R2 depth → R3 connection/integrations → R4 intelligence layer (Phase 1 §7).

## Canonical definitions established in Phase 2

- **Costing basis:** cost-per-paid-hour for ALL recorded time (project and company); cost-per-available-hour is the pricing floor basis; cost-per-productive-hour drives overhead recovery. Estimates and actuals share the paid-hour basis.
- **Allocation identity:** EmploymentCost(period) = ProjectLabour + NonProjectPayroll + UnallocatedPayroll ± ReconciliationAdjustment — every payroll dollar in exactly one bucket; monthly automated tie-out; period cannot lock while red.
- **Contextual time** (meals, commuting) is recorded but costed nowhere. Unpaid leave reduces employment cost pro-rata.
- **Overtime:** costed at standard rate into projects (true effort) with a company-level "absorbed overtime" balancing line (true cash).
- **External cost states:** planned → committed → actual; fixed fees count committed-in-full in forecasts; milestone-else-straight-line accrual for period reporting. Mark-up (default 20%) is a pricing event, never a cost event.
- **Revenue lenses:** contracted / recognised / invoiced / collected; **recognised drives all profitability**; R1 recognition = milestone/phase completion (retainers straight-line, T&M as delivered); R2 = effort-based % completion.
- **18 project formulas** (Phase 2 §5) incl. profit-per-internal-labour-hour as the cross-project comparator, FCAC with burn-factor ETC, unbilled-effort meter, contribution-after-overhead as labelled analytical lens only.
- **Pricing ladder:** effort → internal cost → loaded check → external (+20%) → expenses → contingency (10%) → overhead recovery → price = cost ÷ (1 − target GM). Three floors: NegotiationFloor (direct), MinimumSafePrice (+overhead), RecommendedPrice. Four scenarios (Best/Expected/High-effort/Reduced-scope); Expected is the approval baseline.
- **Legacy lenses preserved as displays:** sheet's Margin-1 (excl. internal, 60–70%) and True Margin (≈GM, 50–60%); worked example E documents the Margin-1 trap.
- **Five worked examples + company tie-out** (Phase 2 §10) double as acceptance tests for the future financial-calculation module.

## Decision log

| # | Decision | Phase | Status |
|---|---|---|---|
| D1 | Merge Planning + Quotations into "Plan & Quote" | 1 | Proposed |
| D2 | R1 scope + explicit exclusions | 1 | Proposed |
| D3 | Company financials lite in R1 | 1 | Proposed |
| D4 | Estimate baseline frozen at approval; variations only | 1 | Proposed |
| D5 | Time sovereignty: only the person edits their own time | 1 | Proposed |
| D6 | SGD single ledger in R1; multi-currency R3 | 1 | Proposed |
| D7 | Cost rates visible to finance/super admin only | 1 | Proposed |
| D8 | Founders commit to daily time entry | 1 | Proposed |
| D9 | Phase-level tracking mandatory; deliverable-level optional | 1 | Proposed |
| D10 | Two named super admins at launch | 1 | Proposed |
| D11 | Costing basis = cost per paid hour everywhere | 2 | Proposed |
| D12 | Overtime: standard-rate costing + absorbed-overtime line | 2 | Proposed |
| D13 | R1 revenue recognition = milestone/phase completion | 2 | Proposed |
| D14 | Fixed external fees committed-in-full; milestone/straight-line accrual | 2 | Proposed |
| D15 | External mark-up 20%; contingency 10% defaults | 2 | Proposed |
| D16 | Target GM band 50–60%; Margin-1 as display lens only | 2 | Proposed |
| D17 | Discretionary bonuses excluded from cost rates; AWS included | 2 | Proposed |
| D18 | Productive factor default 80% | 2 | Proposed |
| D19 | CPF % and ceiling confirmed with accountant, configurable | 2 | Needs input |
| D20 | Pro bono at zero revenue, tagged, excluded from benchmarks | 2 | Proposed |
| D21–D29 | Phase 3 governance set: no time approval; contextual/insight absolute privacy; leadership salary access opt-in; aggregation floors; view-transparency; dual-super salary confirm; thresholds $500/$10k; dispute SLA; PDPA review | 3 | Proposed (D29 needs action) |
| D30–D34 | Phase 4 IA set: subtractive nav; period defaults; no individual gap notifications to managers; retrospective-gated closure; ⌘K scope | 4 | Proposed |
| D35 | Row-model time entry primary; blocks optional; conversational accelerator | 5 | Proposed |
| D36 | Phase 6 set: KPI dictionary mandatory; alert defaults; four-part insight frame; benchmark n≥3; send-time permission re-check; operating-margin target w/ accountant | 6 | Proposed (last needs input) |
| D37 | "Studio Ledger" visual direction, two-temperature rule, tone dial, permanent engagement exclusions | 7 | Proposed |
| D38 | Prototype stack + worked-examples acceptance gate + demo cast | 8 | Proposed |
| D39 | Pilot: whole studio, 4 wks, founders first; "inadmissible in reviews" bright line published | 9 | Proposed |
| D40 | Production: Node/TS + PostgreSQL + managed auth, ap-southeast-1, S1 app-layer encryption | 9 | Proposed |

## Reference material absorbed

- Existing P&L/quotation spreadsheet (reviewed 29 Jul 2026): quotation line-item format with GST 9%; clause library (3-round amendments, working-files release at 20%, look-and-feel scope disclaimers); dual-rate practice (charge-out vs. internal cost rates); two-margin lens (Margin excl. internal costs, ideal 60–70%; True Margin incl. internal, ideal 50–60%); OEV third-party costs with 20% mark-up; 5% buffer (ideally 10%); profit-per-month view. To be formally mapped into the Phase 2 financial model.

## Open questions carried forward

- CPF parameters and bonus structure — confirm with accountant (D17, D19).
- Approval strictness and post-lock correction flow detail (Phase 3).
- PDPA obligations for time/remuneration data (Phase 3).
- Historical data backfill depth (Phase 9 / R3).
