# OuterEdit Agency Intelligence Console
## Phase 1 — Product Definition & System Architecture

**Version 1.0 · 29 July 2026 · Status: For review by Ryan Tan / OE Founders**
Working name only. Naming exercise deferred by design.

---

## 1. Product vision

### Vision statement

The OuterEdit Agency Intelligence Console is the studio's shared memory and financial nervous system. It holds every project's full story — the promise made in the quotation, the effort spent in delivery, the money earned and consumed, and the lessons learned at the end — in one continuous structure. It exists so that OuterEdit can price with evidence rather than instinct, deliver with awareness rather than surprise, and grow a creative practice that is financially self-knowing without ever surveilling the people who make the work.

It is an *operating console*, not a timesheet, not a project-management tool, and not an accounting package. Its unit of thought is the question a founder actually asks: "Is this project healthy? Is the studio healthy? What should the next one cost?"

### The core problem being solved

OuterEdit currently quotes, plans, tracks and accounts in disconnected artefacts (spreadsheets, memory, and instinct). The quotation lives in one structure; delivery effort is largely unrecorded; costs are reconciled after the fact, if at all. The consequences:

1. **The true cost of delivery is unknown.** Internal hours are the largest cost on most projects and the least visible. High-value projects can quietly become loss-making through revisions, scope creep and extended timelines, and this is discovered late or never.
2. **Pricing cannot learn.** Without actuals recorded against the same structure as estimates, every new quotation starts from scratch. The studio's hardest-won knowledge (what a festival *really* takes) evaporates at project close.
3. **Project profit and company profit are conflated.** A portfolio of individually "profitable" projects can still fail to cover rent, non-project payroll, and admin. There is no continuous view of whether project gross profit covers company overheads.
4. **Capacity is invisible.** Commitments are accepted without a clear picture of who has room, who is chronically over-serviced, and how much work the team can responsibly absorb.
5. **The people who could fix this are the ones a bad tool would alienate.** A conventional timesheet imposed on a creative team produces resentment and junk data. The data is only as good as the team's willingness to give it.

### Intended organisational outcomes

Within 12 months of adoption, OuterEdit should be able to:

1. State the actual direct cost and gross margin of every active and completed project, monthly, without a manual exercise.
2. Detect a project trending toward overrun while there is still time to intervene (re-scope, raise a variation, re-staff).
3. Answer "are we profitable this month?" from one screen: project gross profit vs. non-project payroll plus overheads.
4. Price new work from historical evidence — similar projects, real phase-level effort, real revision patterns.
5. Distribute workload more fairly and spot chronic over-servicing before it becomes burnout.
6. Distinguish structurally profitable service lines and clients from prestigious-but-lossy ones, and shape business development accordingly.
7. Hold an institutional record that survives staff changes: every project a searchable, comparable business case.
8. Support salary growth, bonuses and hiring decisions with real contribution and capacity data — used constructively, never as individual surveillance.

### Value propositions by audience

**For the team member.** A calm, two-minute daily ritual that gives back more than it takes: a visual account of your week, your project mix, your focus patterns, early warning when you're heading into overload, and the quiet assurance that when a timeline is unrealistic, the data — not you — makes the argument. Your time record protects you from chronic over-servicing; it is never used to rank you.

**For the project lead.** A live answer to "is my project okay?" — phase-by-phase estimate vs. actual, budget consumed without confidential salary exposure, forecast at completion, and the evidence needed to request a variation or push back on scope creep while it still matters.

**For leadership.** A company cockpit that connects the portfolio to the P&L: which projects, services and clients genuinely make money; whether gross profit covers overheads; what the team can take on; what the next project should cost. Decisions move from anecdote to evidence.

**For finance and operations.** One system of record for cost rates, external agreements, overheads, and project financials — with period locking, audit trails, clean exports, and an end to reconciling five spreadsheets that disagree.

### What the product is not intended to become

- **Not an employee-monitoring system.** No screenshots, keystroke logging, idle detection, surveillance, or individual productivity scoring. Ever. This is a product boundary, not a settings default.
- **Not a task-management or creative-workflow tool.** It does not replace Monday.com, Figma, or the studio's creative process. It cares about phases, effort and money, not to-do lists.
- **Not the accounting system of record.** Xero (or its successor) remains the statutory ledger. The console is the *management* accounting layer; it will integrate, not replace.
- **Not a payroll or HR system.** It stores employment cost data for costing purposes, but does not run payroll, leave approval workflows (beyond time categorisation), or performance management.
- **Not a client-facing portal.** Clients never see it. (A restricted external-collaborator portal is a possible later release; clients are out of scope indefinitely.)
- **Not a CRM.** Opportunities enter the pipeline for estimating purposes; relationship management stays elsewhere.

