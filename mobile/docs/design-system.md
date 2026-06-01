# MathPulse AI Mobile Design System

## Overview

NativeWind v4 design system for MathPulse AI mobile app. All styling via Tailwind classes. No `StyleSheet.create()` in base components.

## Configuration

- **Tailwind Config**: `mobile/tailwind.config.js`
- **Preset**: `nativewind/preset`
- **Content Paths**: `./app/**/*.{js,jsx,ts,tsx}`, `./components/**/*.{js,jsx,ts,tsx}`

## Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#6366f1` | Buttons, active states, progress |
| `primary-foreground` | `#ffffff` | Text on primary |
| `secondary` | `#1e293b` | Cards, secondary surfaces |
| `secondary-foreground` | `#e2e8f0` | Text on secondary |
| `surface` | `#0f172a` | Card backgrounds, elevated surfaces |
| `surface-foreground` | `#f8fafc` | Primary text |
| `background` | `#020617` | App background |
| `background-foreground` | `#e2e8f0` | Text on background |
| `on-surface` | `#94a3b8` | Secondary text, descriptions |
| `error` | `#f87171` | Destructive actions, errors |
| `warning` | `#fbbf24` | Warnings, badges |
| `success` | `#4ade80` | Success states |
| `xp-gold` | `#facc15` | XP points, gamification |
| `border` | `#1e293b` | Borders, dividers |
| `muted` | `#0f172a` | Disabled, skeleton, placeholders |
| `muted-foreground` | `#64748b` | Captions, hints |

## Typography

Use the custom `Text` component. Never use React Native `Text` directly.

| Variant | Size | Weight | Line Height | Color |
|---------|------|--------|-------------|-------|
| `h1` | 32px | bold | 40px | surface-foreground |
| `h2` | 24px | bold | 32px | surface-foreground |
| `h3` | 20px | semibold | 28px | surface-foreground |
| `h4` | 18px | semibold | 24px | surface-foreground |
| `body` | 16px | normal | 24px | on-surface |
| `body-small` | 14px | normal | 20px | on-surface |
| `caption` | 12px | normal | 16px | muted-foreground |
| `label` | 14px | medium | 20px | surface-foreground |

## Spacing Tokens

| Token | Value |
|-------|-------|
| `sp-1` | 4px |
| `sp-2` | 8px |
| `sp-3` | 12px |
| `sp-4` | 16px |
| `sp-6` | 24px |
| `sp-8` | 32px |
| `sp-12` | 48px |
| `sp-16` | 64px |

## Border Radius

| Token | Value |
|-------|-------|
| `sm` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 24px |
| `full` | 9999px |

## Components

### Text
Custom text component with 8 variants. Import from `@/components/ui`.

### Button
Variants: `default`, `secondary`, `outline`, `ghost`, `destructive`.
Sizes: `default`, `sm`, `lg`.
Minimum touch target: `min-h-[44] min-w-[44]`.

### Card
`Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`.
Default: rounded-lg, border, surface background.

### Input
Text input with border, background, placeholder styling.
Container wraps native TextInput.

### Avatar
Image with fallback initials. Sizes: `sm`, `md`, `lg`, `xl`.

### Badge
Status/label badge. Variants: `default`, `secondary`, `outline`, `destructive`, `success`, `warning`.

### Progress
Horizontal progress bar. `value` and `max` props.

### Modal
RN Modal + reanimated Animated.View for spring enter/exit.
Backdrop dismissible.

### BottomSheet
Wraps `@gorhom/bottom-sheet`. Props: `visible`, `onClose`, `snapPoints`.

### Skeleton
Animated placeholder with shimmer opacity cycle.
`circle` prop for circular shape.

### Switch
Custom toggle with reanimated thumb translation.
`value` + `onValueChange` props.

### Slider
Built with RN PanResponder. No external slider dependency.
Props: `value`, `min`, `max`, `step`, `onValueChange`.

### ScrollArea
ScrollView wrapper with `flex-1` and hidden scroll indicator.

## Rules

- Use NativeWind classes only in UI components
- All text uses the custom `Text` component
- Buttons always have `min-h-[44] min-w-[44]`
- No imports from `src/` directory in mobile code
- No screen files in `components/ui`
- No web-only APIs
