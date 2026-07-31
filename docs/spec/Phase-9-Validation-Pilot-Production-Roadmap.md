# OuterEdit Agency Intelligence Console
## Phase 9 — Validation, Pilot & Production Roadmap

**Version 1.0 · 29 July 2026 · Status: For review**

---

## 1. End-to-end review

The chain Quotation → Budget → Phases → Assignments → Time → Direct costs → Forecast → Project GP → Overhead → Company P&L → Benchmarks → Pricing closes without gaps: one structure (phases × roles × hours) flows from Plan & Quote through delivery into benchmarks (Phases 1 §6, 2, 6 §7). Terminology is consistent via the KPI dictionary; two items were reconciled during this review: (a) "budget health" (lead view) is formally defined as the masked projection of Project Financials — same numbers, masked rendering, no parallel calculation; (b) the legacy sheet's "True Margin" is now everywhere labelled as gross margin (GM) with True Margin shown as its alias. One deliberate seam remains: statutory accounting truth lives in Xero; the console's recognised-revenue view reconciles to it from R3. No broken links identified.

## 2. Scenario testing (18)

Format: **behaviour · financial treatment · permissions · notifications · reports · audit.**

1. **Branding project completes within budget** — close checklist passes; GP/GM/profit-per-hour frozen; benchmark emitted · recognised = fee; costs as recorded · finance closes · "quiet celebration" studio note · portfolio, service line, benchmarks · closure + lock records.
2. **80% of design hours at 50% delivery** — amber phase alert with evidence; ETC inflated by burn factor; forecast margin drops · no money moves; forecast only · lead + leadership see · hours-overrun alert → J4/J5 · est-vs-actual, FCAC · forecast-assumption changes logged.
3. **Extra revisions without variation** — out-of-scope hours accrue; unbilled-effort meter rises; scope-without-variation alert with pre-drafted variation (~sell value of excess) · cost real, revenue unchanged → margin visibly erodes; nothing hidden in "budget" · lead sees; leadership notified at threshold · scope-variation report · alert + any variation approval logged.
4. **Fixed-fee freelancer finishes early** — remaining accrual recognises at completion; committed total unchanged; project de-risks · no windfall invented — the fee was always the cost · finance sees accrual shift · none needed · external-cost report · agreement completion logged.
5. **Retainer collaborator across three projects** — monthly fee split per agreement's attribution rule (fixed % or recorded-time share); each project bears its share, once · finance configures; leads see their share as external cost · monthly accrual visible in each project · tie-out unaffected (external, not payroll) · attribution rule changes logged.
6. **Salary increase mid-project** — new agreement + new dated cost rate; entries before effective date keep old rate forever; project cost rises prospectively; estimate baseline unchanged (variance explained by rate note) · second-super-admin confirm · finance/supers only · no employee-visible event · project cost trend annotated · full audit (J7).
7. **Project spans two financial years** — periods roll monthly regardless; YTD views split naturally; benchmark uses whole-life figures · no special treatment needed — period architecture absorbs it · — · annual reports show both slices · lock records per month.
8. **Multi-currency project** — foreign fee/costs captured with SGD rate at commitment/invoice; project reports in project currency + SGD; company reports SGD; FX differences to company FX line · finance manages rates (manual R1) · — · currency column in portfolio · rate-capture logged.
9. **Two forgotten days** — gaps → unallocated payroll (visible, honest); personal nudge Friday; company completeness dips · unallocated is a company cost line, so the P&L never silently loses payroll · manager sees gap only as aggregate; the person sees their own gap · gentle nudge only · data-completeness metric · none (no shame trail).
10. **Project cancelled midway** — status → On hold/Lost-after-start; recognised revenue caps at earned/contractual entitlement; committed external costs honoured (cancellation terms field); write-off recorded; retrospective still required · GP crystallises at cancellation · leadership decision · team notified plainly · portfolio (cancelled cohort), benchmark tagged `cancelled` · closure + write-off logged.
11. **Invoice issued, not collected** — recognised ≠ collected diverge; receivable ages; R3 collection alert · profitability unaffected (recognised basis); cash view shows the hole · finance · overdue alert (calm) · cash/receivables report · dunning actions external in R1.
12. **High revenue, negative GP** — Example E path: alerts at hours divergence, scope creep, forecast margin; portfolio shows red honestly; retrospective mandatory; benchmark records the pattern for pricing intelligence · GP negative, plainly stated · leadership sees full damage; team sees "project closed" without financial shaming · intervention alerts throughout · loss-maker analysis (J12) · complete trail of the drift.
13. **Low revenue, excellent $/h** — Example D path: portfolio sort by profit-per-hour surfaces it; insight recommends growing the category · standard · — · none · service-line/return-on-effort · —.
14. **Heavy BD month for one person** — hours land in Non-project payroll · BD; company time allocation shifts visibly; utilisation reads low *by design and without blame* · payroll unchanged, bucket changes · individual detail only to named manager; aggregates to leadership · none about the person · company time allocation, BD investment view · —.
15. **Projects profitable, overheads not covered** — cockpit: coverage < 1.0, operating loss; alert with forecast context · the two-ledger design exists precisely to catch this · leadership/finance · overhead-not-covered (calm) · operating result, break-even · monthly snapshot.
16. **Modelling one more hire** — what-if (R2/R4): marginal capacity hours × realistic utilisation × blended realised $/h vs marginal employment cost + overhead delta; presented as range, four-part insight frame · sandbox only — no live data mutates · leadership · — · hiring-impact insight · none (sandbox).
17. **External contributor: fee + expenses** — agreement carries fixed fee (committed) + reimbursables (actuals, receipts); both direct external costs; expenses excluded from the 20% mark-up unless quoted · attribution per agreement · finance approves expenses · threshold alerts · external-cost report · expense records logged.
18. **Reopening after financial closure** — super admin only, mandatory reason, loud banner while open, benchmarks flagged stale until re-close; every mutation in reopen window logged · adjustments post as dated entries; frozen history preserved · super admin + finance · leadership notified · affected reports marked "restated" · the heaviest audit path in the system.

