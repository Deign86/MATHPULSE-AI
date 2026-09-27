/** True for string values at the parser input boundary. */
function isStr<V>(value: V): value is V & string {
  return typeof value === 'string';
}

/** True for numeric values at the parser input boundary. */
function isNum<V>(value: V): value is V & number {
  return typeof value === 'number';
}

/** True for boolean values at the parser input boundary. */
function isBool<V>(value: V): value is V & boolean {
  return typeof value === 'boolean';
}

export function coerceDisplayValue<T>(value: T): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (isStr(value)) return value;
  if (isNum(value) || isBool(value)) return value;
  return String(value);
}

export function normalizeText<T>(value: T): string {
  const text = String(value ?? '')
    .replace(/[\u00a0\t\r\n]+/g, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return text;
}

export function normalizeLoose<T>(value: T): string {
  return normalizeText(value).replace(/[^A-Z0-9]+/g, '');
}

export function equalsNormalized<T>(value: T, anchor: string): boolean {
  const strict = normalizeText(value);
  const strictAnchor = normalizeText(anchor);
  if (strict === strictAnchor) return true;

  const loose = normalizeLoose(value);
  const looseAnchor = normalizeLoose(anchor);
  return loose === looseAnchor;
}

export function includesNormalized<T>(value: T, anchor: string): boolean {
  const strict = normalizeText(value);
  const strictAnchor = normalizeText(anchor);
  if (!strict || !strictAnchor) return false;
  if (strict.includes(strictAnchor)) return true;

  const loose = normalizeLoose(value);
  const looseAnchor = normalizeLoose(anchor);
  if (!loose || !looseAnchor) return false;
  return loose.includes(looseAnchor);
}

export function parseNumeric<T>(value: T): number | undefined {
  if (isNum(value) && Number.isFinite(value)) {
    return value;
  }
  if (isStr(value)) {
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
