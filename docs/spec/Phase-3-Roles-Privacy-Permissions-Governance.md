# OuterEdit Agency Intelligence Console
## Phase 3 — Roles, Privacy, Permissions & Governance

**Version 1.0 · 29 July 2026 · Status: For review**

---

## 1. Role framework

Roles are **additive grants** on a person; multi-role is the norm (D-note, Phase 1 §3). A person's effective permission = union of grants, with sensitive-data ceilings applied per grant scope (holding "project lead" on Project X grants nothing on Project Y).

| Role | Scope basis | Summary of grant |
|---|---|---|
| **Team member** | Self + assigned projects | Own profile, own time (full sovereignty), own insights, permitted project info (scope, phases, own hours, team names — no financials) |
| **Project lead** | Per-project assignment | Project health: est-vs-actual hours, phase consumption, **budget consumed % and $ at aggregate level (masked rates)**, team hours on the project, forecasts, variations, notes, phase/deliverable management. No salaries, no individual cost rates, no company financials |
| **People manager** | Named direct reports / assigned groups | Reports' allocation *patterns*: weekly totals, missing days, workload distribution, capacity, leave calendar. **Not** entry-level notes on other leads' projects, not remuneration, not personal contextual categories (meals/commute never visible to anyone but the individual) |
| **Finance administrator** | Company-wide financial | Salaries, employment agreements, cost/sell rates, OE Verse rates & agreements, overheads, revenue/invoices/expenses, periods & locking, reconciliation, financial reports & exports |
| **Operations administrator** | Company-wide operational | People profiles (non-remuneration), templates, activity categories, time rules, project setup, assignments. Financial visibility only if separately granted |
| **Leadership** | Company-wide read + commercial approve | All dashboards and reports incl. company P&L, portfolio profitability, capacity; approves quotations/variations; sees masked people-cost aggregates by default — **remuneration detail only if also finance/super admin** |
| **Super administrator** | Unlimited | Everything + permissions, financial assumptions, audit trail, exports, period reopen. Minimum two, maximum few; every super-admin action is audit-trailed like anyone else's |
| **External contributor** *(R3)* | Self + assigned deliverables | Own assignments, own submissions (time/milestones/invoices/expenses), own contractual terms only. Hard-walled portal; no internal directory, no other collaborators' terms |
| **Read-only auditor** *(R2/R3)* | As granted, time-boxed | View + export on granted financial scopes + audit trail; no create/edit anywhere; access expires by date |

## 2. Permission dimensions

Grants are expressed as **Role × Module × Action × Scope**, where scope ∈ {self, project(s), team(s), reporting line, company} and financial-sensitivity class (below) acts as a ceiling that a module grant can never exceed. Time-period scoping applies to auditors (date-bounded) and locked periods (edit rights collapse to "view + request adjustment"). Actions: view, create, edit, delete, approve, export, configure, invite, assign, close, reopen.

### Module × role matrix (V view · C create · E edit · A approve · X export · ✱ configure; blank = no access; ◐ = masked/aggregate view)

