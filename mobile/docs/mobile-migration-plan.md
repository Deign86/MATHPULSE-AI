# MathPulse AI Mobile Migration Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use feature-dev or subagent-driven-development to implement this plan.
> **Goal:** Full repo-to-mobile port of MathPulse AI from React web to Expo React Native with complete feature parity — student, teacher, and admin roles.
> **Architecture:** Expo Router file-based routing, role-stacked bottom tabs, Firebase v12 + Firestore/RTDB, FastAPI client reuse, NativeWind v4 styling, Reanimated motion.
> **Tech Stack:** Expo SDK latest, Expo Router, NativeWind v4, React Native Reanimated, Firebase JS SDK v12, expo-secure-store, expo-notifications, react-native-sse, expo-linear-gradient, expo-image, Zustand

---

## Section 1: Audit Summary

| Category | Web Implementation | Mobile Impact | Migration Strategy |
|---|---|---|---|
| **Framework** | React 18 + Vite + TypeScript | Full rewrite target | Expo SDK + Expo Router file-based routing |
| **Auth** | Firebase Auth v12 (`browserLocalPersistence`, `signInWithPopup` for Google) | `signInWithPopup` unavailable in RN; must use `expo-auth-session` | Google OAuth via `expo-auth-session` + `useIdTokenAuthRequest`; Firebase persistence compatible via RN polyfill |
| **Database** | Firestore (memory cache) + RTDB (quiz battle matchmaking) | Same SDK works in RN | Firestore with `getReactNativePersistence(AsyncStorage)`; RTDB same paths/rules |
| **Backend** | FastAPI at `https://deign86-mathpulse-api-v3test.hf.space` (`apiService.ts`, 64+ function exports) | Same HTTP pattern | Port `apiService.ts` patterns; `EXPO_PUBLIC_API_URL` env var; `react-native-sse` for streaming |
| **State Mgmt** | React Context (auth, chat, notifications) + `useState` in App.tsx (1500+ lines) | Context-only without Zustand | Add Zustand stores: `useAuthStore`, `useGamificationStore`, `useChatStore`, `useNotificationStore` |
| **Key Features** | Diagnostic assessment, personalized learning paths, AI tutor chat (DeepSeek SSE), lessons, quizzes, quiz battle (PvP + bot via RTDB), daily check-in, leaderboard, teacher/class analytics, admin management, notifications | Full parity required | Each feature gets dedicated screen with shared service layer ported from `src/services/` |
| **DOM-only patterns** | `<a>` nav, `window.history.pushState`, `window.location`, `localStorage`/`sessionStorage`, `<input type="file">`, `URL.createObjectURL`, `html2canvas`, `jspdf`, `canvas-confetti` | None available in RN | Replace with: Expo Router nav, `router.replace`, `AsyncStorage`, `expo-image-picker`, `expo-sharing`, `react-native-confetti-cannon` |
| **Web-only UI libs** | motion/react (AnimatePresence), react-virtuoso, recharts, rehype-katex, sonner, react-markdown, cmdk, vaul(drawer), embla-carousel | Must replace | Reanimated v3, FlashList, Victory Native / react-native-chart-kit, WebView+KaTeX, Reanimated toast, WebView markdown, @gorhom/bottom-sheet |
| **Radix UI** | 49 Radix primitives + shadcn/ui components in `src/components/ui/` | All must be rewritten as RN primitives | Build `nativewind`-based component lib mirroring the same visual API |
| **Browser-only APIs** | `sessionStorage`, `localStorage`, `document.cookie`, `requestIdleCallback`, `window.scrollTo`, `IntersectionObserver`, CSS modules | None available | `AsyncStorage`/`SecureStore`, `InteractionManager`, `ScrollView`/`FlatList`+`onViewableItemsChanged`, RN-compatible equivalents |

---

## Section 2: Screen Map (Full Parity)

### Auth screens

| Web Route / Feature | Mobile Screen | Migration Type | Reusable Logic | Must Rewrite | RN Pitfalls |
|---|---|---|---|---|---|
| `LoginPage.tsx` (login + register tabs) | `app/(auth)/login.tsx` + `register.tsx` | Full rewrite | `authService.ts` (Firebase Auth API calls), validation schemas | Form UI (DOM `<form>` → RN `TextInput`), `signInWithPopup` | Google OAuth → `expo-auth-session`; `KeyboardAvoidingView` on both platforms; `SecureStore` vs `localStorage` for role cache |
| Password Reset | `app/(auth)/reset-password.tsx` | Light rewrite | `sendPasswordResetEmail` from Firebase | Form layout | Minimal — standard form screen |
| Google OAuth inline | Handled within `login.tsx` | Full rewrite | Token exchange, linking anonymous accounts | `signInWithPopup` → `expo-auth-session` | Expo AuthSession proxy config; redirect URI scheme (`exp://` or `https://` proxy) |
| Auth gate (`AuthContext`) | Root `app/_layout.tsx` listener → Zustand store | Port pattern | `onAuthStateChanged` → store action | `AuthContext` → Zustand `useAuthStore` | `getReactNativePersistence` in Firebase init |

### Student screens

