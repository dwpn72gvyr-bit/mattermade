// Financial settings (§8): the assumptions behind the engine, read-only in the
// prototype, dated and audited in Stage B.

import React from 'react';
import { Card, PageHeader, Stat } from '../../components/ui';

export default function Settings() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Financial settings"
        lede="The assumptions the engine runs on. Each is dated; changing one creates a new dated value and never rewrites the past."
      />
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Stat label="GST" value="9%" sub="on all quotations" />
          <Stat label="Base currency" value="SGD" sub="company views" />
          <Stat label="Financial year end" value="31 December" sub="client to confirm (§15)" />
          <Stat label="Employer CPF" value="17%" sub="OW ceiling S$7,400/mo" />
          <Stat label="CPF on AWS" value="Yes" sub="contractual 13th month" />
          <Stat label="Productive factor" value="0.80" sub="of available hours" />
          <Stat label="External mark-up" value="20%" sub="pricing default (R9)" />
          <Stat label="Contingency" value="10%" sub="pricing default" />
          <Stat label="Expense approval" value="S$500" sub="proposed threshold (§15)" />
          <Stat label="External engagement" value="S$10,000" sub="leadership above this (§15)" />
          <Stat label="Revision rounds" value="3 included" sub="+12% phase hours per extra round" />
          <Stat label="Aggregation floor" value="3 people" sub="2 for project budgets" />
        </div>
      </Card>
      <p className="text-xs text-ink-faint mt-3">
        Items marked §15 are proposals awaiting the client's confirmation and are flagged in
        docs/DECISIONS.md.
      </p>
    </div>
  );
}
