// OE Verse talent book (client direction, item 10): searchable, editable,
// single-page profiles with the full field set the studio tracks. Rates stay
// S4: visible to finance, ops and leadership only. Round F: categories and
// engagements are multi-value, profiles carry added/updated dates, and the
// directory can sort by name, country or city.

import { can } from '@oe/policy';
import type { Collaborator } from '@oe/domain';
import { call } from './transport';
import { db, newId, nowIso, type VerseProfile } from './db';
import { hasModule, todayStr } from './settings';
import { actorFor } from './actor';
import type { DemoAccount } from './demoAccounts';

export interface VerseEntry {
  collaborator: Collaborator;
  profile: VerseProfile;
  projects: { id: string; name: string }[];
  ratesVisible: boolean;
  agreements: { id: string; model: string; status: string; feeMinor?: number; rateMinor?: number; currency: string }[];
}

/** Split a stored "City, Country" location string. A single token counts as
 *  both, so city-state entries like "Singapore" sort sensibly either way. */
export function locationParts(location: string | undefined): { city: string; country: string } {
  const s = (location ?? '').trim();
  if (!s) return { city: '', country: '' };
  const i = s.lastIndexOf(',');
  if (i < 0) return { city: s, country: s };
  return { city: s.slice(0, i).trim(), country: s.slice(i + 1).trim() };
}

function profileFor(collaboratorId: string): VerseProfile {
  let p = db.verseProfiles.find((v) => v.collaboratorId === collaboratorId);
  if (!p) {
    p = { collaboratorId, categories: [], capabilities: [], engagements: [], engagedBefore: false };
    db.verseProfiles.push(p);
  }
  return p;
}

function requireInternal(account: DemoAccount): void {
  if (account.isExternal) throw new Error('not_allowed');
  if (!hasModule(account.userId, account.roles, 'verse')) throw new Error('not_allowed');
}

export function searchVerse(account: DemoAccount, query = '') {
  return call('verse.search', () => {
    requireInternal(account);
    const actor = actorFor(account);
    const ratesVisible =
      can(actor, 'view', { type: 'externalAgreement' }, 'rate', todayStr()).allow === true;
    const q = query.trim().toLowerCase();
    return db.collaborators
      .map((c): VerseEntry => {
        const profile = profileFor(c.id);
        const agreements = db.externalAgreements.filter((a) => a.collaboratorId === c.id);
        const projectIds = new Set(agreements.flatMap((a) => a.projectIds));
        return {
          collaborator: c,
          profile,
          projects: db.projects
            .filter((p) => projectIds.has(p.id))
            .map((p) => ({ id: p.id, name: p.name })),
          ratesVisible,
          agreements: agreements.map((a) => ({
            id: a.id, model: a.model, status: a.status, currency: a.currency,
            ...(ratesVisible ? { feeMinor: a.feeMinor, rateMinor: a.rateMinor } : {}),
          })),
        };
      })
      .filter((e) => {
        if (!q) return true;
        const hay = [
          e.collaborator.name, e.collaborator.discipline, e.collaborator.location,
          e.profile.notes,
          ...(e.profile.categories ?? []),
          ...(e.profile.engagements ?? []),
          ...(e.profile.capabilities ?? []),
          ...e.projects.map((p) => p.name),
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.collaborator.name.localeCompare(b.collaborator.name));
  });
}

export interface VerseProfileInput {
  collaboratorId?: string;
  fullName: string;
  discipline?: string;
  location?: string;
  country?: string;
  website?: string;
  instagram?: string;
  email?: string;
  contactNo?: string;
  categories: string[];
  capabilities: string[];
  engagements: string[];
  notes?: string;
  ratesNote?: string;
  engagedBefore: boolean;
  craftRating?: number;
  personalityRating?: number;
}

export function saveVerseProfile(account: DemoAccount, input: VerseProfileInput) {
  return call('verse.save', () => {
    requireInternal(account);
    const editable = ['super_admin', 'ops_admin', 'finance_admin', 'leadership'].some((r) =>
      account.roles.includes(r),
    );
    if (!editable) throw new Error('not_allowed');

    let collaborator = input.collaboratorId
      ? db.collaborators.find((c) => c.id === input.collaboratorId)
      : undefined;
    if (!collaborator) {
      collaborator = {
        id: newId('col'),
        createdAt: nowIso(), createdBy: account.userId,
        updatedAt: nowIso(), updatedBy: account.userId,
        name: input.fullName,
        discipline: input.discipline ?? input.categories[0] ?? 'Collaborator',
        location: input.location ?? 'Singapore',
        country: input.country ?? 'SG',
        defaultCurrency: 'SGD',
      } as Collaborator;
      db.collaborators.push(collaborator);
    } else {
      collaborator.name = input.fullName;
      if (input.discipline) collaborator.discipline = input.discipline;
      if (input.location) collaborator.location = input.location;
      if (input.country) collaborator.country = input.country;
      collaborator.updatedAt = nowIso();
      collaborator.updatedBy = account.userId;
    }

    const profile = profileFor(collaborator.id);
    Object.assign(profile, {
      website: input.website,
      instagram: input.instagram,
      email: input.email,
      contactNo: input.contactNo,
      categories: input.categories,
      capabilities: input.capabilities,
      engagements: input.engagements,
      notes: input.notes,
      ratesNote: input.ratesNote,
      engagedBefore: input.engagedBefore,
      craftRating: input.craftRating,
      personalityRating: input.personalityRating,
      addedAt: profile.addedAt ?? todayStr(),
      updatedAt: todayStr(),
    });
    return { collaborator, profile };
  });
}
