# OuterEdit Agency Intelligence Console
## Phase 7 — Visual Language, Empathy & Playful Engagement

**Version 1.0 · 29 July 2026 · Status: For review**

---

## 1. Experience personality

**Warm · intelligent · calm · creative · precise · reassuring · playful in restrained moments · trustworthy with money.** The console should feel like a thoughtful studio manager who happens to be brilliant with numbers: someone who tells you the truth kindly, never performs urgency, and occasionally makes you smile.

How the personality shows up: **Layout** — generous margins, one clear focal answer per screen, density available on demand (drill, don't cram). **Typography** — confident editorial hierarchy; numbers set in tabular figures and given typographic respect (money is content, not decoration). **Colour** — warm neutral field; colour reserved for meaning (semantic states, data series); no decorative rainbow dashboards. **Illustration** — small, hand-drawn-feeling marks for empty states and moments of completion; never corporate clip-art, never infantilising. **Motion** — settle-and-confirm micro-transitions (150–250ms); the completion ring fills with a small satisfying ease; nothing bounces for attention. **Microcopy** — §4; first person plural for the studio ("we"), second person for the user, no exclamation inflation. **Data visualisation** — §5; quiet grids, direct labelling, annotation over legend-hunting. **Empty states** — an invitation, never an absence. **Notifications** — one calm sentence with a path, never a klaxon. **Errors** — own the failure, protect the work, offer the next step.

## 2. Three visual directions

### Direction 1 · "Studio Ledger" — warm paper editorial
Concept: the dignity of a beautiful account book kept by hand; contemporary editorial typography on warm paper tones. Mood: calm, literary, trustworthy. Type: a humanist serif for headings (e.g. an editorial serif with character), a crisp grotesk for UI and tabular numerals. Colour: warm off-white field, ink-dark text, one deep accent (studio green or oxblood), semantic amber/red used sparingly. Layout: ruled lines, columns, marginalia annotations (benchmark notes rendered like pencil marks). Illustration: fine-line marks, stamps for milestones. Dataviz: ink-weight bars, annotated directly. **Strengths:** deeply un-corporate, ages well, perfect tonal match for "operating console as studio memory." **Risks:** can drift precious/slow-feeling if ruled decoration outweighs clarity; needs discipline in dense finance tables. **Use:** the whole console.

### Direction 2 · "Night Atelier" — dark gallery precision
Concept: the studio after hours; dark UI with luminous data, gallery-lighting focus on numbers. Mood: focused, cinematic, confident. Type: single grotesk family, weight-driven hierarchy. Colour: near-black field, warm white text, one luminous accent. **Strengths:** striking, makes dataviz glow, feels "intelligent." **Risks:** dark UIs read as trading terminals (exactly the surveillance-adjacent vibe to avoid); long-form finance reading fatigues; poor print/export continuity. **Use:** at most an optional theme, later.

### Direction 3 · "Field Notes" — playful annotated workbook
Concept: a designer's annotated notebook; sticker-like chips, hand-set highlights, visible grid. Mood: light, energetic, personable. **Strengths:** most disarming for time entry; strong employee warmth. **Risks:** undermines gravity of financial views; playfulness at company-P&L level erodes trust; hard to keep from tipping childish. **Use:** its *spirit* in the personal area only.

**Recommendation: Direction 1 (Studio Ledger) as the system, adopting Field Notes' warmth in the personal modules** (completion ring, favourites chips, reflection cards) — one system, two temperatures: personal surfaces slightly warmer and rounder; financial surfaces slightly tighter and cooler. Direction 2 is declined as a system (available later as a theme if wanted). No resemblance to existing time-tracker products is intended or permitted.

## 3. Engagement without manipulation

Included: gentle completion streaks (private, lapse-forgiving: "8 mapped days in a row" — a lapse resets quietly, never shamed); week-mapping progress; calm reminders (one/day, user-timed, auto-silenced on completion); small celebration moments (day complete = ring settles + one-line warmth; project closed profitably = a quiet studio-wide note, team-framed); personal reflection prompts (always skippable); team-wide completion shown as a collective ("the studio mapped 94% of last week") without names; collective milestones ("50 projects in the library"); customisable encouragement (tone dial: warm / neutral / minimal); seasonal touches (subtle — a January quietness, a festival-season energy — decorative only, never data-affecting).

Explicitly absent, permanently: leaderboards, any per-person comparison surface, shaming states, red for normal human behaviour, productivity scores, badges/levels/points, variable-reward loops, public working-hours comparisons. (These are product boundaries per Phase 1 Principle 4 and the published privacy page.)

## 4. Microcopy library (samples; tone dial = warm)

| Moment | Copy |
|---|---|
| Missing time (self) | "Wednesday still has 1.5 hours unmapped. Two taps and it's done." |
| Completed day | "That's your day mapped. Thanks for keeping the picture whole." |
| Partial day | "You've mapped 6.5 of 8 hours. The rest can wait until you have a minute." |
| Over-capacity week (self) | "Next week is looking heavier than your schedule allows. Might be worth a word with Ryan before it lands on you." |
| Project warning (lead) | "Identity design is using hours faster than planned — 74% used at 55% of the timeline. Here's where they're going →" |
| Project forecast | "If the current pace holds, this project lands at 48% margin against a 55% target. The forecast updates as the picture changes." |
| Personal insight | "Your deepest work this month happened on days with one project, not three. Something to protect where you can." |
| Manager reminder (aggregate only) | "About a day of last week is still unmapped across the team — a gentle nudge in stand-up usually does it." |
| Time correction | "Updated. Corrections keep the record honest — never hesitate." |
| Locked period | "June is closed, so this entry is preserved as it was. You can request an adjustment and finance will take it from there." |
| Privacy explanation (entry point) | "Your time, your data. See exactly who can see what, and what it's never used for →" |
| First-run onboarding | "Welcome. This console exists so we price fairly, protect your time, and build a studio that lasts. Your part takes about two minutes a day. Here's the whole deal, plainly →" |
| Empty portfolio | "No projects here yet. The first one you add starts the studio's memory." |
| Empty insights | "Your insights will appear after your first mapped week. They're only ever visible to you." |
| Error (save failed) | "That didn't save — the fault is ours, and your entry is kept safely right here. Try again in a moment." |
| Permission denied | "This area isn't part of your access. If it should be, Ryan or the ops team can grant it." |

Rules: no exclamation marks in warnings; no "please" fatigue; never "you failed / you forgot"; money truths stated plainly; the system apologises for its own faults only.

## 5. Data-visualisation system

Estimated vs actual → paired horizontal bars with a schedule-elapsed tick (the single most repeated chart; one component). Budget burn → progress bar with contingency zone marked, threshold ticks at 85/100%. Profitability → waterfall (fee → costs → GP). Margin → bullet chart vs target band (50–60%). Overhead coverage → single gauge-free ratio with trend sparkline (no speedometers). Time allocation → stacked horizontal bars, consistent category order/colour. Capacity → weekly heat-free grid with over/under markers (no red-green heatmaps; use fill density + icons for colour-blind safety). Forecast → actual line solid, forecast dashed with band. Historical comparison → small multiples over overlays. Portfolio → sortable table first (tables are the honest chart), optional scatter (fee × margin, size = hours). Service lines → slope chart period-over-period. Rules: direct labels over legends; tabular numerals; SGD formatting `$84.5k`; every chart has a table view; WCAG AA contrast; colour never the sole encoding.

## 6. Design-system foundations

Grid 8pt spacing, 12-col desktop (1200+), 8-col tablet, 4-col mobile; content max-width 1360px; reading measures capped. Type scale 12/13/15/17/21/28/36 with tabular-numeral variants; two families (editorial serif display, UI grotesk). Colour roles: `surface / surface-raised / ink / ink-muted / accent / positive / caution / critical / info / data-1…8` — semantic states never reused as decoration; caution is amber-on-warm, critical reserved per §3. Semantic states: default, hover, focus (visible ring), active, disabled, loading, error, success, masked (the distinct "you can see this exists but not its value" treatment: `$ ·····` with a lock-note). Components: forms (inputs, cascading pickers, steppers, date-range), tables (sticky headers, row drill, column sort, footer totals), cards (health, insight, approval), charts (§5 set), drawers (detail-in-context, compare), modals (destructive confirm only), navigation (sidebar, tabs, breadcrumbs, ⌘K), notifications (toast, banner, tray), empty states (illustration + one line + one action), mobile patterns (bottom tabs, sheets, steppers). Accessibility: WCAG 2.2 AA; full keyboard paths for time entry (the power-user path is keyboard-first); focus order = reading order; reduced-motion respected; touch targets ≥44px; screen-reader summaries for every chart ("Identity design: 118 of 160 hours used, timeline 55% elapsed").

## 7. Refined wireframe direction (representative set)

The ten screens from Phase 5 (personal home, daily entry, weekly, project overview, est-vs-actual, quotation planner, cockpit, portfolio, people profile, report builder) carry Studio Ledger treatment as follows: warm paper field; page title in editorial serif; ruled section dividers; numbers right-aligned tabular; health cards as inked panels with a single accent; completion ring in the personal temperature (rounder, warmer); the price ladder set like a beautiful invoice; the cockpit as a one-page "monthly account" with marginalia annotations for flags. These are specified for Phase 8's prototype rather than re-drawn here; the interactive wireframe prototype demonstrates layout and behaviour in neutral greys by design (visual skin applied at prototype step, not before approval of this direction).

## 8. Accessibility review

Risks logged: serif display at small sizes (mitigate: serif ≥21px only); warm-palette contrast (all pairs AA-checked incl. amber-on-paper); data-density tables on mobile (mitigate: card collapse + table opt-in); colour-only risk states (never — chips carry icon + word); motion sensitivity (reduced-motion kills ring animation, keeps state change).

## 9. Decisions requiring approval

1. Direction 1 "Studio Ledger" with personal-area warmth. *(Recommended.)*
2. Two-temperature system (personal warmer, financial cooler) as an explicit rule. *(Recommended.)*
3. Tone dial (warm/neutral/minimal) per user. *(Recommended.)*
4. Engagement exclusion list as permanent product boundary. *(Recommended — restated from Phase 1 for the record.)*
5. Typeface selection (editorial serif + grotesk pairing) — shortlist at prototype stage. *(Defer to Phase 8 review.)*

---
*Cumulative spec updated to v0.7.*
