import { Lead } from '../models/Lead.js';
import { Setting } from '../models/Setting.js';

export interface AnalyticsResult {
  totalLeads: number;
  qualifiedLeads: number;
  highPriorityLeads: number;
  incompleteRecords: number;
  duplicatesDetected: number;
  averageScore: number;
  averageCompleteness: number;
  byIndustry: Array<{ name: string; value: number }>;
  byPriority: Array<{ name: string; value: number }>;
  byStatus: Array<{ name: string; value: number }>;
}

const INCOMPLETE_THRESHOLD = 60;

export async function getAnalytics(): Promise<AnalyticsResult> {
  const [
    totalLeads,
    qualifiedLeads,
    highPriorityLeads,
    incompleteRecords,
    scoreAgg,
    industryAgg,
    priorityAgg,
    statusAgg,
    lastImport,
  ] = await Promise.all([
    Lead.countDocuments({}),
    Lead.countDocuments({ status: 'Qualified' }),
    Lead.countDocuments({ priority: 'High' }),
    Lead.countDocuments({ completeness: { $lt: INCOMPLETE_THRESHOLD } }),
    Lead.aggregate<{ _id: null; avgScore: number; avgCompleteness: number }>([
      { $group: { _id: null, avgScore: { $avg: '$score' }, avgCompleteness: { $avg: '$completeness' } } },
    ]),
    Lead.aggregate<{ _id: string; value: number }>([
      { $group: { _id: { $ifNull: ['$industry', 'Unknown'] }, value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $limit: 10 },
    ]),
    Lead.aggregate<{ _id: string; value: number }>([
      { $group: { _id: '$priority', value: { $sum: 1 } } },
    ]),
    Lead.aggregate<{ _id: string; value: number }>([
      { $group: { _id: '$status', value: { $sum: 1 } } },
    ]),
    Setting.findOne({ key: 'lastImport' }).lean(),
  ]);

  const priorityMap = new Map(priorityAgg.map((row) => [row._id, row.value]));
  const statusMap = new Map(statusAgg.map((row) => [row._id, row.value]));

  return {
    totalLeads,
    qualifiedLeads,
    highPriorityLeads,
    incompleteRecords,
    duplicatesDetected: Number(lastImport?.duplicatesDetected ?? 0),
    averageScore: Math.round(scoreAgg[0]?.avgScore ?? 0),
    averageCompleteness: Math.round(scoreAgg[0]?.avgCompleteness ?? 0),
    byIndustry: industryAgg.map((row) => ({ name: row._id || 'Unknown', value: row.value })),
    byPriority: ['High', 'Medium', 'Low'].map((name) => ({
      name,
      value: priorityMap.get(name) ?? 0,
    })),
    byStatus: ['New', 'Contacted', 'Qualified', 'Disqualified'].map((name) => ({
      name,
      value: statusMap.get(name) ?? 0,
    })),
  };
}

export async function recordImportStats(duplicatesDetected: number): Promise<void> {
  await Setting.findOneAndUpdate(
    { key: 'lastImport' },
    { key: 'lastImport', duplicatesDetected },
    { upsert: true },
  );
}