| Module | Team member | Project lead | People mgr | Finance | Ops admin | Leadership | Super |
|---|---|---|---|---|---|---|---|
| Home / My Time / My Week / My Insights | V C E (self) | same (self) | same (self) | same (self) | same (self) | same (self) | same (self) |
| Projects (portfolio) | V (assigned, limited fields) | V (assigned, health) | V (reports' projects, limited) | V (financial fields) | V C E | V X | all |
| Plan & Quote | — | C E (own projects) | — | V (costs) | C E | V A X | all |
| Project Delivery | V (own hours, phase status) | V E (own projects) | ◐ | V | V E | V X | all |
| Project Financials | — | ◐ (budget health, masked) | — | V C E X | ◐ | V X | all |
| People (directory) | V | V | V | V | V C E | V | all |
| People (remuneration/rates) | — | — | — | V C E X | — | ◐ (aggregates) | all |
| OE Verse | — | V (assigned collaborators; rates configurable) | — | V C E X | V C E (non-rate) | V X | all |
| Capacity (R2) | V (self) | V E (own projects) | V (reports) | V | V E | V X | all |
| Company Costs | — | — | — | V C E X | — | V X | all |
| Company Financials | — | — | — | V X | — | V X | all |
| Reports | V (personal only) | V (project scope) | V (team scope) | V C X | V (ops scope) | V C X | all |
| Templates | — | V | — | — | V C E ✱ | V | all |
| Administration | — | — | — | ✱ (periods, financial settings) | ✱ (categories, time rules) | — | all ✱ |
| Audit log | — | — | — | V (financial scope) | — | — | V X |

## 3. Sensitive-data handling

Four sensitivity classes, enforced centrally (one policy module; the report layer and API check field-level class against the viewer, so no report can leak what a screen protects):

| Class | Data | Full access | Masked/aggregate view for others |
|---|---|---|---|
| **S1 · Remuneration** | Salary, employment agreements, individual cost rates, CPF, benefits | Finance, super admin | Leads see **project budget consumed** ($ and %) computed from rates without rate disclosure; leadership sees team-level cost aggregates (≥3 people per aggregate to prevent inference) |
| **S2 · Company finance** | Company P&L, overheads, operating profit, client pricing strategy | Finance, leadership, super admin | Employees see the honest *narrative* ("healthy month" / collective milestones), never figures |
| **S3 · Personal time** | Individual entries, notes, contextual categories, leave reasons | The individual | Lead: project-scoped hours (entry-level, project rows only, no personal notes unless shared); manager: daily/weekly totals + gaps; leadership: aggregates. **Contextual categories (meals, commute) and personal insights: individual only, absolutely** |
| **S4 · External commercial** | OE Verse rates, agreements, contracts | Finance, ops, leadership | Lead sees scope + deliverables + status; rate visibility per-agreement toggle (default hidden) |

**Small-team inference guard:** aggregates that would reveal an individual by subtraction (team of 2) display as ranges or roll up a level. This matters at OuterEdit's size and is a standing rendering rule, not a report author's choice.

## 4. Manager access rules

Access flows **only from explicit relationships**, never from title: (a) named manager on a Person record → that report's S3-masked views; (b) project-lead assignment → that project's scope; (c) admin-granted group (e.g. "Studio team") → group patterns. Dotted-line and cross-functional access are explicit, time-boxable grants. When a report moves on, the former manager keeps *historical aggregate* visibility for periods they managed (for continuity) but loses go-forward access automatically on the relationship end date. All relationship changes are audit-trailed.

## 5. Employee control & trust

Every employee can: **view** everything stored about them (profile, entries, derived insights, who has viewed what class of their data); **correct** their own time until period lock, and request adjustments after; **comment** on any of their records; **dispute** a record via a flag that routes to ops + super admin and cannot be dismissed silently; **export** their own complete data (self-service); **understand** usage via the Privacy page.

### The privacy page (plain-language, shipped in R1, shown at onboarding)

> **Why we ask you to map your time.** So OuterEdit prices projects honestly, protects you from chronic over-servicing, staffs projects fairly, and builds the stability that funds salaries, bonuses and growth. Your time makes the argument that a timeline was unrealistic, so you don't have to.
> **Who sees what.** You see everything of yours. Your project lead sees hours recorded on their project. Your manager sees your weekly totals and gaps, never your notes. Finance sees costed totals. Nobody but you ever sees your breaks, meals, commute, or personal insights.
> **What it's used for.** Project costing, fair pricing, capacity planning, company financial health.
> **What it will never be used for.** Ranking people. Performance scores. Surveillance. There are no screenshots, no keystroke logging, no idle tracking, and no leaderboards, and the system is built so they can't be quietly added.
> **Corrections.** Edit freely until a month locks; after that, corrections are recorded as dated adjustments so history stays honest.
> **Retention.** Time and project records are kept as long-term business records; personal contextual entries are yours and deletable by you at any time.

## 6. Approval flows (deliberately few)

| Flow | Trigger | Approver | Notes |
|---|---|---|---|
| Time | — | **None.** Time is trusted, not approved | Leads may *query* an entry (comment, never edit). Weekly gentle nudge for gaps |
| Time adjustment post-lock | Correction on locked month | Finance | Creates adjustment entry (Phase 2 §3.3) |
| Quotation issue/acceptance | Version sent / client accepts | Leadership | Acceptance freezes baseline |
| Variation | Scope/fee change | Leadership | Required for baseline change; drafted automatically by scope-creep alerts |
| Budget (estimate) edits pre-approval | — | Lead freely | Pre-baseline is a sandbox |
| Cost-rate / salary change | New agreement or rate | Super admin (second pair of eyes on finance's entry) | Audit-trailed with effective date |
| External engagement | New OE Verse agreement | Finance/ops | Above threshold (configurable, e.g. $10k): + leadership |
| Expense | Above threshold (e.g. $500) | Lead (project relevance) + finance (payment) | Below threshold: log-and-review |
| Project closure | Delivery complete | Lead declares; finance closes financially | Retrospective required before "Financially closed" |
| Period lock / reopen | Month end / exceptional | Finance / super admin + reason | Reopen is loud: banner + audit + notification to finance |

## 7. Audit trail specification

Immutable, append-only, super-admin-included. Recorded: salary & agreement changes; cost/sell-rate changes; time edits after the entry's day + all post-lock adjustments; baseline/budget/variation changes; permission & relationship changes; expense/revenue/invoice mutations; recognition marks; closures, locks, reopens; **exports of any S1/S2 report** (who, what, when); dispute flags and resolutions. Each record: actor, timestamp, entity/field, old→new, reason (mandatory for reopens, rate changes, adjustments), session context. Retention: life of company. Access: super admin (all), finance (financial scope), auditor (granted scope).

## 8. Privacy-by-design review — failure modes & countermeasures

| Potential failure | Countermeasure |
|---|---|
| Report layer leaks what screens mask (e.g. export reveals rates) | Single field-level policy module; exports pass the same checks; S1/S2 exports audit-trailed |
| Small-team aggregates reveal individuals by subtraction | ≥3-person aggregation floor with range fallback (§3) |
| Insight drift into scoring ("most productive this week") | Personal insights are individual-only by architecture; team views have no per-person productivity dimension to select |
| Manager fishing through history | Relationship-scoped, dated access; views of S3 data are themselves logged and visible to the employee |
| Quiet feature creep toward surveillance | "What it will never be used for" is a published product boundary; adding such a feature requires editing the public privacy page — a loud act |
| Salary inference from budget math (lead divides cost by hours) | Leads see cost only at project aggregate with ≥2 contributors, else % of budget only |
| Contextual time subpoenaed into disputes | Contextual categories excluded from all exports except the employee's own |
| Super admin as unwatched watcher | Super-admin actions audit-trailed; two supers watch each other; audit log immutable to all |

## 9. Governance risks

Concentration risk (founder as finance + leadership + super admin: acceptable at current size if the *second* super admin genuinely reviews rate changes); dispute-flag credibility (must visibly resolve; an ignored dispute kills trust faster than no mechanism); approval fatigue (thresholds keep flows rare; review quarterly); PDPA compliance (time and remuneration data are personal data — retention, access and export rights above align with PDPA; confirm with counsel; appoint DPO contact).

## 10. Decisions requiring approval

1. **No time approval workflow** — time is trusted; leads query, never approve. *(Recommended; the single biggest anti-timesheet signal.)*
2. **Contextual categories and personal insights are individual-only, absolutely** (no override, not even super admin in-app; raw DB access remains governed by policy). *(Recommended.)*
3. **Leadership does not see individual salaries by default** — remuneration requires the finance or super-admin grant. *(Recommended; confirm founders' preference.)*
4. **≥3-person aggregation floor** for cost aggregates (≥2 for project budget views with %-only fallback). *(Recommended.)*
5. **Employee data-view transparency:** employees can see when their S3 data was viewed and by whom. *(Recommended — strong trust signal; confirm comfort.)*
6. **Salary changes require second-super-admin confirmation.** *(Recommended.)*
7. **Expense threshold $500 / external-engagement leadership threshold $10k.** *(Confirm values.)*
8. **Dispute flag route:** ops + super admin, 5-working-day visible SLA. *(Confirm.)*
9. **PDPA review** with counsel before pilot; DPO contact named. *(Needs action.)*

---
*Cumulative spec updated to v0.3.*
