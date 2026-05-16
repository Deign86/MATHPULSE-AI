/**
 * Server-side profile field sanitization.
 *
 * Mirrors the client-side rules in src/utils/profileValidation.ts. Even when
 * the client validates correctly, the Firestore `users` document can be
 * updated through any path that holds a privileged credential (admin script,
 * compromised client, malformed migration). This module is the last line of
 * defence: any HTML/script tags written into name/phone are stripped on write.
 *
 * The rules deliberately match (not exceed) the client-side schema so a
 * legitimate client cannot save data that the trigger then silently rewrites.
 */

const NAME_MAX_LENGTH = 100;
const PHONE_MAX_LENGTH = 20;
const PHONE_PATTERN = /^\+?[0-9 ()\-.]{7,20}$/;

/** Remove characters used to open HTML/script tags. Keeps Unicode letters,
 *  diacritics, hyphens, apostrophes, and whitespace untouched. */
export function sanitizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const stripped = value.replace(/[<>]/g, "").trim();
  if (stripped.length === 0) return null;
  return stripped.slice(0, NAME_MAX_LENGTH);
}

/** Phone numbers must be digits with optional + and common separators.
 *  Returns the original (trimmed) when valid, an empty string when the
 *  field should be cleared, or null when the input is not a string. */
export function sanitizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  // Strip HTML tag chars first so an XSS payload becomes a clearly-invalid
  // string instead of being kept verbatim.
  const stripped = trimmed.replace(/[<>]/g, "");
  if (!PHONE_PATTERN.test(stripped)) {
    // Field is no longer valid — clear it so we never persist garbage.
    return "";
  }
  return stripped.slice(0, PHONE_MAX_LENGTH);
}

export interface ProfileSanitizationResult {
  /** Map of fields whose stored value differs from the incoming value and
   *  should be written back to Firestore. */
  patches: Record<string, string>;
  /** True when at least one field had to be rewritten. */
  changed: boolean;
}

/**
 * Compare incoming profile fields against the sanitized values. Returns the
 * minimal patch object the trigger should write back. When `changed` is
 * false the caller should skip the write to avoid infinite trigger loops.
 */
export function sanitizeProfileFields(
  data: Record<string, unknown>
): ProfileSanitizationResult {
  const patches: Record<string, string> = {};

  if (Object.prototype.hasOwnProperty.call(data, "name")) {
    const cleanedName = sanitizeName(data.name);
    if (cleanedName !== null && cleanedName !== data.name) {
      patches.name = cleanedName;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "phone")) {
    const cleanedPhone = sanitizePhone(data.phone);
    if (cleanedPhone !== null && cleanedPhone !== data.phone) {
      patches.phone = cleanedPhone;
    }
  }

  return { patches, changed: Object.keys(patches).length > 0 };
}
