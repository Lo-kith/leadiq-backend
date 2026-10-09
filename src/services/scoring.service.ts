import type {
  LeadPriority,
  ScoreBreakdown,
  ScoringConfig,
  ScoringFactor,
} from '../types/lead.js';

export interface ScorableLead {
  companyName?: string | null;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  employeeCount?: number | null;
  revenue?: number | null;
  contactName?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  leadSource?: string | null;
  status?: string | null;
}

const COMPLETENESS_FIELDS: Array<keyof ScorableLead> = [
  'companyName',
  'website',
  'industry',
  'location',
  'employeeCount',
  'revenue',
  'contactName',
  'email',
  'linkedinUrl',
  'leadSource',
];

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

function industryMatches(industry: string, targets: string[]): boolean {
  const value = industry.trim().toLowerCase();
  return targets.some((target) => {
    const t = target.trim().toLowerCase();
    return t.length > 0 && (value === t || value.includes(t) || t.includes(value));
  });
}

export function computeCompleteness(lead: ScorableLead): number {
  const present = COMPLETENESS_FIELDS.filter((field) => hasValue(lead[field])).length;
  return Math.round((present / COMPLETENESS_FIELDS.length) * 100);
}

export function computeScore(
  lead: ScorableLead,
  config: ScoringConfig,
): { score: number; priority: LeadPriority; completeness: number; breakdown: ScoreBreakdown } {
  const factors: ScoringFactor[] = [];
  const missing: string[] = [];
  const reasons: string[] = [];
  let earned = 0;
  const w = config.weights;

  // Industry fit
  if (!hasValue(lead.industry)) {
    missing.push('Industry not provided — treated as unknown, not penalized.');
  } else if (industryMatches(String(lead.industry), config.targetIndustries)) {
    earned += w.industry;
    factors.push({
      label: `Target industry: ${lead.industry}`,
      points: w.industry,
      detail: 'Matches one of your configured target industries.',
      kind: 'positive',
    });
    reasons.push(`Industry "${lead.industry}" is a target industry (+${w.industry}).`);
  } else {
    factors.push({
      label: `Outside target industries: ${lead.industry}`,
      points: 0,
      detail: 'Industry is known but is not in the target list.',
      kind: 'neutral',
    });
    reasons.push(`Industry "${lead.industry}" is outside your target list (0 points).`);
  }

  // Company size
  if (!hasValue(lead.employeeCount)) {
    missing.push('Employee count unknown.');
  } else {
    const count = Number(lead.employeeCount);
    if (count >= config.minEmployees && count <= config.maxEmployees) {
      earned += w.companySize;
      factors.push({
        label: `Company size ${count} employees`,
        points: w.companySize,
        detail: `Within target range ${config.minEmployees}-${config.maxEmployees}.`,
        kind: 'positive',
      });
      reasons.push(`Employee count ${count} is within target range (+${w.companySize}).`);
    } else if (count < config.minEmployees) {
      const ratio = Math.max(0, count / config.minEmployees);
      const points = Math.round(w.companySize * Math.min(ratio, 1) * 0.5);
      earned += points;
      factors.push({
        label: `Company size ${count} employees`,
        points,
        detail: `Below target minimum of ${config.minEmployees}.`,
        kind: points > 0 ? 'neutral' : 'negative',
      });
      reasons.push(`Employee count ${count} is below target range (+${points}).`);
    } else {
      const points = Math.round(w.companySize * 0.5);
      earned += points;
      factors.push({
        label: `Company size ${count} employees`,
        points,
        detail: `Above target maximum of ${config.maxEmployees}.`,
        kind: 'neutral',
      });
      reasons.push(`Employee count ${count} is above target range (+${points}).`);
    }
  }

  // Revenue
  if (!hasValue(lead.revenue)) {
    missing.push('Revenue unknown.');
  } else {
    const revenue = Number(lead.revenue);
    if (revenue >= config.minRevenue) {
      earned += w.revenue;
      factors.push({
        label: 'Revenue meets threshold',
        points: w.revenue,
        detail: `At or above configured minimum of ${config.minRevenue.toLocaleString()}.`,
        kind: 'positive',
      });
      reasons.push(`Revenue meets the minimum threshold (+${w.revenue}).`);
    } else {
      const ratio = Math.max(0, revenue / config.minRevenue);
      const points = Math.round(w.revenue * Math.min(ratio, 1) * 0.5);
      earned += points;
      factors.push({
        label: 'Revenue below threshold',
        points,
        detail: `Below configured minimum of ${config.minRevenue.toLocaleString()}.`,
        kind: 'neutral',
      });
      reasons.push(`Revenue is below the minimum threshold (+${points}).`);
    }
  }

  // Website
  if (hasValue(lead.website)) {
    earned += w.website;
    factors.push({
      label: 'Website available',
      points: w.website,
      detail: 'A company website was provided.',
      kind: 'positive',
    });
  } else {
    missing.push('Website missing.');
  }

  // Contact information
  if (hasValue(lead.email) || hasValue(lead.contactName)) {
    const points = hasValue(lead.email) && hasValue(lead.contactName) ? w.contact : Math.round(w.contact * 0.6);
    earned += points;
    factors.push({
      label: 'Contact information available',
      points,
      detail: hasValue(lead.email) ? 'Email and/or contact name present.' : 'Contact name only, no email.',
      kind: 'positive',
    });
    reasons.push(`Contact information available (+${points}).`);
  } else {
    missing.push('No contact name or email.');
  }

  // Completeness
  const completeness = computeCompleteness(lead);
  const completenessPoints = Math.round(w.completeness * (completeness / 100));
  earned += completenessPoints;
  factors.push({
    label: `Data completeness ${completeness}%`,
    points: completenessPoints,
    detail: `${COMPLETENESS_FIELDS.filter((f) => hasValue(lead[f])).length} of ${COMPLETENESS_FIELDS.length} key fields present.`,
    kind: completenessPoints >= w.completeness * 0.5 ? 'positive' : 'neutral',
  });

  const score = Math.max(0, Math.min(100, Math.round(earned)));
  const priority: LeadPriority =
    score >= config.priorityThresholds.high
      ? 'High'
      : score >= config.priorityThresholds.medium
        ? 'Medium'
        : 'Low';

  const breakdown: ScoreBreakdown = {
    factors,
    missing,
    reasons,
    nextAction: suggestNextAction(score, priority, lead),
  };

  return { score, priority, completeness, breakdown };
}

export function suggestNextAction(
  score: number,
  priority: LeadPriority,
  lead: ScorableLead,
): string {
  if (!hasValue(lead.email) && !hasValue(lead.contactName)) {
    return 'Find a decision-maker contact before outreach.';
  }
  if (!hasValue(lead.industry) || !hasValue(lead.employeeCount)) {
    return 'Enrich company details (industry, size) to firm up scoring.';
  }
  if (lead.status === 'Qualified') {
    return 'Schedule a discovery call and log notes.';
  }
  if (lead.status === 'Disqualified') {
    return 'Archived — revisit only if circumstances change.';
  }
  if (priority === 'High') {
    return 'Prioritize outreach now — send a personalized intro.';
  }
  if (priority === 'Medium') {
    return 'Add to nurture sequence and verify contact details.';
  }
  if (score < 45) {
    return 'Low fit — qualify further before investing outreach time.';
  }
  return 'Review lead details and decide on outreach.';
}
