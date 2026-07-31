# OuterEdit Agency Intelligence Console
# Definitive Product & Wireframe Specification

**v1.0 · 29 July 2026 · Consolidates Phases 1–9.**
This is the handover document. It resolves naming, states what is confirmed vs recommended, and carries the prioritised backlog. The phase documents in this folder are its appendices and remain authoritative for depth; section references below point into them.

---

## 1. Executive summary

The OuterEdit Agency Intelligence Console is an internal web platform that connects, in one continuous structure, everything OuterEdit currently holds in disconnected spreadsheets and instinct: quotation planning, project delivery tracking, humane whole-day time allocation, external-talent commercials, project profitability, company profitability, capacity, and an institutional memory that makes every future quotation smarter than the last. Its two load-bearing ideas: **one language from estimate to actual** (the phase/role/hour structure created at quotation is the same structure time and cost land on), and **two ledgers, never blurred** (project gross profit vs. company operating profit, connected by a single-count payroll allocation that makes double counting structurally impossible). It is explicitly not a timesheet, not surveillance, not a PM tool, and not an accounting system: it is the management console of a creative business, warm in tone and exact with money.

## 2. Specification index (28 required sections → source)

| # | Section | Where |
|---|---|---|
| 1 | Executive summary | Above |
| 2 | Product vision & principles | Phase 1 §1–2 |
| 3 | Intended business outcomes | Phase 1 §1 |
| 4 | Employee value proposition | Phase 1 §1; Phase 3 §5 |
| 5 | User roles & permissions | Phase 3 §1–2 (matrix) |
| 6 | Module architecture | Phase 1 §4 |
| 7 | Navigation & sitemap | Phase 4 §1–2 |
| 8 | Complete data model | Phase 1 §5 + Phase 2 §11 + Phase 8 §3 |
| 9 | Financial terminology & formulas | Phase 2 §1, §5–7 |
| 10 | Project profitability model | Phase 2 §5 |
| 11 | Company profitability model | Phase 2 §7 |
| 12 | Time-allocation model | Phase 2 §3 |
| 13 | Project templates & phases | Phase 1 §4 F1, master brief lists (Branding / Spatial / Festival / Creative strategy) |
| 14 | Detailed user journeys | Phase 4 §3 (J1–J14) |
| 15 | Screen inventory | Phase 4 §2 (~58 screens) |
| 16 | Wireframes | Phase 5 + interactive `OE-Console-Wireframe-Prototype.html` |
| 17 | Reporting & KPI library | Phase 6 §2–3 |
| 18 | Alerts & forecasting | Phase 6 §4; Phase 2 §5.11–5.14 |
| 19 | Historical benchmarking | Phase 6 §7 |
| 20 | Pricing intelligence | Phase 2 §9; Phase 6 §8 |
| 21 | Visual & interaction direction | Phase 7 (Studio Ledger) |
| 22 | Accessibility requirements | Phase 7 §6, §8 |
| 23 | Prototype architecture | Phase 8 + CLAUDE-CODE-BUILD-PROMPT.md |
| 24 | Security & audit | Phase 3 §7; Phase 9 §5 |
| 25 | Pilot plan | Phase 9 §3–4 |
| 26 | Production roadmap | Phase 9 §6 |
| 27 | Acceptance criteria | Backlog below; Phase 8 §5 (financial gate); Phase 9 §3 (pilot exit) |
| 28 | Outstanding decisions | §5 below |

## 3. Resolved terminology (conflicts eliminated)

"True Margin" (legacy) = **Gross margin (GM)**; shown as alias. "Margin-1" = **Third-party margin**, display lens only. "Budget health" (lead view) = masked rendering of Project Financials, not a separate calculation. "Timesheet" does not appear anywhere in the product; the act is **mapping your day**. "OE Verse" is the canonical name for the external network; "freelancer database" deprecated. "Plan & Quote" is the canonical module name for estimating + quotation. KPI names per the Phase 6 dictionary are mandatory in all views.

## 4. Requirement status

**Confirmed requirements** (structural; the product is not this product without them): one-structure loop; two ledgers + single-count invariant; costing at cost-per-paid-hour; baseline freeze + variations; time sovereignty; non-surveillance boundary incl. individual-only insights and contextual-time privacy; sensitivity classes S1–S4 with masking; immutable audit; period locking; R1 scope as the flywheel.

**Recommended requirements** (approved-by-default unless Ryan overrides): the D1–D40 decision log items marked *Recommended* in CUMULATIVE-SPEC.md; Studio Ledger visual direction; row-based time entry as primary; no time-approval workflow; alert thresholds as tabled.

**Future possibilities:** external contributor portal; integrations (Xero first); pricing-intelligence interface; AI-assisted estimating; dark theme; multi-entity/multi-currency maturity.

