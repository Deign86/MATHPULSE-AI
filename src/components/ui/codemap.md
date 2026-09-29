# src/components/ui/

## Responsibility
- Shared low-level UI primitives used by application pages for controls, overlays, navigation, data display, and feedback.
- Files: accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, MathPulseLoader, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip, warp-background.

## Design
- Thin reusable components wrap Radix/shadcn-style primitives and expose composable typed props; styling variants are centralized per primitive.
- Typical props are children, `className`, controlled `open/value`, and change callbacks; controlled state generally remains with consuming page/form. `MathPulseLoader` and `warp-background` provide standalone visual primitives.

## Flow
- A page supplies props/children → primitive composes behavior and accessible interaction → user event invokes the consumer's callback/state → consumer rerenders controlled value or visibility.

## Integration
- Imported throughout pages, feature subtrees, forms, dialogs, and dashboards; UI primitives do not call domain APIs or contexts.
- Depends on shared utility/style infrastructure and installed primitive/chart/notification packages; domain data and persistence remain in consuming components/services.
