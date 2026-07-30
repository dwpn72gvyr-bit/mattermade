// fixtures — one seed dataset (§10), consumed by the mock API, the test suite
// and the future database seeder, so a demo, a test and a fresh database
// always agree.

export * from './support';
export * from './people';
export * from './users';
export * from './activities';
export * from './collaborators';
export * from './projects';
export * from './quotes';
export * from './clauses';
export * from './timeEntries';
export * from './overheads';
export * from './periods';

import { PEOPLE, WORK_SCHEDULES, EMPLOYMENT_AGREEMENTS, COST_RATES, SELL_RATES } from './people';
import { USERS } from './users';
import { ACTIVITIES } from './activities';
import { COLLABORATORS, EXTERNAL_AGREEMENTS } from './collaborators';
import {
  CLIENTS, PROJECTS, PHASES, PROJECT_TEMPLATES, DELIVERABLES, MILESTONES,
  VARIATIONS, DIRECT_EXPENSES, REVENUE_ITEMS, INVOICES, ALERTS, RETROSPECTIVES,
  BENCHMARKS, CAPACITY_ALLOCATIONS,
} from './projects';
import { QUOTATIONS } from './quotes';
import { CLAUSES } from './clauses';
import { TIME_ENTRIES } from './timeEntries';
import { COMPANY_OVERHEADS } from './overheads';
import { FINANCIAL_PERIODS } from './periods';

/** The whole dataset as one object, for the mock API and the seeder. */
export const fixtureDb = {
  people: PEOPLE,
  workSchedules: WORK_SCHEDULES,
  employmentAgreements: EMPLOYMENT_AGREEMENTS,
  costRates: COST_RATES,
  sellRates: SELL_RATES,
  users: USERS,
  activities: ACTIVITIES,
  collaborators: COLLABORATORS,
  externalAgreements: EXTERNAL_AGREEMENTS,
  clients: CLIENTS,
  projects: PROJECTS,
  phases: PHASES,
  projectTemplates: PROJECT_TEMPLATES,
  deliverables: DELIVERABLES,
  milestones: MILESTONES,
  variations: VARIATIONS,
  directExpenses: DIRECT_EXPENSES,
  revenueItems: REVENUE_ITEMS,
  invoices: INVOICES,
  alerts: ALERTS,
  retrospectives: RETROSPECTIVES,
  benchmarks: BENCHMARKS,
  capacityAllocations: CAPACITY_ALLOCATIONS,
  quotations: QUOTATIONS,
  clauses: CLAUSES,
  timeEntries: TIME_ENTRIES,
  companyOverheads: COMPANY_OVERHEADS,
  financialPeriods: FINANCIAL_PERIODS,
} as const;

export type FixtureDb = typeof fixtureDb;