**Assumptions requiring validation:** CPF parameters & bonus structure (accountant); PDPA review (counsel); rate-card currency (the sheet's rates as seeds); team size tolerances for manual R1 finance; founders' daily-entry commitment; two named super admins.

## 5. Outstanding decisions

All 40 phase decisions are logged in CUMULATIVE-SPEC.md. The eight needing genuine input rather than a nod: D8 (founder commitment), D10 (super admin names), D15 (mark-up/contingency values), D17/D19 (bonus & CPF with accountant), Phase 3 §10.7 (approval thresholds), Phase 6 §10.6 (operating-margin target), Phase 9 §8.2 (publish the "inadmissible in reviews" bright line).

---

## 6. Prioritised implementation backlog

### MUST HAVE (R1 — the flywheel)

**M1 · People, agreements & dated rates**
*Story:* As finance, I maintain each person's employment agreement so the system derives accurate, dated cost rates that survive salary changes.
*Rationale:* No trustworthy costing exists without this. *Requirements:* agreement CRUD with effective dating; automatic paid/available/productive rate derivation (Phase 2 §2); rate timeline UI; second-super-admin confirm; no retro-editing. *Permissions:* S1 finance/super only. *Data:* Person, EmploymentAgreement, CostRate. *Success:* entries before a raise's effective date still cost at the old rate. *Error:* missing schedule blocks derivation with plain message. *Acceptance:* J6/J7 pass; audit records on every change.

**M2 · Activity categories with behaviour flags**
*Story:* As ops admin, I configure time categories (incl. contextual meals/commute) so each hour lands in the right cost bucket or none.
*Requirements:* six flags per Phase 1 §5; flag changes audit-trailed; seed set incl. leave/PH. *Acceptance:* contextual time never appears in any cost; category flip mid-month affects only entries after the change date.

**M3 · Project record & lifecycle**
*Story:* As a lead, I take a project from Opportunity to Financially closed on one record.
*Requirements:* 12 statuses; client/service-line/type; risk flags; close checklist requiring retrospective. *Acceptance:* J13; frozen figures post-closure; reopen only via super admin path.

**M4 · Templates & Plan & Quote**
*Story:* As a lead, I build an estimate from a template (phases × roles × hours × externals) and produce versioned quotations with the price ladder and floors.
*Requirements:* 4 seed templates; copy-not-link; estimate grid; external lines + 20% mark-up; contingency 10%; overhead recovery; target-GM price; NegotiationFloor/MinSafe floors; GST; clause library; version history; acceptance freezes baseline. *Permissions:* cost columns masked for leads per S1. *Success:* quote below min-safe requires explicit confirm. *Acceptance:* J9; ladder figures match `lib/finance` tests.

**M5 · Time mapping (day + week)**
*Story:* As a team member, I map my full day in under two minutes, warmly.
*Requirements:* row-model entry, cascading pickers limited to assignments, favourites, copy yesterday/week, 15-min steppers, drafts, completion ring, gentle single daily nudge, week grid with gaps, corrections till lock, mobile-responsive, keyboard path. *Success:* "You've mapped 8 of 8 hours." *Error:* save-fail preserves input. *Acceptance:* J1/J2; median entry time ≤3 min in pilot.

**M6 · Costing & est-vs-actual delivery view**
*Story:* As a lead, I see phase-by-phase estimated vs actual hours and masked budget consumption in time to act.
*Requirements:* formulas 5.1–5.10; paired-bar + schedule tick; per-role drill; manual forecast field; amber thresholds; variation records. *Permissions:* masked $ aggregates for leads. *Acceptance:* J4; scenario 2 & 3 behaviours.

**M7 · Project financials**
*Story:* As finance/leadership, I see each project's revenue lenses, cost stack, GP, GM and profit-per-hour.
*Requirements:* revenue items with milestone recognition; invoices (manual); direct expenses with category guard; external agreements (all models) with committed/accrued logic; profit/hour. *Acceptance:* worked examples A–E reproduce exactly from fixture data.

**M8 · OE Verse core**
*Story:* As ops/finance, I hold every external collaborator and agreement so external costs land correctly without forcing hourly models.
*Requirements:* directory; agreement editor per model; attribution rules; thresholds → approval. *Acceptance:* J8; scenarios 4, 5, 17.

**M9 · Company summary (lite) + overhead register + periods**
*Story:* As leadership, I see monthly: project GP vs non-project payroll + unallocated + overheads = operating profit, with the tie-out badge.
*Requirements:* overhead register with payroll guard; §7 formulas; monthly lock; adjustment flow; tie-out check blocking lock when red. *Acceptance:* J10; scenario 15; mini tie-out example reproduces.

**M10 · Permissions, masking, audit, privacy page**
*Story:* As any user, I see exactly what my roles allow, and my sensitive data is provably protected.
*Requirements:* policy module (Phase 3 matrix); subtractive nav; masked renderers with aggregation floors; immutable audit on S1/S2 mutations + exports; privacy page live at onboarding; dispute flag. *Acceptance:* permission unit tests incl. "lead cannot resolve any cost rate"; every Phase 3 §8 countermeasure demonstrable.

**M11 · Core fixed reports**
*Story:* As leadership/finance, I run project profitability, est-vs-actual, company time allocation and the monthly summary without a report builder.
*Acceptance:* each report's figures reconcile to `lib/finance` (no independent computation).

### SHOULD HAVE (R2)
Full My Insights · capacity planner · forecast-at-completion engine (burn factor) · scenario & discount modelling · report builder + scheduled reports · full cockpit with year-end forecast · service-line & client analysis · people-manager views · retrospective variance pack · auditor role · effort-based recognition.

### COULD HAVE (R3)
Xero sync + reconciliation · Calendar suggestions · Slack/email nudges · SSO · external contributor portal · historical backfill import · multi-currency maturity · saved comparison sharing · Monday.com mirror (if still used).

### DELIBERATELY EXCLUDED FROM FIRST RELEASE
Pricing-intelligence recommendations (needs ≥15 benchmarks) · AI estimating · client portal (excluded indefinitely) · any performance-review linkage (excluded permanently) · leaderboards/productivity scoring (excluded permanently) · screenshots/idle tracking (excluded permanently) · payroll processing · task management.

---

## 7. Handover notes

The repository layout, build stages and acceptance gates for the coded prototype are in Phase 8 and CLAUDE-CODE-BUILD-PROMPT.md; production architecture and staged roadmap in Phase 9 §5–6; pilot and adoption playbook in Phase 9 §3–4. The Phase 2 worked examples serve every implementer as executable truth: **if code disagrees with Example E, the code is wrong.** Naming of the product itself remains open by design; revisit after the pilot, when the team can name the thing they actually use.
