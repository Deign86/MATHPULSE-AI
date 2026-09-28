# src/components/login/

## Responsibility
- Reusable animated robot backdrop for the sign-in experience.
- Files: InteractiveRobotBackground.

## Design
- `InteractiveRobotBackground` is a decorative component with no domain props or auth state; pointer/ambient interactions are presentation-local.
- Authentication fields, validation, submit lifecycle, and route changes belong to root `LoginPage` rather than this subtree.

## Flow
- Login page mounts background → background renders decorative response to permitted interaction → user submits credentials in `LoginPage` → auth context/service handles sign-in and resulting app route.

## Integration
- Embedded by root `LoginPage`; authentication is handled by its parent through Firebase/auth context and not by this component.
- No API/service dependency; follows the login page's presentation and accessibility context.
