export const DEFAULT_ID_PLACEHOLDER = '/icons/id-placeholder.png';

/**
 * Returns a gender-appropriate default avatar path.
 * Falls back to neutral ID placeholder for null/undefined/prefer_not_to_say.
 */
export function getDefaultAvatar(
  gender?: 'male' | 'female' | 'prefer_not_to_say' | null,
): string {
  if (gender === 'male') return '/icons/male-student.png';
  if (gender === 'female') return '/icons/female-student.png';
  return DEFAULT_ID_PLACEHOLDER;
}