const COMPANY_SUFFIXES = [
  'inc',
  'incorporated',
  'llc',
  'l l c',
  'ltd',
  'limited',
  'corp',
  'corporation',
  'co',
  'company',
  'gmbh',
  'plc',
  'sa',
  'ag',
  'bv',
  'pty',
  'lp',
  'llp',
  'group',
  'holdings',
];

export function toTrimmedString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

export function normalizeCompanyName(value: unknown): string {
  const raw = toTrimmedString(value) ?? '';
  let normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ').filter(Boolean);
  while (words.length > 1 && COMPANY_SUFFIXES.includes(words[words.length - 1])) {
    words.pop();
  }
  normalized = words.join(' ');
  return normalized;
}

export function extractDomain(value: unknown): string | null {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  let candidate = raw.trim().toLowerCase();
  candidate = candidate.replace(/^https?:\/\//, '').replace(/^www\./, '');
  candidate = candidate.split(/[/?#]/)[0];
  candidate = candidate.split('@').pop() ?? candidate;
  if (!candidate || !candidate.includes('.')) return null;
  return candidate;
}

export function normalizeEmail(value: unknown): string | null {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  return raw.toLowerCase();
}

export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let str = String(value).trim().toLowerCase();
  if (!str) return null;

  let multiplier = 1;
  if (/\bbillion\b|\bbn\b/.test(str)) multiplier = 1_000_000_000;
  else if (/\bmillion\b|\bm\b/.test(str)) multiplier = 1_000_000;
  else if (/\bthousand\b|\bk\b/.test(str)) multiplier = 1_000;

  str = str.replace(/[$,₹€£]/g, '').replace(/\b(billion|million|thousand|bn|m|k)\b/g, '');
  str = str.replace(/[^0-9.\-]/g, '');
  const parsed = Number(str);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * multiplier);
}

export function normalizeUrl(value: unknown): string | null {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
}

export function normalizeLinkedIn(value: unknown): string | null {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
}
