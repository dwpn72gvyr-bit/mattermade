// The console shell: sidebar, utility bar, role switcher. Navigation is
// subtractive (R6 note in CLAUDE.md): modules a user cannot access are absent,
// never greyed out.

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../stores/session';
import { demoAccounts } from '../api/demoAccounts';

interface NavItem { to: string; label: string }
interface NavGroup { label: string; items: NavItem[] }

function navFor(roles: string[], isExternal: boolean | undefined): NavGroup[] {
  if (isExternal) {
    return [
      {
        label: 'My work',
        items: [
          { to: '/verse-portal', label: 'Assignments' },
          { to: '/verse-portal/submissions', label: 'Submissions' },
          { to: '/verse-portal/terms', label: 'My terms' },
        ],
      },
    ];
  }
  const has = (...r: string[]) => r.some((x) => roles.includes(x));
  const groups: NavGroup[] = [];

  groups.push({
    label: 'Personal',
    items: [
      { to: '/', label: 'Home' },
      { to: '/today', label: 'Today' },
      { to: '/week', label: 'Week' },
      { to: '/history', label: 'History' },
      { to: '/insights', label: 'Insights' },
      { to: '/profile', label: 'Profile' },
      { to: '/privacy', label: 'Privacy' },
    ],
  });

  groups.push({
    label: 'Projects',
    items: [
      { to: '/projects', label: has('project_lead', 'leadership', 'finance_admin', 'ops_admin') ? 'Portfolio' : 'My projects' },
      ...(has('leadership', 'finance_admin', 'project_lead')
        ? [{ to: '/plan-quote', label: 'Plan & Quote' }]
        : []),
    ],
  });

  const peopleItems: NavItem[] = [{ to: '/people', label: 'Directory' }];
  if (has('finance_admin', 'ops_admin', 'leadership')) peopleItems.push({ to: '/verse', label: 'OE Verse' });
  groups.push({ label: 'People', items: peopleItems });

  if (has('finance_admin', 'leadership', 'super_admin')) {
    groups.push({
      label: 'Company',
      items: [
        { to: '/company', label: 'Cockpit' },
        { to: '/company/overheads', label: 'Overheads' },
        { to: '/company/time', label: 'Time allocation' },
      ],
    });
    groups.push({ label: 'Reports', items: [{ to: '/reports', label: 'Report library' }] });
  }

  if (has('super_admin', 'ops_admin', 'finance_admin')) {
    groups.push({
      label: 'Administration',
      items: [
        { to: '/admin/periods', label: 'Financial periods' },
        { to: '/admin/activities', label: 'Activity categories' },
        { to: '/admin/templates', label: 'Project templates' },
        ...(has('super_admin') ? [{ to: '/admin/audit', label: 'Audit log' }, { to: '/admin/settings', label: 'Financial settings' }] : []),
      ],
    });
  }

  return groups;
}

export default function AppShell() {
  const account = useSession((s) => s.account);
  const switchAccount = useSession((s) => s.switchAccount);
  const today = useSession((s) => s.today);
  const navigate = useNavigate();
  const groups = navFor(account.roles, account.isExternal);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-paper">
      {navOpen && (
        <button
          className="fixed inset-0 bg-ink/30 z-30 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className={`w-60 shrink-0 border-r border-line bg-raised flex-col z-40
          ${navOpen ? 'flex fixed inset-y-0 left-0' : 'hidden'} lg:flex lg:static lg:bg-raised/60`}
        aria-label="Main navigation"
      >
        <div className="px-5 py-4 border-b border-line">
          <div className="display text-lg leading-tight">OuterEdit</div>
          <div className="text-xs text-ink-faint tracking-wide uppercase mt-0.5">Studio Console</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {groups.map((g) => (
            <div key={g.label} className="mb-4">
              <div className="px-5 text-xs uppercase tracking-wider text-ink-faint mb-1">{g.label}</div>
              <ul>
                {g.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/' || item.to === '/projects' || item.to === '/company'}
                      onClick={() => setNavOpen(false)}
                      className={({ isActive }) =>
                        `block px-5 py-1.5 text-base transition-colors duration-settle ${
                          isActive
                            ? 'text-accent font-medium border-r-2 border-accent bg-accent/5'
                            : 'text-ink-muted hover:text-ink hover:bg-sunken/60'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line px-5 py-3 text-xs text-ink-faint">
          <div>Business date {today}</div>
          <NavLink to="/styleguide" className="underline hover:text-ink">Styleguide</NavLink>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-line bg-raised/80 backdrop-blur flex items-center justify-between gap-2 px-3 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="lg:hidden border border-line rounded-financial px-2.5 py-1.5 text-base"
              aria-label="Open navigation"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              ☰
            </button>
            <div className="text-sm text-ink-muted truncate hidden sm:block">
              Signed in as <span className="text-ink font-medium">{account.name}</span>
              <span className="text-ink-faint hidden md:inline"> · {account.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="role-switcher" className="text-sm text-ink-muted hidden sm:block">
              View as
            </label>
            <select
              id="role-switcher"
              className="border border-line rounded-financial bg-raised px-2 py-1 text-base"
              value={account.userId}
              onChange={(e) => {
                switchAccount(e.target.value);
                navigate('/');
              }}
            >
              {demoAccounts.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.shortName} · {a.roles.includes('super_admin') ? 'super admin' : a.roles.filter((r) => r !== 'team_member').join(', ') || 'team member'}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main className="flex-1 max-w-content w-full mx-auto px-3 sm:px-6 py-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
