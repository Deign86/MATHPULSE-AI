# MathPulse AI — Desktop Design Tokens Reference

> Source: `C:\Users\Deign\Downloads\MATHPULSE-AI\src\styles\globals.css` (843 lines)
> Generated: 2026-06-02
> Purpose: Reference doc for mobile design-system migration to match desktop.

## Source-of-Truth Files

| File | Role |
|---|---|
| `desktop/src/styles/globals.css` | Tailwind v4 `@theme inline` — defines all custom properties, dark variant, keyframes |
| `desktop/index.html` | Loads Nunito from Google Fonts (weights 300, 400, 500, 600, 700, 800, 900) |
| `desktop/src/components/ui/button.tsx` | shadcn/ui Button — uses `bg-primary text-primary-foreground rounded-md h-9 px-4` |
| `desktop/src/components/ui/card.tsx` | shadcn/ui Card — uses `bg-card text-card-foreground rounded-xl border gap-6 px-6 py-6` |
| `desktop/src/components/ui/sidebar.tsx` | shadcn/ui Sidebar — uses sidebar-primary/accent tokens |

## Brand Palette (Hex)

| Name | Hex | Token | Usage |
|---|---|---|---|
| Amethyst | `#9956DE` | `--primary` (light) | Primary CTAs, brand accent |
| Slate Blue | `#7274ED` | `--secondary` (light) | Secondary actions |
| Summer Sky | `#1FA7E1` | `--accent` (light) | Info, links |
| Downy | `#6ED1CF` | — | Success/info accent |
| Pastel Green | `#75D06A` | chart-3 | Low Risk |
| Texas Rose | `#FFB356` | chart-4 | Medium Risk |
| Mona Lisa | `#FF8B8B` | `--destructive` (light) | Errors, High Risk |
| Illusion | `#FB96BB` | — | Decorative |

## Light Mode Tokens (Default)

```css
:root {
  --background: #f7f9fc;       /* Body bg, app shell */
  --foreground: #0a1628;       /* Body text */
  --card: #ffffff;             /* Card surfaces */
  --card-foreground: #0a1628;
  --popover: #ffffff;          /* Floating surfaces (modals, dropdowns) */
  --popover-foreground: #0a1628;
  --primary: #9956DE;          /* Amethyst */
  --primary-foreground: #ffffff;
  --secondary: #7274ED;        /* Slate Blue */
  --secondary-foreground: #ffffff;
  --muted: #f4f4f5;
  --muted-foreground: #71717a;
  --accent: #1FA7E1;           /* Summer Sky */
  --accent-foreground: #ffffff;
  --destructive: #FF8B8B;      /* Mona Lisa */
  --destructive-foreground: #ffffff;
  --border: #e4e4e7;
  --input: transparent;        /* Input bg is transparent; uses --input-background */
  --input-background: #f4f4f5;
  --switch-background: #d4d4d8;
  --ring: #9956DE;             /* Focus ring matches primary */
  --font-weight-medium: 500;
  --font-weight-normal: 400;
  --font-size: 16px;           /* Base */
  --radius: 1.25rem;           /* 20px — very rounded */
  --sidebar: #ffffff;
  --sidebar-foreground: #09090b;
  --sidebar-primary: #7c3aed;  /* Note: violet-600, different from --primary */
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #f3f0ff;
  --sidebar-accent-foreground: #5b21b6;
  --sidebar-border: #e4e4e7;
  --sidebar-ring: #7c3aed;
  --font-display: 'Nunito';
  --font-body: 'Nunito';
  --chart-1: #9956DE;          /* Amethyst */
  --chart-2: #FF8B8B;          /* High Risk */
  --chart-3: #75D06A;          /* Low Risk */
  --chart-4: #FFB356;          /* Medium Risk */
  --chart-5: #1FA7E1;          /* Summer Sky */
}
```

## Dark Mode Tokens (`.dark` selector)

```css
.dark {
  --background: #050d18;       /* Deep navy */
  --foreground: #f0f7ff;       /* Light blue-white text */
  --card: #0a1628;
  --card-foreground: #f0f7ff;
  --popover: #0a1628;
  --popover-foreground: #f0f7ff;
  --primary: #a78bfa;          /* violet-400 — LIGHTER in dark mode */
  --primary-foreground: #ffffff;
  --secondary: #2e1065;        /* violet-950 */
  --secondary-foreground: #c4b5fd;  /* violet-300 */
  --muted: #27272a;
  --muted-foreground: #a1a1aa;
  --accent: #27272a;           /* In dark mode, accent becomes muted bg */
  --accent-foreground: #f43f5e;     /* rose-500 for danger/info callouts */
  --destructive: #ef4444;      /* red-500 */
  --destructive-foreground: #09090b;
  --border: #27272a;
  --input: #27272a;
  --input-background: #27272a;
  --switch-background: #3f3f46;
  --ring: #a78bfa;
  --sidebar: #09090b;
  --sidebar-foreground: #fafafa;
  --sidebar-primary: #a78bfa;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #27272a;
  --sidebar-accent-foreground: #fafafa;
  --sidebar-border: #27272a;
  --sidebar-ring: #a78bfa;
}
```

## Font Loading

