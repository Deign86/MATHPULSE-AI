# src/components/admin/

## Responsibility
- Admin-specific panels, navigation, profile/settings, content management, and subject/class administration.
- Files: AdminClassManagement, AdminIDCard, AdminMobileBottomNav, AdminPdfUpload, AdminProfilePage, AdminSettingsPage, AdminSubjects, ModelConfigPanel, SubjectsHelpModal.

## Design
- Page panels combine service-backed admin data with local filters/forms; small shared pieces accept typed props and callback handlers.
- `AdminIDCard` takes `profileData`, optional `onPhotoUploaded`, and `className`; `AdminSettingsPage`/`AdminProfilePage` take profile/settings values and callbacks; `AdminPdfUpload` accepts upload-success callback; `AdminMobileBottomNav` is driven by active tab and tab-change handler.
- State examples: selected subject/status/grade, modal visibility, upload progress, settings edits, and profile form values.

## Flow
- Admin selects a tab, edits settings, uploads material, or manages subjects/classes → component state tracks selection/form/progress → admin service/Firebase call persists or fetches → panel rerenders with result/errors.

## Integration
- Rendered by `AdminDashboard` and admin routes/pages; profile data is passed from admin dashboard/auth state.
- Uses admin/content/subject services and Firebase-backed profile/storage operations; shared dialogs, buttons, forms, and navigation primitives come from `components/ui/`.
