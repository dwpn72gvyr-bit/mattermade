// fixtures/src/overheads.ts
// §10 overhead register, sized per §6.9 fixture F so a month lands just under
// break-even: rent 6,500 + software 1,800 + insurance 400 + accounting 800 +
// marketing 1,200 + miscellaneous 1,300 = 12,000 a month. The register may
// never contain payroll (§5.4 guard; enforced by @oe/domain schema and
// @oe/finance assertNotPayroll).

import type { CompanyOverhead } from '@oe/domain';
import { stamp } from './support';

const base = {
  currency: 'SGD' as const,
  recurrence: 'monthly' as const,
  effectiveFrom: '2025-07-01',
  paymentStatus: 'paid' as const,
};

export const COMPANY_OVERHEADS: CompanyOverhead[] = [
  { ...stamp('oh-rent', 'usr-daniel'), category: 'rental', description: 'Studio rental, Kampong Bugis', amountMinor: 650_000, ...base },
  { ...stamp('oh-software', 'usr-daniel'), category: 'software', description: 'Design, project and finance tooling', amountMinor: 180_000, ...base },
  { ...stamp('oh-insurance', 'usr-daniel'), category: 'insurance', description: 'Studio and liability insurance', amountMinor: 40_000, ...base },
  { ...stamp('oh-accounting', 'usr-daniel'), category: 'accounting', description: 'Bookkeeping and corporate secretarial', amountMinor: 80_000, ...base },
  { ...stamp('oh-marketing', 'usr-daniel'), category: 'marketing', description: 'Site, entries and studio profile', amountMinor: 120_000, ...base },
  { ...stamp('oh-misc', 'usr-daniel'), category: 'other', description: 'Utilities, sundries and equipment upkeep', amountMinor: 130_000, ...base },
];