| Web Route / Feature | Mobile Screen | Migration Type | Reusable Logic | Must Rewrite | RN Pitfalls |
|---|---|---|---|---|---|
| Student Dashboard | `app/(student)/index.tsx` | Heavy rewrite | `getUserProgress`, `getHeroBannerSummary`, `getDailyReward`, XP calc, risk data from `StudentProfile` | Layout (responsive grid → `ScrollView`/`FlashList`), `HeroBanner`, `SupplementalPillCarousel`, `LearningPath`, `RecentActivityWidget` | `InteractionManager` instead of `requestIdleCallback`; `react-native-confetti-cannon` for confetti; GPU-accelerated carousel via Reanimated |
| Modules list (`ModulesPage.tsx`) | `app/(student)/modules.tsx` | Heavy rewrite | `curriculumModules.ts`, `useModuleProgress`, module status logic, filtering | Card layout, carousel, flat badges | `@shopify/flash-list` with sticky headers; `react-native-reanimated-carousel` for module carousels |
| Module detail + lessons | `app/(student)/modules/[id].tsx` | Heavy rewrite | `lessonService.ts`, `progressService.ts`, lesson fetching | Lesson list, progress gate, expandable sections | `FlashList`; long-form content in `ScrollView`; math in WebView |
| Learn / topic (`InteractiveLesson.tsx`) | `app/(student)/learn/[topic].tsx` | Heavy rewrite | RAG lesson via `apiService.getCurriculumGroundedLesson`, lesson template rendering | `react-markdown` + `rehype-katex` → WebView+KaTeX; interactive tooltips | WebView for full KaTeX support; `source` prop for math bundle; `originWhitelist` for KaTeX assets |
| Quiz experience (`QuizExperience.tsx`) | `app/(student)/quiz/[id].tsx` | Heavy rewrite | `quizService.ts`, `assessmentService.ts`, scoring logic, timer | Question rendering, `MathAnswerInput`, answer feedback (green/red + haptic) | `@gorhom/bottom-sheet` for answer actions; `expo-haptics` for feedback; WebView for math questions |
| Quiz Battle (`QuizBattlePage.tsx`) | `app/(student)/battle.tsx` | Heavy rewrite | RTDB matchmaking, battle lifecycle, scoring rules in `quizBattleService.ts` | Battle HUD, RTDB presence system, timer | RTDB `onDisconnect` works same in RN; MVP = foreground-only matching |
| Tutor Chat (`AIChatPage.tsx`) | `app/(student)/chat.tsx` | Heavy rewrite | `chatService.ts`, session management, SSE streaming, `useCompetencyMatrix` | Chat UI, message list, streaming reaction | `react-native-sse` for SSE; `FlashList` inverted for messages; `KeyboardAvoidingView`; Markdown in WebView |
| Leaderboard (`LeaderboardPage.tsx`) | `app/(student)/leaderboard.tsx` | Medium rewrite | `gamificationService.getLeaderboard` API | List layout, rank badges, time period filters | `FlashList` with pull-to-refresh; animated rank changes via Reanimated |
| Rewards / Achievements (`RewardsModal.tsx`) | `app/(student)/rewards.tsx` | Medium rewrite | `gamificationService.checkAchievements`, `getUserAchievements` | Modal → full screen, badge grid, XP progress | `Animated.View` for badge unlock `scalePopIn`; gradient for XP bar |
| Avatar Shop (`AvatarShop.tsx`) | `app/(student)/avatar.tsx` | Heavy rewrite | `avatarData.ts`, purchase logic (`purchaseAvatarItem`), `ownedAvatarItems` in profile | Layer-based avatar builder, canvas layers → stacked `Image` components | `expo-image` for layers; purchase confirmation as bottom sheet |
| Daily Check-in (`DailyCheckInModal.tsx`) | `app/(student)/check-in.tsx` | Medium rewrite | `dailyRewardService`, streak logic, 7-day cycle | Modal → screen, 7-day grid | Reanimated for award animation; haptic on day tap |
| Grades / Assessment Results (`GradesPage.tsx`) | `app/(student)/grades.tsx` | Medium rewrite | `assessmentResultsService.ts` | Table → `FlashList`; competency bars | `victory-native` for subject score charts |
| Tasks Board | `app/(student)/tasks.tsx` | Medium rewrite | `taskService.ts`, kanban states | Kanban columns / card list | Swipe actions via Reanimated gesture; drag reorder |
| Diagnostic Assessment (`DiagnosticAssessmentModal.tsx`) | `app/(student)/assessment.tsx` | Heavy rewrite | `diagnosticService.ts`, competency scoring, `iarBlueprint.ts` | Full-assessment flow with timer, progress bar | WebView for math item rendering; `useDerivedValue` for timer ring |
| Profile | `app/(student)/profile.tsx` | Medium rewrite | `authService.updateProfile`, `profileValidation` | Edit form, avatar upload | `expo-image-picker`; `react-native-safe-area-context` |
| Settings | `app/(student)/settings.tsx` | Medium rewrite | `settingsService.ts` | Form UI | `Switch`, `Slider` from base component lib |
| Notifications | `app/(student)/notifications.tsx` | Medium rewrite | `notificationService.ts`, `notificationFirestoreService.ts` | List UI, read/unread state | `expo-notifications` for push; FlatList |
| Scientific Calculator | `app/(student)/calculator.tsx` | Medium rewrite | `math-expression-evaluator` (same lib) | Draggable modal → bottom sheet | `@gorhom/bottom-sheet`; full-screen exit |

### Teacher screens

| Web Route / Feature | Mobile Screen | Migration Type | Reusable Logic | Must Rewrite | RN Pitfalls |
|---|---|---|---|---|---|
| Teacher Dashboard | `app/(teacher)/index.tsx` | Heavy rewrite | `classAnalyticsService.ts`, `dailyRewardService`, `heroBannerSummaryService` | Dashboard layout, stat cards, charts | Stagger entrance animation; `victory-native` charts |
| Students list | `app/(teacher)/students.tsx` | Medium rewrite | `studentService.ts`, `studentDataService.ts`, `useStudentRisk` | List with search + filters | `FlashList` with sticky section headers |
| Student profile (modal → screen) | `app/(teacher)/students/[id].tsx` | Medium rewrite | `StudentProfile` aggregation, risk/competency data | ScrollView with risk badges, chart | `ScrollView` with sticky header; risk indicator colors |
| Class Analytics | `app/(teacher)/analytics.tsx` | Medium rewrite | `classAnalyticsService.ts` computation | Charts, `StudentCompetencyTable` → FlatList | `victory-native` for all chart types |
| At-Risk Dashboard | `app/(teacher)/at-risk.tsx` | Medium rewrite | `riskService.ts`, `useStudentRisk` | Risk table, checklist panel | FlatList with color-coded risk badges |
| Task Management | `app/(teacher)/tasks.tsx` | Medium rewrite | `taskService.ts` CRUD | Form + list UI | `KeyboardAvoidingView` for create form |
| Content Upload | `app/(teacher)/content/upload.tsx` | Heavy rewrite | File upload API + `openpyxl`/`pdfplumber` parsing server-side | File picker, progress bar | `expo-document-picker`; upload progress via `onProgress` |
| Daily Insights | `app/(teacher)/insights.tsx` | Light rewrite | `dailyInsight` API | Display layout | ScrollView with formatted text |

### Admin screens

