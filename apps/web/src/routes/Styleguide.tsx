// §11 Stage A0 acceptance: tokens visible in a /styleguide route. Extended in
// A4 to render every component in its states, and in round F to carry the
// OuterEdit Brand Guidelines v1.0: palette, typefaces, and the light and dark
// expressions of one system.

import React from 'react';
import {
  PageHeader, Card, Button, StatusChip, Masked, EmptyState, Stat, BurnBar,
  EstimateVsActual, LedgerTable, Th, Td, CompletionRing, Banner, NewBadge,
} from '../components/ui';
import { fmtMoneyWhole, fmtPct } from '../lib/format';
import { applyTheme, getTheme, todayStr } from '../api/settings';

/** Live tokens rendered through the CSS variables, so this page shows the
 *  active theme truthfully in both light and dark mode. */
const TOKENS = [
  ['paper', 'bg-paper'], ['raised', 'bg-raised'], ['sunken', 'bg-sunken'],
  ['ink', 'bg-ink'], ['line', 'bg-line'], ['accent', 'bg-accent'],
  ['positive', 'bg-positive'], ['caution', 'bg-caution'],
  ['critical', 'bg-critical'], ['info', 'bg-info'],
] as const;

/** The fixed brand palette from the guidelines, shown as printed. */
const BRAND = [
  ['Paper', '#F0F0F0'], ['Ink', '#111111'], ['Craft Orange', '#FC712B'],
  ['Legacy Blue', '#3337FF'], ['Green', '#78FF9B'], ['Lilac', '#E1CDFC'],
] as const;

