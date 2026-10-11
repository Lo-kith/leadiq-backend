import { Setting } from '../models/Setting.js';
import { DEFAULT_SCORING_CONFIG } from '../config/scoring.js';
import type { ScoringConfig } from '../types/lead.js';

const SCORING_KEY = 'scoring';

export async function getScoringConfig(): Promise<ScoringConfig> {
  try {
    const doc = await Setting.findOne({ key: SCORING_KEY }).lean();
    if (doc?.scoringConfig) {
      const saved = doc.scoringConfig as Partial<ScoringConfig>;
      const merged: ScoringConfig = {
        ...DEFAULT_SCORING_CONFIG,
        ...saved,
        targetIndustries: saved.targetIndustries ?? DEFAULT_SCORING_CONFIG.targetIndustries,
        minEmployees: saved.minEmployees ?? DEFAULT_SCORING_CONFIG.minEmployees,
        maxEmployees: saved.maxEmployees ?? DEFAULT_SCORING_CONFIG.maxEmployees,
        minRevenue: saved.minRevenue ?? DEFAULT_SCORING_CONFIG.minRevenue,
        priorityThresholds: {
          ...DEFAULT_SCORING_CONFIG.priorityThresholds,
          ...(saved.priorityThresholds ?? {}),
        },
        weights: {
          ...DEFAULT_SCORING_CONFIG.weights,
          ...(saved.weights ?? {}),
        },
      };
      return merged;
    }
  } catch {
    // Fall through to defaults if settings cannot be read.
  }
  return DEFAULT_SCORING_CONFIG;
}

export async function updateScoringConfig(config: ScoringConfig): Promise<ScoringConfig> {
  await Setting.findOneAndUpdate(
    { key: SCORING_KEY },
    { key: SCORING_KEY, scoringConfig: config },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return config;
}
