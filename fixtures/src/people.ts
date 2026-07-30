// fixtures/src/people.ts
// §10 seed people: six internal people on the §6.9 rate card, varied schedules
// including one four-day week, dated employment histories, and one mid-dataset
// raise so rate history is demonstrable (Mei, 2026-01-01).
//
// Two layers, deliberately distinct:
//  - EmploymentAgreements hold reverse-engineered salaries so that
//    @oe/finance deriveRates() lands within a fraction of a percent of the
//    §6.9 card (they need not be exact to the cent).
//  - CostRate records are the demo card itself: paidHourRateMinor is EXACTLY
//    the §6.9 cost per hour, methodVersion 'fixture', so every project figure
//    reproduces the worked examples to the cent (R2).

import type {
  Person, WorkSchedule, EmploymentAgreement, CostRate, SellRate, RoleKey,
} from '@oe/domain';
import { stamp } from './support';

export const PERSON_IDS = {
  ryan: 'per-ryan',
  sofia: 'per-sofia',
  priya: 'per-priya',
  weiming: 'per-weiming',
  mei: 'per-mei',
  daniel: 'per-daniel',
} as const;

export type PersonKey = keyof typeof PERSON_IDS;

/** Exactly one internal person per §6.9 rate-card role. */
export const PERSON_ID_BY_ROLE: Partial<Record<RoleKey, string>> = {
  founder: PERSON_IDS.ryan,
  creative_director: PERSON_IDS.sofia,
  account_director: PERSON_IDS.priya,
  account_manager: PERSON_IDS.weiming,
  designer: PERSON_IDS.mei,
  associate_creative_producer: PERSON_IDS.daniel,
};

export const PEOPLE: Person[] = [
  {
    ...stamp(PERSON_IDS.ryan),
    name: 'Ryan Tan',
    title: 'Founder and Executive Creative Director',
    roleKey: 'founder',
    team: 'Leadership',
    seniority: 'principal',
    employmentStatus: 'active',
    startDate: '2018-03-01',
    location: 'SG',
    skills: ['creative direction', 'brand strategy', 'client leadership'],
  },
  {
    ...stamp(PERSON_IDS.sofia),
    name: 'Sofia Lim',
    title: 'Creative Director',
    roleKey: 'creative_director',
    team: 'Creative',
    managerId: PERSON_IDS.ryan,
    seniority: 'director',
    employmentStatus: 'active',
    startDate: '2020-01-06',
    location: 'SG',
    skills: ['art direction', 'identity systems', 'spatial design'],
  },
  {
    ...stamp(PERSON_IDS.priya),
    name: 'Priya Nair',
    title: 'Account Director',
    roleKey: 'account_director',
    team: 'Client Services',
    managerId: PERSON_IDS.ryan,
    seniority: 'director',
    employmentStatus: 'active',
    startDate: '2021-04-12',
    location: 'SG',
    skills: ['client leadership', 'programme management', 'stakeholder engagement'],
  },
  {
    ...stamp(PERSON_IDS.weiming),
    name: 'Wei Ming Chua',
    title: 'Account Manager',
    roleKey: 'account_manager',
    team: 'Client Services',
    managerId: PERSON_IDS.priya,
    seniority: 'mid',
    employmentStatus: 'active',
    startDate: '2023-02-01',
    location: 'SG',
    skills: ['account management', 'production coordination'],
  },
  {
    ...stamp(PERSON_IDS.mei),
    name: 'Mei Chen',
    title: 'Designer',
    roleKey: 'designer',
    team: 'Creative',
    managerId: PERSON_IDS.priya,
    seniority: 'mid',
    employmentStatus: 'active',
    startDate: '2022-08-15',
    location: 'SG',
    skills: ['visual identity', 'editorial design', 'motion basics'],
  },
  {
    ...stamp(PERSON_IDS.daniel),
    name: 'Daniel Ong',
    title: 'Associate Creative Producer',
    roleKey: 'associate_creative_producer',
    team: 'Production',
    managerId: PERSON_IDS.priya,
    seniority: 'associate',
    employmentStatus: 'active',
    startDate: '2023-06-05',
    location: 'SG',
    skills: ['production management', 'fabrication coordination', 'site operations'],
  },
];