Desktop loads Nunito from Google Fonts CDN:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
```

**Mobile requires**: Download .ttf files for weights 300, 400 (regular), 500, 600 (semibold), 700 (bold), 800, 900 and load via `expo-font` from `useFonts()` hook in `app/_layout.tsx`.

## Component Token Usage Patterns

### Button (shadcn/ui desktop)

```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md text-sm font-medium focus-visible:ring-ring/50 focus-visible:ring-[3px]">
```

Pattern: `bg-{variant} text-{variant}-foreground rounded-md h-{size} px-{size}`.

### Card (shadcn/ui desktop)

```tsx
<Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
```

Pattern: `bg-card text-card-foreground rounded-xl border gap-6 px-6 py-6`.

### Sidebar (shadcn/ui desktop)

Uses `sidebar-*` token family: `bg-sidebar text-sidebar-foreground`, accent uses `bg-sidebar-accent text-sidebar-accent-foreground`, primary uses `bg-sidebar-primary text-sidebar-primary-foreground`. Active item uses both.

## Mobile Migration Mapping (HSL → Hex)

Mobile uses `hsl(var(--token))` pattern. To migrate to hex, switch to direct `var(--token)` and update tailwind config.

| Mobile token (current HSL) | Desktop token (target hex) | Light Hex | Dark Hex |
|---|---|---|---|
| `222 47% 5%` (background) | `--background` | `#f7f9fc` | `#050d18` |
| `222 47% 95%` (foreground) | `--foreground` | `#0a1628` | `#f0f7ff` |
| `222 47% 7%` (card) | `--card` | `#ffffff` | `#0a1628` |
| `222 47% 95%` (card-foreground) | `--card-foreground` | `#0a1628` | `#f0f7ff` |
| `217 91% 60%` (primary) | `--primary` | `#9956DE` | `#a78bfa` |
| `0 0% 100%` (primary-foreground) | `--primary-foreground` | `#ffffff` | `#ffffff` |
| `217 33% 17%` (secondary) | `--secondary` | `#7274ED` | `#2e1065` |
| `210 40% 98%` (secondary-foreground) | `--secondary-foreground` | `#ffffff` | `#c4b5fd` |
| `217 33% 17%` (muted) | `--muted` | `#f4f4f5` | `#27272a` |
| `215 20% 65%` (muted-foreground) | `--muted-foreground` | `#71717a` | `#a1a1aa` |
| `199 89% 48%` (accent) | `--accent` | `#1FA7E1` | `#27272a` |
| `0 0% 100%` (accent-foreground) | `--accent-foreground` | `#ffffff` | `#f43f5e` |
| `0 63% 31%` (destructive) | `--destructive` | `#FF8B8B` | `#ef4444` |
| `0 85% 97%` (destructive-foreground) | `--destructive-foreground` | `#ffffff` | `#09090b` |
| `217 33% 17%` (border) | `--border` | `#e4e4e7` | `#27272a` |
| `217 33% 17%` (input) | `--input` | `transparent` | `#27272a` |
| `217 33% 8%` (input-background) | `--input-background` | `#f4f4f5` | `#27272a` |
| `217 91% 60%` (ring) | `--ring` | `#9956DE` | `#a78bfa` |
| `0 0% 100%` (sidebar) | `--sidebar` | `#ffffff` | `#09090b` |
| `0 0% 9%` (sidebar-foreground) | `--sidebar-foreground` | `#09090b` | `#fafafa` |
| `240 5% 84%` (sidebar-primary) | `--sidebar-primary` | `#7c3aed` | `#a78bfa` |
| `0 0% 100%` (sidebar-primary-foreground) | `--sidebar-primary-foreground` | `#ffffff` | `#ffffff` |
| `240 5% 96%` (sidebar-accent) | `--sidebar-accent` | `#f3f0ff` | `#27272a` |
| `240 6% 10%` (sidebar-accent-foreground) | `--sidebar-accent-foreground` | `#5b21b6` | `#fafafa` |
| `220 13% 91%` (sidebar-border) | `--sidebar-border` | `#e4e4e7` | `#27272a` |
| `240 5% 84%` (sidebar-ring) | `--sidebar-ring` | `#7c3aed` | `#a78bfa` |

**Mobile font migration**: `'Inter', system-ui, ...` → `'Nunito', system-ui, ...`

**Mobile radius migration**: `0.5rem` (8px) → `1.25rem` (20px) — drastically more rounded. Note this affects Card (`rounded-lg` → `rounded-xl`) and Button (`rounded-md` → `rounded-xl`).

## Non-Portable Desktop Utilities (Not Replicated on Mobile Yet)

These are visual elements desktop has but mobile doesn't. Out of scope for "targeted gaps" but documented for future waves:

- `.card-elevated` — custom box-shadow for raised cards
- `.glow-blue/violet/rose/emerald` — colored box-shadow glows
- `.bg-dot-pattern` — radial-gradient dot background
- `.bg-math-pattern` — SVG data URL math-symbol background
- `.surface-raised/inset` — gradient surfaces
- `.login-bg`, `.login-orb-*` — login page specific gradients
- `.app-loader-*` — loader animation styles
- `.chat-markdown` — full markdown prose styling
- `.katex` overrides — force Nunito font on math (will be implemented in MathText)
- `.card-accent-sky/rose/emerald` — left border accent variants
- `.animate-sunburst-spin` — 30s linear infinite rotation
- `@keyframes float` — translateY animation

## Math Rendering (KaTeX)

Desktop uses `rehype-katex` + `remark-math` in markdown pipeline. Mobile will use `react-native-webview@13.16.1` (already installed) + bundled KaTeX HTML string for the `MathText` component. Implementation detail: serve KaTeX CSS + JS inline within the WebView HTML; pass formula as a prop; render in a transparent WebView sized to content.

## Verification Targets

After migration, mobile visual should match:
- Background: `#f7f9fc` light / `#050d18` dark
- Primary buttons: `#9956DE` Amethyst
- Text: `#0a1628` light / `#f0f7ff` dark
- Card surfaces: `#ffffff` light / `#0a1628` dark
- Border: `#e4e4e7` light / `#27272a` dark
- Font: Nunito across all text
- Radius: 20px on all rounded surfaces
- Math equations: render via KaTeX (e.g., `f(x) = x^2 + 3x - 4`)