## 3. Four-week internal pilot

**Group:** everyone (the studio is small enough); founders explicitly included and *first*. **Week 0 onboarding (60 min):** why (pricing fairness, over-servicing protection, stability), live demo of the two-minute day, the privacy page read aloud, what leadership will and will not look at, Q&A. **Expectations:** map each working day by end of next morning; no back-fill sprints on Fridays. **Support:** a named buddy (COO), 48h fix-or-answer promise, visible changelog. **Weekly:** 15-min feedback circle + anonymous form; adoption metrics reviewed *as aggregates in the open*: completeness %, median time-to-map, correction rate, insight opens. **Accuracy checks:** week 2 and 4 — spot-reconcile mapped hours vs calendars (voluntary), tie-out status, one project's costs walked end-to-end with the lead. **Exit review:** completeness ≥ 85% sustained fortnight, entry ≤ 3 min median, tie-out green both months, team sentiment ("does this feel like surveillance?" — target: unambiguous no), decision: proceed to internal launch / iterate / stop. Stopping must be a real option and said so.

## 4. Adoption principles (how leadership introduces it)

**Say:** "This protects your time and prices our work honestly. It's how we afford raises and say no to bad timelines." Founders' own completion shown first. When data reveals a process problem (chronic overrun in a phase type), the response is *pricing/process change, announced back to the team* — the loop must visibly close. **Never say:** "so we know what everyone's doing," "let's see who's really busy," anything comparing individuals, anything using time data in a performance conversation (a published bright line: time data is inadmissible in reviews). **Manager behaviour:** nudge in stand-up, never 1:1 chase-downs; curiosity about workload, never about gaps. **FAQ shipped in-product** (who sees what; what if I forget; is this used in reviews — no, in writing; can I see everything about me — yes). **Structural anti-surveillance guarantee:** the Phase 3 architecture (individual-only insights, aggregate floors, no per-person productivity dimensions) means the tool *cannot* drift into surveillance without loud, visible product changes.

## 5. Production architecture

