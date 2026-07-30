# OuterEdit Agency Intelligence Console
## Phase 2 — Financial Model & Profitability Logic

**Version 1.0 · 29 July 2026 · Status: For review**
This phase defines the numerical engine. Every screen in later phases is a view of these formulas; nothing downstream may reinterpret them. The centre of the design is one invariant: **every dollar is counted exactly once.**

---

## 1. Financial terminology dictionary

| Term | Definition |
|---|---|
| **Contract value** | The fee agreed in the accepted quotation, before GST, excluding variations. |
| **Approved variation** | An explicitly approved change to scope/fee after acceptance. Contract value + variations = **total approved fee**. |
| **Contracted revenue** | Total approved fee — what the client has agreed to pay overall. |
| **Invoiced revenue** | The portion billed to date. |
| **Recognised revenue** | The portion *earned* to date (work delivered), regardless of billing. The basis for profitability reporting. |
| **Collected cash** | The portion actually received. The basis for cash reporting. |
| **Direct internal labour cost** | Recorded project hours × the person's dated cost rate. |
| **Direct external cost** | OE Verse and supplier costs attributable to the project (any commercial model). |
| **Direct expense** | Non-labour project cost: fabrication, production, travel, project software, purchases. |
| **Total direct project cost** | Internal labour + external cost + direct expenses. Never includes overhead. |
| **Gross profit (GP)** | Recognised revenue − total direct project cost. |
| **Gross margin (GM)** | GP ÷ recognised revenue. |
| **Third-party margin** *(legacy lens)* | Revenue − (external costs + buffer), the existing spreadsheet's "Margin 1" (target 60–70%). Kept as a display lens; never the primary measure. |
| **True margin** *(legacy lens)* | The spreadsheet's margin after internal labour (target 50–60%) ≈ gross margin in this model. |
| **Contribution after overhead recovery** | GP − allocated overhead share. An *analytical* figure for pricing; never replaces GP. |
| **Profit per internal labour hour** | GP ÷ actual internal project hours. The great equaliser between big and small projects. |
| **Effective realised hourly revenue** | Recognised revenue ÷ actual internal hours — what each internal hour actually earned. |
| **Cost rate (per paid hour)** | A person's total employment cost ÷ total paid hours. The **costing basis** for all time. |
| **Cost rate (per available hour)** | Employment cost ÷ hours actually available for work (paid − leave − holidays). The **pricing floor basis**. |
| **Sell rate** | The charge-out rate used to price and to value unbilled effort. |
| **Non-project payroll cost** | Paid hours on company activities (BD, admin, training, leave…) × cost rate. |
| **Unallocated payroll cost** | Scheduled paid hours not yet mapped × cost rate. A company cost bucket that makes gaps visible and keeps totals honest. |
| **Company operating overhead** | Non-payroll running costs: rent, insurance, software, legal, accounting, marketing… **Never contains salaries or project costs.** |
| **Operating profit** | Σ project GP + other income − non-project payroll − unallocated payroll − overheads. |
| **Break-even revenue** | Revenue needed at current average margin for GP to cover payroll-outside-projects + overheads. |
| **Budget consumed %** | Actual direct cost ÷ estimated total direct cost (baseline + variations). |
| **Hours consumed %** | Actual internal hours ÷ estimated internal hours. |
| **Forecast cost at completion (FCAC)** | Actual cost to date + estimated cost to complete. |
| **Estimate-at-completion variance** | FCAC − baseline estimated cost (with variations). Negative = under. |
| **Unbilled effort** | Delivered work not yet billed or not billable: for T&M, unbilled hours × sell rate; for fixed-fee, effort beyond scope with no variation, valued at sell rates. |
| **Write-off** | Revenue or recoverable effort formally abandoned at closure. |
| **Utilisation** | Hours on activities flagged *counts-toward-utilisation* ÷ available hours. A capacity-health measure, never an individual performance score. |
| **Committed cost** | External cost contractually owed even if not yet invoiced (a signed fixed fee is committed in full). |

