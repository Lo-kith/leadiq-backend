import Papa from 'papaparse';
import { isValidEmail, normalizeCompanyName, extractDomain, parseNumber } from '../utils/normalize.js';
import type { LeadInput } from './lead.service.js';

export interface ImportRow {
  rowNumber: number;
  input: Partial<LeadInput>;
  companyName: string;
  websiteDomain: string | null;
  raw: Record<string, unknown>;
}

const HEADER_ALIASES: Record<string, string[]> = {
  companyName: ['companyname', 'company', 'name', 'organization', 'organisation', 'account', 'accountname', 'businessname'],
  website: ['website', 'url', 'web', 'domain', 'companywebsite', 'site'],
  industry: ['industry', 'sector', 'vertical', 'category'],
  location: ['location', 'city', 'country', 'region', 'hq', 'headquarters', 'address'],
  employeeCount: ['employeecount', 'employees', 'employee count', 'headcount', 'size', 'companysize', 'numberofemployees', 'num_employees', 'staff'],
  revenue: ['revenue', 'annualrevenue', 'arr', 'mrr', 'annual revenue', 'turnover'],
  contactName: ['contactname', 'contact', 'contact name', 'fullname', 'full name', 'person', 'leadname', 'primarycontact'],
  email: ['email', 'e-mail', 'emailaddress', 'email address', 'workemail', 'contactemail'],
  linkedinUrl: ['linkedin', 'linkedinurl', 'linkedin url', 'linkedinprofile', 'linkedin profile'],
  leadSource: ['leadsource', 'lead source', 'source', 'channel'],
  status: ['status', 'leadstatus', 'stage'],
  notes: ['notes', 'note', 'comments', 'remarks'],
};

function canonicalHeader(header: string): string | null {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => alias.replace(/[^a-z0-9]/g, '') === normalized)) {
      return field;
    }
  }
  return null;
}

export function parseCsv(buffer: Buffer): ImportRow[] {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length && result.data.length === 0) {
    throw new Error(`CSV parse error: ${result.errors[0]?.message ?? 'unknown error'}`);
  }

  const rows: ImportRow[] = [];
  result.data.forEach((rawRow, index) => {
    const input: Partial<LeadInput> = {};
    for (const [header, value] of Object.entries(rawRow)) {
      const field = canonicalHeader(header);
      if (!field) continue;
      if (field === 'employeeCount' || field === 'revenue') {
        (input as Record<string, unknown>)[field] = parseNumber(value);
      } else {
        (input as Record<string, unknown>)[field] = value;
      }
    }
    const companyName = String(input.companyName ?? '').trim();
    if (!companyName && Object.keys(input).length === 0) return;
    rows.push({
      rowNumber: index + 2,
      input,
      companyName,
      websiteDomain: extractDomain(input.website),
      raw: rawRow,
    });
  });

  return rows;
}

export interface ClassifiedRow {
  rowNumber: number;
  companyName: string;
  input: Partial<LeadInput>;
  status: 'valid' | 'invalid' | 'duplicate';
  issues: string[];
  duplicateOf: string | null;
}

export interface ExistingKey {
  id: string;
  companyName: string;
  websiteDomain: string | null;
}

export function classifyRow(row: ImportRow, existing: ExistingKey[]): ClassifiedRow {
  const issues: string[] = [];
  const companyName = row.companyName;

  if (!companyName) issues.push('Missing company name');
  if (row.input.email && !isValidEmail(String(row.input.email))) {
    issues.push('Invalid email format');
  }
  if (row.input.status && !['New', 'Contacted', 'Qualified', 'Disqualified'].includes(String(row.input.status))) {
    issues.push(`Unknown status "${row.input.status}" (defaulted to New)`);
  }

  const normalizedName = normalizeCompanyName(companyName);
  const domain = row.websiteDomain;
  let duplicateOf: string | null = null;
  for (const key of existing) {
    const keyName = normalizeCompanyName(key.companyName);
    if (domain && key.websiteDomain && domain === key.websiteDomain.toLowerCase()) {
      duplicateOf = key.companyName;
      break;
    }
    if (normalizedName && keyName && normalizedName === keyName) {
      duplicateOf = key.companyName;
      break;
    }
  }

  let status: ClassifiedRow['status'] = 'valid';
  if (!companyName) status = 'invalid';
  else if (duplicateOf) status = 'duplicate';

  return {
    rowNumber: row.rowNumber,
    companyName: companyName || '(missing)',
    input: row.input,
    status,
    issues,
    duplicateOf,
  };
}

export function markInFileDuplicates(rows: ClassifiedRow[]): void {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.status === 'invalid') continue;
    const key = normalizeCompanyName(row.companyName);
    if (!key) continue;
    if (seen.has(key)) {
      if (row.status !== 'duplicate') {
        row.status = 'duplicate';
        row.duplicateOf = `${seen.get(key)} (row in this file)`;
        row.issues.push('Duplicate company name within this file');
      }
    } else {
      seen.set(key, row.companyName);
    }
  }
}
