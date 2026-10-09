import Papa from 'papaparse';
import type { LeadRecord } from '../types/lead.js';

export const EXPORT_COLUMNS = [
  'id',
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
  'status',
  'priority',
  'score',
  'completeness',
  'nextAction',
  'notes',
  'createdAt',
  'updatedAt',
] as const;

function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Prevent CSV formula injection in spreadsheet apps.
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function leadsToCsv(leads: LeadRecord[]): string {
  const rows = leads.map((lead) => {
    const row: Record<string, string> = {};
    for (const column of EXPORT_COLUMNS) {
      row[column] = sanitizeCell((lead as unknown as Record<string, unknown>)[column]);
    }
    return row;
  });
  return Papa.unparse(rows, { columns: [...EXPORT_COLUMNS] });
}
