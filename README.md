# OuterEdit Agency Intelligence Console

An internal operating console for OuterEdit, a Singapore creative direction studio. It connects quotation planning, project delivery, whole-day time allocation, project profitability, company profitability and pricing intelligence in one continuous structure.

It is **not** a timesheet in spirit, not a project manager, not an accounting ledger, and never a monitoring tool. See `apps/web` → Privacy page for the promise the product makes to the people using it.

## Quick start

```bash
pnpm install
pnpm dev          # web app on http://localhost:5173
pnpm test         # financial acceptance + permission + fixture suites
pnpm build        # production build of every workspace
```

Add `?chaos=0.15` to the URL to demonstrate the mock transport's seeded error injection.

## Demo accounts

The account switcher in the top bar re-renders navigation subtractively and re-masks every figure on screen. No password, mock data only.

| Account | Roles | What to look at |
|---|---|---|
| Mei | team member | Today's two-minute ritual, week view, personal insights nobody else can see |
| Ryan | team member + project lead + leadership + super admin | Additive roles: same personal experience, plus portfolio, cockpit, admin |
| Priya | people manager | Reports' weekly totals and gaps, never their notes or categories |
| Daniel | finance administrator | Rates, overheads, periods, locking, project financials |
| Sofia | leadership | Dashboards and approvals with people-cost aggregates masked |
| Wei Ming | team member + project lead (one project) | Lead view scoped to a single project |
| Aiko | external contributor (OE Verse) | Hard-walled portal: own assignments and terms only |

## Architecture

```
packages/finance   THE financial engine. Pure TS, no I/O, no clock. Every number
                   displayed anywhere originates here (rule R1). §6.9 worked
                   examples are law and live in test/workedExamples.test.ts.
packages/policy    THE permission engine: can(), sensitivity classes S1-S4,
                   masking with aggregation floors. Server-side masking model.
packages/domain    Shared types and Zod schemas for every entity.
fixtures/          One seed dataset consumed by the mock API, the tests and the
                   future database seeder. Every month ties out green.
apps/web           React 18 + Vite + Tailwind. Studio Ledger design system.
                   src/api is a mock transport whose signatures mirror the
                   future tRPC procedures (Stage B swaps that module only).
```

The ten non-negotiable rules are in `CLAUDE.md`. The full brief is `docs/MASTER-BUILD-PROMPT.md`; product depth in `docs/spec/` (Phases 1 to 9). Anything built differently is logged in `docs/DEVIATIONS.md`.

## The two ideas that carry the product

1. **One language from promise to proof.** The structure created when estimating (phases, roles, hours) is the identical structure time is recorded against, costs land on, forecasts run over, and the retrospective compares.
2. **Two ledgers, never blurred.** Project profitability and company profitability are always visible to those authorised, always reconcile, and each dollar of salary is counted exactly once: `EmploymentCost = ProjectLabour + NonProjectPayroll + UnallocatedPayroll ± ReconciliationAdjustment`.

## Status and limitations

Stage A build (fully navigable application on deterministic mock data). The real backend (Fastify + tRPC + Prisma + Postgres), auth, audit persistence and period-lock snapshotting arrive with Stage B; CSV import, exports and notifications with Stage C. Capacity planner, report builder, integrations, external portal depth and pricing intelligence are deliberately out of Release 1 scope.

## Stress test

`node tools/stress.mjs` (with `pnpm dev` running) drives the app in headless
Chromium through seven personas: employee, super admin, finance administrator,
people manager, leadership, single-project lead and an OE Verse freelancer.
52 checks cover function, permission masking, report accuracy against the
worked examples, period lock and reopen guards, the variation flow, the
discount floor confirmation and the payroll guard.

## Deploying (Railway)

The repo ships a multi-stage `Dockerfile` and `railway.json`. Railway builds the
workspace with pnpm, bundles `apps/web`, and serves the static SPA through
`apps/web/server.mjs` (dependency-free, binds `0.0.0.0:$PORT`, SPA fallback,
immutable caching for hashed assets). No environment variables are required.
