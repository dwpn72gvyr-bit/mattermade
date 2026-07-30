# OuterEdit Agency Intelligence Console
## Phase 4 — Information Architecture & User Journeys

**Version 1.0 · 29 July 2026 · Status: For review**

---

## 1. Navigation model

**Primary navigation (left sidebar, permission-filtered):** Home · My Time · Projects · People · OE Verse · Capacity* · Company* · Reports · Admin* (*appears only with rights). A team member sees five items; a super admin sees nine. Navigation is *subtractive* — items a user can't use simply don't exist for them (no greyed-out teasers of forbidden data).

**Secondary navigation:** contextual tabs within a section (Project: Overview · Plan & Quote · Delivery · Time · Financials · Team · Variations · Retrospective — tabs themselves permission-filtered, e.g. Financials hidden from plain members).

**Utility bar (top):** global search (⌘K) · date-range selector (persistent per section: This month default; Today/Week/Month/Quarter/Year/Custom) · notifications bell · help & privacy · profile menu (role indicator, settings, sign out).

**Context switching:** project switcher within project pages (recent + assigned); team switcher for managers; period selector for finance. No org/entity switcher in R1 (single company).

## 2. Sitemap & screen inventory

### Personal (R1 except *)
| Screen | Notes |
|---|---|
| Sign in | Email + password R1; SSO R3 |
| Personal home | Greeting, today's completion, current projects, nudges, one insight |
| Today (time entry) | Primary daily surface; three-model editor (Phase 5 §B2) |
| Week | Mon–Sun grid, expected vs recorded, copy week, gaps |
| Calendar allocation | Block view of day/week |
| Personal activity history | Searchable own entries |
| Personal insights* | R1 lite ("your week"), R2 full |
| My projects | Assigned projects, my hours on each |
| My capacity* | Upcoming planned allocation (R2) |
| Profile · Notification preferences · Help & privacy | Privacy page per Phase 3 §5 |

