// Session store: the role switcher is the single most persuasive demonstration
// in the product (§10). Switching account re-renders navigation subtractively
// and re-masks every figure on screen.

import { create } from 'zustand';
import { demoAccounts, type DemoAccount } from '../api/demoAccounts';

interface SessionState {
  account: DemoAccount;
  /** Business "today" for the fixture dataset; passed as asOf, never system clock. */
  today: string;
  switchAccount: (userId: string) => void;
}

const STORAGE_KEY = 'oe-console-account';

function initialAccount(): DemoAccount {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const found = demoAccounts.find((a) => a.userId === stored);
    if (found) return found;
  } catch {
    // storage unavailable; fall through to the default account
  }
  return demoAccounts[0]!;
}

export const useSession = create<SessionState>((set) => ({
  account: initialAccount(),
  today: '2026-06-30',
  switchAccount: (userId) =>
    set(() => {
      const next = demoAccounts.find((a) => a.userId === userId);
      if (!next) return {};
      try {
        window.localStorage.setItem(STORAGE_KEY, userId);
      } catch {
        // storage unavailable; the switch still applies for this session
      }
      return { account: next };
    }),
}));

export function useRoles(): string[] {
  return useSession((s) => s.account.roles);
}

export function useHasRole(...roles: string[]): boolean {
  const held = useRoles();
  return roles.some((r) => held.includes(r));
}
