// Demo accounts per §10. Roles are additive and scoped (§7.2); Ryan holding
// team_member + project_lead + leadership + super_admin demonstrates that a
// person's own daily experience is identical regardless of seniority.

export interface DemoAccount {
  userId: string;
  personId: string;
  name: string;
  shortName: string;
  title: string;
  roles: string[];               // SystemRole keys
  leadProjectIds: string[];
  reportPersonIds: string[];     // people_manager scope
  isExternal?: boolean;
}

export const demoAccounts: DemoAccount[] = [
  {
    userId: 'user-mei', personId: 'person-mei', name: 'Mei Chen', shortName: 'Mei',
    title: 'Designer', roles: ['team_member'], leadProjectIds: [], reportPersonIds: [],
  },
  {
    userId: 'user-ryan', personId: 'person-ryan', name: 'Ryan Tan', shortName: 'Ryan',
    title: 'Founder & Executive Creative Director',
    roles: ['team_member', 'project_lead', 'leadership', 'super_admin'],
    leadProjectIds: ['prj-c', 'prj-e', 'prj-kite'], reportPersonIds: [],
  },
  {
    userId: 'user-priya', personId: 'person-priya', name: 'Priya Nair', shortName: 'Priya',
    title: 'Account Director', roles: ['team_member', 'people_manager'],
    leadProjectIds: [], reportPersonIds: ['person-mei', 'person-daniel', 'person-weiming'],
  },
  {
    userId: 'user-daniel', personId: 'person-daniel', name: 'Daniel Ong', shortName: 'Daniel',
    title: 'Associate Creative Producer', roles: ['team_member', 'finance_admin'],
    leadProjectIds: [], reportPersonIds: [],
  },
  {
    userId: 'user-sofia', personId: 'person-sofia', name: 'Sofia Lim', shortName: 'Sofia',
    title: 'Creative Director', roles: ['team_member', 'leadership'],
    leadProjectIds: [], reportPersonIds: [],
  },
  {
    userId: 'user-weiming', personId: 'person-weiming', name: 'Wei Ming Chua', shortName: 'Wei Ming',
    title: 'Account Manager', roles: ['team_member', 'project_lead'],
    leadProjectIds: ['prj-b'], reportPersonIds: [],
  },
  {
    userId: 'user-aiko', personId: 'collab-aiko', name: 'Aiko Tanaka', shortName: 'Aiko',
    title: 'Motion Designer (OE Verse)', roles: ['external_contributor'],
    leadProjectIds: [], reportPersonIds: [], isExternal: true,
  },
];
