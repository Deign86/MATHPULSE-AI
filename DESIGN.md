---
version: alpha
name: MathPulse AI
description: Design system for MathPulse AI, a progressive web application delivering curriculum-grounded math tutoring for Filipino senior high school STEM students.
colors:
  background: "#f7f9fc"
  foreground: "#0a1628"
  primary: "#9956DE"
  primary-foreground: "#ffffff"
  secondary: "#7274ED"
  secondary-foreground: "#ffffff"
  accent: "#1FA7E1"
  accent-foreground: "#ffffff"
  destructive: "#FF8B8B"
  destructive-foreground: "#ffffff"
  muted: "#f4f4f5"
  muted-foreground: "#71717a"
  border: "#e4e4e7"
  ring: "#9956DE"
typography:
  display:
    fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif"
    fontWeight: "800"
  body:
    fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif"
    fontWeight: "400"
rounded:
  base: "1.25rem"
---

## Overview

MathPulse AI is an AI-powered mathematics tutoring platform designed for Filipino Senior High School STEM students (Grades 11–12), their teachers, and administrators. The interface balances high-agency educational utility with gamified encouragement, strictly grounded in Department of Education (DepEd) Strengthened Senior High School (SSHS) curriculum guides.

## Colors

The core color palette utilizes an approachable, modern educational scheme anchored by deep amethyst purple, slate blue, and vibrant diagnostic indicators.

- `primary` (`#9956DE`): Amethyst purple used for primary calls-to-action, level indicators, and high-priority branding.
- `secondary` (`#7274ED`): Slate blue used for supportive actions, module accents, and interactive progress tracks.
- `accent` (`#1FA7E1`): Summer sky blue used for informational highlights, RAG evidence citations, and active lesson tabs.
- `destructive` (`#FF8B8B`): Mona Lisa red used for critical risk alerts, destructive modal confirmations, and assessment error states.
- `border` (`#e4e4e7`): Crisp 1px structural borders defining cards and data tables.

## Themes

The system supports both light mode (default for daylight classroom environments) and high-contrast dark mode for low-light focus sessions.

| Token | Light Value | Dark Value |
|---|---|---|
| `background` | `#f7f9fc` | `#050d18` |
| `foreground` | `#0a1628` | `#f0f7ff` |
| `card` | `#ffffff` | `#0a1628` |
| `primary` | `#9956DE` | `#a78bfa` |
| `border` | `#e4e4e7` | `#1e293b` |

## Typography

All typographic scales are set in Nunito to maximize legibility for mathematical formulas, fraction notations, and Filipino/English bilingual lesson copy.

- Headings: Use `text-balance` to avoid typographic widows and improve rhythm.
- Numerals & Metrics: High-frequency changing numbers (quiz timers, scores, leaderboard ranks, XP, and teacher class averages) MUST use `tabular-nums` (`font-variant-numeric: tabular-nums`) to prevent cumulative layout shift (CLS).
- Math Expressions: Rendered via KaTeX inline or display math blocks with accessible screen-reader fallbacks.

## Layout

The application functions as a repository-owned Progressive Web App (PWA) installable on desktop and mobile viewports.

- Viewport Sizing: Fullscreen views MUST use dynamic viewport height (`h-dvh` or `min-h-dvh`) rather than `h-screen` to prevent mobile address-bar displacement.
- Stacking Scale: Layering is strictly constrained to a standardized semantic z-index scale:
  - `z-0` to `z-30`: In-page relative content, avatar layering, and cards.
  - `z-40`: Persistent sticky elements, floating toolbars, and formula docks.
  - `z-50`: Modals, dialogs, celebration drawers, and notification panels.

## Elevation & Depth

- Surfaces use subtle layered shadows for elevation and 1px structural borders for separation.
- Concentric Border Radius: Nested containers obey concentric geometry where outer radius equals inner radius plus padding (e.g. `rounded-[24px]` modal shell containing `rounded-[16px]` interactive cards).

## Components

- Buttons: All buttons feature tactile active scaling (`active:scale-[0.98]`). Icon-only buttons MUST include descriptive `aria-label`s.
- Dialogs & Modals: Centered backdrop with `bg-black/50 backdrop-blur-sm`, focus trapping, and Escape key dismissal.
- Cards: Elevated with subtle shadows, 1px borders, and clear singular primary actions.

## Do's and Don'ts

### Do's
- Do use `h-dvh` on mobile-responsive full-height application containers.
- Do apply `tabular-nums` on any dynamic numeric readout, countdown timer, or table column.
- Do provide accessible names (`aria-label`) on every icon-only button and action trigger.
- Do respect `motion-reduce:transition-none` on interactive elements.

### Don'ts
- Don't use arbitrary z-index values such as `z-[9999]`, `z-[300]`, or `z-[200]`.
- Don't block paste events in text inputs or mathematical formula editors.
- Don't animate non-compositor layout properties (`width`, `height`, `margin`, `padding`).
- Don't use generic multi-color gradient soups or glow borders as primary affordances.