| Web Route / Feature | Mobile Screen | Migration Type | Reusable Logic | Must Rewrite | RN Pitfalls |
|---|---|---|---|---|---|
| Admin Dashboard | `app/(admin)/index.tsx` | Heavy rewrite | `heroBannerSummaryService`, `deepseekMonitoringService`, `huggingfaceMonitoringService` | Dashboard cards, system status indicators | Grid of stat cards via FlashList |
| User Management | `app/(admin)/users.tsx` | Heavy rewrite | `adminService.ts` CRUD, bulk actions API | Table → FlatList, search, bulk action modals | FlatList with pull-to-refresh, search header, bottom sheet for actions |
| Content Management | `app/(admin)/content.tsx` | Medium rewrite | `adminService.ts` content CRUD | List + editor UI | PDF preview in WebView |
| System Settings | `app/(admin)/settings.tsx` | Medium rewrite | `platformConfigService.ts` | Form UI | Keyboard avoiding |
| AI Model Config | `app/(admin)/model-config.tsx` | Light rewrite | `apiService.getModelConfig`, profile switching | Config display + toggle | `Switch` components |
| PDF Upload / RAG | `app/(admin)/content/upload.tsx` | Medium rewrite | `AdminRagManager` logic | File picker + upload progress | `expo-document-picker` |
| AI Monitoring | `app/(admin)/monitoring.tsx` | Medium rewrite | `aiMonitoringService.ts`, DeepSeek + HF monitoring | Dashboard with charts | Victory Native charts |
| Audit Logs | `app/(admin)/audit.tsx` | Light rewrite | Audit log fetching API | Table → FlatList | Date filter in flat list header |
| RAG Manager | `app/(admin)/rag.tsx` | Medium rewrite | `getRagHealth`, RAG status | Status display, re-ingest button | ScrollView with status cards |

### Shared / UI components

| Web Component | Mobile Component | Migration Type | Notes |
|---|---|---|---|
| `MathText.tsx` + rehype-katex | `components/MathText.tsx` | Full rewrite | `WebView` with bundled KaTeX CDN; handles inline `$...$` and block `$$...$$` |
| `ChatMarkdown.tsx` | `components/ChatMarkdown.tsx` | Full rewrite | WebView rendering markdown with KaTeX preset; reuses HTML template from web |
| `FloatingAITutor.tsx` | `components/FloatingAITutor.tsx` | Full rewrite | FAB with `scalePopIn`; expands to bottom-sheet chat |
| `XPNotification.tsx` | `components/XPNotification.tsx` | Medium rewrite | Toast notification animated with Reanimated spring; auto-dismiss |
| `NotificationBell.tsx` | `components/NotificationBell.tsx` | Medium rewrite | Badge count + press → `notifications` screen |
| `MathAnswerInput.tsx` | `components/MathAnswerInput.tsx` | Heavy rewrite | WebView math input or RN `TextInput` with keyboard “done” handler |
| `CompositeAvatar.tsx` | `components/CompositeAvatar.tsx` | Heavy rewrite | Stacked `expo-image` components with `position: absolute` layers within a `View` |
| `ErrorBoundary.tsx` | `components/ErrorBoundary.tsx` | Port as-is | React error boundary works identically in RN |
| Sidebar navigation | Bottom tabs | Replace | Expo Router tabs with animated indicator |

---

## Section 3: Design System Token Definitions

Save detail spec to `mobile/docs/design-system.md`.

### Color Palette (dark-first, extend to light below)

| Token | Value | Description |
|---|---|---|
| `--color-primary` | `#6366f1` | Indigo — primary actions, links, active tab |
| `--color-primary-foreground` | `#ffffff` | Text on primary |
| `--color-secondary` | `#1e293b` | Slate 800 — secondary buttons, cards, elevated surfaces |
| `--color-secondary-foreground` | `#e2e8f0` | Slate 200 — text on secondary |
| `--color-surface` | `#0f172a` | Slate 900 — card and sheet backgrounds |
| `--color-surface-foreground` | `#f8fafc` | Slate 50 — primary text on surface |
| `--color-background` | `#020617` | Slate 950 — screen background (dark mode default) |
| `--color-background-foreground` | `#e2e8f0` | Slate 200 — global body text |
| `--color-on-surface` | `#94a3b8` | Slate 400 — secondary labels, placeholders |
| `--color-error` | `#f87171` | Red 400 — errors, destructive actions |
| `--color-error-foreground` | `#1c1917` | Stone 900 — text on error buttons |
| `--color-warning` | `#fbbf24` | Amber 400 — warnings |
| `--color-success` | `#4ade80` | Green 400 — success, correct answers |
| `--color-xp-gold` | `#facc15` | Yellow 400 — XP, rewards, streak fire |
| `--color-border` | `#1e293b` | Slate 800 — subtle dividers |
| `--color-muted` | `#0f172a` | Muted surfaces |
| `--color-muted-foreground` | `#64748b` | Slate 500 — muted text |

### Typography Scale

| Token | Size (sp) | Line Height (sp) | Weight | Font | Usage |
|---|---|---|---|---|---|
| `text-display` | 32 | 40 | 800 | Inter-ExtraBold | Hero “Welcome back”, XP milestones |
| `text-heading` | 24 | 32 | 700 | Inter-Bold | Screen titles, card headers |
| `text-subheading` | 20 | 28 | 600 | Inter-SemiBold | Section titles |
| `text-body` | 16 | 24 | 400 | Inter-Regular | Body content (math min 16) |
| `text-body-semibold` | 16 | 24 | 600 | Inter-SemiBold | Emphasized body |
| `text-label` | 14 | 20 | 500 | Inter-Medium | Button labels, form labels |
| `text-caption` | 12 | 16 | 400 | Inter-Regular | Timestamps, hints |
| `text-tiny` | 10 | 14 | 400 | Inter-Regular | Badges |

### Spacing Scale

| Token | Value (dp) |
|---|---|
| `sp-1` | 4 |
| `sp-2` | 8 |
| `sp-3` | 12 |
| `sp-4` | 16 |
| `sp-6` | 24 |
| `sp-8` | 32 |
| `sp-12` | 48 |
| `sp-16` | 64 |

### Component Tokens

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 8 | Badges, chips, small pills |
| `radius-md` | 12 | Buttons, inputs, small cards |
| `radius-lg` | 16 | Standard cards, modals |
| `radius-xl` | 24 | Hero cards, bottom sheets |
| `radius-full` | 9999 | Avatars, circular FABs |
| `shadow-sm` | Elevation 1 (Android) / `0 1px 3px rgba(0,0,0,0.3)` (iOS) | Elevated chips |
| `shadow-md` | Elevation 3 (Android) / `0 4px 6px rgba(0,0,0,0.4)` | Cards, dropdowns |
| `shadow-lg` | Elevation 6 (Android) / `0 10px 15px rgba(0,0,0,0.5)` | Bottom sheets, modals |
| `shadow-xl` | Elevation 12 (Android) / `0 20px 25px rgba(0,0,0,0.6)` | Full-screen overlays |
| `icon-xs` | 16 | Inline icons |
| `icon-sm` | 20 | Button icons |
| `icon-md` | 24 | Standard icons |
| `icon-lg` | 32 | Feature section icons |
| `hit-slop` | 8 | Minimum target expansion per touch target |

