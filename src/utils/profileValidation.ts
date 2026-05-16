/**
 * Profile field validation schemas (Zod).
 *
 * Centralised so both SettingsModal and ProfileModal apply the same rules
 * before persisting profile data. Output is also escaped: while React's
 * default text-rendering escapes HTML on display, the *write path* should
 * still reject obvious script payloads to keep stored values safe for any
 * downstream consumer (PDF export, email templates, server-rendered pages).
 */
import { z } from 'zod';

// Reject the bracket characters that enable HTML/script injection while
// remaining permissive enough for international names (apostrophes, hyphens,
// Unicode letters, accents). Names are display-only; numeric / currency-like
// payloads are still accepted to avoid false positives on edge cases.
const NAME_DISALLOWED = /[<>]/;

/**
 * Display-time sanitizer for legacy / unsanitized name records.
 *
 * The Cloud Function `onStudentProfileUpdated` strips `<>` chars on the
 * write path, but pre-existing user docs (created before that trigger
 * shipped) can still contain payloads like `<script>alert("XSS")</script>`.
 * React escapes by default so this is not an execution risk, but the raw
 * tag text leaks into UI cards. Strip on display as a defence-in-depth.
 *
 * Empty / falsy input returns 'User' so we never render an empty card.
 */
export function sanitizeDisplayName(value: unknown, fallback: string = 'User'): string {
  if (typeof value !== 'string') return fallback;
  // Strip HTML/script tag chars and normalise whitespace.
  const cleaned = value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 100) : fallback;
}

// Phone numbers: digits + common separators only. Optional leading '+'.
// Length 7–20 covers international formats. Empty string is allowed since
// phone is optional in ProfileData.
const PHONE_PATTERN = /^\+?[0-9 ()\-.]{7,20}$/;

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Full name is required')
  .max(100, 'Full name must be 100 characters or fewer')
  .refine((value) => !NAME_DISALLOWED.test(value), {
    message: 'Full name cannot contain < or > characters',
  });

export const phoneSchema = z
  .string()
  .trim()
  .max(20, 'Phone number must be 20 characters or fewer')
  .refine(
    (value) => value.length === 0 || PHONE_PATTERN.test(value),
    { message: 'Phone number must contain only digits and + ( ) - . spaces' }
  );

export const profileEditSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional(),
});

export type ProfileEditInput = z.infer<typeof profileEditSchema>;

/**
 * Validate a profile draft. Returns the first error message (if any),
 * suitable for surfacing via toast. Returns `null` when valid.
 */
export function validateProfileDraft(draft: {
  name?: string;
  phone?: string;
}): string | null {
  const result = profileEditSchema.safeParse({
    name: draft.name ?? '',
    phone: draft.phone ?? '',
  });
  if (result.success) return null;
  const issue = result.error.issues[0];
  return issue?.message ?? 'Invalid profile data';
}
