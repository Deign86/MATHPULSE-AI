# src/components/teacher/

## Responsibility
- Teacher profile, settings, and identity-card page surfaces.
- Files: TeacherIDCard, TeacherProfilePage, TeacherSettingsPage.

## Design
- Profile/settings pages receive or load teacher profile values and expose save/photo callbacks; the ID card presents supplied identity details.
- Props include teacher profile, optional `onPhotoUploaded`, form/save handlers, and className; local state covers edited fields, validation, and save status.

## Flow
- Teacher opens profile/settings → page initializes from auth/profile data → teacher edits fields/uploads photo → profile service/storage persists changes → success/error and updated profile render.

## Integration
- Routed from root `TeacherDashboard`, profile/settings navigation; `AuthContext` provides signed-in identity and teacher profile services/Firebase Storage persist profile data.
- Shared forms, cards, upload controls, and buttons come from `components/ui/` and root profile components where reused.
