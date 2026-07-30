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