> **Touch target rule:** All interactive elements ≥ 44×44 dp. Use `min-w=[44] min-h-[44]` on buttons.

### Motion Primitives (react-native-reanimated)

| Name | Animation | Config | Usage |
|---|---|---|---|
| `fadeInUp` | opacity 1→0, translateY 20→0 | `{ duration: 300, easing: Easing.out(Easing.cubic) }` | Screen entrance, card list |
| `fadeOut` | opacity 1→0 | `{ duration: 200 }` | Element exit |
| `scalePopIn` | scale 0.5→1 | Spring `{ damping: 15, stiffness: 200 }` | Modals, badge unlock, XP reward |
| `slideUp` | translateY screenHeight→0 | Spring `{ damping: 20, stiffness: 200 }` | Bottom sheet entry |
| `pulseGlow` | scale 1→1.08→1 loop | `{ duration: 1500, easing: Easing.inOut(Easing.ease), repeat: -1 }` | XP badge, notification ring |
| `tabShift` | translateX slide to active index | Spring `{ damping: 25, stiffness: 300 }` | Bottom tab indicator |
| `staggerChildren` | staggered fadeInUp | 50 ms delay per child | Dashboard card grid |

---

## Section 4: Expo Packages to Install

### Core `expo install`

| Package | Purpose |
|---|---|
| `expo` | Core SDK |
| `expo-router` | File-based routing |
| `expo-linking` | Deep linking / proxy redirects |
| `expo-constants` | Env vars & app config |
| `expo-status-bar` | Status bar control |
| `expo-splash-screen` | Splash screen |
| `expo-font` | Custom font loading (Inter family) |
| `expo-secure-store` | Secure token storage |
| `expo-image` | Optimized remote image component (replaces RN `Image`) |
| `expo-linear-gradient` | Gradient backgrounds + XP bars |
| `expo-image-picker` | Photo selection for profile / uploads |
| `expo-document-picker` | PDF / file picker |
| `expo-file-system` | File caching, downloads |
| `expo-sharing` | Share / export data on device |
| `expo-notifications` | Push notification client |
| `expo-haptics` | Haptic feedback (correct / wrong / achievement) |
| `expo-auth-session` | Google OAuth + general OAuth redirects |
| `expo-crypto` | UUID / hash utilities |
| `expo-web-browser` | OAuth in-app browser |

### React Native core `npx expo install`

| Package | Purpose |
|---|---|
| `react-native-screens` | Native screen containers for Expo Router |
| `react-native-safe-area-context` | Safe-area-aware wrappers |
| `react-native-gesture-handler` | Touch & gesture handling (Reanimated dependency) |
| `react-native-reanimated` | Shared-element & layout animations |
| `react-native-svg` | SVG rendering |
| `@react-native-async-storage/async-storage` | Persistent key-value storage |
| `react-native-webview` | KaTeX math, markdown, secure OAuth |

### Community `npm install` (or `bun add`)

| Package | Purpose |
|---|---|
| `nativewind@^4` | Tailwind CSS for React Native |
| `tailwindcss` | Tailwind compiler (stay on v3 with v4 beta — pin `^3.4`) |
| `zustand` | State management |
| `firebase@^12` | Firebase JS SDK (reuse same version as web) |
| `react-native-sse` | Server-Sent Events polyfill for AI chat streaming |
| `@gorhom/bottom-sheet@^4` | Bottom sheet (calculator, actions) |
| `react-native-reanimated-carousel` | Carousel for hero banner + pills |
| `react-native-confetti-cannon` | Confetti on XP / level-up |
| `victory-native` | Charts (analytics, grades) |
| `date-fns` | Date formatting (unchanged from web) |
| `zod` | Runtime validation (unchanged from web) |
| `@shopify/flash-list` | High-performance FlatList replacement |
| `react-native-chart-kit` | Lightweight chart fallback |
| `react-native-math-view` | Optional optimized native math view (fallback to WebView KaTeX) |

### Dev

| Package | Purpose |
|---|---|
| `typescript` | Type checking |
| `@types/react` | React typings |
| `@types/react-native` | RN typings |
| `jest` / `@testing-library/react-native` | Unit / component tests |

---

## Section 5: Implementation Waves

### Wave 0 — Scaffold + Design System + Firebase (start immediately)

| Group | Tasks | Dependencies | Deliverable | Verification |
|---|---|---|---|---|
| **0A Scaffold** | `npx create-expo-app@latest mobile --template blank-typescript`; install all packages; add `app/` directory tree; set up `app.json` + `babel.config.js` + `metro.config.js`; add path alias `@/` | None | Running `npx expo start` | `npx expo start` opens cleanly; simulator boots |
| **0B Design System** | Create `tailwind.config.js`; add `global.css`; build `components/ui/`: `Button`, `Card`, `Text`, `Input`, `Avatar`, `Badge`, `Progress`, `Modal`, `BottomSheet`, `Skeleton`, `Switch`, `Slider`, `ScrollArea`; configure Inter via `expo-font` in root `_layout.tsx` | None | `components/ui/` library renders on screen | Tap/scroll each; contrast passes WCAG threshold |
| **0C Firebase Config** | Create `lib/firebase.ts` using `getReactNativePersistence(AsyncStorage)`; export `auth`, `db`, `storage`, `cloudFunctions`, `realtimeDb`, `isRealtimeDbEnabled`; set up `.env` with `EXPO_PUBLIC_*` vars | None | Firebase initializes | `onAuthStateChanged` fires on auth state change |
| **0D Types** | Port `types/models.ts`, `types/assessment.ts`, `types/competency.ts`, `types/curriculum.ts`, `types/rewards.ts`, `types/settings.ts` | None | All types compile | `tsc --noEmit` passes |

**Commit:** `feat(mobile): scaffold Expo project with design system and Firebase config`

---

### Wave 1 — Auth Flow (all roles) + Root Navigation

