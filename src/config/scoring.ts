import type { ScoringConfig } from '../types/lead.js';

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  targetIndustries: [
    'SaaS',
    'Software',
    'Information Technology',
    'Financial Services',
    'Fintech',
    'Healthcare',
    'Manufacturing',
  ],
  minEmployees: 20,
  maxEmployees: 1000,
  minRevenue: 1_000_000,
  weights: {
    industry: 25,
    companySize: 20,
    revenue: 15,
    website: 10,
    contact: 15,
    completeness: 15,
  },
  priorityThresholds: {
    high: 70,
    medium: 45,
  },
};
