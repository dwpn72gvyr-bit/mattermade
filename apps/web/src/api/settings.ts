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


// ---------------------------------------------------------------------------
// Theme (brand guide: one system, light and dark expressions).
// ---------------------------------------------------------------------------

export type ThemeChoice = 'light' | 'dark' | 'system';
const THEME_KEY = 'oe-console-theme';

export function getTheme(): ThemeChoice {
  const t = storage()?.getItem(THEME_KEY);
  return t === 'light' || t === 'dark' ? t : 'system';
}

export function applyTheme(choice: ThemeChoice): void {
  storage()?.setItem(THEME_KEY, choice);
  const dark =
    choice === 'dark' ||
    (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

/** NEW-item window in days (client direction, round F). Super admin editable. */
const NEW_DAYS_KEY = 'oe-console-new-days';

export function newItemWindowDays(): number {
  const raw = Number(storage()?.getItem(NEW_DAYS_KEY));
  return raw >= 1 && raw <= 60 ? raw : 7;
}

export function setNewItemWindowDays(days: number): void {
  storage()?.setItem(NEW_DAYS_KEY, String(Math.min(60, Math.max(1, Math.round(days)))));
}

/** Is a created/updated stamp within the NEW window? Accepts ISO datetimes or dates. */
export function isNew(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt.slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(created)) return false;
  const today = Date.parse(todayStr() + 'T00:00:00Z');
  return (today - created) / 86_400_000 <= newItemWindowDays();
}

// ---------------------------------------------------------------------------
// Option lists (client direction, round F): the choice lists behind service
// lines and OE Verse fields are the super admin's to extend, so the console
// grows with the studio rather than waiting on a release.
// ---------------------------------------------------------------------------

export type OptionListKey =
  | 'service_lines' | 'verse_categories' | 'verse_capabilities' | 'verse_engagements';

const OPTIONS_KEY = 'oe-console-option-lists';

export const OPTION_LIST_DEFAULTS: Record<OptionListKey, string[]> = {
  service_lines: [
    'brand_strategy', 'brand_identity', 'creative_direction', 'campaign',
    'spatial_activation', 'installation', 'exhibition', 'experience_design',
    'placemaking', 'community_engagement', 'cultural_programming', 'festival',
    'event_activation',
  ],
  verse_categories: [
    'Design', 'Creative Strategist / Copywriter / Content Planner', 'Producer',
    'Marketing', 'Activations', 'Creative Strategy', 'Admin', 'Spatial Collaborators',
    'Interiors', 'Exhibitions', 'Translation', 'Transcreation',
  ],
  verse_capabilities: [
    'Account Management', 'Marketing', 'Strategy', 'Spatial/Experience Design',
    'Interior Design', 'Graphic Design', 'Art Direction', 'Branding', 'Content',
    'Animation', 'Motion Graphics', 'Photography', 'Social Media Content',
    'Editorial', 'Copywriting', 'Videography / Film', '3D Design', 'Video Editing',
    'Creative Direction', 'Installation Design', 'Product Design', 'Illustration',
    'Event / Experiences', 'Digital / UIUX', 'Packaging', 'Publication', 'Rendering',
  ],
  verse_engagements: ['Full-time', 'Freelance', 'Short Stint', 'Internship'],
};

function readOptionLists(): Partial<Record<OptionListKey, string[]>> {
  try {
    const raw = storage()?.getItem(OPTIONS_KEY);
    if (raw) return JSON.parse(raw) as Partial<Record<OptionListKey, string[]>>;
  } catch {
    // fall through to defaults
  }
  return {};
}

export function optionList(key: OptionListKey): string[] {
  const stored = readOptionLists()[key];
  return stored && stored.length > 0 ? stored : OPTION_LIST_DEFAULTS[key];
}

export function setOptionList(key: OptionListKey, values: string[]): void {
  const lists = readOptionLists();
  const cleaned = values.map((v) => v.trim()).filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  lists[key] = cleaned;
  storage()?.setItem(OPTIONS_KEY, JSON.stringify(lists));
}

export function addOption(key: OptionListKey, value: string): void {
  const v = value.trim();
  if (!v) return;
  const current = optionList(key);
  if (current.includes(v)) return;
  setOptionList(key, [...current, v]);
}

// ---------------------------------------------------------------------------
// Internal team rate defaults (client direction, round F): the admin-set cost
// and sell rate per role for the Plan & Quote team rates table. Super admin
// editable inline in that table; persisted here in the browser like the other
// console settings. All values are integer minor units per hour.
// ---------------------------------------------------------------------------

export type TeamRateRoleKey = 'founder' | 'cd' | 'ad' | 'am' | 'designer' | 'acp';

export interface TeamRateDefault {
  costMinor: number;   // cost rate per hour, minor units
  sellMinor: number;   // sell rate per hour, minor units
}

const TEAM_RATES_KEY = 'oe-console-team-rate-defaults';

export const TEAM_RATE_DEFAULTS: Record<TeamRateRoleKey, TeamRateDefault> = {
  founder: { costMinor: 12_700, sellMinor: 32_000 },
  cd: { costMinor: 13_000, sellMinor: 23_500 },
  ad: { costMinor: 10_000, sellMinor: 20_000 },
  am: { costMinor: 6_000, sellMinor: 12_000 },
  designer: { costMinor: 5_000, sellMinor: 11_000 },
  acp: { costMinor: 5_000, sellMinor: 11_000 },
};

function readTeamRates(): Partial<Record<TeamRateRoleKey, TeamRateDefault>> {
  try {
    const raw = storage()?.getItem(TEAM_RATES_KEY);
    if (raw) return JSON.parse(raw) as Partial<Record<TeamRateRoleKey, TeamRateDefault>>;
  } catch {
    // fall through to defaults
  }
  return {};
}

export function teamRateDefault(role: TeamRateRoleKey): TeamRateDefault {
  const stored = readTeamRates()[role];
  const base = TEAM_RATE_DEFAULTS[role];
  if (!stored) return { ...base };
  return {
    costMinor: Number.isFinite(stored.costMinor) && stored.costMinor >= 0 ? stored.costMinor : base.costMinor,
    sellMinor: Number.isFinite(stored.sellMinor) && stored.sellMinor >= 0 ? stored.sellMinor : base.sellMinor,
  };
}

export function teamRateDefaults(): Record<TeamRateRoleKey, TeamRateDefault> {
  return {
    founder: teamRateDefault('founder'),
    cd: teamRateDefault('cd'),
    ad: teamRateDefault('ad'),
    am: teamRateDefault('am'),
    designer: teamRateDefault('designer'),
    acp: teamRateDefault('acp'),
  };
}

export function setTeamRateDefault(role: TeamRateRoleKey, patch: Partial<TeamRateDefault>): void {
  const all = readTeamRates();
  const current = teamRateDefault(role);
  all[role] = {
    costMinor: Math.max(0, Math.round(patch.costMinor ?? current.costMinor)),
    sellMinor: Math.max(0, Math.round(patch.sellMinor ?? current.sellMinor)),
  };
  storage()?.setItem(TEAM_RATES_KEY, JSON.stringify(all));
}
