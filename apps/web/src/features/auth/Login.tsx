// Sign in (client direction, item 2). Fictional roles for testers to adopt;
// real authentication (argon2id sessions) arrives with Stage B2. The fresh
// workspace toggle (item 3) lives here so testers choose their dataset before
// they step inside.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { demoAccounts } from '../../api/demoAccounts';
import { isFreshMode, setFreshMode } from '../../api/settings';
import { useSession } from '../../stores/session';
import { Button } from '../../components/ui';

const ROLE_BLURBS: Record<string, string> = {
  'usr-mei': 'The team member experience: log your day, see your own patterns.',
  'usr-ryan': 'Super admin and founder: everything, and the duty of care that comes with it.',
  'usr-priya': 'People manager and lead: your reports’ workload, your projects’ health.',
  'usr-daniel': 'Finance administrator: rates, periods, invoices, the P&L.',
  'usr-sofia': 'Leadership: portfolio, cockpit, approvals.',
  'usr-weiming': 'Project lead on one project: scoped access in action.',
  'usr-aiko': 'OE Verse freelancer: the hard-walled collaborator portal.',
};

export default function Login() {
  const signIn = useSession((s) => s.signIn);
  const navigate = useNavigate();
  const [fresh, setFresh] = React.useState(isFreshMode());

  const enter = (userId: string) => {
    signIn(userId);
    navigate('/', { replace: true });
  };

  const toggleFresh = (on: boolean) => {
    setFresh(on);
    setFreshMode(on);
    // The working dataset is built at load; a reload swaps it cleanly.
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl">
          <header className="text-center mb-8 settle-in">
            <div className="font-ui font-extrabold text-2xl tracking-tight">OUTEREDIT</div>
            <div className="brand-label text-xs text-ink-faint mt-1">
              Studio Console · Est. 2011, Singapore
            </div>
            <p className="text-ink-muted mt-4 max-w-md mx-auto">
              Welcome. This console exists so we price fairly, protect your time, and build a
              studio that lasts. Sign in to begin.
            </p>
          </header>

          <div className="grid sm:grid-cols-2 gap-3">
            {demoAccounts.map((a) => (
              <button
                key={a.userId}
                onClick={() => enter(a.userId)}
                className="text-left border border-line bg-raised rounded-personal p-4 hover:border-accent hover:shadow-sm transition-all duration-settle group"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-medium"
                  >
                    {a.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <span>
                    <span className="block font-medium text-base group-hover:text-accent">
                      {a.name}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {a.roles.includes('super_admin')
                        ? 'super admin'
                        : a.roles.filter((r) => r !== 'team_member').join(', ').replace(/_/g, ' ') ||
                          'team member'}
                    </span>
                  </span>
                </div>
                <p className="text-sm text-ink-muted mt-2">{ROLE_BLURBS[a.userId]}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 border border-line rounded-financial bg-raised p-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-md">
              <div className="font-medium text-base">Workspace data</div>
              <p className="text-sm text-ink-muted mt-0.5">
                {fresh
                  ? 'Fresh workspace: fictional projects, hours and leads are off. Working data starts from what you put in; the studio itself (people, salaries, the real P&L) remains.'
                  : 'Demo dataset: twelve fictional projects and a year of mapped time, so every screen has something to say.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={fresh ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => fresh && toggleFresh(false)}
                aria-pressed={!fresh}
              >
                Demo data
              </Button>
              <Button
                variant={fresh ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => !fresh && toggleFresh(true)}
                aria-pressed={fresh}
              >
                Fresh workspace
              </Button>
            </div>
          </div>

          <p className="text-xs text-ink-faint text-center mt-6">
            Passwordless fictional sign-in for testing. Nobody but you ever sees your breaks,
            meals, commute, or personal insights, whichever door you enter by.
          </p>
        </div>
      </main>
    </div>
  );
}