export default function Styleguide() {
  const theme = getTheme();
  return (
    <div className="space-y-8">
      <PageHeader
        title="OuterEdit styleguide"
        lede="One brand system with a light and a dark expression. The dignity of a beautifully kept account book, set in the studio's own voice."
      />

      <Card as="section">
        <h2 className="display text-lg mb-3">Brand</h2>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <div className="font-ui font-extrabold text-2xl tracking-tight leading-none">OUTEREDIT</div>
            <div className="brand-label text-xs text-ink-faint mt-1">Make Meaningful Matter · Est. 2011, Singapore</div>
          </div>
          <div className="flex items-center gap-1 text-xs" role="group" aria-label="Theme">
            <span className="text-ink-faint mr-1">Theme</span>
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                aria-pressed={theme === t}
                className={`px-2 py-1 rounded-sm border ${theme === t ? 'border-accent text-accent' : 'border-line text-ink-muted hover:text-ink'}`}
                onClick={() => { applyTheme(t); window.location.reload(); }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {BRAND.map(([name, hex]) => (
            <div key={name}>
              <div className="h-12 rounded-financial border border-line" style={{ background: hex }} />
              <div className="text-xs text-ink-muted mt-1">{name}</div>
              <div className="text-xs tabular text-ink-faint">{hex}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink-muted mt-3">
          Craft Orange is the working accent in both modes. In dark mode the console sits on Ink,
          Green carries positive signals and mono labels, and Lilac appears sparingly as a highlight.
          Paper and Ink swap roles between the two expressions; everything else stays put.
        </p>
      </Card>

      <Card as="section">
        <h2 className="display text-lg mb-3">Tokens in the current theme</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {TOKENS.map(([name, cls]) => (
            <div key={name}>
              <div className={`h-12 rounded-financial border border-line ${cls}`} />
              <div className="text-xs text-ink-muted mt-1">{name}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-2xl display">Source Serif 4 at 36, editorial</p>
          <p className="text-xl display">Source Serif 4 at 28</p>
          <p className="text-lg display">Source Serif 4 at 21, the smallest serif size</p>
          <p className="text-md">Manrope 17, interface</p>
          <p className="text-base">Manrope 15, body</p>
          <p className="text-sm text-ink-muted">Manrope 13, secondary</p>
          <p className="text-xs text-ink-faint">Manrope 12, captions</p>
          <p className="tabular text-md">Roboto Mono tabular figures: 1,234,567.89 · 0.5% · 38,000</p>
          <p className="brand-label text-xs text-ink-muted">Roboto Mono brand label · EST. 2011 · SINGAPORE</p>
          <p className="text-sm text-ink-muted mt-2">
            Items added recently carry a quiet flag: Meridian Rebrand <NewBadge createdAt={todayStr()} />
          </p>
        </div>
      </Card>

      <Card as="section">
        <h2 className="display text-lg mb-3">Buttons and chips</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="primary">Log a variation</Button>
          <Button variant="secondary">Update forecast</Button>
          <Button variant="quiet">Copy yesterday</Button>
          <Button variant="danger">Reopen period</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <StatusChip tone="positive">On track</StatusChip>
          <StatusChip tone="caution">Running hot</StatusChip>
          <StatusChip tone="critical">Over budget</StatusChip>
          <StatusChip tone="info">Locked</StatusChip>
          <StatusChip tone="neutral">Draft</StatusChip>
          <Masked />
        </div>
      </Card>

      <Card as="section">
        <h2 className="display text-lg mb-3">Charts (§9.3)</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-sm text-ink-muted">Budget burn with 85/100 ticks and schedule mark</div>
            <BurnBar pct={0.74} scheduleElapsedPct={0.55} label="Budget 74 percent used, timeline 55 percent elapsed" />
            <BurnBar pct={0.92} scheduleElapsedPct={0.8} label="Budget 92 percent used, timeline 80 percent elapsed" />
            <BurnBar pct={1.08} scheduleElapsedPct={0.95} label="Budget 108 percent used, timeline 95 percent elapsed" />
          </div>
          <EstimateVsActual
            label="Identity design"
            estHours={160}
            actHours={118}
            scheduleElapsedPct={0.55}
            srSummary="Identity design: 118 of 160 hours used, timeline 55 percent elapsed"
          />
          <div className="flex items-center gap-6">
            <CompletionRing pct={0.81} label="Day 81 percent mapped" />
            <CompletionRing pct={1} label="Day fully mapped" />
            <div className="text-sm text-ink-muted max-w-[200px]">
              The completion ring eases; nothing bounces for attention.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Recognised revenue" value={fmtMoneyWhole(96_000_00)} sub="June 2026" />
            <Stat label="Operating profit" value={fmtMoneyWhole(-800_00)} tone="critical" sub="coverage 0.98" />
            <Stat label="Gross margin" value={fmtPct(0.472)} tone="positive" sub="target 50 to 60%" />
            <Stat label="Tie-out" value={<StatusChip tone="positive">green</StatusChip>} />
          </div>
        </div>
      </Card>

      <Card as="section">
        <h2 className="display text-lg mb-3">Ledger table</h2>
        <LedgerTable
          caption="Example portfolio table"
          head={
            <tr>
              <Th>Project</Th>
              <Th num>Fee</Th>
              <Th num>Actual cost</Th>
              <Th num>Gross profit</Th>
              <Th num>Margin</Th>
              <Th>Risk</Th>
            </tr>
          }
          foot={
            <tr>
              <Td>Total</Td>
              <Td num>{fmtMoneyWhole(288_000_00)}</Td>
              <Td num>{fmtMoneyWhole(161_120_00)}</Td>
              <Td num>{fmtMoneyWhole(126_880_00)}</Td>
              <Td num>—</Td>
              <Td />
            </tr>
          }
        >
          <tr>
            <Td>Meridian Rebrand</Td>
            <Td num>{fmtMoneyWhole(38_000_00)}</Td>
            <Td num>{fmtMoneyWhole(20_070_00)}</Td>
            <Td num>{fmtMoneyWhole(17_930_00)}</Td>
            <Td num>{fmtPct(0.472)}</Td>
            <Td><StatusChip tone="positive">Healthy</StatusChip></Td>
          </tr>
          <tr>
            <Td>Northwind Flagship</Td>
            <Td num>{fmtMoneyWhole(250_000_00)}</Td>
            <Td num>{fmtMoneyWhole(256_200_00)}</Td>
            <Td num className="text-critical">{fmtMoneyWhole(-6_200_00)}</Td>
            <Td num className="text-critical">{fmtPct(-0.025)}</Td>
            <Td><StatusChip tone="critical">Loss-making</StatusChip></Td>
          </tr>
          <tr>
            <Td>A value outside your access</Td>
            <Td num><Masked /></Td>
            <Td num><Masked /></Td>
            <Td num><Masked /></Td>
            <Td num><Masked as="percentage" /></Td>
            <Td><StatusChip tone="neutral">Masked</StatusChip></Td>
          </tr>
        </LedgerTable>
      </Card>

      <Card as="section">
        <h2 className="display text-lg mb-3">Voice (§9.4)</h2>
        <div className="space-y-2">
          <Banner tone="info">June is closed, so this entry is preserved as it was. You can request an adjustment and finance will take it from there.</Banner>
          <Banner tone="caution">Identity design is using hours faster than planned, 74 percent used at 55 percent of the timeline. Here's where they're going.</Banner>
          <Banner tone="critical">That didn't save. The fault is ours, and your entry is kept safely right here. Try again in a moment.</Banner>
          <Banner tone="positive">That's your day mapped. Thanks for keeping the picture whole.</Banner>
        </div>
      </Card>

      <EmptyState
        title="No projects here yet."
        body="The first one you add starts the studio's memory."
        action={<Button variant="primary">Add a project</Button>}
      />
    </div>
  );
}