| Group | Tasks | Dependencies | Deliverable | Verification |
|---|---|---|---|---|
| **1A Auth Service** | Port `services/authService.ts` to `services/authService.ts` (keep same exports); replace `browserLocalPersistence` with `getReactNativePersistence(AsyncStorage)`; implement Google OAuth via `expo-auth-session` + `useIdTokenAuthRequest` | 0C | Auth service works | Email/password signup + signin; Google OAuth flow; role stored in SecureStore |
| **1B Auth Store** | Create `stores/useAuthStore.ts` (Zustand) replacing `AuthContext`; actions: `setUser`, `setLoading`, `refreshProfile`; selectors: `user`, `role`, `isAuthenticated`, `isLoading` | 1A | `useAuthStore` | Login → store updates; refresh → profile visible |
| **1C Auth Screens** | Build `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/reset-password.tsx`; use `components/ui/Button`, `Input`, `Text`; role selection on register | 0B, 1A | Auth stack functional | Complete login flow on iOS + Android |
| **1D Root Navigation** | Create `app/(auth)/_layout.tsx` (stack), `app/(student)/_layout.tsx` (bottom tabs), `app/(teacher)/_layout.tsx`, `app/(admin)/_layout.tsx`; root `_layout.tsx` reads `role` from store, redirects to matching stack | 1B | Role redirect works | Logout → auth stack; new user → register |
| **1E Stores** | Create `stores/useGamificationStore.ts`, `stores/useChatStore.ts`, `stores/useNotificationStore.ts` | 1B | All stores compile | Importable; no circular deps |

**Commit:** `feat(mobile): auth flow with Google OAuth and role-based navigation`

---

### Wave 2 — Student Screens: Dashboard, Modules, Lessons

| Group | Tasks | Dependencies | Deliverable | Verification |
|---|---|---|---|---|
| **2A Dashboard** | `app/(student)/index.tsx`: HeroBanner, LearningPath, SupplementalPillCarousel, XP summary, check-in trigger, risk data | Wave 1 | Dashboard loads | Real XP, risk, and recommendations display |
| **2B Modules** | `app/(student)/modules.tsx`: curriculum data, module cards, search/filter | Wave 1 | Module list | Filters work; modules load |
| **2C Module Detail** | `app/(student)/modules/[id].tsx`: lesson list, progress, expandable items | 2B | Module detail | Expand/collapse; progress bars update |
| **2D Lesson Viewer** | `app/(student)/learn/[topic].tsx`: RAG lesson fetched via `apiService.getCurriculumGroundedLesson`; render in WebView+KaTeX template | 2C | Lesson with LaTeX renders | LaTeX renders correctly on device |
| **2E Port Services (partial)** | `services/progressService.ts`, `services/lessonService.ts`, `services/gamificationService.ts`, `services/assessmentService.ts` | 0D | Core services | Fetch user progress; award XP; list lessons |

**Commit:** `feat(mobile): student dashboard, modules, and lesson viewer`

---

### Wave 3 — Student Screens: Quiz, Tutor Chat, Battle, Rewards

| Group | Tasks | Dependencies | Deliverable | Verification |
|---|---|---|---|---|
| **3A Quiz** | `app/(student)/quiz/[id].tsx`: quiz generation, question rendering, timer, scoring, results screen | 2E | Quiz flow | Generate quiz; score answers; results show XP |
| **3B Tutor Chat** | `app/(student)/chat.tsx`: SSE streaming via `react-native-sse`, message list via `FlashList` inverted, markdown + KaTeX via WebView, session management | 2E | Chat streams | Streaming response appears in real time |
| **3C Quiz Battle** | `app/(student)/battle.tsx`: RTDB matchmaking, battle screens (lobby, in-progress, result), `onDisconnect` cleanup | 2E | Battle UI | Matchmaking queue works; game flow function |
| **3D Leaderboard** | `app/(student)/leaderboard.tsx`: leaderboard fetching, rank display, time filters | 2E | Leaderboard | Rankings load + filter correctly |
| **3E Rewards + Avatar** | `app/(student)/rewards.tsx`: XP display, badge grid, unlock animations; `app/(student)/avatar.tsx`: shop with layered avatar | 2E | Rewards + avatar | Badge unlock triggers animation; avatar purchase deducts XP |
| **3F Gamification Store** | Complete `stores/useGamificationStore.ts` | Wave 1 | Store ready | XP, level, streak state reactive |

**Commit:** `feat(mobile): quiz, chat, battle, leaderboard, rewards`

---

### Wave 4 — Teacher Screens

| Group | Tasks | Dependencies | Deliverable | Verification |
|---|---|---|---|---|
| **4A Teacher Dashboard** | `app/(teacher)/index.tsx` with stat cards, daily insight widget, risk summary | Wave 1 | Teacher dashboard | Data loads; risk indicators visible |
| **4B Students** | `app/(teacher)/students.tsx` (list) + `app/(teacher)/students/[id].tsx` (profile) | Wave 1 | Student management | Search works; profile drill-down |
| **4C Analytics** | `app/(teacher)/analytics.tsx` with charts | Wave 1 | Charts render | Victory Native charts display data |
| **4D Tasks + Content** | `app/(teacher)/tasks.tsx` (kanban/list) + `app/(teacher)/content/upload.tsx` (upload) | Wave 1 | Task + content screens | Task CRUD; PDF upload succeeds |
| **4E At-Risk + Insights** | `app/(teacher)/at-risk.tsx` + `app/(teacher)/insights.tsx` | Wave 1 | At-risk dashboard | Risk badges render; insight text readable |

**Commit:** `feat(mobile): teacher dashboard and student management`

---

### Wave 5 — Admin Screens + Shared (profile, settings, notifications, assessment)

| Group | Tasks | Dependencies | Deliverable | Verification |
|---|---|---|---|---|
| **5A Admin Dashboard** | `app/(admin)/index.tsx` — system stats, health cards | Wave 1 | Admin dashboard | System overview displays |
| **5B User Management** | `app/(admin)/users.tsx` — user list, search, CRUD, bulk | Wave 1 | User management | Search filter; create/edit user |
| **5C Content + Config** | `app/(admin)/content.tsx` + `app/(admin)/settings.tsx` + `app/(admin)/model-config.tsx` + `app/(admin)/rag.tsx` | Wave 1 | Admin config | Save settings; switch model profile |
| **5D Monitoring + Audit** | `app/(admin)/monitoring.tsx` + `app/(admin)/audit.tsx` | Wave 1 | Monitoring | Charts render; audit list scrolls |
| **5E Shared Screens** | `app/(student)/profile.tsx`, `app/(student)/settings.tsx`, `app/(student)/notifications.tsx`, `app/(student)/grades.tsx`, `app/(student)/tasks.tsx`, `app/(student)/calculator.tsx`, `app/(student)/check-in.tsx` | Wave 1 + 3F | Shared screens | All render + persist appropriately |
| **5F Diagnostic Assessment** | `app/(student)/assessment.tsx` with timer, `ProgressGate`, competency scoring | 3A | Assessment flow | Completes end-to-end; score saved to Firestore |
| **5G Shared Components** | Port `components/MathText.tsx`, `components/ChatMarkdown.tsx`, `components/FloatingAITutor.tsx`, `components/XPNotification.tsx`, `components/NotificationBell.tsx`, `components/ErrorBoundary.tsx`, `components/CompositeAvatar.tsx` | Wave 1 | Shared lib | Each component renders in isolation |

