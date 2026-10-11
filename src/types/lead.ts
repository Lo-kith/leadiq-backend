export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Disqualified'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export interface ScoringFactor {
  label: string;
  points: number;
  detail: string;
  kind: 'positive' | 'negative' | 'neutral';
}

export interface ScoreBreakdown {
  factors: ScoringFactor[];
  missing: string[];
  reasons: string[];
  nextAction: string;
}

export interface ScoringConfig {
  targetIndustries: string[];
  minEmployees: number;
  maxEmployees: number;
  minRevenue: number;
  weights: {
    industry: number;
    companySize: number;
    revenue: number;
    website: number;
    contact: number;
    persona: number;
    completeness: number;
  };
  priorityThresholds: {
    high: number;
    medium: number;
  };
}

export interface LeadRecord {
  id: string;
  companyName: string;
  website: string | null;
  websiteDomain: string | null;
  industry: string | null;
  location: string | null;
  employeeCount: number | null;
  revenue: number | null;
  contactName: string | null;
  jobTitle: string | null;
  email: string | null;
  linkedinUrl: string | null;
  leadSource: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  score: number;
  completeness: number;
  nextAction: string | null;
  notes: string | null;
  enrichment?: unknown | null;
  breakdown: ScoreBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
