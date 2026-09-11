# Avatar Studio Responsive Redesign & Quantum Cyber-Podium

> **Branch:** `feat/avatar-studio-mobile-redesign`  
> **Scope:** Faithful desktop layout preservation with Quantum Cyber-Podium & Spotlight, mobile/tablet split-screen architecture, dynamic active-tab-label-expand, compact 3-column grid, and prominent student header.

---

## 1. Overview & Goals

This update delivers a unified, cross-device experience for the student Avatar Studio:
* **Desktop & Laptop (`xl:` screens and wider)**:
  * Faithfully preserves the original bright desktop layout (`bg-gradient-to-br from-white via-sky-50/30 to-white rounded-[2rem]`).
  * Left column: Student greeting header, XP balance chip, dev reset, full category pill bar with icons + labels, and 3-column item grid.
  * Right column: Dedicated **Quantum Cyber-Podium showcase card** (`bg-[#0a0f1d] border-4 border-slate-800 rounded-[2rem]`) featuring an overhead volumetric spotlight beam, floating math glyphs, animated avatar, speech bubbles, and surprise outfit randomizer (🎲), with the primary Save button directly beneath.
* **Mobile & Tablet (`< xl` screens)**:
  * Implements a game-inspired split-screen layout (matching the Finch-style reference).
  * **Top Pinned Stage (~36% height)**: Non-scrolling stage featuring student name, XP chip, randomizer, overhead spotlight, floating math glyphs, and the 3D cyber-podium.
  * **Bottom Wardrobe Drawer (~64% height)**: Overlaps the stage with rounded top corners and a tactile drag handle.
  * **Dynamic Category Pill Bar**: Inactive tabs render as clean icons only (`[ 👕 ] [ 🩳 ] [ 👟 ] [ 👑 ] [ ⭐ ]`). When tapped/active, the selected tab dynamically expands to reveal its text label (`[ 👕 Tops ]`), maintaining a compact horizontal profile while making the active category instantly obvious.
  * **Compact 3-Column Item Grid**: Uses tighter padding and typography (`grid-cols-3 gap-1.5`) so students can see 9–12 items simultaneously without deep scrolling.
  * **Sticky Bottom Save Button**: Permanently accessible at the bottom of the drawer.

---

## 2. Component Architecture (`src/components/AvatarShop.tsx`)

### Desktop Layout (`hidden xl:flex`)
```
┌────────────────────────────────────────────────────────────────────────┐
│  Desktop Card (bg-white/sky rounded-[2rem] border shadow)              │
│                                                                        │
│  [Left Column: Max 620px]                  [Right Column: 350px]       │
│  • Student Name & Subtitle   • XP Badge    • Quantum Showcase Card:    │
│  • Tabs: [👕 Tops] [🩳 Bottoms] ...         │  - Volumetric Spotlight  │
│  • Scrollable 3-col Item Grid              │  - Floating Math Glyphs  │
│                                            │  - 3D Cyber Podium       │
│                                            │  - Avatar Float + Speech │
│                                            │  - 🎲 Randomizer         │
│                                            └──────────────────────────┘
│                                            • Save Profile Avatar Btn   │
└────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (`xl:hidden`)
```
┌────────────────────────────────────────┐
│ Top Pinned Stage (~36% viewport)       │
│ • [✨ Juan's Avatar]  [🎲] [⚡ 7350 XP] │
│ • Volumetric Overhead Spotlight Beam   │
│ • Floating Math Glyphs (π, ∑, ∫, √x)   │
│ • 3D Cyber-Podium with Neon Cyan Rim   │
│ • Animated Avatar + Speech Bubbles     │
├────────────────────────────────────────┤
│ Bottom Wardrobe Drawer (~64% viewport) │
│ ═══ Tactile Handle Indicator ═══       │
│ Sticky Tabs: [👕 Tops] [🩳] [👟] [👑] [⭐]│
│ Scrollable 3-Column Compact Grid:      │
│  [Card 1]  [Card 2]  [Card 3]          │
│  [Card 4]  [Card 5]  [Card 6]          │
│  [Card 7]  [Card 8]  [Card 9]          │
│ Sticky Bottom: [Save Changes to Avatar]│
└────────────────────────────────────────┘
```

---

## 3. Visual & Interactive Details

| Feature | Implementation |
| :--- | :--- |
| **Volumetric Spotlight** | `clipPath: polygon(30% 0%, 70% 0%, 94% 100%, 6% 100%)`, cyan-to-transparent gradient with pulsing core. |
| **3D Cyber-Podium** | Top disc: `rounded-[100%] border-2 border-sky-400/80 shadow-[0_0_22px_rgba(56,189,248,0.5)]` with depth cylinder base and floor reflection. |
| **Floating Math Symbols** | Seven floating mathematical glyphs ($\pi$, $\sum$, $\int$, $\sqrt{x}$, $\infty$, $\Delta$, $f(x)$) with smooth staggered CSS floating keyframes. |
| **Active Tab Expand** | `cat.label` has `className={isActive ? 'inline' : 'hidden sm:inline'}` — only the selected category expands on mobile! |
| **Compact Items** | Mobile cards feature `grid-cols-3 gap-1.5 p-1.5`, allowing 9–12 items above the fold. |
| **Surprise Outfit (🎲)** | `handleRandomize()` picks a random combination from available and default items. |

---

## 4. Verification

* `npm run typecheck`: **0 errors**
* `npm run lint:anti-slop`: **0 errors** across 382 files
* `node .agents/skills/unlazy/scripts/gate-check.mjs GATES.md`: **37 of 37 gates met**