---

## 2. Product principles

1. **One structure from promise to proof.** The phase/role/hour structure created at estimation is the same structure used in planning, time recording, forecasting and retrospective. There is never one language for quotations and another for timesheets. Every feature that would fork these structures is rejected.

2. **Two ledgers, never blurred.** Project profitability (revenue minus directly attributable costs) and company profitability (aggregate gross profit minus non-project payroll and overheads) are always distinct, always both visible to those authorised, and always reconcilable to each other. Overhead allocation to projects exists only as a clearly-labelled analytical lens.

3. **Every dollar counted once.** An employee's employment cost for a period is allocated across their recorded paid activities: hours on projects become project cost; hours on company work become company cost. The same dollar never appears in both. This invariant is enforced in the data model, not left to report authors.

4. **Time is contributed, not extracted.** The system asks people to *map* their day, in their own interest and the studio's, and explains exactly why, who sees what, and what the data will never be used for. No surveillance features exist. Language is invitational ("You've mapped 6.5 of your 8 hours"), never punitive ("You failed to submit").

5. **The employee gets more back than they give.** Two minutes of daily mapping buys personal insight: week shape, focus vs. meetings, project switching, workload trajectory, private trends. If the team member gains nothing, the design has failed regardless of what leadership gains.

6. **See only what your role needs.** Progressive disclosure and least privilege. A project lead sees budget consumed, not colleagues' salaries. A team member sees their own time, not others'. Sensitive financial data (remuneration, cost rates, company P&L) is visible only to explicitly authorised roles, and aggregated or masked views are provided wherever partial insight suffices.

7. **Gentle language, honest numbers.** Tone never softens the truth of the data — a project heading for a loss is shown plainly — but the framing is calm, constructive and never shaming. Warning states describe situations, not people.

8. **Correctable by design, auditable by default.** People make mistakes; the system makes correction easy (until a period locks) and records every change to sensitive data — salaries, rates, budgets, time, permissions — in an immutable audit trail. Trust comes from correction *plus* accountability, not from prevention alone.

9. **Insight is offered, never imposed as verdict.** Analytical outputs separate observation ("Phase 3 has consumed 82% of hours at 50% duration") from explanation, forecast and recommendation, and recommendations are always framed as evidence-based suggestions, not automated judgments.

10. **History is an asset that compounds.** Every completed project enriches the benchmark library. Closing a project without a retrospective and a pricing lesson is treated as leaving money on the table. The system makes capture nearly effortless at the moment of closure.

11. **Fast for the daily minute, deep for the monthly hour.** The daily team-member experience must be finishable in under two minutes on a phone. The monthly leadership experience can be dense and powerful. These are different products sharing one truth, and neither may compromise the other.

12. **Privacy has a user interface.** Data-use rules are not buried in a policy document; they are visible in-product: every person can see what is collected about them, who can view it, and what it is used for — written in plain language.

---

## 3. User groups

| Group | Who at OuterEdit | Primary surfaces | Sensitivity ceiling |
|---|---|---|---|
| **Team member** | Every full-time employee | Home, My Time, My Week, My Insights, assigned projects | Own data + permitted project info only |
| **Project lead** | Senior staff leading projects (often also team members) | Project overview, plan, est-vs-actual, resourcing | Project budget health; **no** salaries or individual cost rates |
| **People manager** | Anyone with direct reports | Team view, workload, missing allocations | Direct reports' allocation patterns; no remuneration |
| **Finance administrator** | Finance/ops (may be a founder initially) | People (remuneration), OE Verse rates, overheads, periods, reconciliation | Full financial; salaries; cost rates |
| **Operations administrator** | Ops lead / COO | Templates, categories, time rules, projects setup | Operational config; financials as granted |
| **Leadership** | Founders / directors | Company cockpit, portfolio, service lines, capacity | Everything except system configuration |
| **Super administrator** | Founder(s), likely Ryan + COO | All of the above + permissions, audit trail, settings | Unlimited |
| **External contributor** *(later release)* | OE Verse collaborators | Restricted portal: own assignments, submissions, invoices | Own contractual data only |
| **Read-only auditor** *(later release)* | External accountant / due-diligence | Read-only financial views + audit trail | As granted, view/export only |

