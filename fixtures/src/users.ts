// fixtures/src/users.ts
// §10 demo accounts for the role switcher. Grants are additive (§7): Ryan
// demonstrates stacked roles, Priya scopes people_manager to her direct
// reports, Wei Ming is a team member who leads exactly one project, and Aiko
// is the external contributor persona.

import type { User, NotificationPrefs, RoleGrant } from '@oe/domain';
import { stamp } from './support';
import { PERSON_IDS } from './people';

const PREFS: NotificationPrefs = {
  emailDigest: true,
  weeklySummary: true,
  personalNudges: false, // off by default; never routed to managers (§C1)
};

const FROM = '2025-07-01';

function grant(role: RoleGrant['role'], scope: RoleGrant['scope']): RoleGrant {
  return { role, scope, effectiveFrom: FROM };
}

export const USER_IDS = {
  ryan: 'usr-ryan',
  sofia: 'usr-sofia',
  priya: 'usr-priya',
  weiming: 'usr-weiming',
  mei: 'usr-mei',
  daniel: 'usr-daniel',
  aiko: 'usr-aiko',
} as const;

export const USERS: User[] = [
  {
    // Mei: plain team member.
    ...stamp(USER_IDS.mei),
    personId: PERSON_IDS.mei,
    email: 'mei.chen@outeredit.example',
    status: 'active',
    roleGrants: [grant('team_member', { type: 'global' })],
    notificationPrefs: PREFS,
  },
  {
    // Ryan: additive roles in one account (team member, lead on several
    // projects, leadership, super admin). §10: the role switcher demo.
    ...stamp(USER_IDS.ryan),
    personId: PERSON_IDS.ryan,
    email: 'ryan.tan@outeredit.example',
    status: 'active',
    roleGrants: [
      grant('team_member', { type: 'global' }),
      grant('project_lead', { type: 'project', ids: ['prj-a', 'prj-c', 'prj-e', 'prj-f'] }),
      grant('leadership', { type: 'global' }),
      grant('super_admin', { type: 'global' }),
    ],
    notificationPrefs: PREFS,
  },
  {
    // Priya: people manager scoped to her direct reports, plus team member.
    ...stamp(USER_IDS.priya),
    personId: PERSON_IDS.priya,
    email: 'priya.nair@outeredit.example',
    status: 'active',
    roleGrants: [
      grant('team_member', { type: 'global' }),
      grant('people_manager', {
        type: 'reports',
        ids: [PERSON_IDS.mei, PERSON_IDS.daniel, PERSON_IDS.weiming],
      }),
    ],
    notificationPrefs: PREFS,
  },
  {
    // Daniel: finance administrator plus team member.
    ...stamp(USER_IDS.daniel),
    personId: PERSON_IDS.daniel,
    email: 'daniel.ong@outeredit.example',
    status: 'active',
    roleGrants: [
      grant('team_member', { type: 'global' }),
      grant('finance_admin', { type: 'global' }),
    ],
    notificationPrefs: PREFS,
  },
  {
    // Sofia: leadership plus team member.
    ...stamp(USER_IDS.sofia),
    personId: PERSON_IDS.sofia,
    email: 'sofia.lim@outeredit.example',
    status: 'active',
    roleGrants: [
      grant('team_member', { type: 'global' }),
      grant('leadership', { type: 'global' }),
    ],
    notificationPrefs: PREFS,
  },
  {
    // Wei Ming: team member who is also project lead on exactly one project.
    ...stamp(USER_IDS.weiming),
    personId: PERSON_IDS.weiming,
    email: 'weiming.chua@outeredit.example',
    status: 'active',
    roleGrants: [
      grant('team_member', { type: 'global' }),
      grant('project_lead', { type: 'project', ids: ['prj-g'] }),
    ],
    notificationPrefs: PREFS,
  },
  {
    // Aiko: external contributor (OE Verse freelancer persona), scoped to the
    // festival project she works on. Navigation is subtractive; she sees
    // nothing else.
    ...stamp(USER_IDS.aiko),
    collaboratorId: 'col-aiko',
    email: 'aiko.tanaka@studioarc.example',
    status: 'active',
    roleGrants: [grant('external_contributor', { type: 'project', ids: ['prj-c'] })],
    notificationPrefs: { emailDigest: false, weeklySummary: false, personalNudges: false },
  },
];

export const USER_ID_BY_PERSON: Record<string, string> = {
  [PERSON_IDS.ryan]: USER_IDS.ryan,
  [PERSON_IDS.sofia]: USER_IDS.sofia,
  [PERSON_IDS.priya]: USER_IDS.priya,
  [PERSON_IDS.weiming]: USER_IDS.weiming,
  [PERSON_IDS.mei]: USER_IDS.mei,
  [PERSON_IDS.daniel]: USER_IDS.daniel,
};
