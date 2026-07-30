# Architectural Decisions

Choices made where the brief left options open.

| # | Area | Decision | Reasoning |
|---|------|----------|-----------|
| 1 | Monetary type | `number` of integer minor units with explicit currency code, helpers in packages/finance/src/money.ts | Values stay far below Number.MAX_SAFE_INTEGER for studio scale; bigint adds friction with JSON and charts |
| 2 | Third-party margin lens | Computed as (revenue − external costs − expenses − contingency) ÷ revenue | Reproduces worked example E's published 52% exactly (130,000 ÷ 250,000) |
| 3 | Mock transport | Promise-based module with injectable latency and seeded error injection, signatures mirroring future tRPC procedures | §11 Stage A3 requirement |