**Commit:** `feat(mobile): admin screens, shared components, notifications`

---

### Wave 6 — Polish, Accessibility, QA Gate

| Group | Tasks | Dependencies | Deliverable |
|---|---|---|---|
| **6A Error Handling** | Error boundaries per route stack; retry states; offline banner | All waves | Robust failure handling |
| **6B Performance** | Remove animation leaks; `remove()` all subscriptions; lazy-load heavy WebViews | All waves | No memory leaks; 60 fps scrolls |
| **6C Accessibility** | `accessibilityLabel`, `accessibilityHint`, `accessible={true}` on all interactive elements; color-contrast audit on every surface | All waves | WCAG 2.2 AA pass |
| **6D Haptics** | `expo-haptics` triggers: light on tap, medium on wrong answer, heavy on achievement unlock, notification on match found | All waves | Correct haptic at each trigger |
| **6E QA Checklist** | Execute Section 8 checklist; fix any failures; run on iOS Simulator + Android Emulator | All waves | All QA items `Pass` |
| **6F Rollout Prep** | Finalize `mobile/README.md`; document `mobile/docs/design-system.md`; confirm env vars | All waves | README + design docs complete |

**Commit:** `feat(mobile): polish, accessibility, and QA fixes`

---

## Section 6: Firebase Migration

### Config (no hardcoding)

```typescript
// lib/firebase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { auth, db, storage, cloudFunctions, realtimeDb, isRealtimeDbEnabled } from '@/lib/firebase';
```

### Persistence mapping

| What | Web | Mobile |
|---|---|---|
| Auth tokens | `browserLocalPersistence` | `getReactNativePersistence(AsyncStorage)` |
| Role cache | `localStorage` | `AsyncStorage` (fallback: `SecureStore`) |
| Firestore cache | `memoryLocalCache()` | Same (`memoryLocalCache()`) |
| Secure tokens | N/A | `expo-secure-store` (upgrade over web) |
| User settings | Firestore `users/{uid}` | Same — no change |

### Firestore rules
No schema changes. Same collections and paths: `users/`, `progress/`, `xpActivities/`, `achievements/`, `notifications/`, `tasks/`, `chatSessions/`, `chatMessages/`.

### RTDB (Quiz Battle)
Same `.read` / `.write` rules. `onDisconnect` semantics identical in React Native. Foreground-only matching in MVP.

### Storage
Same rules. Upload via `expo-image-picker` → `blob()` → `uploadBytes(storage.ref, blob)`.

---

## Section 7: Backend Integration

### API client pattern

```typescript
// services/apiService.ts
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const apiFetch = async (endpoint, options) => {
  const token = auth.currentUser?.getIdToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(...);
  return res.json();
};
```

### SSE streaming (AI Chat)

```typescript
// services/streamingService.ts
import { EventSource } from 'react-native-sse';

export function streamChat(url: string, token: string, body: any, callbacks: {
  onChunk: (chunk: string) => void;
  onEnd: () => void;
  onError: (err: Error) => void;
}) {
  const es = new EventSource(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  es.onmessage = (e) => callbacks.onChunk(JSON.parse(e.data).content);
  es.onend = () => { es.close(); callbacks.onEnd(); };
  es.onerror = () => { es.close(); callbacks.onError(new Error('Stream error')); };
  return () => es.close();
}
```

### Environment variables

```
# .env
EXPO_PUBLIC_API_URL=https://deign86-mathpulse-api-v3test.hf.space
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_DATABASE_URL=...
```

### File uploads
```typescript
// Photo
const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
const blob = await fetch(result.assets[0].uri).then(r => r.blob());
const ref = storage.ref(`users/${uid}/photo.jpg`);
await uploadBytes(ref, blob);

// PDF / document
const doc = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
// same uploadBytes path
```

---

## Section 8: QA Checklist

| # | Check | Pass/Fail | Evidence |
|---|---|---|---|
| 1 | TypeScript strict — zero `any` in new code | | `tsc --noEmit` |
| 2 | All Firestore `onSnapshot` listeners unsubscribed on unmount | | Code review + manual logoff test |
| 3 | No animation loop memory leaks (Reanimated worklets cancelled on unmount) | | Profile memory in Xcode Instruments / Android Profiler |
| 4 | Keyboard avoiding on all forms — iOS + Android tested | | Manual tap each form on both simulators |
| 5 | Safe area insets respected on iPhone 15+ (Dynamic Island) + Pixel 7+ | | Visual check in simulators |
| 6 | Tested on iOS Simulator + Android Emulator | | Simulator output screenshots |
| 7 | `EXPO_PUBLIC_API_URL` is source of truth — no hardcoded backend URL | | `grep -r "hf\.space" mobile/` returns 0 hits |
| 8 | No hardcoded Firebase config — all from env vars via `expo-constants` | | `grep -r "apiKey\|authDomain" mobile/src/lib/firebase.ts` — only constants |
| 9 | `expo-image` used for all remote images | | `grep -rn "Image("` vs `grep -rn "expo-image"` |
| 10 | Bundle size < 50 MB release | | `expo export --dump-sourcemap && npx source-map-explorer` |
| 11 | Auth persists across app restart | | Kill app → re-open → still logged in |
| 12 | Google OAuth works on iOS + Android | | Manual tap on both |
| 13 | AI chat streaming stays smooth (no frozen UI) | | Send 5-msg thread; observe scroll |
| 14 | Quiz battle RTDB matchmaking works (foreground) | | Open battle screen → queue message |
| 15 | Push notifications delivered via expo-notifications | | Send test notification → device alert |
| 16 | KaTeX math renders in WebView | | Load lesson + quiz with math |
| 17 | Zustand stores stay in sync (auth / gamification / chat) | | Tab between screens; XP and role persist |
| 18 | No `localStorage` / `sessionStorage` references remain | | `grep -r "localStorage\|sessionStorage" mobile/` returns 0 hits |
| 19 | Offline state handled (error boundary + retry button) | | Airplane mode → error screen visible |
| 20 | Back button (Android) dismisses every modal/sheet | | Press back on each modal on Android emulator |