**Multi-role is the norm, not the exception.** At OuterEdit's size, one person is often team member + project lead + leadership. Roles are additive grants layered on a person; the interface adapts by combining entitlements, and the person's *personal* experience (their own time entry) remains the same regardless of seniority. Founders enter time too — the data is worthless without the most senior (and most expensive) hours.

---

## 4. Module map

The console is organised into six areas. One structural recommendation departs from the brief's module list: **Project Planning and Quotations & Estimates are one continuous workspace** (working name *Plan & Quote*), because Principle 1 makes them the same structure at different moments — an estimate that is won *becomes* the plan. Quotation versioning and the client-facing quotation document remain distinct outputs within that workspace.

### Area A — Personal (every user, daily)

**A1 · Home**
- *Purpose:* The landing surface. Today's mapping progress, current projects, gentle nudges, one personal insight, upcoming assignments.
- *Users:* Everyone.
- *Functions:* Day completion indicator; quick-add time; recent/favourite activities; notifications digest; links onward.
- *Relations:* Reads Time entry, Capacity allocation, Project assignments.
- *Release:* **R1.**

**A2 · My Time** (day view)
- *Purpose:* The two-minute daily ritual. Map the day against projects, phases, and activity categories.
- *Users:* Everyone (including founders).
- *Functions:* Timeline/blocks and row-based entry; copy yesterday; favourites; optional timer; 15-min (configurable) increments; drafts; notes; correction of recent days.
- *Relations:* Writes Time entry; reads Project, Phase, Activity, Assignment.
- *Release:* **R1** (the single most important module for data quality).

**A3 · My Week**
- *Purpose:* Weekly shape: expected vs. mapped hours, leave/holidays, per-project totals, missing days, copy previous week.
- *Users:* Everyone.
- *Release:* **R1.**

**A4 · My Insights**
- *Purpose:* The give-back. Private, constructive views: project mix, focus vs. meetings, switching, client vs. company work, workload trajectory, reflection prompts.
- *Users:* Everyone; visible only to the individual.
- *Release:* **R2** (a light "your week at a glance" ships in R1 so the give-back exists from day one).

### Area B — Projects

**B1 · Projects** (portfolio and record)
- *Purpose:* The long-term project database: every project from Opportunity to Archived, searchable and comparable.
- *Users:* All (permission-filtered fields); leads and leadership primarily.
- *Functions:* Portfolio list with status/filters; project overview page; status pipeline; risk flags; retrospective record.
- *Relations:* Parent of nearly everything project-scoped.
- *Release:* **R1.**

**B2 · Plan & Quote** (merges *Project Planning* + *Quotations & Estimates*)
- *Purpose:* Build a project's structure once: phases → deliverables → estimated hours by role → external costs → expenses → contingency → margin → price. Produce versioned quotations from it. On win, the same structure becomes the delivery plan.
- *Users:* Project leads, leadership, ops admin.
- *Functions:* Create from template; estimate grid (hours × role × phase); external cost lines (all OE Verse commercial models); buffer/contingency; target margin; scenario comparison (R2); quotation document versions incl. inclusions/exclusions and clause library (from the existing sheet); variation records post-win.
- *Relations:* Creates Quotation, Quotation line item, Phase, Deliverable; consumes Sell rate, Cost rate (masked), Template.
- *Release:* **R1** core; scenarios and discount modelling **R2**.

**B3 · Project Delivery**
- *Purpose:* Live health during delivery: estimate vs. actual by phase and role, budget consumed, forecast at completion, variations, milestones.
- *Users:* Project leads (masked costs), leadership (full).
- *Release:* **R1** for est-vs-actual and budget consumed; forecast-at-completion tooling **R2**.

**B4 · Project Financials**
- *Purpose:* The money view of one project: revenue items, invoices, direct internal labour cost, external costs, expenses, gross profit, margin, profit per internal labour hour.
- *Users:* Finance, leadership; leads see a masked "budget health" subset.
- *Release:* **R1.**

### Area C — People & Capacity

