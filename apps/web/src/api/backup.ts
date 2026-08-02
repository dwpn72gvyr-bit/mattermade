// Daily CSV backup and restore (client direction, round F). The console keeps
// its working data in the browser, so the studio's safety net is a plain CSV
// the super admin can read, correct in a spreadsheet, and load back in. One
// file, one section per sheet, headed columns; money in whole SGD, lists
// joined with "; ".

import type { Project, TimeEntry } from '@oe/domain';
import { call } from './transport';
import { db, newId, nowIso, type Lead, type LeadStage, type ProjectNote, type VerseProfile } from './db';
import { todayStr } from './settings';
import type { DemoAccount } from './demoAccounts';

const SECTION_MARK = '## ';

function esc(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(cells: unknown[]): string {
  return cells.map(esc).join(',');
}

/** Minimal CSV line parser: quotes, escaped quotes, commas inside quotes. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const joinList = (xs: string[] | undefined) => (xs ?? []).join('; ');
const splitList = (s: string) => s.split(';').map((x) => x.trim()).filter(Boolean);
const money = (minor: number | undefined) => (minor === undefined ? '' : String(minor / 100));
const minor = (s: string) => (s.trim() === '' ? undefined : Math.round(Number(s) * 100));
const yesNo = (b: boolean | undefined) => (b ? 'yes' : 'no');

// ---------------------------------------------------------------------------
// Section definitions: header order is the contract for both directions.
// ---------------------------------------------------------------------------

const HEADERS = {
  projects: [
    'id', 'code', 'name', 'client', 'service_line', 'status', 'currency',
    'contract_value', 'start_date', 'target_end_date', 'lead_user_id', 'team_person_ids',
  ],
  time_entries: [
    'id', 'person_id', 'date', 'minutes', 'activity_id', 'project_id', 'phase_id', 'notes',
  ],
  leads: [
    'id', 'name', 'organisation', 'contact_name', 'contact_email', 'source',
    'service_line', 'est_fee', 'probability_pct', 'stage', 'next_step',
    'next_step_date', 'owner_user_id', 'created_at', 'updated_at',
    'converted_project_id', 'notes_json',
  ],
  project_notes: ['id', 'project_id', 'author_user_id', 'author_name', 'created_at', 'body'],
  verse_profiles: [
    'collaborator_id', 'website', 'instagram', 'email', 'contact_no', 'category',
    'capabilities', 'engagement', 'engaged_before', 'craft_rating',
    'personality_rating', 'rates_note', 'notes',
  ],
} as const;

export type BackupSection = keyof typeof HEADERS;

function clientName(clientId: string): string {
  return db.clients.find((c) => c.id === clientId)?.name ?? clientId;
}

export function buildBackupCsv(): string {
  const lines: string[] = [
    `# OuterEdit Console backup,${todayStr()}`,
    '# Edit values freely; keep the header rows and the ## section titles.',
    '# Lists use "; " between items. Money is whole SGD.',
    '',
  ];
  const section = (name: BackupSection, rows: unknown[][]) => {
    lines.push(`${SECTION_MARK}${name}`);
    lines.push(row([...HEADERS[name]]));
    for (const r of rows) lines.push(row(r));
    lines.push('');
  };

  section('projects', db.projects.map((p) => [
    p.id, p.code, p.name, clientName(p.clientId), p.serviceLine, p.status,
    p.currency, money(p.contractValueMinor), p.startDate, p.targetEndDate,
    p.leadId, joinList(p.teamIds),
  ]));
  section('time_entries', db.timeEntries.map((e) => [
    e.id, e.personId, e.date, e.minutes, e.activityId, e.projectId ?? '', e.phaseId ?? '', e.notes ?? '',
  ]));
  section('leads', db.leads.map((l) => [
    l.id, l.name, l.organisation, l.contactName ?? '', l.contactEmail ?? '',
    l.source ?? '', l.serviceLine ?? '', money(l.estFeeMinor),
    l.probability !== undefined ? Math.round(l.probability * 100) : '',
    l.stage, l.nextStep ?? '', l.nextStepDate ?? '', l.ownerUserId,
    l.createdAt, l.updatedAt, l.convertedProjectId ?? '', JSON.stringify(l.notes),
  ]));
  section('project_notes', db.projectNotes.map((n) => [
    n.id, n.projectId, n.authorUserId, n.authorName, n.createdAt, n.body,
  ]));
  section('verse_profiles', db.verseProfiles.map((v) => [
    v.collaboratorId, v.website ?? '', v.instagram ?? '', v.email ?? '',
    v.contactNo ?? '', v.category ?? '', joinList(v.capabilities),
    v.engagement ?? '', yesNo(v.engagedBefore), v.craftRating ?? '',
    v.personalityRating ?? '', v.ratesNote ?? '', v.notes ?? '',
  ]));

  return lines.join('\r\n');
}

export function backupFilename(): string {
  return `outeredit-console-backup-${todayStr()}.csv`;
}

/** Trigger a browser download of today's backup. */
export function downloadBackup(): void {
  const blob = new Blob([buildBackupCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const LAST_BACKUP_KEY = 'oe-console-last-backup';

export function lastBackupDate(): string | undefined {
  try { return window.localStorage.getItem(LAST_BACKUP_KEY) ?? undefined; } catch { return undefined; }
}

/** Once a day, quietly hand the super admin the day's CSV (round F). Returns
 *  true when a download was made. */
export function maybeDailyBackup(account: DemoAccount): boolean {
  if (!account.roles.includes('super_admin')) return false;
  if (lastBackupDate() === todayStr()) return false;
  downloadBackup();
  try { window.localStorage.setItem(LAST_BACKUP_KEY, todayStr()); } catch { /* session-only */ }
  return true;
}

// ---------------------------------------------------------------------------
// Restore: parse the sectioned CSV, then replace or merge each collection.
// ---------------------------------------------------------------------------

interface ParsedSection { name: string; header: string[]; rows: string[][] }

export function parseBackup(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/﻿/g, '');
    if (line.startsWith('#') && !line.startsWith(SECTION_MARK)) continue;
    if (line.startsWith(SECTION_MARK)) {
      current = { name: line.slice(SECTION_MARK.length).trim(), header: [], rows: [] };
      sections.push(current);
      continue;
    }
    if (!current || line.trim() === '') continue;
    const cells = parseLine(line);
    if (current.header.length === 0) current.header = cells.map((c) => c.trim());
    else current.rows.push(cells);
  }
  return sections;
}

function recordOf(section: ParsedSection, cells: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  section.header.forEach((h, i) => { rec[h] = cells[i] ?? ''; });
  return rec;
}

function ensureClientId(name: string, by: string): string {
  const existing = db.clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const id = newId('cli');
  db.clients.push({
    id, createdAt: nowIso(), createdBy: by, updatedAt: nowIso(), updatedBy: by,
    name, country: 'SG', paymentTermsDays: 30,
  } as (typeof db.clients)[number]);
  return id;
}

/** Counts per section so the admin sees exactly what a restore would change. */
export function previewRestore(text: string): { section: string; rows: number; known: boolean }[] {
  return parseBackup(text).map((s) => ({
    section: s.name,
    rows: s.rows.length,
    known: s.name in HEADERS,
  }));
}

export function restoreFromCsv(account: DemoAccount, text: string) {
  return call('backup.restore', () => {
    if (!account.roles.includes('super_admin')) throw new Error('not_allowed');
    const sections = parseBackup(text);
    if (!sections.some((s) => s.name in HEADERS)) throw new Error('no_sections');
    const restored: Record<string, number> = {};

    for (const s of sections) {
      const recs = s.rows.map((r) => recordOf(s, r));
      switch (s.name as BackupSection) {
        case 'projects': {
          for (const r of recs) {
            if (!r.name?.trim()) continue;
            const existing = db.projects.find((p) => p.id === r.id);
            const fields = {
              name: r.name,
              clientId: ensureClientId(r.client || 'Unnamed client', account.userId),
              serviceLine: r.service_line as Project['serviceLine'],
              status: (r.status || 'planning') as Project['status'],
              currency: r.currency || 'SGD',
              contractValueMinor: minor(r.contract_value ?? '') ?? 0,
              startDate: r.start_date,
              targetEndDate: r.target_end_date,
              leadId: r.lead_user_id || account.userId,
              teamIds: splitList(r.team_person_ids ?? ''),
              updatedAt: nowIso(),
              updatedBy: account.userId,
            };
            if (existing) Object.assign(existing, fields);
            else {
              db.projects.push({
                id: r.id || newId('prj'),
                createdAt: nowIso(), createdBy: account.userId,
                code: r.code || `OE-${todayStr().slice(2, 4)}${String(db.projects.length + 1).padStart(2, '0')}`,
                projectType: r.service_line,
                country: 'SG', isProBono: false, riskFlags: [],
                ...fields,
              } as Project);
            }
          }
          restored.projects = recs.length;
          break;
        }
        case 'time_entries': {
          db.timeEntries = recs
            .filter((r) => r.person_id && r.date && Number(r.minutes) > 0)
            .map((r) => ({
              id: r.id || newId('te'),
              createdAt: nowIso(), createdBy: r.person_id,
              updatedAt: nowIso(), updatedBy: r.person_id,
              personId: r.person_id,
              date: r.date,
              minutes: Math.round(Number(r.minutes)),
              activityId: r.activity_id,
              ...(r.project_id ? { projectId: r.project_id } : {}),
              ...(r.phase_id ? { phaseId: r.phase_id } : {}),
              ...(r.notes ? { notes: r.notes } : {}),
              source: 'manual', status: 'confirmed',
            }) as TimeEntry);
          restored.time_entries = db.timeEntries.length;
          break;
        }
        case 'leads': {
          db.leads = recs
            .filter((r) => r.name?.trim())
            .map((r) => {
              let notes: Lead['notes'] = [];
              try { notes = r.notes_json ? JSON.parse(r.notes_json) : []; } catch { notes = []; }
              return {
                id: r.id || newId('lead'),
                name: r.name ?? '',
                organisation: r.organisation ?? '',
                contactName: r.contact_name || undefined,
                contactEmail: r.contact_email || undefined,
                source: r.source || undefined,
                serviceLine: r.service_line || undefined,
                estFeeMinor: minor(r.est_fee ?? ''),
                probability: r.probability_pct?.trim() ? Number(r.probability_pct) / 100 : undefined,
                stage: (r.stage || 'tofu') as LeadStage,
                nextStep: r.next_step || undefined,
                nextStepDate: r.next_step_date || undefined,
                notes,
                ownerUserId: r.owner_user_id || account.userId,
                createdAt: r.created_at || nowIso(),
                updatedAt: r.updated_at || nowIso(),
                convertedProjectId: r.converted_project_id || undefined,
              } satisfies Lead;
            });
          restored.leads = db.leads.length;
          break;
        }
        case 'project_notes': {
          db.projectNotes = recs
            .filter((r) => r.project_id && r.body?.trim())
            .map((r) => ({
              id: r.id || newId('note'),
              projectId: r.project_id ?? '',
              authorUserId: r.author_user_id || account.userId,
              authorName: r.author_name || account.name,
              body: r.body ?? '',
              createdAt: r.created_at || nowIso(),
            }) satisfies ProjectNote);
          restored.project_notes = db.projectNotes.length;
          break;
        }
        case 'verse_profiles': {
          db.verseProfiles = recs
            .filter((r) => r.collaborator_id?.trim())
            .map((r) => ({
              collaboratorId: r.collaborator_id ?? '',
              website: r.website || undefined,
              instagram: r.instagram || undefined,
              email: r.email || undefined,
              contactNo: r.contact_no || undefined,
              category: r.category || undefined,
              capabilities: splitList(r.capabilities ?? ''),
              engagement: (r.engagement || undefined) as VerseProfile['engagement'],
              engagedBefore: r.engaged_before?.trim().toLowerCase() === 'yes',
              craftRating: r.craft_rating?.trim() ? Number(r.craft_rating) : undefined,
              personalityRating: r.personality_rating?.trim() ? Number(r.personality_rating) : undefined,
              ratesNote: r.rates_note || undefined,
              notes: r.notes || undefined,
            }) satisfies VerseProfile);
          restored.verse_profiles = db.verseProfiles.length;
          break;
        }
        default:
          break;
      }
    }
    return { restored };
  });
}
