// fixtures/src/activities.ts
// §5.3 activity table, seeded exactly. This table is the money model in
// miniature: the seven flags decide which §6.3 allocation bucket every minute
// lands in, so a wrong flag literally moves money.

import type { Activity, ActivityScope } from '@oe/domain';
import { stamp } from './support';

type Flags = [
  scope: ActivityScope,
  paid: boolean,
  costBearing: boolean,
  productive: boolean,
  billable: boolean,
  countsTowardUtilisation: boolean,
  includedInProjectCosting: boolean,
];

// §5.3 rows, flag order: scope, paid, costBearing, productive, billable,
// utilisation, projectCosted.
const TABLE: [name: string, flags: Flags][] = [
  // Project delivery work: everything true.
  ['Design', ['project', true, true, true, true, true, true]],
  ['Strategy', ['project', true, true, true, true, true, true]],
  ['Concept', ['project', true, true, true, true, true, true]],
  ['Production', ['project', true, true, true, true, true, true]],
  ['Client meeting', ['project', true, true, true, true, true, true]],
  ['Revisions', ['project', true, true, true, true, true, true]],
  ['Site visit', ['project', true, true, true, true, true, true]],
  ['Project management', ['project', true, true, true, true, true, true]],
  // Growth work: paid, cost-bearing, productive, counts toward utilisation,
  // but neither billable nor project-costed.
  ['Business development', ['company', true, true, true, false, true, false]],
  ['Marketing', ['company', true, true, true, false, true, false]],
  // Internal work: paid, cost-bearing, productive, no utilisation credit.
  ['Company administration', ['company', true, true, true, false, false, false]],
  ['Internal meeting', ['company', true, true, true, false, false, false]],
  ['Training', ['company', true, true, true, false, false, false]],
  ['Internal research', ['company', true, true, true, false, false, false]],
  ['Internal initiative', ['company', true, true, true, false, false, false]],
  ['Culture and team', ['company', true, true, true, false, false, false]],
  // Paid leave: the studio pays for this time, it creates a cost line, and it
  // is not productive. It stays inside §6.3 bucket 2 so the identity closes.
  ['Annual leave', ['company', true, true, false, false, false, false]],
  ['Medical leave', ['company', true, true, false, false, false, false]],
  ['Public holiday', ['company', true, true, false, false, false, false]],
  ['Time in lieu taken', ['company', true, true, false, false, false, false]],
  // Unpaid leave: no pay, no cost anywhere (§6.3 reduces scheduled hours).
  ['Unpaid leave', ['company', false, false, false, false, false, false]],
  // Contextual time: visible to its owner alone, never costed (R7).
  ['Break or meal', ['personal', false, false, false, false, false, false]],
  ['Commuting', ['personal', false, false, false, false, false, false]],
  // Work-related travel: project-costed; billable is configurable and the
  // fixture default is not billable (§5.3 last row).
  ['Work-related travel', ['project', true, true, true, false, true, true]],
];

export function activityIdFor(name: string): string {
  return `act-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`;
}

export const ACTIVITIES: Activity[] = TABLE.map(([name, f]) => ({
  ...stamp(activityIdFor(name)),
  name,
  scope: f[0],
  active: true,
  paid: f[1],
  costBearing: f[2],
  productive: f[3],
  billable: f[4],
  countsTowardUtilisation: f[5],
  includedInProjectCosting: f[6],
}));

export const ACTIVITY_BY_NAME: Record<string, Activity> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.name, a]),
);

export const ACTIVITY_BY_ID: Record<string, Activity> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a]),
);
