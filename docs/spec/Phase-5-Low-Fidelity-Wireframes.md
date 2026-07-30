# OuterEdit Agency Intelligence Console
## Phase 5 — Low-Fidelity Wireframes

**Version 1.0 · 29 July 2026 · Status: For review**
Text wireframes communicate hierarchy, layout and interaction; no visual styling implied (Phase 7 owns that). An interactive HTML wireframe prototype accompanies this document (`OE-Console-Wireframe-Prototype.html`).

Annotation key under each frame: **U**=user · **J**=primary job · **1°**=primary action · **P**=permission conditions · **∅**=empty state · **⚠**=risk state · **📱**=mobile adaptation.

---

## A · Shared application shell

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◐ OE Console      [⌘K Search…………………]     ‹Jul 2026 ▾›   🔔2   ? DP ▾ │ ← utility bar
├──────────┬─────────────────────────────────────────────────────────────┤
│ Home     │  Projects › Sun Yat Sen Rebranding            [Save view ▾] │ ← breadcrumb + page title
│ My Time  │  Overview | Plan & Quote | Delivery | Time | Financials ⋯   │ ← secondary tabs (perm-filtered)
│ Projects │  ┌─ filters: Status ▾  Client ▾  Lead ▾ ────────[Export ▾]─┐│
│ People   │  │                                                         ││
│ OE Verse │  │                  PAGE CONTENT                           ││
│ Company* │  │                                                         ││
│ Reports  │  └─────────────────────────────────────────────────────────┘│
│ Admin*   │                                                             │
└──────────┴─────────────────────────────────────────────────────────────┘
  * only rendered when the role grants it (subtractive nav)
