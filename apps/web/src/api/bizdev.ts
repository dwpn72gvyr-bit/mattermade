// Business Development chamber (client direction, item 15): leads and
// opportunities tracked TOFU → MOFU → BOFU → conversion. A converted lead
// becomes a live project the super admin or operations director staffs.

import { call } from './transport';
import { db, newId, type Lead, type LeadStage } from './db';
import { todayStr } from './settings';
import type { DemoAccount } from './demoAccounts';
import { saveProject } from './projectOps';

export const STAGES: { key: LeadStage; label: string; blurb: string }[] = [
  { key: 'tofu', label: 'Top of funnel', blurb: 'Identified: a name, a signal, a reason to care' },
  { key: 'mofu', label: 'Middle of funnel', blurb: 'In conversation: needs understood, fit forming' },
  { key: 'bofu', label: 'Bottom of funnel', blurb: 'Proposal out: estimating, negotiating, deciding' },
  { key: 'converted', label: 'Converted', blurb: 'Won and live as a project' },
  { key: 'parked', label: 'Parked', blurb: 'Not now; kept warm for later' },
];

function canBizdev(account: DemoAccount): boolean {
  return ['super_admin', 'ops_admin', 'leadership', 'finance_admin'].some((r) =>
    account.roles.includes(r),
  ) || account.roles.includes('project_lead');
}

export function getLeads(account: DemoAccount) {
  return call('bizdev.leads', () => {
    if (!canBizdev(account)) throw new Error('not_allowed');
    return [...db.leads].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  });
}

export interface LeadInput {
  id?: string;
  name: string;
  organisation: string;
  contactName?: string;
  contactEmail?: string;
  source?: string;
  serviceLine?: string;
  estFeeMinor?: number;
  probability?: number;
  stage?: LeadStage;
  nextStep?: string;
  nextStepDate?: string;
}

export function saveLead(account: DemoAccount, input: LeadInput) {
  return call('bizdev.saveLead', () => {
    if (!canBizdev(account)) throw new Error('not_allowed');
    const now = new Date().toISOString();
    if (input.id) {
      const lead = db.leads.find((l) => l.id === input.id);
      if (!lead) throw new Error('not_found');
      Object.assign(lead, { ...input, updatedAt: now });
      return lead;
    }
    const lead: Lead = {
      id: newId('lead'),
      name: input.name,
      organisation: input.organisation,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      source: input.source,
      serviceLine: input.serviceLine,
      estFeeMinor: input.estFeeMinor,
      probability: input.probability ?? 0.3,
      stage: input.stage ?? 'tofu',
      nextStep: input.nextStep,
      nextStepDate: input.nextStepDate,
      notes: [],
      ownerUserId: account.userId,
      createdAt: now,
      updatedAt: now,
    };
    db.leads.push(lead);
    return lead;
  });
}

export function moveLead(account: DemoAccount, leadId: string, stage: LeadStage) {
  return call('bizdev.moveLead', () => {
    if (!canBizdev(account)) throw new Error('not_allowed');
    const lead = db.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error('not_found');
    lead.stage = stage;
    lead.updatedAt = new Date().toISOString();
    return lead;
  });
}

export function addLeadNote(account: DemoAccount, leadId: string, body: string) {
  return call('bizdev.addNote', () => {
    if (!canBizdev(account)) throw new Error('not_allowed');
    const lead = db.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error('not_found');
    lead.notes.push({ at: new Date().toISOString(), by: account.name, body: body.trim() });
    lead.updatedAt = new Date().toISOString();
    return lead;
  });
}

/** Conversion (item 15): the lead's profile and figures become a live project;
 *  staffing stays with the super admin or operations director. */
export async function convertLead(account: DemoAccount, leadId: string) {
  const allowed = ['super_admin', 'ops_admin'].some((r) => account.roles.includes(r));
  if (!allowed) throw new Error('conversion_needs_admin');
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error('not_found');
  if (lead.convertedProjectId) throw new Error('already_converted');

  const start = todayStr();
  const end = `${Number(start.slice(0, 4))}-12-31`;
  const project = await saveProject(account, {
    name: lead.name,
    clientName: lead.organisation,
    serviceLine: lead.serviceLine ?? 'creative_direction',
    contractValueMinor: lead.estFeeMinor ?? 0,
    startDate: start,
    targetEndDate: end > start ? end : start,
    teamPersonIds: [],
    status: 'planning',
  });
  lead.stage = 'converted';
  lead.convertedProjectId = project.id;
  lead.updatedAt = new Date().toISOString();
  return { lead, project };
}

/** Weighted pipeline for the cockpit and BD summary. */
export function pipelineSummary(account: DemoAccount) {
  return call('bizdev.summary', () => {
    if (!canBizdev(account)) throw new Error('not_allowed');
    const open = db.leads.filter((l) => ['tofu', 'mofu', 'bofu'].includes(l.stage));
    return {
      countByStage: {
        tofu: db.leads.filter((l) => l.stage === 'tofu').length,
        mofu: db.leads.filter((l) => l.stage === 'mofu').length,
        bofu: db.leads.filter((l) => l.stage === 'bofu').length,
        converted: db.leads.filter((l) => l.stage === 'converted').length,
        parked: db.leads.filter((l) => l.stage === 'parked').length,
      },
      weightedPipelineMinor: open.reduce(
        (s, l) => s + Math.round((l.estFeeMinor ?? 0) * (l.probability ?? 0)), 0),
    };
  });
}