// Varied schedules (§10), including Priya's four-day week. Fixture convention:
// a 4-day schedule works Monday to Thursday.
export const WORK_SCHEDULES: WorkSchedule[] = [
  { ...stamp('ws-ryan'), personId: PERSON_IDS.ryan, effectiveFrom: '2024-07-01', daysPerWeek: 5, hoursPerDay: 8, weeklyHours: 40 },
  { ...stamp('ws-sofia'), personId: PERSON_IDS.sofia, effectiveFrom: '2024-07-01', daysPerWeek: 5, hoursPerDay: 8, weeklyHours: 40 },
  { ...stamp('ws-priya'), personId: PERSON_IDS.priya, effectiveFrom: '2024-07-01', daysPerWeek: 4, hoursPerDay: 8, weeklyHours: 32 },
  { ...stamp('ws-weiming'), personId: PERSON_IDS.weiming, effectiveFrom: '2024-07-01', daysPerWeek: 5, hoursPerDay: 8, weeklyHours: 40 },
  { ...stamp('ws-mei'), personId: PERSON_IDS.mei, effectiveFrom: '2024-07-01', daysPerWeek: 5, hoursPerDay: 8, weeklyHours: 40 },
  { ...stamp('ws-daniel'), personId: PERSON_IDS.daniel, effectiveFrom: '2024-07-01', daysPerWeek: 5, hoursPerDay: 8, weeklyHours: 40 },
];

// Common agreement terms (§6.2 canonical shape): CPF 17%, ordinary-wage
// ceiling S$7,400, CPF applies to the contractual AWS month, benefits S$1,800
// a year, 18 annual leave days, 11 public holidays, 4 expected medical days,
// productive factor 0.80.
const COMMON = {
  currency: 'SGD' as const,
  employerCpfRate: 0.17,
  cpfMonthlyCeilingMinor: 740_000,
  cpfAppliesToBonus: true,
  contractualBonusMonths: 1,
  fixedAllowancesMonthlyMinor: 0,
  benefitsAnnualMinor: 180_000,
  annualLeaveDays: 18,
  publicHolidayDays: 11,
  expectedMedicalDays: 4,
  productiveFactor: 0.8,
};

// Salaries reverse-engineered so deriveRates() ≈ the §6.9 card:
//   Ryan   18,776/mo → ~127.01/paid hr      Sofia  19,249/mo → ~130.00
//   Priya  11,351/mo → ~ 99.99 (32h week)   Wei Ming 8,194/mo → ~60.01
//   Mei     6,719/mo → ~ 50.00, raised to 7,403/mo → ~55.00 from 2026-01-01
//   Daniel  6,719/mo → ~ 50.00
export const EMPLOYMENT_AGREEMENTS: EmploymentAgreement[] = [
  { ...stamp('ea-ryan-1'), personId: PERSON_IDS.ryan, effectiveFrom: '2024-07-01', employmentType: 'full_time', monthlySalaryMinor: 1_877_600, ...COMMON },
  { ...stamp('ea-sofia-1'), personId: PERSON_IDS.sofia, effectiveFrom: '2024-07-01', employmentType: 'full_time', monthlySalaryMinor: 1_924_900, ...COMMON },
  { ...stamp('ea-priya-1'), personId: PERSON_IDS.priya, effectiveFrom: '2024-07-01', employmentType: 'part_time', monthlySalaryMinor: 1_135_100, ...COMMON },
  { ...stamp('ea-weiming-1'), personId: PERSON_IDS.weiming, effectiveFrom: '2024-07-01', employmentType: 'full_time', monthlySalaryMinor: 819_400, ...COMMON },
  // Mei's history: the earlier agreement auto-ends the day before the raise
  // (§6.2 rate history; prior records are immutable).
  { ...stamp('ea-mei-1'), personId: PERSON_IDS.mei, effectiveFrom: '2024-07-01', effectiveTo: '2025-12-31', employmentType: 'full_time', monthlySalaryMinor: 671_900, ...COMMON },
  { ...stamp('ea-mei-2'), personId: PERSON_IDS.mei, effectiveFrom: '2026-01-01', employmentType: 'full_time', monthlySalaryMinor: 740_300, ...COMMON },
  { ...stamp('ea-daniel-1'), personId: PERSON_IDS.daniel, effectiveFrom: '2024-07-01', employmentType: 'full_time', monthlySalaryMinor: 671_900, ...COMMON },
];

