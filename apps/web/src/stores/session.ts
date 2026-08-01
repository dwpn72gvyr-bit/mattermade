// Session store. The console now opens on a sign-in page (client direction,
// item 2): a visitor adopts one of the fictional roles to explore, or the
// studio's own people sign in as themselves once real auth arrives (Stage B2).
// The business date is the real current day (item 6).

import { create } from 'zustand';
import { demoAccounts, type DemoAccount } from '../api/demoAccounts';
import { todayStr } from '../api/settings';

interface SessionState {
  account: DemoAccount | null;
  today: string;
  signIn: (userId: string) => void;
  signOut: () => void;
  /** Kept for the stress suite and quick demos; identical to signIn. */
  switchAccount: (userId: string) => void;
}

const STORAGE_KEY = 'oe-console-account';

function initialAccount(): DemoAccount | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return demoAccounts.find((a) => a.userId === stored) ?? null;
  } catch {
    return null;
  }
}

export const useSession = create<SessionState>((set) => {
  const apply = (userId: string) => {
    const next = demoAccounts.find((a) => a.userId === userId);
    if (!next) return {};
    try {
      window.localStorage.setItem(STORAGE_KEY, userId);
    } catch { /* storage unavailable; session-only */ }
    return { account: next };
  };
  return {
    account: initialAccount(),
    today: todayStr(),
    signIn: (userId) => set(() => apply(userId)),
    switchAccount: (userId) => set(() => apply(userId)),
    signOut: () =>
      set(() => {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch { /* ignore */ }
        return { account: null };
      }),
  };
});

/** The signed-in account. Screens under AppShell may assume it exists because
 *  the shell redirects to /login otherwise. */
export function useAccount(): DemoAccount {
  const account = useSession((s) => s.account);
  if (!account) throw new Error('No signed-in account outside the shell');
  return account;
}

export function useRoles(): string[] {
  return useSession((s) => s.account?.roles ?? []);
}

export function useHasRole(...roles: string[]): boolean {
  const held = useRoles();
  return roles.some((r) => held.includes(r));
}
