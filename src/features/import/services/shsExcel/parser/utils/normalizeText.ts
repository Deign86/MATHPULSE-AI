export function coerceDisplayValue(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

export function normalizeText(value: unknown): string {
  const text = String(value ?? '')
    .replace(/[\u00a0\t\r\n]+/g, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return text;
}

export function normalizeLoose(value: unknown): string {
  return normalizeText(value).replace(/[^A-Z0-9]+/g, '');
}

export function equalsNormalized(value: unknown, anchor: string): boolean {
  const strict = normalizeText(value);
  const strictAnchor = normalizeText(anchor);
  if (strict === strictAnchor) return true;

  const loose = normalizeLoose(value);
  const looseAnchor = normalizeLoose(anchor);
  return loose === looseAnchor;
}

export function includesNormalized(value: unknown, anchor: string): boolean {
  const strict = normalizeText(value);
  const strictAnchor = normalizeText(anchor);
  if (!strict || !strictAnchor) return false;
  if (strict.includes(strictAnchor)) return true;

  const loose = normalizeLoose(value);
  const looseAnchor = normalizeLoose(anchor);
  if (!loose || !looseAnchor) return false;
  return loose.includes(looseAnchor);
}

export function parseNumeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function sanitizeKey(input: string): string {
  return normalizeText(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}