**C1 · People**
- *Purpose:* Central database of employees: profile, role, team, schedule, skills, assignments — with remuneration, cost rates and sell rates in an admin-only compartment with dated history.
- *Users:* All (directory subset); finance/super admin (full).
- *Release:* **R1** (cost rates are a precondition for any costing).

**C2 · OE Verse**
- *Purpose:* The external-talent network: collaborators, disciplines, locations, commercial models (hourly / daily / retainer / fixed fee / milestone / deliverable), rates, agreements, past projects, performance notes.
- *Users:* Ops/finance admin, leadership; leads see assigned collaborators without rates (configurable).
- *Release:* **R1** core directory + agreements; availability and richer profiles **R2**.

**C3 · Capacity**
- *Purpose:* Forward view: who is committed where, planned vs. available hours, conflicts, room for new work.
- *Users:* Leadership, people managers, ops.
- *Release:* **R2** (R1 records assignments; genuine capacity *planning* needs trustworthy time data first).

### Area D — Company Finance

**D1 · Company Costs**
- *Purpose:* Overhead register: rental, insurance, software, legal, marketing, accounting, equipment, admin — recurring and one-off, by effective period, forecast vs. actual.
- *Users:* Finance admin, leadership.
- *Release:* **R1** (simple register); variance and forecasting **R2**.

**D2 · Company Financials**
- *Purpose:* The company cockpit: project gross profit roll-up, non-project payroll cost, overheads, operating profit, break-even, trend.
- *Users:* Leadership, finance, super admin only.
- *Release:* **R1 lite** (monthly summary: gross profit vs. overheads + non-project payroll); full cockpit with forecast **R2**.

### Area E — Intelligence

**E1 · Reports**
- *Purpose:* The drillable reporting layer (Company → Service line → Client → Project → Phase → Person) and, later, the report builder, scheduled reports and exports.
- *Users:* Permission-scoped; leadership and finance primarily.
- *Release:* **R1** fixed core reports (project profitability, est-vs-actual, time allocation, monthly company summary); report builder **R2**; benchmarking and pricing intelligence **R3**.

**E2 · Pricing Intelligence** *(module emerges in R3)*
- *Purpose:* Evidence-based pricing: similar-project benchmarks, phase-level effort history, revision patterns, recommended price ranges with the evidence shown.
- *Release:* **R3 / future layer** — it is fed by R1–R2 data; shipping it early would produce confident answers from no evidence.

### Area F — Platform

**F1 · Templates** — project/phase templates (Branding, Spatial activation, Festival, Creative strategy…), activity categories, clause library. Admin-editable; projects copy-then-customise without touching masters. **R1.**
**F2 · Administration** — permissions, financial settings (GST, currencies, financial year), time rules (increments, day length, category behaviours), financial periods and locking, audit log, data import/export. **R1** core; granular permission editor matures **R2**.
**F3 · Settings** — personal preferences, notification choices, working schedule view, privacy explanations ("what we collect, who sees it, what it's never used for"). **R1** (the privacy page is non-negotiable at launch).
**F4 · Integrations** — Xero, Google Calendar, Slack/email reminders, Monday.com, SSO. **R3** (design for integration-readiness from R1: clean IDs, export formats, API-shaped internals — but no live integrations in the first release).

### Module relationship summary

Time entry is the heartbeat: My Time writes it; Project Delivery, Project Financials, Capacity, Company Financials and Reports all derive from it joined with dated Cost rates. Plan & Quote defines the structures (phases, roles, estimates) that both time entry and all comparisons hang off. People and OE Verse supply the rates. Company Costs plus the non-project share of payroll complete the company P&L. Templates seed structures; Administration governs everything; the audit trail observes everything sensitive.

---

## 5. Primary entities

Conventions: every entity has `id`, `created_at/by`, `updated_at/by`; sensitive entities are additionally audit-trailed (§ Audit record). "Owner" = the role accountable for the record's accuracy. Rates and money fields are **dated** — historical values are never overwritten (Principle 8).

### Identity & people

**User** — an authentication identity with role grants.
- Fields: email, auth method, status, role grants[], last sign-in, notification prefs.
- Relations: 1–1 with Person (internal) or External collaborator.
- Owner: Super admin. View: self + admins. Edit: super admin (roles), self (prefs).

**Person** — a human in the studio (profile, not pay).
- Fields: name, role/title, department/discipline, seniority, manager → Person, employment status, start/end dates, skills[], photo, location.
- Relations: has Employment agreements, Cost rates, Sell rates, Time entries, Assignments, Capacity allocations; belongs to Teams.
- Owner: Ops admin. View: directory subset = everyone; full = admins + self. Edit: ops admin; self (limited profile fields).

