# CLAUDE.md — OuterEdit Agency Intelligence Console

Place this file at the repository root. Claude Code reads it at the start of every session.

## What this is

An internal operating console for OuterEdit, a Singapore creative direction studio. It connects quotation planning, project delivery, whole-day time allocation, project profitability, company profitability and pricing intelligence in one continuous structure. It is not a timesheet, not a project manager, not an accounting system, and never a monitoring tool.

**Full build instruction:** `docs/MASTER-BUILD-PROMPT.md`. **Depth reference:** `docs/spec/` (Phases 1 to 9 and FINAL-SPECIFICATION.md). Where they disagree, the master prompt wins and the discrepancy goes in `docs/DEVIATIONS.md`.

## The ten rules (never violate, never weaken to ease implementation)

1. **Single source of financial truth.** Every displayed number comes from `packages/finance`. No component, resolver, report or fixture computes money independently. Cite the section number in a comment.
2. **The worked examples are law.** `packages/finance/test/workedExamples.test.ts` holds exact expected values from master prompt §6.9. If code disagrees, the code is wrong. Never edit an expected value.
3. **Single-count invariant.** `EmploymentCost = ProjectLabour + NonProjectPayroll + UnallocatedPayroll ± ReconciliationAdjustment`, per person per period. Enforced by the tie-out; a red tie-out blocks period lock.
4. **Baseline freeze.** Accepted quotations snapshot the estimate immutably. Change flows only through approved Variations. No code path edits an accepted baseline.
5. **Time sovereignty.** Only the person edits their own time. No admin override exists in the API. Post-lock corrections are dated adjustments, never rewrites.
6. **Centralised permissions.** One `can()` engine in `packages/policy`. Masking happens server-side at the serialiser; a forbidden value never reaches the client, including by subtraction from aggregates.
7. **Non-surveillance boundary.** No screenshots, keystroke logging, idle tracking, leaderboards, productivity scores, or per-person comparison surfaces. Personal insights and contextual time (meals, commuting) are visible to their owner alone, with no override for any role.
8. **Costing basis.** All recorded time costs at the person's **cost per paid hour** on the entry's date. Loaded rates appear only in pricing. Contextual activities are never costed.
9. **Mark-up is a pricing event.** External costs record what OuterEdit pays. The 20% mark-up lives in the quotation ladder only.
10. **Voice.** Microcopy from master prompt §9.4 verbatim where it matches. No exclamation marks in warnings, no "you failed" or "you forgot", situations described rather than people blamed, no em dashes in user-facing text. Red is for money and deadlines, never for a person's behaviour.

## Conventions

- Money is **integer minor units** with an explicit currency. Never floats. Percentages are decimals.
- Business dates are calendar dates in `Asia/Singapore`; storage timestamps are UTC.
- `packages/finance` and `packages/policy` are pure: no I/O, no framework, no system clock (pass `asOf`).
- The `fixtures/` dataset is shared by the mock API, the tests and the database seeder.
- Navigation is subtractive: modules a user cannot access are absent, not disabled.

## Working agreement

Plan mode first for every stage, wait for approval, then implement. One stage per branch. Do not start a stage before its predecessor's acceptance tests are green. When something is ambiguous or looks wrong, **stop and ask** rather than inventing business logic. Keep `docs/DEVIATIONS.md` and `docs/DECISIONS.md` current.

## Build order

A0 foundation · A1 financial engine and tests · A2 permission engine · A3 domain and mock API · A4 design system · A5 personal · A6 projects · A7 Plan & Quote · A8 people, OE Verse, company, admin · A9 states and scenarios · B1 backend · B2 auth, audit, periods · B3 hardening · C1 pilot readiness · D release 2 · E integrations and intelligence.

Release 1 stops at C1. Do not build the capacity planner, report builder, integrations, external portal or pricing intelligence before Release 1 ships.

## Commands

```
pnpm install
pnpm dev              # web on :5173, server on :3000 (from B1)
pnpm test             # unit + financial acceptance + permission suites
pnpm test:e2e         # Playwright journeys
pnpm db:migrate       # Prisma (from B1)
pnpm db:seed          # load fixtures/
```
