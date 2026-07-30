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

export const useSession = create<SessionState>((set) => ({
  account: demoAccounts[0]!,
  today: '2026-06-30',
  switchAccount: (userId) =>
    set(() => {
      const next = demoAccounts.find((a) => a.userId === userId);
      return next ? { account: next } : {};
    }),
}));

export function useRoles(): string[] {
  return useSession((s) => s.account.roles);
}

export function useHasRole(...roles: string[]): boolean {
  const held = useRoles();
  return roles.some((r) => held.includes(r));
}