**Employment agreement** — the dated terms of employment; the source of employment cost.
- Fields: person, type (FT/PT/contract), effective from/to, monthly salary, employer statutory contributions (CPF etc.), fixed allowances, bonus provisions, benefits cost, working schedule (days/week, hours/day, expected weekly hours), annual leave entitlement.
- Relations: person 1–many (history); drives Cost rate derivation.
- Owner: Finance admin. **View/Edit: finance admin + super admin only.** Changes audit-trailed.

**Cost rate** — a dated internal cost per hour for a person.
- Fields: person, effective from/to, derivation basis (salary + contributions + benefits ÷ available hours — Phase 2 defines precisely), rate value, method version.
- Relations: consumed by Time entry costing, Plan & Quote internal-cost estimation.
- Owner: Finance admin. **View: finance + super admin only** (leads see only aggregated cost consequences). Edit: finance admin. Historical rates immutable once a period referencing them locks.

**Sell rate** — a dated charge-out rate per role or person, used for pricing.
- Fields: scope (role-level default or person override), effective from/to, rate, currency.
- Relations: consumed by Plan & Quote and quotation documents.
- Owner: Leadership/finance. View: leads + admins (needed to quote). Edit: finance/leadership.

**Team** — a grouping (department, discipline or working group).
- Fields: name, type, lead → Person, members[].
- Owner: Ops admin. View: everyone. Edit: ops admin.

### Clients & projects

**Client** — the commissioning organisation.
- Fields: name, client group (parent), country, industry, contacts (minimal), payment terms, risk notes.
- Relations: has Projects.
- Owner: Ops admin/leadership. View: all internal (risk notes: leads+). Edit: ops admin.

**Project** — the central entity; a commercial engagement across its whole life.
- Fields: name, code, client, project type, service line, status (Opportunity … Archived/Lost), probability, project lead → Person, team[], country, currency, contract value, approved variations total, start / target end / actual end, description, risk flags[], retrospective ref, pricing lessons.
- Relations: has Phases, Deliverables, Quotations, Revenue items, Invoices, Time entries (via phases), Direct expenses, External agreements (links), Assignments.
- Owner: Project lead (delivery data) + finance (financial data). View: assigned members (permitted fields), leads (own projects, fuller), leadership/finance (all). Edit: lead (plan/status), finance (financials), admins.

**Project template** — a reusable master structure per project type (Branding, Spatial activation, Festival/cultural programme, Creative strategy…).
- Fields: name, project type, default phases[] (with typical role/hour patterns), default activities, notes.
- Relations: copied (never linked) into new Projects.
- Owner: Ops admin. View: leads+. Edit: ops/super admin only.

**Project phase** — a stage of one project; the primary unit of estimate-vs-actual comparison.
- Fields: project, name, order, start/end (planned + actual), status, estimated hours by role[], estimated internal cost, estimated external cost, notes.
- Relations: has Deliverables; receives Time entries, Direct expenses, external cost attributions.
- Owner: Project lead. View: project team. Edit: lead.

**Deliverable** — an output within a phase (optional granularity level).
- Fields: phase, name, status, estimated hours, notes.
- Owner: Project lead. View: project team. Edit: lead.

**Activity** — a configurable time category (project-scoped like "Design", "Revisions", "Meetings"; or company-scoped like "Business development", "Admin", "Training", "Leave", "Commuting").
- Fields: name, scope (project/company/personal), **behaviour flags: paid?, cost-bearing?, productive/contextual, billable?, counts-toward-utilisation?, included-in-project-costing?**, active?.
- Relations: referenced by Time entries; company-scoped ones drive non-project payroll split.
- Owner: Ops admin. View: everyone (their pickable subset). Edit: ops/super admin. Behaviour-flag changes audit-trailed (they move money).

### Commercial

**Quotation** — a versioned commercial offer generated from the project's estimate structure.
- Fields: project, version, date, status (draft/sent/accepted/superseded), line items[], subtotal, GST rate & amount, total, inclusions/exclusions, clauses[] (from clause library: amendments policy, working-files release, look-and-feel scope…), validity, period of engagement.
- Owner: Lead + leadership approval. View: leads+, finance. Edit: lead (draft); accepted versions immutable.