---

## Section 9: Deliverables Checklist

| # | Deliverable | Status |
|---|---|---|
| 1 | Complete Expo project in `mobile/` directory | Pending |
| 2 | `mobile/docs/migration-plan.md` | ✅ This document |
| 3 | `mobile/docs/design-system.md` | Pending |
| 4 | `mobile/README.md` with setup + env vars + run instructions | Pending |
| 5 | All student screens implemented + passing QA | Pending |
| 6 | All teacher screens implemented + passing QA | Pending |
| 7 | All admin screens implemented + passing QA | Pending |
| 8 | Auth flow (email/password + Google) on iOS + Android | Pending |
| 9 | Firebase integration (Auth, Firestore, RTDB, Storage) | Pending |
| 10 | Backend API integration (chat streaming, quiz gen, RAG) | Pending |
| 11 | Push notifications (expo-notifications) | Pending |
| 12 | Design system base UI component library | Pending |
| 13 | Zustand stores (auth, gamification, chat, notifications) | Pending |
| 14 | Unit + integration tests for services + auth | Pending |

---

## Section 10: File Inventory (complete, all paths)

```
mobile/
├── app.json                          # Expo config (scheme, plugins, extra env)
├── app.config.ts                     # Expo config (type-safe)
├── babel.config.js                   # Babel with NativeWind preset
├── metro.config.js                   # Metro bundler config (assetExts)
├── tailwind.config.js                # NativeWind v4 config + design tokens
├── tsconfig.json                     # Strict TypeScript + paths alias "@/"
├── global.css                        # Tailwind directives + CSS custom properties
├── package.json
├── .env                              # EXPO_PUBLIC_* variables (gitignored)
├── .env.example
├── README.md
│
├── app/
│   ├── _layout.tsx                   # Root layout: font load, AuthProvider, splash
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx               # Auth stack
│   │   ├── login.tsx                 # Login + link to register
│   │   ├── register.tsx              # Signup + role select
│   │   └── reset-password.tsx        # Password reset
│   │
│   ├── (student)/
│   │   ├── _layout.tsx               # Student bottom tabs + header
│   │   ├── index.tsx                 # Student dashboard
│   │   ├── modules.tsx               # Module list
│   │   ├── modules/[id].tsx          # Module detail
│   │   ├── learn/[topic].tsx         # Lesson viewer (WebView+KaTeX)
│   │   ├── quiz/[id].tsx             # Quiz experience
│   │   ├── battle.tsx                # Quiz battle (RTDB)
│   │   ├── chat.tsx                  # AI tutor chat (SSE)
│   │   ├── leaderboard.tsx           # Leaderboard
│   │   ├── rewards.tsx               # Achievements + XP
│   │   ├── avatar.tsx                # Avatar shop
│   │   ├── check-in.tsx              # Daily check-in
│   │   ├── grades.tsx                # Grades / results
│   │   ├── tasks.tsx                 # Task board
│   │   ├── assessment.tsx            # Diagnostic assessment
│   │   ├── profile.tsx               # Profile
│   │   ├── settings.tsx              # Settings
│   │   └── notifications.tsx         # Notification center
│   │
│   ├── (teacher)/
│   │   ├── _layout.tsx               # Teacher bottom tabs
│   │   ├── index.tsx                 # Teacher dashboard
│   │   ├── students.tsx              # Student list
│   │   ├── students/[id].tsx         # Student profile
│   │   ├── analytics.tsx             # Class analytics
│   │   ├── tasks.tsx                 # Task management
│   │   ├── content/upload.tsx        # Content upload
│   │   ├── insights.tsx              # Daily AI insights
│   │   └── at-risk.tsx               # At-risk dashboard
│   │
│   └── (admin)/
│       ├── _layout.tsx               # Admin bottom tabs
│       ├── index.tsx                 # Admin dashboard
│       ├── users.tsx                 # User management
│       ├── content.tsx               # Content management
│       ├── content/upload.tsx        # PDF + RAG upload
│       ├── settings.tsx              # System settings
│       ├── model-config.tsx          # AI model config
│       ├── monitoring.tsx            # AI monitoring
│       ├── audit.tsx                 # Audit logs
│       └── rag.tsx                   # RAG manager
│
├── assets/
│   ├── fonts/                        # Inter family (loaded by expo-font)
│   └── images/                       # App icons, mascot, avatars
│
├── components/
│   ├── ui/                           # NativeWind base component library
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Text.tsx
│   │   ├── Input.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Progress.tsx
│   │   ├── Modal.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Switch.tsx
│   │   ├── Slider.tsx
│   │   ├── ScrollArea.tsx
│   │   ├── index.ts
│   │   └── utils.ts
│   │
│   ├── MathText.tsx                  # KaTeX via WebView
│   ├── ChatMarkdown.tsx              # Markdown + KaTeX in WebView
│   ├── FloatingAITutor.tsx           # FAB + expandable chat
│   ├── XPNotification.tsx            # Animated XP toast
│   ├── NotificationBell.tsx          # Badge + press to notifications
│   ├── MathAnswerInput.tsx           # Math input field
│   ├── CompositeAvatar.tsx           # Layered avatar builder
│   ├── ErrorBoundary.tsx             # React error boundary
│   ├── HeroBanner.tsx                # Gradient carousel banner
│   ├── LearningPath.tsx              # Learning path widget
│   ├── SupplementalPillCarousel.tsx  # Pill carousel
│   ├── ModuleCard.tsx                # Curriculum module card
│   ├── LessonViewer.tsx              # Scrollable lesson (WebView)
│   ├── QuizQuestion.tsx              # Question renderer
│   ├── ChatMessage.tsx               # Incoming/outgoing bubble
│   ├── BattleLobby.tsx               # Matchmaking UI
│   ├── BattleArena.tsx               # In-battle HUD
│   ├── BattleTimerBar.tsx            # Timer bar
│   ├── BattleHeader.tsx              # Battle header
│   ├── BattleFooter.tsx              # Battle controls
│   ├── LeaderboardRow.tsx            # Rank pill + name + score
│   ├── RewardCard.tsx                # Achievement card
│   ├── AvatarEditor.tsx              # Avatar layer editor
│   ├── StudentRiskCard.tsx           # Risk color-coded card
│   ├── AnalyticsChart.tsx            # Victory Native wrapper
│   └── TaskItem.tsx                  # Swipeable task row
│
├── contexts/                         # (retain if needed; prefer Zustand)
│   └── ChatContext.tsx
│
├── hooks/
│   ├── useAuth.ts                    # Convenience wrapper
│   ├── useKeyboard.ts                # Keyboard height / state
│   ├── useNetworkStatus.ts           # Online / offline
│   └── ...                          # Port others from src/hooks/
│
├── lib/
│   ├── firebase.ts                   # Mobile Firebase init (RN persistence)
│   └── queryClient.ts                 # TanStack Query client (same client)
│
├── services/
│   ├── authService.ts                # Port of web authService (RN-adjusted)
│   ├── apiService.ts                 # Port of web apiService types + fetch
│   ├── streamService.ts             # SSE streaming via react-native-sse
│   ├── progressService.ts            # Progress tracking
│   ├── lessonService.ts              # Lesson generation
│   ├── lessonQuizService.ts          # Quiz generation
│   ├── quizService.ts                # Quiz logic
│   ├── quizBattleService.ts          # RTDB matchmaking
│   ├── leaderboardService.ts         # Leaderboard data
│   ├── gamificationService.ts        # XP, level, streak, achievements
│   ├── achievementCheckerService.ts  # Achievement unlock logic
│   ├── notificationService.ts        # Notifications
│   ├── pushNotificationService.ts    # Expo push tokens
│   ├── diagnosticService.ts          # Diagnostic assessment
│   ├── assessmentService.ts          # Assessment scoring
│   ├── chatService.ts                # Chat session
│   ├── settingsService.ts            # Settings CRUD
│   ├── classAnalyticsService.ts      # Teacher analytics
│   ├── taskService.ts                # Task CRUD
│   ├── studentService.ts             # Student data
│   ├── riskService.ts                # Risk engine
│   ├── adminService.ts               # Admin API
│   ├── platformConfigService.ts      # Model config
│   ├── aiMonitoringService.ts        # Monitoring
│   └── gradesService.ts              # Grades & results
│
├── stores/
│   ├── useAuthStore.ts               # Auth state (user, role, loading)
│   ├── useGamificationStore.ts       # XP, level, streak, daily reward state
│   ├── useChatStore.ts              # Chat sessions, active session
│   └── useNotificationStore.ts       # Notifications, unread count
│
├── types/
│   ├── models.ts                     # User + role discriminated unions
│   ├── assessment.ts                 # Diagnostic + quiz types
│   ├── competency.ts                 # Competency matrix types
│   ├── curriculum.ts                 # Subject / module / topic types
│   ├── rewards.ts                    # Achievement + XP types
│   ├── hfMonitoring.ts              # Monitoring types
│   └── settings.ts                   # Settings types
│
├── data/
│   ├── curriculumModules.ts          # Local curriculum fallback
│   ├── curriculumTemplates.ts
│   ├── avatarData.ts                 # Avatar shop catalog
│   ├── rewardCatalog.ts              # Achievement catalog
│   ├── subjects.ts
│   └── types.ts
│
├── utils/
│   ├── chatMessageFormatting.ts      # Markdown + LaTeX preprocess
│   ├── mathScope.ts                  # Math expression detection
│   ├── rateLimitHandler.ts           # Retry / backoff
│   └── chatPreview.ts                # Message preview
│
├── docs/
│   ├── mobile-migration-plan.md      # This document
│   └── design-system.md              # Token reference
│
└── __tests__/
    ├── authService.test.ts
    ├── apiService.test.ts
    ├── streamService.test.ts
    ├── useAuthStore.test.ts
    ├── gamificationService.test.ts
    └── quizService.test.ts
```

