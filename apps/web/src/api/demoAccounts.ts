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
    userId: 'usr-mei', personId: 'per-mei', name: 'Mei Chen', shortName: 'Mei',
    title: 'Designer', roles: ['team_member'], leadProjectIds: [], reportPersonIds: [],
  },
  {
    userId: 'usr-ryan', personId: 'per-ryan', name: 'Ryan Tan', shortName: 'Ryan',
    title: 'Founder & Executive Creative Director',
    roles: ['team_member', 'project_lead', 'leadership', 'super_admin'],
    leadProjectIds: ['prj-a', 'prj-c', 'prj-e', 'prj-f', 'prj-i', 'prj-k'], reportPersonIds: [],
  },
  {
    userId: 'usr-priya', personId: 'per-priya', name: 'Priya Nair', shortName: 'Priya',
    title: 'Account Director', roles: ['team_member', 'people_manager', 'project_lead'],
    leadProjectIds: ['prj-j', 'prj-l'], reportPersonIds: ['per-mei', 'per-daniel', 'per-weiming'],
  },
  {
    userId: 'usr-daniel', personId: 'per-daniel', name: 'Daniel Ong', shortName: 'Daniel',
    title: 'Associate Creative Producer', roles: ['team_member', 'finance_admin'],
    leadProjectIds: [], reportPersonIds: [],
  },
  {
    userId: 'usr-sofia', personId: 'per-sofia', name: 'Sofia Lim', shortName: 'Sofia',
    title: 'Creative Director', roles: ['team_member', 'leadership', 'project_lead'],
    leadProjectIds: ['prj-b', 'prj-d', 'prj-h'], reportPersonIds: [],
  },
  {
    userId: 'usr-weiming', personId: 'per-weiming', name: 'Wei Ming Chua', shortName: 'Wei Ming',
    title: 'Account Manager', roles: ['team_member', 'project_lead'],
    leadProjectIds: ['prj-g'], reportPersonIds: [],
  },
  {
    userId: 'usr-aiko', personId: 'col-aiko', name: 'Aiko Tanaka', shortName: 'Aiko',
    title: 'Motion Designer (OE Verse)', roles: ['external_contributor'],
    leadProjectIds: [], reportPersonIds: [], isExternal: true,
  },
];
