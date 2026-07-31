# OuterEdit Agency Intelligence Console
## Phase 6 — Reporting, Dashboards & Decision Intelligence

**Version 1.0 · 29 July 2026 · Status: For review**

---

## 1. Reporting levels & hierarchy

One drill spine: **Company → Service line → Client → Project → Phase → Deliverable/Activity → Team → Individual**, with financial-period as the universal time dimension. Every report is a view over the same warehouse tables (facts: time entries costed, external cost accruals, expenses, revenue recognition events; dimensions: project, phase, person†, activity, client, service line, period). † Individual-level facts exist in the warehouse but are reachable only through the Phase 3 policy module — there is no "raw" report path.

**Dashboard hierarchy:** Personal (Home/Insights) → Project (lead) → Portfolio (leadership) → Company cockpit (leadership/finance) → Admin/data-health (finance). Each level answers its user's standing question and links one level down for "why?".

## 2. Core report library

### Project reports (R1 unless *)
| Report | Content | Audience |
|---|---|---|
| Project profitability | Revenue lenses, cost stack, GP, GM, profit/hour | Finance, leadership; lead masked |
| Estimated vs actual hours | By phase, role, week; consumed % vs schedule % | Lead+ |
| Estimated vs actual cost | Same, in $ (masked aggregates for lead) | Lead ◐, finance |
| Phase profitability* | GP contribution per phase (needs revenue weighting) | Finance (R2) |
| Team effort | Hours by person on project (no rates) | Lead |
| External cost | Committed vs accrued vs invoiced per agreement | Finance, lead ◐ |
| Scope variation | Original vs variations vs unbilled effort | Lead+, leadership |
| Forecast at completion | FCAC, forecast GP/GM, EAC variance, assumptions log | Lead+, leadership |
| Project cash position* | Invoiced vs collected vs WIP (R3 with Xero) | Finance |
| Retrospective pack | Auto-assembled variance analysis for the close meeting | Lead, leadership |
| Profit per internal labour hour | Trend across project life | Leadership |

### Company reports (R1-lite; full R2)
Operating result (Phase 2 §7 statement) · Revenue & GP trend · Overhead coverage · Non-project payroll by category · Company time allocation · Capacity & utilisation* · Service-line profitability* · Client profitability* · Project-size and duration comparisons* · Monthly/quarterly trends* · Annual performance* · Forecast year-end*.

### People & capacity reports (R2; confidential per Phase 3)
Capacity by week · Planned vs actual allocation · Workload distribution (team-level; individual only for the named manager) · Project switching (aggregate) · Missing allocations (aggregate completeness; per-person only to the named manager) · Leave impact · Skills demand · External talent demand.

## 3. KPI dictionary (canonical names — reports may not invent synonyms)

| KPI | Definition (Phase 2 ref) | Healthy signal |
|---|---|---|
| Gross margin (GM) | §5.6 | 50–60% target band |
| Profit per internal hour | §5.8 | > blended loaded cost/hr; portfolio median rising |
| Effective hourly revenue | §5.7 | > blended sell benchmark |
| Hours consumed vs schedule | §5.10 vs elapsed | gap < 10 pts |
| Budget consumed | §5.9 | tracks schedule |
| Forecast margin | §5.13 | ≥ target − 5 pts |
| EAC variance | §5.14 | ≤ contingency |
| Unbilled effort | §5.16 | < 5% of fee |
| Overhead coverage | §7.8 | ≥ 1.1 |
| Operating margin | §7.7 | ≥ 10% (set with accountant) |
| Break-even revenue | §7.9 | pipeline-covered 3 months out |
| Utilisation | dictionary §1 | 65–80% (never a personal target) |
| Unallocated share | §7.3 ÷ payroll | < 5% (data health, not discipline) |
| Data completeness | mapped ÷ scheduled hours, company level | > 90% |

## 4. Alert framework (calm, situation-framed; thresholds configurable)

| Alert | Default trigger | Audience | Sample language |
|---|---|---|---|
| Hours overrun risk | phase hours% − schedule% ≥ 15 pts | Lead | "Concept development is running ahead of its hours plan. Worth a look before Friday?" |
| Cost overrun | budget consumed ≥ 85% before final phase | Lead, finance | "This project has used 87% of its cost plan with two phases remaining." |
| Low forecast margin | forecast GM < target − 10 pts | Lead, leadership | "Forecast margin has drifted to 41% against a 55% target. See what changed →" |
| Delayed milestone | milestone date − today ≤ 7d, status open | Lead | "Concept approval is due in 6 days." |
| Unsubmitted time | company completeness < 85% for the week | Finance (aggregate) | "About a day and a half of last week is still unmapped across the studio." |
| Unallocated capacity | person < 60% planned next 2 wks | Ops (R2) | "There's room in the schedule week of 18 Aug — good week for the brand sprint?" |
| Over-capacity | person > 110% planned | Ops, manager | "Next week looks heavier than JL's schedule allows. Rebalance?" |
| Missing revenue data | active project, no revenue items | Finance | "Night Festival has no billing plan yet." |
| Scope without variation | revisions > included, or out-of-scope activity hours > threshold | Lead, leadership | "This project has absorbed ~$28k of effort beyond the quoted scope. Draft a variation?" (pre-drafted) |
| Unbilled at completion | status→Completed & unbilled > 0 | Finance | "Two deliverables finished ahead of billing. $8,400 ready to invoice." |
| Overhead not covered | coverage < 1.0 for the month | Leadership | "July's project profit covered 98% of running costs — the first shortfall in five months. Forecast recovers in August." |
| Cash collection delay* | invoice overdue > terms + 14d (R3) | Finance | "The SP invoice is 18 days past terms." |