---

## Section 11: Commit Strategy

### Branch Map
```
main
  └── feat/mobile-migration
       ├── 0-scaffold      (Wave 0)
       ├── 1-auth          (Wave 1)
       ├── 2-student-core  (Wave 2)
       ├── 3-student-quiz  (Wave 3)
       ├── 4-teacher       (Wave 4)
       ├── 5-admin         (Wave 5)
       └── 6-polish        (Wave 6)
```

### Atomic Commit Convention
```
feat(mobile): <scope> — <description>
Examples:
feat(mobile): scaffold — Expo project with NativeWind and Firebase
feat(mobile): auth — email/password and Google OAuth login flow
feat(mobile): student — dashboard with progress and XP
feat(mobile): teacher — class analytics dashboard
feat(mobile): admin — user management and audit logs
feat(mobile): polish — accessibility, haptics, loading states
```

### Pre-commit Hooks
```bash
npx tsc --noEmit                  # strict type check
npx eslint . --ext .ts,.tsx       # lint
npx jest --passWithNoTests        # tests green
```

---

## Section 12: Known Risks + Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| NativeWind v4 styles do not apply inside Reanimated animated views | Styling breaks on screen transitions | Fallback to `StyleSheet.create()` inside animated components; keep NativeWind for static markup |
| `react-native-sse` drops events on poor network | Chat interruptions | Implement chunk buffer + exponential reconnect; show “reconnecting…” banner |
| Android `getReactNativePersistence` returns `null` for some configs | User logged out on restart | Fallback: manually write token to `SecureStore`; detect null persistence and force SecureStore |
| WebView KaTeX bundle latency on low-end Android | Slow lesson render | Pre-load KaTeX CDN; show skeleton spinner; cache rendered HTML in Firestore |
| RTDB `onDisconnect` unreliable when app in background | Ghost matches remain in queue | Enforce foreground-only matchmaking in MVP; clear queue on app visibility change |
| Bundle size > 50 MB | App Store / Play Store rejection | Tree-shake Firebase auth-only bundle; `expo build:android --no-workspace-tag`; lazy-load teacher/admin tabs |
| `expo-auth-session` Google OAuth redirect fails on Android TWA | Auth loop never completes | Use `AuthSession.startAsync` with `useProxy: true` for dev; register native scheme for production |

---

## Section 13: Estimation

| Wave | Estimated effort | Risk |
|---|---|---|
| 0 Scaffold + Design System + Firebase | 2–3 days | Low |
| 1 Auth + Navigation | 3–4 days | Medium (OAuth edge cases) |
| 2 Student Core (Dashboard + Modules + Lessons) | 5–7 days | Medium |
| 3 Student Quiz + Chat + Battle + Rewards | 5–7 days | High (RTDB, SSE, WebView) |
| 4 Teacher Screens | 4–5 days | Low |
| 5 Admin + Shared + Assessment | 4–5 days | Low |
| 6 Polish + QA | 3–4 days | Medium |
| **Total** | **26–35 days** | |

