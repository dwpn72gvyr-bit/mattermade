// §11 Stage A0 acceptance: tokens visible in a /styleguide route. Extended in
// A4 to render every component in its states.

import React from 'react';
import {
  PageHeader, Card, Button, StatusChip, Masked, EmptyState, Stat, BurnBar,
  EstimateVsActual, LedgerTable, Th, Td, CompletionRing, Banner,
} from '../components/ui';
import { fmtMoneyWhole, fmtPct } from '../lib/format';

const SWATCHES = [
  ['paper', '#FAF8F4'], ['raised', '#FFFFFF'], ['sunken', '#F1EDE6'],
  ['ink', '#2B2B2B'], ['ink muted', '#6E6A64'], ['ink faint', '#8A8A8A'],
  ['line', '#D9D4CC'], ['accent', '#3D5A4C'], ['positive', '#4E7A52'],
  ['caution', '#B98A2E'], ['critical', '#A5432E'], ['info', '#3E5C7A'],
] as const;

export default function Styleguide() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Studio Ledger styleguide"
        lede="Warm paper editorial. The dignity of a beautifully kept account book, rendered in contemporary type."
      />

      <Card as="section">
        <h2 className="display text-lg mb-3">Tokens</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {SWATCHES.map(([name, hex]) => (
            <div key={name}>
              <div className="h-12 rounded-financial border border-line" style={{ background: hex }} />
              <div className="text-xs text-ink-muted mt-1">{name}</div>
              <div className="text-xs tabular text-ink-faint">{hex}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-2xl display">Editorial serif at 36</p>
          <p className="text-xl display">Editorial serif at 28</p>
          <p className="text-lg display">Editorial serif at 21, the smallest serif size</p>
          <p className="text-md">UI grotesk 17</p>
          <p className="text-base">UI grotesk 15, body</p>
          <p className="text-sm text-ink-muted">UI grotesk 13, secondary</p>
          <p className="text-xs text-ink-faint">UI grotesk 12, captions</p>
          <p className="tabular text-md">Tabular figures: 1,234,567.89 · 0.5% · 38,000</p>
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