**Quotation line item** — one "Area of Work" row.
- Fields: quotation, order, description, linked phase(s), est. duration, amount, optional?.
- Note: line items map to phases so client-facing structure and internal structure stay reconciled without being forced identical.

**Revenue item** — a planned or recognised piece of project revenue (Phase 2 defines recognition basis).
- Fields: project, type (fee/milestone/retainer period/variation), amount, currency, planned date, recognition status, linked invoice.
- Owner: Finance. View: finance/leadership (leads: masked to % of budget). Edit: finance.

**Invoice** — an issued bill (mirrors Xero later; manual in R1).
- Fields: project, number, date issued, amount, GST, currency, status (draft/sent/paid/overdue), paid date.
- Owner: Finance. View/Edit: finance (+leadership view).

**Direct expense** — a non-labour cost directly attributable to a project.
- Fields: project, phase?, category (fabrication/production/travel/software/other), description, supplier or OE Verse link, amount, currency, date, status (planned/committed/actual), receipt ref, approved by.
- Owner: Finance (lead can propose). View: lead (own project), finance. Edit: finance; lead-create if granted.

**External collaborator agreement** — the commercial arrangement with an OE Verse member for a project or period.
- Fields: collaborator, project(s), commercial model (hourly / daily / monthly retainer / fixed project fee / fixed phase fee / fixed deliverable fee / milestone), rate or fee, currency, expenses policy, start/end, milestones[], attribution rule (which phases/periods the cost lands in — Phase 2), status, documents[].
- Owner: Ops/finance admin. View: finance, leadership; lead sees existence + scope, rate visibility configurable. Edit: finance/ops.

### Time & capacity

**Time entry** — the atomic record: a person's time on an activity on a date.
- Fields: person, date, duration (or start/end), project?, phase?, deliverable?, activity, notes?, source (manual/timer/copied), status (draft/confirmed), locked?.
- Costing: cost is **derived at read time** from the person's dated Cost rate and the activity's flags; on financial-period lock, the computed cost is **snapshotted** for immutability.
- Owner: the person, absolutely — no one else edits another person's time (admins may only annotate/flag). View: self; lead sees *project-scoped* entries on their projects (hours + person, no cost rate); people manager sees direct reports' allocation summaries; finance sees costed aggregates.
- Edit: self, until period lock; post-lock corrections via adjustment flow (Phase 3).

**Capacity allocation** — a forward plan of a person's hours to a project/phase for a week.
- Fields: person, project, phase?, week, planned hours, tentative?.
- Owner: Lead/ops. View: person (own), lead (own projects), managers/leadership. Edit: lead/ops. **R2.**

### Company finance

**Company overhead** — a non-project operating cost.
- Fields: category (rental/accounting/insurance/software/legal/marketing/BD/banking/equipment/travel/training/admin), description, amount, currency, recurrence (monthly/annual/one-off), effective from/to, department?, forecast vs. actual, payment status.
- Owner: Finance. View/Edit: finance, leadership, super admin only.

**Financial period** — a lockable month.
- Fields: year-month, status (open/soft-closed/locked), locked by/at, snapshot refs (rate + cost snapshots).
- Owner: Finance. Locking freezes time-entry costing and rate application for that month; reopening requires super admin + audit reason.

### Governance

**Permission** — a grant binding a User to a role (optionally scoped to team/project/module) with the action set defined in Phase 3.
- Owner: Super admin. All changes audit-trailed.

**Report** — a saved or scheduled report definition (metrics, dimensions, filters, period, recipients). Owner: creator; sharing permission-checked against the *viewer's* rights, not the author's. **Builder in R2.**

**Audit record** — immutable log entry: actor, timestamp, entity, field, old → new value, reason?, context. Written automatically for: salary/agreement changes, cost & sell rate changes, time edits after confirmation, budget/estimate changes post-approval, permission changes, expense/revenue/invoice changes, period lock/reopen, exports of sensitive reports. View: super admin, finance (scoped), auditor role. **Nobody edits or deletes audit records, including super admin.**

### Additional recommended entities (not in the brief's minimum list)

**Variation** (approved scope/fee change: description, amount, hours delta, linked phases, approval, date — first-class because "scope increase without variation" is a key alert), **Retrospective** (structured close-out: what overran, why, pricing lesson, client factors), **Milestone** (dated commitments for delivery and billing), **Assignment** (person ↔ project link driving "suggested projects" in time entry and lead visibility scope), **Notification** (in-app/email nudges with per-user preferences).

