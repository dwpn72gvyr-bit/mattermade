// packages/policy/src/sensitivity.ts
// §7.1 sensitivity classes. S1 remuneration, S2 company finance, S3 personal
// time, S4 external commercial. The table below maps resource.field keys to a
// class; '<resource>.*' entries classify every field of that resource.

import type { SystemRole } from './roles';

export type SensitivityClass = 'S1' | 'S2' | 'S3' | 'S4';

/** §7.1 resource/field → sensitivity class. Keys are '<resourceType>.<field>'
 *  with '<resourceType>.*' as a whole-resource wildcard. */
export const SENSITIVITY_TABLE: Readonly<Record<string, SensitivityClass>> = {
  // S1 · Remuneration: salaries, agreements, individual cost rates, CPF, benefits.
  'person.employmentAgreement': 'S1',
  'person.costRate': 'S1',
  'person.salary': 'S1',
  'person.cpf': 'S1',
  'person.benefits': 'S1',
  'person.remuneration': 'S1',
  'employmentAgreement.*': 'S1',
  'costRate.*': 'S1',
  'salary.*': 'S1',

  // S2 · Company finance: P&L, overheads, operating profit, pricing strategy.
  'company.pnl': 'S2',
  'company.overheads': 'S2',
  'company.operatingProfit': 'S2',
  'company.pricingStrategy': 'S2',
  'companyFinance.*': 'S2',

  // S3 · Personal time: entries, notes, contextual categories, leave detail,
  // personal insights. Contextual categories and personal insights are the
  // individual's alone, no exceptions (R7).
  'timeEntry.*': 'S3',
  'timeEntry.contextual': 'S3',
  'personalInsight.*': 'S3',

  // S4 · External commercial: OE Verse rates, agreements.
  'externalAgreement.rate': 'S4',
  'externalAgreement.fee': 'S4',
  'externalAgreement.rateMinor': 'S4',
  'externalAgreement.feeMinor': 'S4',
  'externalAgreement.sgdRateAtCommitment': 'S4',
};

/** Resolve the sensitivity class of a resource field. Exact '<type>.<field>'
 *  wins over the '<type>.*' wildcard; undefined means unclassified (§7.1). */
export function sensitivityOf(resourceType: string, field?: string): SensitivityClass | undefined {
  if (field !== undefined) {
    const exact = SENSITIVITY_TABLE[`${resourceType}.${field}`];
    if (exact !== undefined) return exact;
  }
  return SENSITIVITY_TABLE[`${resourceType}.*`];
}

/** §7.1 "Full access" column. S3's full-access set is the individual owner,
 *  which no role list can express: it is empty here by design (R7). */
export const FULL_ACCESS_ROLES: Readonly<Record<SensitivityClass, readonly SystemRole[]>> = {
  S1: ['finance_admin', 'super_admin'],
  S2: ['finance_admin', 'leadership', 'super_admin'],
  S3: [],
  S4: ['finance_admin', 'ops_admin', 'leadership'],
};