### Project (R1 except *)
Project portfolio (list/pipeline) · Project overview · Plan & Quote (estimate grid, quotation versions, scenarios*, approval) · Phases & deliverables · Team & resourcing (assignments; conflicts* R2) · Project time (entries by phase/person, lead view) · Project expenses · External collaborators (project view) · Revenue & invoices · Project profitability (finance/leadership) · Budget health (lead's masked view) · Forecast at completion* (R2 engine; R1 manual field) · Risks & variations · Retrospective · Archive.

### People & resourcing (R1 except *)
People directory · Employee profile (tabbed: General | Employment† | Remuneration† | Cost rates† | Sell rates | Capacity | Skills | Assignments | History† | Access†) — † finance/super only · Capacity planner* (R2) · Team view* (manager, R2) · OE Verse directory · Collaborator profile · External agreement editor · External availability* (R2).

### Company (finance/leadership; R1 lite, R2 full)
Company dashboard (cockpit) · Revenue view · Project contribution roll-up · Non-project labour · Overheads register · Operating profit · Cash view* (R3) · Service-line analysis* (R2) · Client analysis* (R2) · Company time allocation · Historical trends* (R2).

### Administration (R1 except *)
Project templates · Phase templates · Activity categories (+ behaviour flags) · Time rules · Financial settings (GST, currency, financial year, CPF params) · Overhead categories · Permissions & roles · Financial periods (lock/reopen) · Audit log · Data import/export · Integrations* (R3) · Currencies* (R3).

**~58 screens total; ~44 in R1.**

## 3. User journeys (14)

Format — **Trigger → Goal → Steps → System feedback → Errors → Completion → Data.**

**J1 · Logging a complete workday (team member).** End-of-day habit or 5pm gentle nudge → account for 8h → open Today; "Copy yesterday" offers baseline; adjust two blocks (project/phase picked from *assigned* shortlist); add "internal meeting" 1h; progress ring fills as blocks land ("You've mapped 8 of your 8 hours — day complete ✓") → offline: local draft, sync later; unknown project: request-assignment link → day marked complete; streak quietly increments → 5–7 Time entries (draft→confirmed), completion event.

**J2 · Correcting yesterday's time.** Realises Tuesday's hours went to the wrong phase → fix without friction → Week → Tuesday → tap entry → change phase → save → toast "Updated — thanks for keeping it accurate"; if month locked: "This month is closed — request an adjustment?" one-tap flow to finance → entry updated + audit note (post-day edit), or adjustment request created.

**J3 · Viewing a personal weekly insight.** Friday "Your week is ready" (opt-in) → self-understanding → Insights: project mix donut, focus vs meetings, switching count, gentle reflection prompt ("Wednesday was your most fragmented day — protect a maker block next week?") → no data: warm empty state, never guilt → private; nothing shared; view event visible to user only.

**J4 · Lead checks whether a phase is overrunning.** Amber alert "Concept development: 78% hours at 55% duration" → decide intervention → Project → Delivery → phase table (est/actual/remaining per phase, per role) → drill: who, when, which activities (project-scoped entries) → trend sparkline; benchmark note ("similar branding projects averaged 112% on this phase") → options presented: add variation draft / rebalance staffing / accept & note → decision logged as project note; possibly Variation draft → alert acknowledged; forecast updated.

**J5 · Lead forecasts remaining effort.** Monthly rhythm or alert → honest FCAC → Delivery → Forecast tab → system shows computed ETC (burn-factor, Phase 2 §5.11) → lead adjusts remaining-hours assumptions per phase with reason → forecast GP/GM recalc live; margin below threshold flags amber → save → ForecastRecord versioned; leadership cockpit updates.

**J6 · Admin creates a new employee.** New hire signed → person ready before day one → People → New: identity, role, team, manager, schedule, start date → Employment tab (finance): salary, CPF, benefits → system derives cost rates (paid/available/productive) with dated effective-from → invite user account with role grants → validation: missing schedule blocks rate derivation with clear message → Person + Agreement + Cost rate + User created; audit records.

**J7 · Salary update with historical accuracy.** Raise effective 1 Oct → change forward, never backward → Employment tab → "New agreement from 1 Oct" (old one auto-ends 30 Sep) → new cost rate derived, effective-dated; second super admin confirms → screens show rate timeline; September entries keep old rate forever → attempt to edit past agreement: blocked ("history is preserved — create a new agreement instead") → Agreement v2, Rate v2, audit trail, confirmation event.

**J8 · Creating an external fixed-fee collaborator.** OEV designer engaged for $20k identity system → cost lands correctly across phases → OE Verse → collaborator (or new) → New agreement: model=Fixed project fee, $20k, currency, linked project, attribution: milestones (60% concept approval / 40% final delivery), expenses policy → committed cost $20k appears in project FCAC immediately; accrual per milestones → threshold ≥$10k routes to leadership approval → Agreement active; commitments visible.

**J9 · Lead creates a project from a template.** New branding win likely → structured estimate fast → Projects → New → type=Branding → template copies 10 phases → prune to 7, adjust deliverables → estimate grid: hours × role per phase (sell + cost columns; cost shown as totals only) → external lines, expenses, contingency 10%, target GM 55% → planner shows floors + recommended price ($X) vs intended quote → save as Opportunity/Estimating → Project, Phases, Estimate v1; template untouched.

**J10 · Leadership monthly profitability review.** First Monday of month → is the studio healthy? → Company cockpit, period = last month: recognised revenue, project GP, non-project payroll, unallocated, overheads, operating profit, coverage ratio, tie-out status green → drill any figure to its inputs → flags: two projects amber, unallocated 6% → decisions noted; possibly fire J4/J5 on flagged projects → monthly snapshot stored.

**J11 · Identifying the most profitable service line (R2).** Quarterly planning → where to grow → Reports → Service-line analysis: revenue, GP, GM%, profit/hour, overrun frequency per line, trend → sort by profit/hour; note brand sprints outperform festivals 3.7× on effort return → insight framed as observation + recommendation ("consider weighting BD toward X — evidence attached") → export deck-ready summary (audit-logged).

**J12 · Comparing a big lossy project against a small profitable one.** Preparing pricing reform → make the case tangible → Portfolio → select Project E ($250k, −2.5%) and Project D ($12k, 59.6%) → Compare view: side-by-side fee, cost stack, GP, margin, profit/hour ($−3.76 vs $110), hours variance, revision counts, duration → the console renders the comparison; the argument makes itself → saved comparison shareable to leadership.

**J13 · Finance closes a project.** Delivery complete, last invoice paid → freeze the record → Project → Close checklist: invoices reconciled ✓, external costs invoiced ✓, unbilled effort reviewed (write-off $X recorded with reason) ✓, retrospective exists ✓ → status → Financially closed; figures frozen; benchmark entry generated → blockers listed plainly if unmet → project locked; audit; benchmark library +1.

**J14 · BD prices a new opportunity from history (R3/R4; manual version viable in R2).** New spatial-activation RFP → evidence-based quote → Pricing intelligence: filter similar (type, value band, duration) → see actual phase-effort distributions, revision patterns, margin outcomes ("5 similar projects: median 780 internal hours; fabrication-coordination overran in 4 of 5 by ~30%") → seed new estimate from median actuals, not old estimates → planner as J9 with evidence panel → quote grounded in delivered history.

## 4. System states

Every list/detail view defines: **empty** (warm, instructive, never blaming — copy in Phase 7), **loading** (skeletons, no spinners > 400ms unannounced), **success/saved** (quiet toast), **warning** (amber, situation-framed), **risk** (project-level red reserved for money/deadline realities, never for people), **error** (what happened + what to do + nothing lost), **permission-denied** (rare by subtractive nav; plain "You don't have access to this — here's who to ask"), **locked-period** (read-only banner + adjustment path), **archived** (read-only, clearly badged, excluded from active rollups).

## 5. Search model

**Global (⌘K):** projects, clients, people, OE Verse, reports, admin objects — results permission-filtered at query time (a member searching "salary" finds the privacy page, nothing else). Recent + fuzzy + type-ahead. **Local:** per-list filter bars with saved views (portfolio: status/type/client/lead/health; time history: project/activity/date). Filters combine; saved views are personal, shareable only where scope allows.

## 6. Notifications model

Channels: in-app (R1), email digest (R1, off by default except weekly summary), Slack (R3). Personal: gentle day-completion nudge (configurable time, default 5pm, one per day max), week-gap Friday summary, insight-ready (opt-in). Lead: phase threshold alerts, scope-creep flag, forecast margin drop, milestone approaching. Finance: approvals queue, tie-out status, period-end checklist. Leadership: monthly cockpit ready, variation requests, threshold breaches. **Anti-nag rules:** no red badges for normal life; nudges stop when the day completes; all personal nudges individually disableable; the system never emails a manager about an individual's missing time (gaps surface in aggregate views only).

## 7. Open questions

Calendar-block vs row entry as *default* (Phase 5 recommends), notification defaults per role, whether leads see deliverable-level actuals in R1 (recommend yes where deliverables exist).

## 8. Decisions requiring approval

1. Subtractive navigation (hide, don't grey out). *(Recommended.)*
2. Date-range default "This month" for finance/leadership, "Today/This week" personal. *(Recommended.)*
3. Managers never notified about individuals' gaps; aggregate completeness only. *(Recommended — trust-critical.)*
4. Close checklist hard-requires retrospective before financial closure. *(Recommended.)*
5. ⌘K global search scope as listed. *(Recommended.)*

---
*Cumulative spec updated to v0.4.*