**Frontend:** the prototype's React/TS app hardened (same design system; screens rebound to real API). **Backend:** Node/TypeScript (NestJS or tRPC service) so `lib/finance` and `lib/permissions` move server-side unchanged — the single-source rule survives the architecture boundary. **Database:** PostgreSQL (relational fits the entity map; window functions fit the reporting); append-only audit table; monthly snapshot tables for locked periods. **Auth:** managed provider (e.g. Auth0/WorkOS) with MFA; SSO in R3. **RBAC:** server-enforced policy module; field-level masking at the API serialiser. **Encryption:** TLS in transit; at-rest encryption; S1 fields (remuneration) additionally application-layer encrypted with restricted key access. **Backups:** automated daily + point-in-time recovery; quarterly restore test. **Environments:** local / staging / production; seed = the mock dataset. **Reporting:** Postgres views/materialised views first (company scale doesn't need a warehouse); revisit at >50 active projects. **Integrations:** Xero via official API (invoices, payments, overhead actuals) behind an anti-corruption layer; Google Calendar read-only suggestions; Slack webhooks. **Import:** CSV importers (people, projects, historical summaries) with dry-run preview. **Export:** CSV/XLSX everywhere permitted; full data export for the company. **DR:** RPO ≤ 24h, RTO ≤ 1 business day, documented runbook. **Hosting:** managed PaaS (e.g. Render/Fly/Vercel+Neon) in ap-southeast-1; PDPA data-residency check. **Maintenance:** monthly dependency window; uptime monitoring; error tracking (Sentry).

## 6. Build roadmap

| Stage | Scope | Depends on | Key risks | Acceptance | Deliberately excluded |
|---|---|---|---|---|---|
| **Prototype** (Claude Code, ~2–4 wks part-time) | Phase 8 stages 0–8 | Approved decisions D1–D40 | Scope creep into "real app" | Financial suite green; flows demoable per role | Persistence, auth, integrations |
| **Pilot MVP** (~6–10 wks) | R1 scope on production architecture; import of people/rates; 4 templates; privacy page | Prototype validation; PDPA review | Financial edge cases; adoption | §3 exit criteria met | Capacity, report builder, insights-full, integrations |
| **Internal launch** | Pilot fixes; R2 wave 1 (insights, forecast engine, manager views, auditor role) | Pilot exit ✓ | Feature pressure vs data quality | 3 consecutive green tie-out months; first retrospective-fed re-pricing | External portal |
| **Xero integration** | Invoices/payments/overhead sync; recognised-vs-Xero reconciliation view | Stable periods | Mapping drift | Month reconciles to Xero within tolerance | Payroll sync |
| **Monday.com** *(only if still used)* | Project/phase mirroring | Xero stable | Two-source-of-truth confusion | One-way sync agreed and honoured | Two-way editing |
| **Historical migration** | Backfill closed projects at summary level (fee, costs, phase hours where known) | Benchmark model | Garbage benchmarks | Backfilled projects tagged `historical`, excluded from tie-outs | Entry-level history |
| **Advanced forecasting** | R2 wave 2: scenarios, what-ifs, year-end model | 12 months data | False confidence | Forecast error tracked & displayed | — |
| **AI-assisted pricing** | R4: benchmark-driven ranges with evidence (Phase 6 §8) | ≥15 closed benchmarked projects | Overfitting small n | Recommendations carry n and spread; divergence tracked | Auto-pricing |

## 7. Final product specification

Compiled as `FINAL-SPECIFICATION.md` (companion file): the consolidated, handover-ready document drawing together Phases 1–9 with resolved terminology, confirmed-vs-recommended status, the full backlog and acceptance criteria — suitable for briefing a product designer, UX researcher, financial controller, front-end and backend developers, data engineer, security reviewer and implementation partner.

## 8. Decisions requiring approval

1. Pilot = whole studio, four weeks, founders first; stopping is a real option. *(Recommended.)*
2. "Time data is inadmissible in performance reviews" published as a bright line. *(Recommended — the keystone adoption promise.)*
3. Production stack: Node/TS + PostgreSQL + managed auth, ap-southeast-1. *(Recommended.)*
4. S1 application-layer encryption. *(Recommended.)*
5. Monday.com integration contingent on continued use at that time. *(Recommended.)*
6. Historical backfill at summary level only, tagged. *(Recommended.)*

---
*Cumulative spec updated to v0.9.*