---

## 6. Project lifecycle architecture

The same Project record moves through eleven stages; nothing is re-keyed, everything accretes.

| Stage | What happens | Data created | Data inherited / updated |
|---|---|---|---|
| **1 · Opportunity** | Lead logs a prospective project | Project (status=Opportunity), client, type, service line, rough value, probability | Client record (or reuse) |
| **2 · Estimate** | Structure built from template | Phases, deliverables, estimated hours × role, external cost lines, expenses, contingency | Template copied; sell + cost rates referenced (dated) |
| **3 · Quote** | Commercial packaging | Quotation v1..n, line items mapped to phases, clauses, GST, totals | Estimate structure inherited; versions on revision |
| **4 · Approval** | Client accepts; internal sign-off | Accepted quotation (immutable), contract value fixed, status=Won | Probability→100%; estimate baseline **frozen** as the comparison baseline |
| **5 · Planning** | Delivery setup | Assignments, capacity allocations (R2), milestones, external agreements activated | Phases get real dates; structure may be *refined* — baseline retained |
| **6 · Delivery** | Work happens | Time entries land on phases; direct expenses; external costs accrue per agreements | Actual hours/costs accumulate against frozen estimates |
| **7 · Monitoring** | Continuous health | Forecast-at-completion, risk flags, variations, alerts | Budget consumed %, hours consumed %, trend |
| **8 · Completion** | Work delivered | Actual end date, final deliverable states, remaining invoices | Status=Completed; unbilled effort computed |
| **9 · Financial closure** | Money finalised | Final invoices/payments reconciled, write-offs recorded, period-locked | Final gross profit, margin, profit per labour hour — frozen |
| **10 · Retrospective** | Learning captured | Retrospective record, pricing lessons, client/risk notes | Variance analysis auto-prepared (est vs. actual by phase) as the meeting input |
| **11 · Historical benchmark** | Project joins the evidence base | Benchmark entry (normalised type/value/duration/effort metrics) | Feeds Pricing Intelligence (R3) and template refinement |

Two rules bind the lifecycle: the **estimate baseline is frozen at approval** (variations create explicit deltas, never silent edits), and **financial closure locks the numbers** (reopening is a super-admin, audit-logged event).

---

## 7. Release roadmap

**Governing priority:** the minimum functionality for OuterEdit to begin collecting *reliable actual-versus-estimate profitability data*. Everything else is sequenced after that flywheel starts.

### R1 — Pilot MVP (the flywheel)
People + employment cost + dated cost/sell rates · Activity categories with behaviour flags · Project database + statuses · Templates (4 seed types) · Plan & Quote core (phases, hours × role, external costs, contingency, margin, quotation versions) · Time entry (day + week) with copy/favourites and gentle completion · Est-vs-actual + budget consumed per project · Project financials (gross profit, margin, profit per labour hour) · OE Verse directory + agreements (all commercial models recordable; simple attribution) · Company cost register + monthly company summary (lite) · Financial periods + locking · Core fixed reports · Privacy page · Audit trail on sensitive data · Roles: team member, lead, finance/ops admin, leadership, super admin.
**Deliberately excluded from R1:** capacity planning, report builder, scenarios/discount modelling, external portal, all integrations, pricing intelligence, forecast-at-completion automation (manual forecast field only), approvals beyond the essential (quotation acceptance, variation approval, expense approval).

### R2 — Depth
My Insights (full personal analytics) · Capacity planner · Company cockpit (full: forecast, break-even, trends) · Forecast-at-completion engine · Scenario planning + discount impact in Plan & Quote · Report builder + saved/scheduled reports · Variance analysis pack for retrospectives · People manager views · Read-only auditor role · Maturity of approval flows and adjustment-after-lock handling.

### R3 — Connection
Xero integration (invoices, payments, overhead actuals) · Google Calendar (time-entry suggestions) · Slack/email reminders · SSO · Monday.com (if still in use) · External contributor portal (submissions, invoices, milestones) · Historical data import (backfill of past projects at summary level) · Multi-currency maturation.

### R4 — Intelligence layer
Benchmark engine (similar type/value/duration/staffing) · Pricing recommendation interface with visible evidence · Overrun early-warning models · What-if modelling (hire one more person; lose no new work; reduce overhead) · AI-assisted estimate drafting from historical patterns.

