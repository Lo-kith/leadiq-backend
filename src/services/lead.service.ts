import type { LeadDocument } from '../models/Lead.js';
import { computeScore } from './scoring.service.js';
import {
  extractDomain,
  normalizeCompanyName,
  normalizeEmail,
  normalizeLinkedIn,
  normalizeUrl,
  toTrimmedString,
} from '../utils/normalize.js';
import type { LeadRecord, ScoringConfig } from '../types/lead.js';

export interface LeadInput {
  companyName: string;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  employeeCount?: number | null;
  revenue?: number | null;
  contactName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  leadSource?: string | null;
  status?: string;
  nextAction?: string | null;
  notes?: string | null;
}

export function buildScoredPayload(
  input: LeadInput,
  config: ScoringConfig,
  base: Record<string, unknown> = {},
): Record<string, unknown> {
  const website = normalizeUrl(input.website ?? null);
  const email = normalizeEmail(input.email ?? null);
  const normalized = {
    companyName: toTrimmedString(input.companyName) ?? '',
    website,
    websiteDomain: extractDomain(website) ?? extractDomain(input.companyName),
    industry: toTrimmedString(input.industry),
    location: toTrimmedString(input.location),
    employeeCount: input.employeeCount ?? null,
    revenue: input.revenue ?? null,
    contactName: toTrimmedString(input.contactName),
    jobTitle: toTrimmedString(input.jobTitle),
    email,
    linkedinUrl: normalizeLinkedIn(input.linkedinUrl ?? null),
    leadSource: toTrimmedString(input.leadSource),
    status: (input.status ?? 'New') as LeadInput['status'],
    nextAction: toTrimmedString(input.nextAction),
    notes: toTrimmedString(input.notes),
  };

  const { score, priority, completeness, breakdown } = computeScore(normalized, config);

  return {
    ...base,
    ...normalized,
    normalizedCompanyName: normalizeCompanyName(normalized.companyName),
    priority,
    score,
    completeness,
    nextAction: normalized.nextAction ?? breakdown.nextAction,
    breakdown,
  };
}

export function serializeLead(doc: LeadDocument | Record<string, unknown>): LeadRecord {
  const obj = typeof (doc as LeadDocument).toObject === 'function'
    ? (doc as LeadDocument).toObject()
    : (doc as Record<string, unknown>);
  const id = String((obj as Record<string, unknown>)._id ?? (obj as Record<string, unknown>).id);
  const created = (obj.createdAt as Date | undefined) ?? new Date();
  const updated = (obj.updatedAt as Date | undefined) ?? created;
  return {
    id,
    companyName: String(obj.companyName ?? ''),
    website: (obj.website as string) ?? null,
    websiteDomain: (obj.websiteDomain as string) ?? null,
    industry: (obj.industry as string) ?? null,
    location: (obj.location as string) ?? null,
    employeeCount: (obj.employeeCount as number) ?? null,
    revenue: (obj.revenue as number) ?? null,
    contactName: (obj.contactName as string) ?? null,
    jobTitle: (obj.jobTitle as string) ?? null,
    email: (obj.email as string) ?? null,
    linkedinUrl: (obj.linkedinUrl as string) ?? null,
    leadSource: (obj.leadSource as string) ?? null,
    status: (obj.status as LeadRecord['status']) ?? 'New',
    priority: (obj.priority as LeadRecord['priority']) ?? 'Low',
    score: (obj.score as number) ?? 0,
    completeness: (obj.completeness as number) ?? 0,
    nextAction: (obj.nextAction as string) ?? null,
    notes: (obj.notes as string) ?? null,
    enrichment: (obj.enrichment as unknown) ?? null,
    breakdown: (obj.breakdown as LeadRecord['breakdown']) ?? {
      factors: [],
      missing: [],
      reasons: [],
      nextAction: null,
    },
    createdAt: new Date(created).toISOString(),
    updatedAt: new Date(updated).toISOString(),
  };
}
