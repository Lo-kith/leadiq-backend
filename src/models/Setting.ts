import { Schema, model } from 'mongoose';

const scoringConfigSchema = new Schema(
  {
    targetIndustries: { type: [String], default: [] },
    minEmployees: { type: Number, required: true },
    maxEmployees: { type: Number, required: true },
    minRevenue: { type: Number, required: true },
    weights: {
      industry: { type: Number, required: true },
      companySize: { type: Number, required: true },
      revenue: { type: Number, required: true },
      website: { type: Number, required: true },
      contact: { type: Number, required: true },
      persona: { type: Number, required: true },
      completeness: { type: Number, required: true },
    },
    priorityThresholds: {
      high: { type: Number, required: true },
      medium: { type: Number, required: true },
    },
  },
  { _id: false },
);

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    scoringConfig: { type: scoringConfigSchema, default: null },
    duplicatesDetected: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Setting = model('Setting', settingSchema);