```
**P** nav items, tabs, filters and export all permission-filtered; export of S1/S2 audit-logged. **📱** sidebar → bottom tab bar (Home · Time · Projects · More); utility collapses into header.

---

## B · Team-member experience

### B1 · Personal home
```
┌ Good evening, Wei Ming ✳ ────────────────────────────────────────────┐
│ TODAY  ◔ 6.5 of 8h mapped   [Finish my day →]                        │
│ ────────────────────────────────────────────────────────────────────  │
│ MY PROJECTS            hrs this wk │ COMING UP                        │
│ ▪ Sun Yat Sen Rebranding    11.5h  │ ▪ Science Park install  next wk  │
│ ▪ Night Festival 2027        6.0h  │ ▪ Leave: Fri approved ✓          │
│ ▪ Company · BD support       2.5h  │                                  │
│ ────────────────────────────────────────────────────────────────────  │
│ ✨ This week you had 2 uninterrupted maker mornings — one more than   │
│    last week.                          [See my week →]                │
└───────────────────────────────────────────────────────────────────────┘
```
**U** everyone · **J** know where my day stands; get to time entry in one tap · **1°** Finish my day · **P** self-data only · **∅** first week: "Let's map your first day — it takes about two minutes." · **📱** identical stack, single column.

### B2 · Daily time entry — three interaction models

**Model 1 · Timeline blocks (calendar-style)**
```
│ 9  ┌ SYS Rebrand · Identity design ─────┐ 9:00–11:30   2.5h │
│11  └──────────────────────────────────── ┘                   │
│11  ┌ Internal · Studio meeting ┐ 11:30–12:00  0.5h           │
│12  ┈ lunch (contextual · not costed) ┈                       │
│ 1  ┌ Night Fest · Programme dev ────┐ 1:00–4:00  3.0h        │
│ 4  ░ 4:00–6:00 unmapped ░  [+ map this]                      │
```
**Model 2 · Activity rows (ledger-style)**
```
│ + Add row        [Copy yesterday] [Favourites ▾]             │
│ SYS Rebrand ▾ · Identity design ▾ · Design ▾      [2.5h ▾] ✎ │
│ Internal ▾    · Studio meeting ▾                  [0.5h ▾] ✎ │
│ Night Fest ▾  · Programme dev ▾  · Workshop ▾     [3.0h ▾] ✎ │
│ ── mapped 6.0 / 8h ▓▓▓▓▓▓░░ ── [Save draft] [Complete day ✓] │
```
**Model 3 · Conversational quick entry**
```
│ "2.5 identity design sys, 30m studio meeting,                │
│  3h night fest programme"                       [Map it →]   │
│ → parsed into 3 rows for confirmation (edit inline)          │
```
**Recommendation: Model 2 (rows) as primary, Model 1 as an optional view, Model 3 as an accelerator on top of Model 2.** Rows are fastest for retrospective entry (the dominant real behaviour), degrade best on mobile, and need no start/end precision; blocks suit planners who live in calendars; conversational entry is a delight layer that must resolve into visible, correctable rows. Duration-first (not clock-time-first) keeps the two-minute promise.
**U** everyone · **1°** Complete day · **∅** "Copy yesterday?" offered when day empty · **⚠** none — an incomplete day is a gap, never an error · **📱** Model 2 rows with big steppers (+15m), favourites as chips.

### B3 · Weekly view
```
│            Mon   Tue   Wed   Thu   Fri   Sat  Sun   week     │
│ expected    8     8     8     8     8    –    –     40       │
│ mapped      8     8     6.5   8     ░    –    –     30.5     │
│ SYS Rebrand 4     6     2.5   3                     15.5     │
│ Night Fest  2.5   2     3     4                     11.5     │
│ Company     1.5   –     1     1                      3.5     │
│ Leave/PH    –     –     –     –    (Fri: leave ✓)    8       │
│ [Copy last week]  Wed has 1.5h unmapped · Fri is leave  ✓    │
```
**1°** fill gaps · **📱** horizontal scroll days, sticky project column.

### B4 · Personal insights (private)
```
│ YOUR WEEK IN SHAPE          │ PROJECT MIX (4 wks)            │
│ focus ▓▓▓▓▓▓ 62%            │ SYS ▓▓▓▓▓ 48%                  │
│ meetings ▓▓▓ 27%            │ NF  ▓▓▓ 31%                    │
│ company ▓ 11%               │ Co. ▓▓ 21%                     │
│ Context switches: 9 (↓3)    │ Upcoming: next wk ~85% planned │
│ ✳ Reflection: your fullest weeks follow Mondays with a       │
│   planning block. Want a recurring one?    [Not now] [Try it]│
```
**P** individual only, absolutely (Phase 3) · no rankings, no comparisons, no profitability of self.

---

## C · Project-lead experience

### C1 · Project overview
```
│ SYS Rebranding   ACTIVE · Sep 26–May 27 · Lead: Ryan         │
│ fee $70,000 (+$0 variations)   client: WE Communications     │
│ ┌ BUDGET HEALTH ─────────┐ ┌ HOURS ─────────────┐ ┌ RISK ──┐ │
│ │ ▓▓▓▓▓▓░░░░ 61% used    │ │ ▓▓▓▓▓░░░ 54% used  │ │ ● amber│ │
│ │ at 55% of timeline     │ │ vs 55% timeline ✓  │ │ 2 flags│ │
│ └────────────────────────┘ └────────────────────┘ └────────┘ │
│ forecast margin 48% (target 55%)  ▁▂▃▅ trend                 │
│ MILESTONES  ▪ Concept approval 12 Aug  ▪ Guide v1 30 Sep     │
│ TEAM  RT · WM · JL · +OEV Brand Designer                     │
│ [Log a variation] [Update forecast] [Phase detail →]         │
```
**U** lead · **J** "is my project okay?" in 10 seconds · **P** budget as $ aggregate + % only (no rates) · **⚠** amber/red on budget-vs-timeline divergence · **📱** three health cards stack; actions in sheet.

### C2 · Estimated vs actual
```
│ phase            est h  act h  remain  cost used  forecast   │
│ Discovery          40    38 ✓     –     ▓▓▓ 95%     on est   │
│ Strategy           80    92 ⚠     –     ▓▓▓▓ 115%   +$1.4k   │
│ Identity design   160   118      55✎    ▓▓ 74%      +8% ⚠    │
│ Applications      120    12     108     ▓ 10%       on est   │
│ PM (run)           90    41      49     ▓▓ 46%      on est   │
│ ── by role ▾ ──   trend ▁▂▃▅▆   warnings: Strategy closed    │
│                                  15% over · noted ✓          │
```
**1°** adjust remaining-effort assumptions (✎) → forecast updates · **P** hours visible; costs as % + $ aggregates.

### C3 · Phase detail  — deliverables, assigned team, est/act/remaining hours, cost aggregates, notes, variations touching this phase, benchmark line ("similar phases ran 112% median"). **∅** "No time recorded on this phase yet."

### C4 · Resource plan (R2)
```
│ week of      4 Aug  11 Aug  18 Aug  25 Aug                   │
│ WM  plan/act  16/–    16      12      8    ⚠ 34/40 cap Wk1   │
│ JL            20      24 ⚠    20      12   (24 > 20 avail)   │
│ OEV-BD        fixed fee — milestone-based                    │
│ gaps: Applications needs +20h Designer wks 3–4  [Find help →]│
```

---

## D · Plan & Quote (project creation & quotation planning)
```
│ 1 Particulars → 2 Structure → 3 Effort → 4 Externals →       │
│ 5 Price → 6 Scenarios → 7 Approval                           │
│ ┌ 3 · EFFORT (hours × role per phase) ──────────────────────┐│
│ │ phase          F   CD   AD   Des  ACP   h     int. cost   ││
│ │ Discovery      2    8    –    –    12   22    $2,014      ││
│ │ Identity des   4   40    –   120   20  184    $12,708     ││
│ │ …                                        Σ 690  $47,340   ││
│ └───────────────────────────────────────────────────────────┘│
│ ┌ 5 · PRICE LADDER ────────────────────────────────────────┐ │
│ │ internal cost            $47,340                          │ │
│ │ external + 20% markup    $24,000 → sell $28,800           │ │
│ │ expenses                 $6,500                           │ │
│ │ contingency 10% ✎        $7,784                           │ │
│ │ overhead recovery ✎      $9,660   (analytical)            │ │
│ │ ── floors ──  negotiation $85,624 · min safe $95,284      │ │
│ │ target GM 55% ✎ →  RECOMMENDED PRICE  $190,000            │ │
│ │ your quote ✎ $175,000 → GM 51% ⚠ below target, above safe │ │
│ │ legacy lenses: Margin-1 71% ✓ · true margin 51%           │ │
│ └───────────────────────────────────────────────────────────┘ │
│ scenarios: Best | Expected ● | High-effort | Reduced  compare │
│ [Save estimate] [Generate quotation v2 →] [Send for approval] │
```
**U** lead + leadership · **J** price consciously, see every layer · **1°** generate quotation version · **P** cost columns render only aggregates for leads; full for finance · **⚠** quote below min-safe triggers explicit confirm · discount slider shows live margin erosion.

---

## E · Administrator experience

### E1 · People database — list: name, role, team, type (FT/PT), status, manager, schedule, cost-config ✓/✗, access level. **1°** add person. **P** remuneration columns absent unless finance.

### E2 · Employee profile (finance view)
```
│ Wei Ming Tan · Account Manager · Studio team                 │
│ General | Employment | Remuneration | Cost rates | Sell rates│
│ | Capacity | Skills | Assignments | History | Access         │
│ ┌ COST RATES (derived) ────────────────────────────────────┐ │
│ │ effective   paid-h rate  avail-h rate  productive        │ │
│ │ 01 Oct 26 →   $34.10       $39.05       $48.85   (new)   │ │
│ │ 01 Jan 25 →   $31.20       $35.70       $44.60           │ │
│ │ derivation: salary+CPF+benefits ÷ hours  [expand]        │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ⚠ Editing past agreements is not possible — create a new     │
│   agreement with an effective date.  [New agreement →]       │
```

### E3 · OE Verse database — cards/list: name, discipline, location, currency, commercial model badge (hourly/day/retainer/fixed/milestone), indicative rate (P: finance), availability note, past projects count, performance note icon, agreements, documents. **1°** new agreement (J8 flow).

### E4 · Company-cost management
```
│ category      item              recur   monthly   FY fcst / act / var │
│ Rental        Studio @ Tanjong  mo      $6,500    78k / 45.5k / ✓     │
│ Software      Adobe+Figma+…     mo      $1,840    22k / 12.9k / ✓     │
│ Insurance     Prof. indemnity   yr÷12   $400      4.8k / 4.8k / ✓     │
│ Marketing     Site + press      var     ~$1,200   14k / 9.1k / +0.9k⚠ │
│ + add cost    guard: payroll-like entries rejected → People module    │
```

---

## F · Leadership experience

### F1 · Company cockpit
```
│ JULY 2026        tie-out ● green                              │
│ recognised revenue   $96,000    ▁▃▅▆                          │
│ project gross profit $34,500    GM 36%                        │
│ non-project payroll  $21,000 · unallocated $2,300 (6% ⚠)      │
│ overheads            $12,000                                  │
│ ── OPERATING PROFIT  −$800 ● just under break-even ──         │
│ coverage 0.98 (GP covers 98% of running costs)                │
│ forecast year-end: +$41k base / +$12k low / +$78k high        │
│ CAPACITY next 4 wks: 82% committed   PIPELINE: $310k wtd      │
│ ⚑ needs attention: Placemaking SP (forecast −2%) · NF hours   │
```
**J** "are we okay, what needs me" in 30 seconds · every figure drills to inputs · **⚠** language: "just under break-even," never alarm-red for a near-miss month.

### F2 · Portfolio profitability
```
│ sort: profit/hour ▾  filters: status · service line · client  │
│ project        fee     act cost  GP      GM    $/h    risk    │
│ Brand sprint   12.0k   4.9k     7.2k    60%   $110    ●       │
│ SYS Rebrand    70.0k   44.1k    est 26k  37%   $58     ●      │
│ Night Fest    420.0k  367.7k    52.3k   12%   $29.5   ◐       │
│ Placemaking   250.0k  256.2k   −6.2k   −2.5%  −$3.8   ⚠       │
│ [Compare selected] [Open project →]                           │
```

### F3 · Company time allocation — stacked monthly bars: client work / BD / marketing / admin / training / leave / internal initiatives / unallocated; trend line of client-work share; **no per-person dimension available in this view.**

### F4 · Service-line analysis (R2) — table per line: revenue, direct cost, GP, GM, avg duration, avg hours, overrun frequency, profit/hour, sparkline; sort any column; drill to projects.

---

## G · Mobile behaviour (key adaptations)

Daily entry: row model, chips for favourites, +15m steppers, one-thumb complete-day. Weekly: horizontal day scroll. Notifications: OS push mirrors in-app (personal nudges only by default). Insights: single-column cards. Project health (lead): the three health cards + phase list, read-mostly; variation/forecast actions deferred to desktop with "continue on desktop" handoff. Approvals (leadership): actionable cards (approve variation, expense) — the one write-path prioritised on mobile.

## H · Annotations summary (screens not annotated inline)

| Screen | U | 1° action | ∅ empty | ⚠ risk | Data deps |
|---|---|---|---|---|---|
| Portfolio | lead/leadership | open project | "No projects yet — create from a template" | risk chips | Project, health rollups |
| Phase detail | lead | adjust remaining ✎ | no time yet | phase overrun | Phase, entries, benchmark |
| OE Verse | ops/finance | new agreement | "Your network starts here" | expiring agreements | Collaborator, Agreement |
| Company costs | finance | add cost | seeded categories | variance ⚠ | Overhead register |
| Cockpit | leadership | drill figure | pre-first-month explainer | coverage <1 | All Phase 2 §7 |
| Reports | varies | run/save report | "Pick a question to answer" | — | warehouse views |

## I · Screen-to-screen flow map (primary paths)

Home → Today ⇄ Week → Insights. Home → My projects → Project overview → (Delivery ⇄ Phase detail ⇄ Est-vs-actual) → Forecast → Variation. Portfolio → Overview → Financials (finance). New project → Plan & Quote steps 1–7 → Approval → baseline freeze → Delivery. People → Profile → Employment → New agreement → rate timeline. OE Verse → Agreement → project commitments. Cockpit → any figure → underlying report → project. Close: Overview → Close checklist → Retrospective → Financially closed → Benchmark.

## J · Component inventory

Shell: sidebar nav, utility bar, breadcrumbs, tab bar, date-range picker, ⌘K palette, notification tray, saved-view chip bar, export menu. Data entry: project/phase/activity cascading picker, duration stepper, favourites chips, copy-yesterday card, completion ring, week grid, block timeline, quick-parse input. Display: health card (budget/hours/risk), progress bar with threshold ticks, est-vs-actual table row, price-ladder panel, floors indicator, scenario tabs, sparkline, stacked allocation bar, portfolio table, compare drawer, rate-timeline, benchmark note, tie-out badge. Feedback: quiet toast, gentle nudge banner, amber/red situation chips, locked-period banner, approval card, dispute flag, adjustment-request sheet. All components carry permission-aware rendering variants (full / masked / hidden).

## K · Remaining design questions

Deliverable-level time picking default on/off per project (recommend: on only when deliverables defined); timer feature placement (recommend: quiet optional, R2); whether leadership cockpit shows per-person unallocated detail (recommend: no — aggregate only, per Phase 3).

---
*Cumulative spec updated to v0.5.*