---

## 2. Cost-rate logic (full-time employees)

### 2.1 Annual employment cost

For each person, from the dated Employment agreement:

```
AnnualEmploymentCost =
    12 × MonthlySalary
  + EmployerCPF                    (17% of ordinary wages up to the CPF ceiling —
                                    configurable %, ceiling, and age band; confirm current values)
  + ContractualBonus provision      (e.g. AWS / 13th month, annualised)
  + FixedAllowances
  + InsuranceAndBenefits cost
```

Plain language: everything OuterEdit pays *because this person is employed*, per year. Discretionary bonuses are excluded from the rate (they'd distort project costs retroactively); they land in company costs when paid, or are added by policy decision. Training spend is **overhead**, not employment cost, to keep the rate clean.

### 2.2 Three hour bases

```
PaidHours/year      = WeeklyScheduledHours × 52                     (e.g. 40 × 52 = 2,080)
AvailableHours/year = PaidHours − (AnnualLeave + PublicHolidays
                       + ExpectedMedical) × DailyHours              (e.g. 2,080 − (18+11+4)×8 = 1,816)
ProductiveHours/yr  = AvailableHours × ProductiveFactor             (default 80% ⇒ ~1,453)
```

### 2.3 Three rates and their exclusive uses

| Rate | Formula | Used for | Never used for |
|---|---|---|---|
| **Cost per paid hour** | AnnualEmploymentCost ÷ PaidHours | Costing **all** recorded time — project and company alike | Pricing |
| **Cost per available hour** | AnnualEmploymentCost ÷ AvailableHours | Pricing floors; loaded cost views | Costing recorded time |
| **Cost per productive hour** | AnnualEmploymentCost ÷ ProductiveHours | Overhead-recovery targets; capacity economics | Costing or margin reporting |

**Why the paid-hour rate is the costing basis (the anti-double-count choice).** If every paid hour — project work, admin, BD, *and leave* — is costed at the same per-paid-hour rate, then the sum of all costed hours in a period equals the person's employment cost for that period, exactly. Leave appears honestly as a company labour cost line. If we instead costed project hours at the *loaded* (available-hour) rate **and** also showed leave as a cost, the leave burden would be counted twice. The loaded rate still matters — but in pricing, where the client's fee must carry the person's leave, not in costing, where the ledger must tie.

**Estimates and actuals share one basis.** Estimated internal cost = estimated hours × cost-per-paid-hour, so est-vs-actual comparisons are like-for-like. The pricing model (§8) layers the loading on top, explicitly and visibly.

### 2.4 Rate history and change handling

- Rates are dated records derived from dated agreements. A salary change creates a new rate effective from its date; **prior rates are never edited**.
- Each time entry is costed with the rate effective on its date. A mid-project raise means early hours cost the old rate, later hours the new — which is the truth.
- Mid-month changes pro-rate the month's employment cost by calendar days.
- On financial-period lock, computed costs are **snapshotted**; later corrections flow as adjustments in the open period (accounting-style), never by rewriting history.

---

## 3. Time & payroll allocation logic

### 3.1 The allocation identity

For person *i* in period *P*:

```
EmploymentCost(i,P) = ProjectLabourCost(i,P)        → inside project GP
                    + NonProjectPayrollCost(i,P)     → company P&L line
                    + UnallocatedPayrollCost(i,P)    → company P&L line (visible gap)
                    ± ReconciliationAdjustment(i,P)  → company P&L line (see 3.3)
```

Every payroll dollar lands in exactly one of these buckets. The company P&L (§7) consumes buckets 2–4; project GP consumes bucket 1. Nothing is counted twice; nothing silently disappears.

### 3.2 Activity flags decide the bucket

Each activity category carries flags (Phase 1 §5). The costing rules:

| Time recorded on… | Paid? | Cost-bearing? | Lands in |
|---|---|---|---|
| Client project phases | ✓ | ✓ | **Project labour cost** (that project) |
| BD, marketing, admin, internal meetings, training, internal initiatives | ✓ | ✓ | **Non-project payroll** (by category) |
| Annual leave, medical leave, public holidays, time in lieu taken | ✓ | ✓ | **Non-project payroll** (leave categories) |
| Breaks/meals, commuting | ✗ (contextual) | ✗ | **No cost anywhere** — recorded for personal reflection only; excluded from the identity (they sit outside scheduled paid hours or are display-only) |
| Unpaid leave | ✗ | ✗ | Reduces the period's EmploymentCost pro-rata; no cost line |
| Nothing recorded (gap) | — | — | **Unallocated payroll** |

Contextual categories are the trust feature: a person can map their *whole* day, including lunch and the commute, and the money model simply ignores those rows. The UI shows this ("recorded for you, not counted as cost").

### 3.3 Edge cases

- **Missing time** → costed to Unallocated payroll at the standard rate. Reports show a *data-completeness* score per period (company-level), so leadership chases completeness, not individuals.
- **Partial days** → whatever is recorded is costed normally; the remainder of scheduled hours goes to Unallocated.
- **Overtime (salaried)** → recorded hours beyond schedule are costed at the standard rate so projects show the *true effort* they consumed. Because salary is fixed, this over-attributes cost vs. actual payroll; a period-level **Reconciliation adjustment** (negative, company line, labelled "absorbed overtime") ties the total back to true payroll. Effect: project costs tell the truth about effort; the company P&L tells the truth about cash; over-servicing becomes visible instead of free.
- **Time in lieu** → overtime worked may bank lieu hours (recorded, flagged); lieu taken later is a paid leave category. Config decides whether OT banks 1:1.
- **Unpaid leave** → reduces employment cost pro-rata for the period; the schedule shrinks so Unallocated doesn't inflate.
- **Public holidays** → auto-populated entries (SG calendar, per-person location), category "Public holiday," editable if worked.
- **Medical leave** → leave category; costed as company labour cost (the brief's rule: paid leave remains a company cost).
- **Different schedules** → all identities are driven by the person's dated schedule (days × hours); part-time simply has fewer scheduled hours.
- **Corrections after period lock** → the locked month never changes. A correction creates a dated adjustment entry in the current open period referencing the original (visible in both places, audit-trailed). Projects show "includes adjustments from prior periods" where applicable.

---

## 4. External contributor cost logic

External costs have three states — **planned** (estimated), **committed** (agreement signed; owed regardless of invoicing), **actual** (invoiced/paid) — and two attribution questions: *which project/phase* and *which financial period*.

| Commercial model | Cost measurement | Project/phase attribution | Period attribution |
|---|---|---|---|
| **Hourly** | Recorded/invoiced hours × rate | The phase the hours were worked on | The month worked |
| **Day rate** | Days × rate | As invoiced/assigned per phase | The month worked |
| **Monthly retainer** | Fixed monthly fee | One project; **or** split across projects by fixed % ; **or** by the collaborator's recorded time share (if they log time) | Each month of the retainer |
| **Fixed project fee** | Total fee (committed at signing) | Whole project; phase split optional by % | **Accrual policy** (below) |
| **Fixed phase fee** | Fee per phase | That phase | Straight-line across the phase, or on phase completion |
| **Fixed deliverable fee** | Fee per deliverable | The deliverable's phase | On acceptance of the deliverable |
| **Milestone payments** | Fee per milestone | Linked phase(s) | On milestone acceptance |
| **Reimbursable expenses** | Actuals with receipts | The phase incurred | The month incurred |

**Fixed-fee accrual policy (recommended default):** accrue on linked milestones/deliverables where defined; otherwise straight-line across the engagement duration. For *project profitability at any moment*, the **full committed fee** always counts in forecast-at-completion (a signed $20k is owed whether or not invoiced) — accrual only affects *which month* the cost is recognised in period reporting. This is the difference between "is this project going to make money?" (committed view) and "what did this month cost?" (accrued view).

**The finished-early case:** a fixed-fee freelancer completing early changes nothing about cost (the fee is the fee); remaining accrual recognises immediately on completion. Profit per *internal* hour is unaffected; the project simply de-risks.

**Multi-currency:** commitments capture currency + SGD rate at commitment date (manual in R1); actuals capture rate at invoice date; the difference posts as a small FX line in company costs. Full revaluation is R3.

**Mark-up is a pricing event, not a cost event.** The existing sheet's 20% mark-up on OEV costs lives in the quotation (§8) — the client-facing price of the external work. The cost side records only what OuterEdit pays. The spread between them is simply part of gross profit; modelling it as inflated "cost" would corrupt margins.

---

## 5. Project profitability formulas

All formulas expressed per project; period-scoped variants filter time/cost/revenue to the period. *(B = baseline at approval, incl. approved variations.)*

| # | Formula | Plain language |
|---|---|---|
| 5.1 | `EstInternalCost = Σ (est hours by role/phase × cost-per-paid-hour at estimate date)` | What the planned internal effort should cost. |
| 5.2 | `ActInternalCost = Σ (time entries on project-costed activities × dated cost rate)` | What the recorded effort did cost. |
| 5.3 | `EstExternalCost = Σ planned external lines` · `ActExternalCost = Σ committed/actual per §4` | Outside help, planned vs. real. |
| 5.4 | `EstDirectCost = 5.1 + 5.3est + EstExpenses + Contingency` · `ActDirectCost = 5.2 + 5.3act + ActExpenses` | Total planned vs. total real direct cost. Contingency exists only on the estimate side; actuals consume it invisibly by simply being higher. |
| 5.5 | `EstGP = ContractValue(B) − EstDirectCost` · `ActGP = RecognisedRevenue − ActDirectCost` | Planned and actual gross profit. |
| 5.6 | `GM% = GP ÷ revenue` (est over contract value; actual over recognised) | The margin percentage. |
| 5.7 | `EffectiveHourlyRevenue = RecognisedRevenue ÷ ActInternalHours` | What each internal hour earned. |
| 5.8 | `ProfitPerInternalHour = ActGP ÷ ActInternalHours` | What each internal hour *kept*. The fairest cross-project comparator. |
| 5.9 | `BudgetConsumed% = ActDirectCost ÷ EstDirectCost(B)` | How much of the planned cost envelope is spent. |
| 5.10 | `HoursConsumed% = ActInternalHours ÷ EstInternalHours(B)` — overall, per phase, per role | The overrun early-warning metric; compare against schedule % elapsed. |
| 5.11 | `ETC = Σ remaining est hours × burn factor × rate + remaining committed external + remaining planned expenses`, where `burn factor = actual-hours-per-unit-progress ÷ planned` (lead may override with reason) | Honest cost-to-finish: remaining plan, corrected by how delivery is actually running. |
| 5.12 | `FCAC = ActDirectCost + ETC` | Forecast cost at completion. |
| 5.13 | `ForecastGP = TotalApprovedFee − FCAC` · `ForecastGM% = ForecastGP ÷ TotalApprovedFee` | Where the project will land if the trend holds. |
| 5.14 | `EACVariance = FCAC − EstDirectCost(B)` | Damage (or savings) vs. the promise made at approval. |
| 5.15 | `OriginalVsVariations = ContractValue ∥ Σ ApprovedVariations` (always shown side by side) | Keeps scope growth visible instead of absorbed. |
| 5.16 | `UnbilledEffort = (T&M: unbilled hours × sell rate) + (fixed-fee: out-of-scope hours with no variation × sell rate)` | Work delivered but not paid for — the over-servicing meter. |
| 5.17 | `WriteOff = recognised-but-uncollectable revenue + formally abandoned unbilled effort` (recorded at closure, audit-trailed) | The honest final accounting of what was given away. |
| 5.18 | `ContributionAfterOverhead = ActGP − (OverheadPerProductiveHour × ActInternalHours)` | *Analytical lens only:* would this project survive carrying its share of the studio? Displayed with an explicit "analytical view" label. |

---

## 6. Overhead model

The overhead register (Company Costs) holds **non-payroll, non-project** operating costs by category (rental, accounting, insurance, general software, legal, banking, marketing, BD expenses, equipment, general travel, training, company admin). Monthly recurring, annual (spread monthly), and one-off entries; forecast vs. actual.

Analytical rates, recomputed monthly:

```
6.1  MonthlyOverhead            = Σ overhead register for the month (annuals ÷ 12)
6.2  OverheadPerAvailableHour   = MonthlyOverhead ÷ Σ team available hours in month
6.3  OverheadPerProductiveHour  = MonthlyOverhead ÷ Σ team productive hours in month   ← default pricing lens
6.4  OverheadAsPctDirectLabour  = MonthlyOverhead ÷ Σ project labour cost in month
6.5  OverheadAsPctRevenue       = MonthlyOverhead ÷ recognised revenue in month
6.6  MonthlyRecoveryTarget      = MonthlyOverhead + MonthlyNonProjectPayroll
                                  ("what the month's gross profit must exceed")
```

**Standing rule (displayed wherever these appear):** overhead allocation is an analytical and pricing lens. Project gross profit is always reported without it. Allocated views are labelled and never aggregated into company operating profit (which would double-count the overhead).

---

## 7. Company profitability

```
7.1  TotalProjectGP(P)      = Σ over projects of ActGP in period P (recognised basis)
7.2  NonProjectPayroll(P)   = Σ company-activity hours × cost rates  (incl. leave, PH)
7.3  UnallocatedPayroll(P)  = Σ unmapped scheduled hours × cost rates
7.4  Overhead(P)            = §6.1
7.5  OtherIncome(P)         = grants, interest, non-project income
7.6  OperatingProfit(P)     = 7.1 + 7.5 − 7.2 − 7.3 − 7.4 ± ReconciliationAdjustments
7.7  OperatingMargin        = 7.6 ÷ RecognisedRevenue(P)
7.8  OverheadCoverage       = 7.1 ÷ (7.2 + 7.3 + 7.4)      (>1.0 = the studio pays for itself)
7.9  BreakEvenRevenue       = (7.2 + 7.3 + 7.4) ÷ AverageGM%
7.10 ForecastYearEnd        = YTD OperatingProfit + Σ forecast months (pipeline × probability − planned costs)
7.11 CashRunway             = CashBalance ÷ avg monthly net cash outflow   (only if cash data provided; R3 with Xero)
```

**How double counting is structurally impossible.** Salaries enter the model *only* through the time-allocation identity (§3.1): the project share is already inside 7.1 (as project labour cost reducing GP), and the remainder appears in 7.2/7.3. The overhead register (7.4) is forbidden from containing payroll or project costs by category design. So `7.6` contains each payroll dollar exactly once and each overhead dollar exactly once. A monthly automated **tie-out check** asserts: Σ(7.1's labour component + 7.2 + 7.3 ± adjustments) = Σ payroll per employment agreements — surfaced as a green/amber reconciliation status to finance.

---

## 8. Revenue models & recognition

Supported commercial structures: fixed fee · retainer · time-and-materials · milestone billing · phased billing · deposits · approved variations · pro bono/discounted (real costs, zero/reduced revenue, explicitly tagged so they don't pollute benchmarks) · mixed (line-item level).

Four revenue lenses and their exclusive uses:

| Lens | Basis | Used for |
|---|---|---|
| **Contracted** | Accepted quote + variations | Pipeline, pricing, forecast ceiling |
| **Recognised** | Work earned (below) | **All profitability reporting** — project and company |
| **Invoiced** | Bills issued | Accounting alignment (Xero is authoritative), receivables |
| **Collected** | Cash received | Cash-flow reports, runway |

**Recognition rules (R1, deliberately simple):** fixed fee → recognised per **milestone/phase completion** as marked by finance (weights default to the quotation's line-item values); retainers → straight-line monthly; T&M → hours × sell rate as delivered; deposits → liability until earned; variations → recognised like their parent structure. R2 upgrades fixed-fee recognition to effort-based percentage-of-completion (hours consumed ÷ forecast hours), which is more honest mid-phase. Statutory revenue recognition remains Xero's problem; the console's recognised revenue is a management view and reconciles to Xero in R3.

**Why recognised (not invoiced) drives profitability:** invoicing schedules are negotiation artefacts. A project 80% delivered but 20% invoiced is not unprofitable; it is unbilled. Mixing the two poisons both project health and month-to-month company results.

---

## 9. Pricing intelligence model (quotation planning)

The quotation planner builds price bottom-up, showing every layer. Nothing is hidden inside a blended number.

```
Step 1  Effort        Est hours by role × phase                     (from template + judgement)
Step 2  Internal cost Σ hours × cost-per-paid-hour                  (the costing truth)
Step 3  Loaded check  Σ hours × cost-per-available-hour             (the leave/PH-carrying floor)
Step 4  External      Σ external lines at agreed/estimated fees
Step 5  Sell external ExternalCost × (1 + external mark-up)         (default 20% — the sheet's OEV rule)
Step 6  Expenses      Fabrication, travel, production, licences
Step 7  Contingency   ContingencyRate × (Steps 2+4+6)               (default 10%; sheet notes 5% "ideally 10%")
Step 8  Overhead rec. OverheadPerProductiveHour × est internal hours  (analytical layer, §6.3)
Step 9  Price         RecommendedPrice = TotalCost(2+4+6+7+8) ÷ (1 − TargetGM)
                      — margin applied ON PRICE, not on cost (a 50% target means price = 2× cost)
```

Three floors, always displayed:

```
NegotiationFloor  = direct costs only (2+4+6+7)          → below this, the project destroys cash
MinimumSafePrice  = direct costs + overhead recovery (8)  → below this, the project doesn't pay its share of the studio
RecommendedPrice  = Step 9                                → the healthy quote
```

**Sensitivity levers** (each shown as live deltas on price, margin, and profit-per-hour):
- **Discount** — applied to price, absorbed entirely by margin; the planner shows the margin at each discount step and flags when a discount breaches MinimumSafePrice.
- **Additional revisions** — +X hours per revision round per phase (template default, e.g. 10–15% of design-phase hours per extra round beyond the included three).
- **Duration extension** — +PM/oversight hours per extra month (default: the project's monthly PM run-rate), plus retainer-type external costs that scale with time, plus profit-per-month dilution (the sheet's lens, kept).
- **Delayed client decisions** — modelled as duration extension + context-switching overhead factor on remaining phases.
- **Staffing mix** — recompute Steps 2–3 with a different role blend (e.g. shifting 60 CD hours to Designer hours), showing cost and risk trade-offs.

**Scenario planning:** every estimate can hold four scenarios sharing structure — *Best*, *Expected* (baseline for approval), *High-effort* (revisions + extension), *Reduced-scope*. The comparison view shows fee, cost, GP, GM, profit/hour, and profit/month per scenario. The approval baseline is always Expected.

**Legacy lens mapping:** the planner also displays the sheet's Margin-1 ("margin excluding internal costs," target 60–70%) and True Margin (≈ GM, target 50–60%) so current intuition transfers. Worked example E below shows why Margin-1 alone is dangerous.

---

## 10. Worked examples (fictional, SGD, GST excluded)

Shared rate card (from current sheet): **cost/hr** Founder 127 · CD 130 · AD 100 · AM 60 · Designer 50 · ACP 50; **sell/hr** 320 · 235 · 200 · 120 · 110 · 110.

### A · Two-month branding project — healthy mid-size
Fee **$38,000**. No external. Hours: CD 60, Designer 180, ACP 40, Founder 10 = **290 h**.
Internal cost = 60×130 + 180×50 + 40×50 + 10×127 = 7,800+9,000+2,000+1,270 = **$20,070**.
GP **$17,930** · GM **47.2%** · profit/hour **$61.83** · effective hourly revenue $131.
*Reading:* below the 50–60% True-Margin target — next branding quote should either price higher or trim senior hours; the phase-level record shows where.

### B · Six-month spatial activation — external-heavy
Fee **$180,000**. External: fabricator fixed fee $65,000 (accrued on fabrication + installation milestones), lighting designer fixed phase fee $8,000, travel/materials $7,000 → **$80,000**.
Internal: Founder 40×127 + CD 160×130 + Designer 320×50 + ACP 260×50 = 5,080+20,800+16,000+13,000 = **$54,880** (780 h).
Direct cost **$134,880** · GP **$45,120** · GM **25.1%** · profit/hour **$57.85**.
*Reading:* external-heavy work structurally earns thinner margins but similar profit-per-hour to A — the portfolio needs both, priced knowingly. The fabricator's $65k counts in FCAC from signing day, even though invoices arrive months later.

### C · Twelve-month festival development — big fee, thin margin
Fee **$420,000**. External: curator retainer $4,000×12 = 48,000; production partner milestones 120,000; comms designer fixed 25,000; expenses 30,000 → **$223,000**.
Internal: Founder 120, CD 400, AD 300, ACP 700, Designer 250 = **1,770 h** → 15,240+52,000+30,000+35,000+12,500 = **$144,740**.
Direct cost **$367,740** · GP **$52,260** · GM **12.4%** · profit/hour **$29.53** · profit/month $4,355.
*Reading:* prestigious, portfolio-defining — and each internal hour earns half what project A's does. Not a reason to refuse festivals; a reason to price the *next* one on evidence, and to protect the team assigned to it.

### D · Small fast-turnaround — the quiet star
Brand sprint, 2 weeks, fee **$12,000**. CD 20×130 + Designer 45×50 = **$4,850** (65 h).
GP **$7,150** · GM **59.6%** · profit/hour **$110.00**.
*Reading:* the highest return-on-effort in the portfolio. Historical intelligence should surface how many of these the pipeline could carry.

### E · High-value project that becomes loss-making — the cautionary tale
Placemaking project, quoted then discounted 15% to win: fee **$250,000**.
**At approval (baseline):** est internal 900 h ($75,620), external committed $95,000, expenses $18,000 → EstDirectCost $188,620 → EstGP **$61,380 (24.6%)**. Tight but viable.
**What happened:** seven revision rounds (three included), a five-month extension, no variation raised. Actual internal **1,650 h**: Founder 100, CD 450, AD 200, Designer 500, ACP 400 = **$136,200**; expenses crept to $25,000.
ActDirectCost **$256,200** → GP **−$6,200** · GM **−2.5%** · profit/hour **−$3.76**.
**The legacy-lens trap:** Margin-1 (excluding internal labour) = (250,000 − 120,000) ÷ 250,000 = **52%** — *looks fine*. Only the full model shows the loss.
**What the console would have done:** at month 3, HoursConsumed 48% vs. schedule 30% → amber; at month 5, revisions 5 of 3 with no variation → "scope increase without variation" alert + drafted variation of ~$28,000; the discount breach of MinimumSafePrice would have been flagged at quotation. The loss was preventable at three separate moments.

### Company month tie-out (mini-example, no double counting)
Suppose July holds slices of A–D. Project labour costed into projects: $38,000. Non-project payroll (BD, admin, leave at paid-hour rates): $21,000. Unallocated: $2,300. Overheads (rent 6,500, software 1,800, insurance 400, accounting 800, marketing 1,200, misc 1,300): **$12,000**. Total payroll per agreements: $61,300 ✓ = 38,000+21,000+2,300.
Recognised revenue $96,000; project GP $34,500 → OperatingProfit = 34,500 − 21,000 − 2,300 − 12,000 = **−$800**; OverheadCoverage 0.98.
*Reading:* every project "made money," and the studio still lost $800 this month — precisely the visibility gap this platform closes.

---

## 11. Data fields required (additions to the Phase 1 entity map)

- **Employment agreement:** CPF rate & ceiling overrides, bonus provision type, benefits cost, expected medical-leave days, productive factor.
- **Person schedule:** days/week, hours/day, dated changes; location (holiday calendar).
- **Cost rate record:** basis fields (paid / available / productive hours), derivation snapshot, method version.
- **Activity:** the six behaviour flags (Phase 1) + costing bucket mapping.
- **Time entry:** resolved-rate reference, snapshot cost (on lock), adjustment link.
- **External agreement:** commercial model, attribution rule, accrual policy, committed amount, currency + capture rate, milestone/deliverable links.
- **Revenue item:** lens states (contracted/recognised/invoiced/collected), recognition trigger, weight, deposit flag.
- **Quotation:** contingency %, external mark-up %, target GM, overhead-recovery rate used, scenario set, discount fields, floors (computed, stored).
- **Project:** baseline snapshot (est hours/cost by phase & role at approval), pro-bono/discount tag.
- **Financial period:** tie-out status, snapshot references, adjustment register.
- **Company:** overhead categories (validated non-payroll), FX line, other income.

## 12. Financial controls & audit requirements

1. **Monthly tie-out** (§7): allocated payroll must equal contractual payroll; status visible to finance; period cannot lock while red.
2. **Baseline immutability:** approval snapshots estimates; only variations alter the comparison base. Baseline edits are impossible, not merely logged.
3. **Rate snapshots at lock;** post-lock corrections only via adjustment entries in open periods.
4. **Category guards:** overhead categories reject payroll-like entries; project expense categories reject overhead-like entries (soft warning + finance override with reason).
5. **Approval gates:** quotation acceptance (leadership), variations (leadership), external agreements (finance/ops), expenses above threshold (configurable), period lock (finance), period reopen (super admin + reason, audit-trailed).
6. **Audit trail** on: rates, agreements, baselines, variations, revenue recognition marks, adjustments, locks/reopens, exports of financial reports.
7. **Derived-figure provenance:** every reported number can expand to show its inputs (hours, rates, entries) — subject to the viewer's permissions (masking rules, Phase 3).

## 13. Decisions requiring approval

1. **Costing basis = cost per paid hour** for all recorded time; loaded rates confined to pricing. *(Recommended — this is the anti-double-count keystone.)*
2. **Overtime treatment:** cost true effort at standard rate + company-level "absorbed overtime" reconciliation line. *(Recommended — makes over-servicing visible.)*
3. **Recognition basis R1:** milestone/phase-completion recognition (line-item weights), retainers straight-line, T&M as delivered; effort-based % completion in R2. *(Recommended.)*
4. **Fixed external fees:** committed-in-full for forecasts; milestone-else-straight-line accrual for period reporting. *(Recommended.)*
5. **External mark-up default 20%** and **contingency default 10%** (sheet said 5%, "ideally 10%" — adopt the ideal). *(Confirm values.)*
6. **Target margins:** adopt GM 50–60% as the standard target band (True-Margin heritage), with Margin-1 retained as a display lens only. *(Confirm.)*
7. **Discretionary bonuses** excluded from cost rates; contractual AWS included. *(Confirm bonus structure.)*
8. **Productive factor default 80%** for overhead-recovery and capacity views. *(Confirm.)*
9. **CPF parameters** (17%, current OW ceiling) to be confirmed with the accountant and made configurable with effective dates. *(Needs confirmation.)*
10. **Pro bono policy:** carried at zero revenue with true costs, tagged and excluded from pricing benchmarks by default. *(Recommended.)*

---

*Cumulative product specification updated to v0.2 — Phase 2 sections populated.*
