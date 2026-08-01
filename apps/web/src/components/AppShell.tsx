// The console shell. Navigation is organised around OuterEdit's chambers of
// the business (client direction, item 16): Business Development, Project &
// Service Delivery, Financial Discipline, plus the personal area and studio
// administration. Groups collapse (item 1), modules a user cannot access are
// absent (R6), and the super admin decides who holds the working modules
// (item 14, via settings.moduleAccess).

import React, { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../stores/session';
import { hasModule } from '../api/settings';
import { useQuery } from '@tanstack/react-query';
import { getDay } from '../api/queries';

interface NavItem { to: string; label: string }
interface NavGroup { key: string; label: string; items: NavItem[] }

function navFor(userId: string, roles: string[], isExternal: boolean | undefined): NavGroup[] {
  if (isExternal) {
    return [
      {
        key: 'work', label: 'My work',
        items: [
          { to: '/verse-portal', label: 'Assignments' },
          { to: '/verse-portal/terms', label: 'My terms' },
        ],
      },
    ];
  }
  const has = (...r: string[]) => r.some((x) => roles.includes(x));
  const mod = (m: Parameters<typeof hasModule>[2]) => hasModule(userId, roles, m);
  const groups: NavGroup[] = [];

  groups.push({
    key: 'personal', label: 'Personal',
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

  if (mod('bizdev')) {
    groups.push({
      key: 'bizdev', label: 'Business development',
      items: [
        { to: '/bizdev', label: 'Leads & pipeline' },
        ...(mod('plan_quote') ? [{ to: '/plan-quote', label: 'Plan & Quote' }] : []),
      ],
    });
  } else if (mod('plan_quote')) {
    groups.push({
      key: 'bizdev', label: 'Business development',
      items: [{ to: '/plan-quote', label: 'Plan & Quote' }],
    });
  }

  const delivery: NavItem[] = [
    { to: '/projects', label: has('project_lead', 'leadership', 'finance_admin', 'ops_admin', 'super_admin') ? 'Portfolio' : 'My projects' },
  ];
  if (mod('directory')) delivery.push({ to: '/people', label: 'Directory' });
  if (mod('verse')) delivery.push({ to: '/verse', label: 'OE Verse' });
  groups.push({ key: 'delivery', label: 'Project & service delivery', items: delivery });

  if (has('finance_admin', 'leadership', 'super_admin')) {
    groups.push({
      key: 'finance', label: 'Financial discipline',
      items: [
        { to: '/company', label: 'Cockpit' },
        { to: '/company/overheads', label: 'P&L and overheads' },
        { to: '/company/time', label: 'Time allocation' },
        { to: '/reports', label: 'Report library' },
        ...(has('finance_admin', 'super_admin') ? [{ to: '/admin/periods', label: 'Financial periods' }] : []),
      ],
    });
  }

  if (has('super_admin', 'ops_admin', 'finance_admin', 'people_manager')) {
    groups.push({
      key: 'admin', label: 'Administration',
      items: [
        ...(has('super_admin', 'ops_admin', 'people_manager') ? [{ to: '/admin/completeness', label: 'Day mapping' }] : []),
        ...(has('super_admin', 'ops_admin') ? [{ to: '/admin/templates', label: 'Project templates' }] : []),
        { to: '/admin/activities', label: 'Activity categories' },
        ...(has('super_admin')
          ? [
              { to: '/admin/access', label: 'Module access' },
              { to: '/admin/audit', label: 'Audit log' },
              { to: '/admin/settings', label: 'Financial settings' },
            ]
          : []),
      ],
    });
  }

  return groups;
}

const COLLAPSE_KEY = 'oe-console-nav-collapsed';

function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(COLLAPSE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export default function AppShell() {
  const account = useSession((s) => s.account);
  const signOut = useSession((s) => s.signOut);
  const today = useSession((s) => s.today);
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsed);
  const [reminderDismissed, setReminderDismissed] = useState(
    () => {
      try {
        return window.sessionStorage.getItem('oe-reminder-dismissed') === today;
      } catch { return false; }
    },
  );

  // The gentle daily reminder (item 12): map your scheduled day.
  const day = useQuery({
    queryKey: ['day', account?.userId, today],
    queryFn: () => getDay(account!, today),
    enabled: Boolean(account && !account.isExternal),
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
    } catch { /* session-only */ }
  }, [collapsed]);

  if (!account) return <Navigate to="/login" replace />;

  const groups = navFor(account.userId, account.roles, account.isExternal);
  const unmapped = day.data
    ? Math.max(0, day.data.scheduledMinutes - day.data.mappedPaidMinutes)
    : 0;
  const showReminder = !reminderDismissed && day.data && day.data.scheduledMinutes > 0 && unmapped > 0;

  const dismissReminder = () => {
    setReminderDismissed(true);
    try { window.sessionStorage.setItem('oe-reminder-dismissed', today); } catch { /* ignore */ }
  };

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
          {groups.map((g) => {
            const isCollapsed = collapsed[g.key] ?? false;
            return (
              <div key={g.key} className="mb-2">
                <button
                  className="w-full flex items-center justify-between px-5 py-1.5 text-xs uppercase tracking-wider text-ink-faint hover:text-ink"
                  aria-expanded={!isCollapsed}
                  onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !isCollapsed }))}
                >
                  <span>{g.label}</span>
                  <span aria-hidden="true" className="text-[10px]">{isCollapsed ? '▸' : '▾'}</span>
                </button>
                {!isCollapsed && (
                  <ul>
                    {g.items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === '/' || item.to === '/projects' || item.to === '/company' || item.to === '/bizdev'}
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
                )}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-line px-5 py-3 text-xs text-ink-faint space-y-1">
          <div className="tabular">{today}</div>
          <NavLink to="/styleguide" className="underline hover:text-ink block">Styleguide</NavLink>
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
              <span className="text-ink font-medium">{account.name}</span>
              <span className="text-ink-faint hidden md:inline"> · {account.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="text-sm text-ink-muted hover:text-ink underline"
              onClick={() => {
                signOut();
                navigate('/login');
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        {showReminder && (
          <div className="bg-accent/5 border-b border-accent/20 px-4 lg:px-6 py-2 flex items-center justify-between gap-3 text-sm">
            <span>
              Today still has {(unmapped / 60).toFixed(1).replace(/\.0$/, '')} of your{' '}
              {(day.data!.scheduledMinutes / 60)} hours unmapped. Two taps and it's done.{' '}
              <NavLink to="/today" className="text-accent underline">Open Today</NavLink>
            </span>
            <button className="text-ink-faint hover:text-ink" aria-label="Dismiss reminder" onClick={dismissReminder}>
              ×
            </button>
          </div>
        )}
        <main className="flex-1 max-w-content w-full mx-auto px-3 sm:px-6 py-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
