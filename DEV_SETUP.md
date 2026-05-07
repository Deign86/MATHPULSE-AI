# MathPulse AI — Dev Environment Setup

## Prerequisites

- **Node.js** 20 LTS or 22+
- **Python** 3.11+ (for `sync:models` and backend-gate scripts)
- **npm** 10+
- **RAM** 8 GB minimum (16 GB recommended)

## Quick Start

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd MATHPULSE-AI

# 2. Copy environment file and fill in Firebase config values
cp .env.example .env.local

# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
```

The dev server starts at `http://localhost:3000`.

## What `npm run dev` Does

The `dev` script runs three sequential steps:

1. **`predev`** — runs `sync:models` (Python script that syncs AI model config) then `check:backend:dev` (mypy typecheck of the FastAPI backend). Both must pass or the dev server won't start.
2. **`vite`** — Vite 6 dev server with:
   - `@vitejs/plugin-react-swc` (fast SWC-based React transform)
   - `@tailwindcss/vite` (Tailwind CSS v4 on-demand engine)
   - SWC is used instead of Babel for ~10-20x faster transforms
3. **`cross-env NODE_OPTIONS=--max-old-space-size=4096`** — doubles Node.js heap from ~1.4 GB default to 4 GB, reducing GC pauses during cold start.

## Troubleshooting Slow Dev Server

### 1. Increase memory further

If you still see frequent GC pauses:

```powershell
# PowerShell (Windows)
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx vite
```

```bash
# Bash (macOS / Linux)
export NODE_OPTIONS="--max-old-space-size=8192"
npx vite
```

### 2. Skip predev checks (start faster)

```bash
npx vite
```

This skips `sync:models` + mypy typecheck. Use this when you know the backend hasn't changed and just need to iterate on frontend code.

### 3. Profile cold start

```bash
# Vite built-in profiler
npm run dev:profile

# Debug plugin transform timings
npm run dev:debug:plugin-transform

# Debug all transform timings
npm run dev:debug:transform
```

### 4. Measure CSS transform time

```bash
npm run dev:debug:css-probe
```

This logs every CSS transform that takes longer than 25ms. The `@tailwindcss/vite` plugin processes CSS on-demand — if the initial page is heavy on Tailwind utilities, you may see 100-500ms transforms on first load. These are cached after the first request.

### 5. Clear Vite cache

```bash
# Vite caches pre-bundled dependencies in this directory
rm -rf node_modules/.vite

# On Windows PowerShell:
Remove-Item -Recurse -Force node_modules/.vite
```

### 6. Check which files are being served

```bash
# List all module transforms
npx vite --debug transform
```

### 7. HMR is slow on large components

Some components are very large and will always take longer to hot-reload:

| Component | Lines | Notes |
|---|---|---|
| `src/components/TeacherDashboard.tsx` | 3,683 | Largest file; contains motion.div inside .map() loops |
| `src/components/QuizBattlePage.tsx` | 3,285 | RainStorm/ConfettiBurst animation sub-components |
| `src/components/QuizExperience.tsx` | 1,289 | Orbs animation with Math.random() in animate props |
| `src/components/InteractiveLesson.tsx` | ~1,000 | Orbs + answer options with whileHover/whileTap |
| `src/components/ModuleDetailView.tsx` | 644 | lessons.map() with motion.div + stagger delay |

If you're editing one of these and HMR feels slow, that's expected due to file size and animation complexity.

## Optimizations Already Applied

The following Vite 6 optimizations are configured in `vite.config.ts`:

| Optimization | What It Does |
|---|---|
| **optimizeDeps.include** | Pre-bundles 18 packages so Vite doesn't need to discover them via ESM |
| **server.warmup.clientFiles** | Pre-transforms the 12 most-imported source files during server idle time |
| **server.fs.allow** | Explicit allow-list avoids filesystem validation overhead |
| **server.hmr.overlay** | Disabled DOM error overlay (errors still in console) for faster HMR |
| **server.cacheDir** | Explicit `.vite` cache directory |
| **NODE_OPTIONS** | `--max-old-space-size=4096` reduces GC pause frequency |

## Known Performance Patterns in the Codebase

- **Decorator components** (`motion.div`) — 59 files import `motion/react`. Inside `.map()` callbacks, each `motion.*` element creates a new Framer Motion animation node. These are NOT virtualized.
- **No virtualization** — `react-window`, `react-virtuoso`, and similar list virtualization libraries are not in use. Large lists (students in TeacherDashboard, leaderboard in QuizBattlePage) render all items as DOM nodes.
- **8 Firestore onSnapshot subscriptions** — Real-time listeners in service files trigger re-renders on every Firestore change. Most components consuming these listeners are NOT wrapped in `React.memo`.
- **Math.random() in animate** — Some components (QuizExperience, InteractiveLesson) use `Math.random()` inside `motion.div animate` props, causing re-animation on every render.

## Barrel File Warning

The project has minimal barrel file usage. Only one barrel file exists:

- `src/features/notifications/index.ts` — 7 re-exports from 4 modules

No heavy barrels (10+ re-exports) were found. No action needed.

## Reference

- Vite 6 Docs: https://vite.dev
- Tailwind CSS v4: https://tailwindcss.com
- Motion (Framer Motion): https://motion.dev
- Firebase Console: https://console.firebase.google.com/project/mathpulse-ai-2026