// The demo cost card (§6.9, R2). paidHourRateMinor is the law for every
// project figure in the dataset. available/productive columns follow the §6.2
// hour bases for each schedule (40h week: 2080 paid / 1816 available / 1452.8
// productive hours; Priya's 32h week: 1664 / 1400 / 1120).
function fixtureRate(args: {
  id: string; personId: string; effectiveFrom: string; effectiveTo?: string;
  paid: number; available: number; productive: number; paidHours: number;
  availableHours: number; productiveHours: number;
}): CostRate {
  return {
    ...stamp(args.id, 'usr-daniel'),
    personId: args.personId,
    effectiveFrom: args.effectiveFrom,
    ...(args.effectiveTo ? { effectiveTo: args.effectiveTo } : {}),
    paidHourRateMinor: args.paid,
    availableHourRateMinor: args.available,
    productiveHourRateMinor: args.productive,
    derivation: {
      annualEmploymentCostMinor: args.paid * args.paidHours,
      paidHours: args.paidHours,
      availableHours: args.availableHours,
      productiveHours: args.productiveHours,
      inputs: { note: 'Fixture card per master prompt §6.9; demo dataset only.' },
    },
    methodVersion: 'fixture',
  };
}

const H40 = { paidHours: 2080, availableHours: 1816, productiveHours: 1452.8 };
const H32 = { paidHours: 1664, availableHours: 1400, productiveHours: 1120 };

export const COST_RATES: CostRate[] = [
  fixtureRate({ id: 'cr-ryan-1', personId: PERSON_IDS.ryan, effectiveFrom: '2024-07-01', paid: 12_700, available: 14_546, productive: 18_183, ...H40 }),
  fixtureRate({ id: 'cr-sofia-1', personId: PERSON_IDS.sofia, effectiveFrom: '2024-07-01', paid: 13_000, available: 14_890, productive: 18_612, ...H40 }),
  fixtureRate({ id: 'cr-priya-1', personId: PERSON_IDS.priya, effectiveFrom: '2024-07-01', paid: 10_000, available: 11_886, productive: 14_857, ...H32 }),
  fixtureRate({ id: 'cr-weiming-1', personId: PERSON_IDS.weiming, effectiveFrom: '2024-07-01', paid: 6_000, available: 6_872, productive: 8_590, ...H40 }),
  // Mei: 50.00/paid hr until the 2026-01-01 raise, 55.00 after (§10 raise).
  fixtureRate({ id: 'cr-mei-1', personId: PERSON_IDS.mei, effectiveFrom: '2024-07-01', effectiveTo: '2025-12-31', paid: 5_000, available: 5_727, productive: 7_159, ...H40 }),
  fixtureRate({ id: 'cr-mei-2', personId: PERSON_IDS.mei, effectiveFrom: '2026-01-01', paid: 5_500, available: 6_300, productive: 7_874, ...H40 }),
  fixtureRate({ id: 'cr-daniel-1', personId: PERSON_IDS.daniel, effectiveFrom: '2024-07-01', paid: 5_000, available: 5_727, productive: 7_159, ...H40 }),
];

/** §6.9 role rate card, cost per paid hour in minor units (R8 costing basis). */
export const RATE_CARD: Record<string, number> = {
  founder: 12_700,
  creative_director: 13_000,
  account_director: 10_000,
  account_manager: 6_000,
  designer: 5_000,
  associate_creative_producer: 5_000,
};

/** Available-hour card (§6.10 ladder step 3, the leave-carrying floor). */
export const AVAILABLE_RATE_CARD: Record<string, number> = {
  founder: 14_546,
  creative_director: 14_890,
  account_director: 11_886,
  account_manager: 6_872,
  designer: 5_727,
  associate_creative_producer: 5_727,
};

/** §6.9 sell per hour: 320, 235, 200, 120, 110, 110. */
export const SELL_RATES: SellRate[] = (
  [
    ['founder', 32_000],
    ['creative_director', 23_500],
    ['account_director', 20_000],
    ['account_manager', 12_000],
    ['designer', 11_000],
    ['associate_creative_producer', 11_000],
  ] as [RoleKey, number][]
).map(([roleKey, rateMinor]) => ({
  ...stamp(`sr-${roleKey.replace(/_/g, '-')}`),
  scope: { type: 'role', roleKey },
  effectiveFrom: '2024-07-01',
  rateMinor,
  currency: 'SGD',
}));
