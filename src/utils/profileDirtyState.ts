import type { ProfileData } from '../components/SettingsPage';

// Profile fields compared when deciding whether the form holds unsaved work.
// `photo` is excluded: the photo upload persists immediately (Storage +
// Firestore), so a photo-only difference must not trip the leave guard.
const PROFILE_DIRTY_KEYS: Array<Exclude<keyof ProfileData, 'photo'>> = [
  'uid',
  'name',
  'email',
  'phone',
  'avatarLayers',
  'role',
  'gender',
  'lrn',
  'grade',
  'section',
  'school',
  'department',
  'subject',
  'yearsOfExperience',
  'qualification',
  'position',
  'major',
  'gpa',
  'enrollmentDate',
];

/** True when the draft differs from the baseline in any not-yet-persisted field. */
export const hasUnsavedProfileChanges = (
  draft: ProfileData,
  baseline: ProfileData,
): boolean => PROFILE_DIRTY_KEYS.some((key) => draft[key] !== baseline[key]);