**Rules:** alerts fire once per state change (no daily nagging); every alert links to the evidence and, where possible, a prepared action (variation draft, rebalance view); red is reserved for money/deadline realities, never applied to individuals.

## 5. Decision-support insights

Every generated insight is rendered in four labelled parts — **Observation** (fact), **Explanation** (why, from data), **Forecast** (if trend holds; with confidence framing), **Recommendation** (suggested move, always tentative: "consider…", "evidence suggests…"). Recommendations are never presented as certainties, and never auto-execute.

Standing questions wired into the console (each a saved insight view): which active project needs intervention (risk-ranked portfolio) · which phase will overrun (burn-factor projection per open phase) · where to add resource (over-capacity vs gap matrix) · what to re-scope (worst forecast-GM with variation-less scope growth) · which client needs a change request (unbilled effort by client) · which service to grow / reprice (profit-per-hour league with volume) · return on effort by project type · revenue still needed to break even this year (§7.9 vs weighted pipeline) · required margin on the next project (gap-filling margin given YTD) · result if no new work is won (run-out projection) · impact of one more hire (marginal capacity revenue vs marginal cost, template model) · impact of overhead reduction (coverage sensitivity) · how much work the team can accept (available productive hours vs pipeline demand).

## 6. Report builder (R2)

Metrics (KPI dictionary only) × dimensions (drill spine) × filters (any dimension + status/billable/cost category/employment type/currency/location) × grouping × comparison period (prior period / prior year / baseline) → table, bar, line, stacked views. Saved reports (personal or shared-within-permission), scheduled email delivery, CSV/XLSX export. The builder physically cannot combine an S1/S3 field with an individual dimension for non-authorised viewers — the policy module filters the *available* field list per user, so forbidden reports are unbuildable, not merely blocked.

## 7. Historical benchmark model

On financial closure every project emits a **benchmark record**: type, service line, client, fee band, duration band, phase-level est vs actual hours and cost, role mix, revision count, variation history, margin outcomes, profit/hour, retrospective lessons, tags (pro bono/discounted excluded by default). Benchmarks answer: distribution of actual hours per phase for similar projects (median, quartiles); frequency and size of overruns per phase; margin achieved vs quoted; effect of duration on PM load. Similarity = same type first, then fee band (±50%), duration band, staffing structure; same-client comparisons called out separately. Minimum n=3 before the console displays a benchmark as guidance (below that, it shows the raw comparable projects instead).

## 8. Pricing recommendation interface (R3/R4; wireframe)

```
│ NEW OPPORTUNITY · Spatial activation · est. fee ~$180k · 6 mo │
│ ┌ EVIDENCE (5 similar projects, 2024–26) ────────────────────┐│
│ │ internal hours  median 780   your draft: 640  ⚠ −18%       ││
│ │ fab coordination overran in 4 of 5 (median +30%)           ││
│ │ achieved GM     median 26%   quoted GM median 31%          ││
│ │ revisions       median 4 rounds (3 included)               ││
│ │ [open each project →]                                      ││
│ └────────────────────────────────────────────────────────────┘│
│ ADJUSTMENTS  cost-rate inflation since sample +6% ✓ applied   │
│ risk level ✎ medium · target GM ✎ 55% · overhead rec ✓        │
│ ┌ RECOMMENDED RANGE ────────────────────────────────────────┐ │
│ │ floor $168k ─── recommended $196k–214k ─── stretch $232k  │ │
│ │ at your draft $180k → expected GM 22% (evidence-adjusted) │ │
│ └───────────────────────────────────────────────────────────┘ │
│ [Seed estimate from median actuals] [Proceed with my draft]   │
```
The range is **shown with its evidence**; the user can always proceed against advice — the console records the divergence so the retrospective can learn from it.

## 9. Permission requirements

Reports inherit the Phase 3 matrix; additional rules: benchmark views expose no individual data; client-profitability reports are leadership/finance; exports of S1/S2 audit-logged; scheduled reports re-check the *recipient's* permissions at send time (a role change silently truncates the report rather than leaking).

## 10. Decisions requiring approval

1. KPI dictionary as the single vocabulary (no synonym metrics in any view). *(Recommended.)*
2. Alert thresholds as tabled defaults, configurable by super admin. *(Confirm values.)*
3. Insights always render the four-part frame; recommendations never auto-execute. *(Recommended.)*
4. Benchmark minimum n=3 with raw-comparables fallback. *(Recommended.)*
5. Scheduled reports re-check recipient permissions at send time. *(Recommended.)*
6. Operating-margin health target set with accountant. *(Needs input.)*

---
*Cumulative spec updated to v0.6.*