---

## 8. Risks and assumptions

### Risks

| Risk | Severity | Design response |
|---|---|---|
| **Adoption failure** — the team experiences it as surveillance and enters junk data | Existential | Principles 4–5 as product boundaries; founders enter time first; privacy UI at launch; insights give-back in R1; no punitive language anywhere; pilot framing (Phase 9) |
| **Financial model error** — double counting or wrong cost rates poisons every downstream number | High | Phase 2 before any UI; single centralised formula module; worked examples as executable tests; dated rates with snapshots |
| **Estimate baseline erosion** — leads silently edit estimates to look on-budget | High | Baseline frozen at approval; variations as explicit audited deltas |
| **Data-entry decay** — enthusiasm fades in week 3; gaps make reports lie | High | Two-minute ceiling on daily entry; copy/favourites/defaults; gentle reminders; "missing time" shown as gaps, not failures; leadership reviews *data completeness* not individuals |
| **Privacy breach by design drift** — a future report quietly exposes salaries or ranks individuals | High | Sensitive-data matrix (Phase 3) enforced centrally; report layer permission-checks at field level; audit on exports |
| **Over-scoping R1** — building capacity planning, integrations and intelligence before the flywheel spins | High | Roadmap above; R1 exclusion list is explicit and approved |
| **Multi-currency complexity** arriving early | Medium | R1: SGD ledger; foreign amounts captured with manual rate + date, reported in SGD; full multi-currency R3 |
| **Spreadsheet logic mismatch** — console formulas diverge from the trusted sheet's two-margin logic | Medium | Phase 2 explicitly maps the sheet's Margin-1/True-Margin lenses and 20% OEV mark-up into the formal model |
| **Key-person configuration risk** — one super admin holds all knowledge | Medium | Two super admins minimum; settings documented in-product |
| **Change management** — leads feel policed by est-vs-actual visibility | Medium | Frame variance as pricing-model feedback, not lead performance; retrospectives blame estimates before people |

### Assumptions (to validate)

1. Team size is small enough (≈5–15 internal) that manual admin (invoices, expenses) is tolerable in R1 without integrations.
2. SGD is the ledger currency; GST 9%; financial year and CPF specifics to confirm in Phase 2.
3. Standard day is 8 hours, configurable per person; 15-minute increments acceptable.
4. Xero is and remains the statutory ledger.
5. Founders will personally enter time daily (the model collapses without senior hours).
6. The existing spreadsheet's charge-out and cost rates are current and can seed the rate tables.
7. No works-council/regulatory constraints on time recording beyond PDPA (to confirm in Phase 3).

---

## 9. Decisions requiring approval

1. **Module merge:** Project Planning + Quotations & Estimates become one *Plan & Quote* workspace. *(Recommended: yes.)*
2. **R1 scope** as listed in §7, including the explicit exclusions (no capacity planner, no report builder, no integrations, manual forecast only). *(Recommended: yes — smallest release that starts the learning flywheel.)*
3. **Company financials in R1 = lite monthly summary** (gross profit vs. non-project payroll + overheads), full cockpit in R2. *(Recommended: yes.)*
4. **Baseline freeze rule:** estimates lock at approval; all changes via Variations. *(Recommended: yes — this is load-bearing for the whole learning loop.)*
5. **Time sovereignty rule:** only the person edits their own time; leads/admins may query, never modify. *(Recommended: yes.)*
6. **Currency posture:** SGD single-ledger in R1 with foreign amounts converted at capture; full multi-currency deferred to R3. *(Recommended: yes.)*
7. **Cost-rate visibility:** individual cost rates visible to finance + super admin only; leads see aggregate budget consumption. Sell rates visible to leads. *(Recommended: yes; Phase 3 details masking.)*
8. **Founders in the data:** leadership commits to daily time entry from day one of the pilot. *(Needs explicit commitment, not just approval.)*
9. **Deliverable-level tracking optional per project** (phase-level is the mandatory grain; deliverables add precision where wanted). *(Recommended: yes — protects the two-minute daily ceiling.)*
10. **Two super admins** named at launch (suggest: Ryan + COO). *(Needs names.)*

---

*Cumulative product specification updated: see CUMULATIVE-SPEC.md v0.1 — Phase 1 sections populated; Phases 2–9 pending.*
