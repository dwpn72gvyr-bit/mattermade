// Console settings persisted in the browser: fresh-workspace mode (fictional
// data off), and per-person module access decided by the super admin.

export type ModuleKey = 'plan_quote' | 'directory' | 'verse' | 'bizdev';

const FRESH_KEY = 'oe-console-fresh';
const ACCESS_KEY = 'oe-console-module-access';

function storage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

/** Fresh mode: fictional projects, hours and finances are switched off so the
 *  console can be tested with real inputs. People, roles, activity categories
 *  and templates stay, so the studio can work from a clean page. */
export function isFreshMode(): boolean {
  return storage()?.getItem(FRESH_KEY) === '1';
}

export function setFreshMode(on: boolean): void {
  storage()?.setItem(FRESH_KEY, on ? '1' : '0');
}

interface AccessGrants {
  /** userId → modules explicitly granted beyond their role defaults. */
  grants: Record<string, ModuleKey[]>;
  /** userId → modules explicitly withdrawn. */
  denials: Record<string, ModuleKey[]>;
}

function readAccess(): AccessGrants {
  try {
    const raw = storage()?.getItem(ACCESS_KEY);
    if (raw) return JSON.parse(raw) as AccessGrants;
  } catch {
    // fall through to defaults
  }
  return { grants: {}, denials: {} };
}

function writeAccess(a: AccessGrants): void {
  storage()?.setItem(ACCESS_KEY, JSON.stringify(a));
}

/** Role defaults: leadership, finance, ops and super admin see the working
 *  modules; plain team members do not see Plan & Quote, the Directory or the
 *  OE Verse unless the super admin grants them (client direction, item 14). */
function defaultModules(roles: string[]): ModuleKey[] {
  const has = (...r: string[]) => r.some((x) => roles.includes(x));
  const out: ModuleKey[] = [];
  if (has('leadership', 'finance_admin', 'super_admin', 'ops_admin', 'project_lead')) {
    out.push('plan_quote', 'directory');
  }
  if (has('leadership', 'finance_admin', 'super_admin', 'ops_admin')) out.push('verse', 'bizdev');
  return out;
}

export function hasModule(userId: string, roles: string[], module: ModuleKey): boolean {
  const access = readAccess();
  if ((access.denials[userId] ?? []).includes(module)) return false;
  if ((access.grants[userId] ?? []).includes(module)) return true;
  return defaultModules(roles).includes(module);
}

export function setModuleAccess(userId: string, module: ModuleKey, allowed: boolean): void {
  const access = readAccess();
  const pull = (rec: Record<string, ModuleKey[]>) => {
    rec[userId] = (rec[userId] ?? []).filter((m) => m !== module);
  };
  pull(access.grants);
  pull(access.denials);
  if (allowed) access.grants[userId] = [...(access.grants[userId] ?? []), module];
  else access.denials[userId] = [...(access.denials[userId] ?? []), module];
  writeAccess(access);
}

export function moduleAccessTable(userId: string, roles: string[]): Record<ModuleKey, boolean> {
  return {
    plan_quote: hasModule(userId, roles, 'plan_quote'),
    directory: hasModule(userId, roles, 'directory'),
    verse: hasModule(userId, roles, 'verse'),
    bizdev: hasModule(userId, roles, 'bizdev'),
  };
}

/** The console works on real calendar days now (client direction, item 6). */
export function todayStr(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

export function currentMonth(): string {
  return todayStr().slice(0, 7);
}
