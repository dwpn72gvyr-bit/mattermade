# Architectural Decisions

Choices made where the brief left options open.

| # | Area | Decision | Reasoning |
|---|------|----------|-----------|
| 1 | Monetary type | `number` of integer minor units with explicit currency code, helpers in packages/finance/src/money.ts | Values stay far below Number.MAX_SAFE_INTEGER for studio scale; bigint adds friction with JSON and charts |
| 2 | Third-party margin lens | Computed as (revenue − external costs − expenses − contingency) ÷ revenue | Reproduces worked example E's published 52% exactly (130,000 ÷ 250,000) |
| 3 | Mock transport | Promise-based module with injectable latency and seeded error injection, signatures mirroring future tRPC procedures | §11 Stage A3 requirement |
| 4 | USD aggregation | The one USD project converts into SGD company views at a fixed demo rate of 1.35, labelled in code (`DEMO_USD_SGD`) | Fixture dataset carries no FX feed; Stage E's Xero integration replaces this |
| 5 | Mock persistence | The Stage A mock database lives in browser memory; a full page reload restores pristine fixtures, while client-side navigation preserves mutations | Keeps the demo deterministic and resettable; the real backend (B1) makes mutations durable |
| 6 | Portfolio fee visibility | Contract value is visible to the project's lead, leadership and finance; plain team members see no project money | §7.2 grants leads "contract value with variations" on their overview while excluding unauthorised project financials for team members |
| 7 | Complimentary overtime | Hours mapped beyond a person's scheduled day (and any hours on weekends or closed days) are valued in a separate `projectOvertime` lens at paid rates and shown at the end of project profitability reports; they never enter official cost, gross profit or margin | Client direction (round F) fixed the 8-hour day as the official costing boundary while asking for transparent recognition of extra effort; keeping the lens outside the engine's official figures preserves R2 and the §6.9 worked examples |
| 8 | Backup fidelity | The daily CSV backs up the working collections a spreadsheet can sensibly carry: projects (core fields), time entries, leads, project notes and OE Verse profiles; structural finance data (rates, agreements, periods) ships with the app seed | A restore format the studio can hand-edit beats a lossless dump nobody can read; sections replace wholesale so the file is the truth |
