# MathPulse AI - Development Guide

## Tooling Policy

- Use standard built-in tools for context gathering and shell operations.
- Use external documentation tools only when they are relevant to the task.
- When a user pastes images or PDFs in chat, always use the MarkItDown MCP (`mcp_markitdown_convert_to_markdown`) first to extract content for lower token usage and better understanding.

## Mandatory Prompt Context Contract (Non-Negotiable)

- For every user prompt, all agents and subagents must load and apply this file before planning, tool calls, or final output.
- Prompt-start checklist is required on every prompt:
  1. Re-read `.github/copilot-instructions.md` and `AGENTS.md`.
  2. Load task-relevant source-of-truth files before making claims (for inference/model claims, always read `config/models.yaml` and `backend/config/models.yaml`).
  3. If a subagent is used, include these exact constraints in the subagent prompt and require the subagent to follow them.
- Precedence rule for conflicting information:
  - Runtime config and code > instruction files > README/docs.
  - If docs conflict with runtime config, update docs to match runtime config.

## Current System Context (April 2026 Source of Truth)

- Frontend stack: React 18 + TypeScript + Vite + Firebase + Tailwind CSS v4 + Radix UI + Motion (`motion/react`).
- Backend stack: FastAPI + Hugging Face Inference routing via `backend/services/inference_client.py`.
- Global primary model is `Qwen/Qwen3-32B` (source: `config/models.yaml` and `backend/config/models.yaml`).
- Task routing maps all key tasks to `Qwen/Qwen3-32B` (chat, verify_solution, lesson_generation, quiz_generation, learning_path, daily_insight, risk_classification, risk_narrative).
- Chat fallback policy is strict-primary-only (`chat: []` in `task_fallback_model_map`). `verify_solution` is configured with explicit fallback models in the model config files, but those fallbacks are only effective when the backend Qwen-only enforcement lock is disabled; with the default `INFERENCE_ENFORCE_QWEN_ONLY=true`, runtime behavior remains Qwen-only and the per-task fallback chains are cleared.
- Provider routing is `hf_inference` across key tasks in both config files.
- When model/version wording appears elsewhere (for example in README), treat the two model config files as authoritative, but resolve any conflict in favor of runtime config/code.

## Copilot Skill Invocation Policy

- ALWAYS auto-invoke `ui-ux-pro-max` whenever a task changes UI, UX, or visual behavior.
- This includes both explicit UI requests and implicit UI edits in mixed tasks.
- Trigger auto-invocation when touching frontend files such as `src/components/**`, `src/features/**`, `src/styles/**`, `src/App.tsx`, and `index.html`.
- Trigger auto-invocation for UI-impacting changes even outside those paths (layout, spacing, typography, color, animation, responsiveness, accessibility, interaction states, or component structure).
- For mixed tasks, apply `ui-ux-pro-max` to the UI portion while still following all architecture and service-layer rules in this guide.
- Skip this skill only when a task is strictly non-UI (backend/API/data/infrastructure with no UI surface changes).

## Architecture Overview

**Tech Stack**: React 18 + TypeScript + Vite + Firebase (Auth, Firestore, Storage)  
**UI Framework**: Radix UI primitives + Tailwind CSS + Motion for React (`motion/react`)  
**Project Type**: Educational platform with role-based access (Student/Teacher/Admin)

### Key Architectural Patterns

**Service Layer Abstraction**: All Firebase operations are isolated in `src/services/`:
- `authService.ts` - Authentication (email/password, Google), profile creation
- `progressService.ts` - Lesson/quiz completion tracking
- `gamificationService.ts` - XP, levels, streaks, achievements, leaderboards
- `friendsService.ts` - Social features (friend requests, search)
- `notificationService.ts` - User notifications
- `taskService.ts` - Task CRUD operations
- `chatService.ts` - AI chat session management

**State Management**:
- `AuthContext` (global) - User authentication state via `useAuth()` hook
- `ChatContext` (global) - AI chat history and sessions  
- Component-level `useState` for UI state
- Firebase real-time listeners for data subscriptions

**Role-Based Profile System**: Single `users` collection with discriminated union types:
```typescript
type UserRole = 'student' | 'teacher' | 'admin';
// StudentProfile extends User with level, XP, streak, friends
// TeacherProfile extends User with teacherId, students
// AdminProfile extends User with adminId, department
```

## Development Workflows

### Running the Project
```bash
npm install          # First time setup
npm run dev          # Dev server on localhost:3000
npm run build        # Production build
```

### Firebase Configuration
- Config in `src/lib/firebase.ts` loaded from env vars
- Environment variables in `.env.local` (VITE_FIREBASE_* prefix)
- See `.env.example` for required variables

### Testing Locally
- Use demo accounts or create test users for each role
- Firestore emulator not configured - uses live Firebase
- Check browser console for Firebase debug logs (`🔥 Firebase Config:`)

## Code Conventions

### File Organization
- **Components**: `src/components/[Name].tsx` - PascalCase
  - `*Page.tsx` - Full-page views
  - `*Modal.tsx` - Dialog overlays
  - `*Widget.tsx` - Small reusable blocks
  - `ui/` - Radix-based primitives (kebab-case)
- **Services**: `src/services/[name]Service.ts` - camelCase
- **Types**: Centralized in `src/types/models.ts`

### TypeScript Patterns
All components use typed props interfaces:
```typescript
interface ComponentNameProps {
  userId: string;
  onClose: () => void;
  // Props defined inline at top of file
}

const ComponentName: React.FC<ComponentNameProps> = ({ userId, onClose }) => {
  // Functional component with hooks
};
```

### Import Patterns
**NO PATH ALIASES** - Use relative imports:
```typescript
import { signIn } from '../services/authService';
import { Button } from '../components/ui/button';
import { StudentProfile } from '../types/models';
import { useAuth } from '../contexts/AuthContext';
```

Exception: `@` alias points to `./src` in vite.config.ts but rarely used

## Firebase Integration

### Firestore Collections Structure
```
users/              → User profiles (role-based)
progress/           → Learning progress per user
xpActivities/       → XP earning history
achievements/       → User achievements
friendRequests/     → Pending friend requests
friendships/        → Active friendships
notifications/      → User notifications
tasks/              → Student tasks
chatSessions/       → AI chat sessions
chatMessages/       → Chat message history
```

### Writing to Firebase
Always use service functions, never direct Firestore calls in components:
```typescript
// ✅ Good - Component calls service
await completeLesson(userId, lessonId, timeSpent, score);
await addXP(userId, 50, 'lesson_complete', lessonId);

// ❌ Bad - Direct Firestore in component
const docRef = doc(db, 'progress', userId);
await updateDoc(docRef, { ... });
```

### Authentication Flow
1. User signs in via `LoginPage` → calls `signInWithEmail()` or `signInWithGoogle()`
2. `AuthProvider` detects auth state change via `onAuthStateChanged`
3. Fetches user profile from Firestore → `getUserProfile(uid)`
4. Components access via `const { userProfile, userRole, isLoggedIn } = useAuth()`

### Progress Tracking Pattern
```typescript
// Complete a lesson
await completeLesson(userId, lessonId, timeSpentSeconds, scorePercent);
// Automatically updates: lessons collection, progress doc, awards XP
```

## Component Patterns

### Modal Components
Modals use Radix `Dialog` primitive with consistent pattern:
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Modal content */}
  </DialogContent>
</Dialog>
```

### Loading & Error States
Always provide user feedback for async operations:
```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleAction = async () => {
  setLoading(true);
  setError('');
  try {
    await someAsyncOperation();
    toast.success('Success message');
  } catch (err) {
    setError(err.message);
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Responsive Design
Mobile-first with Tailwind breakpoints:
```jsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

## Data & Content

### Static Subject Data
Educational content defined in `src/data/subjects.ts`:
- Subjects (Algebra, Geometry, Calculus, etc.)
- Modules per subject with lessons and quizzes
- Progress percentages, completion states, locked states

### Gamification System
**XP Formula**: Fixed amounts per action (e.g., 50 XP per lesson)  
**Leveling**: Exponential - `XP_needed = 100 * 1.5^(level-1)`  
**Streaks**: Daily login tracking with bonus XP (5 XP × streak days, max 50)  
**Achievements**: Predefined in `gamificationService.ts`, unlocked via user actions

### Profile Data Sync
App.tsx maintains local state synced with Firebase:
```tsx
useEffect(() => {
  if (studentProfile && userRole === 'student') {
    setUserLevel(studentProfile.level || 1);
    setCurrentXP(studentProfile.currentXP || 0);
    // Sync gamification state from Firebase profile
  }
}, [userProfile, userRole]);
```

## Common Pitfalls

### Vite Import Paths
Vite uses `import.meta.env` not `process.env`:
```typescript
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
```

### Async State Updates
After Firebase writes, local state may be stale. Either:
1. Re-fetch from Firebase after mutation
2. Use Firestore real-time listeners (`onSnapshot`)
3. Update local state optimistically

### Role Checking
Always check `userRole` before rendering role-specific UI:
```tsx
{userRole === 'student' && <StudentDashboard />}
{userRole === 'teacher' && <TeacherDashboard />}
{userRole === 'admin' && <AdminDashboard />}
```

### Date Handling
Firebase uses `serverTimestamp()` which returns `Timestamp` objects:
```typescript
createdAt: serverTimestamp()  // Write
userData.createdAt.toDate()   // Read
```

## Quick Reference

### Adding a New Feature
1. Define types in `src/types/models.ts`
2. Create service functions in `src/services/[name]Service.ts`
3. Build UI component in `src/components/`
4. Update Firestore rules in `firestore.rules` if needed
5. Add to navigation in `App.tsx` or `Sidebar.tsx`

### Debugging Firebase
- Check browser console for `🔥 Firebase Config:` and `🚨 Error` logs
- Verify Firestore rules allow your operation
- Check Firebase console for data structure
- Use `console.log` liberally in service functions

### UI Components
Radix UI components in `src/components/ui/` - import and use directly:
```tsx
import { Button } from '@/components/ui/button';
<Button variant="default" size="lg" onClick={handleClick}>
```

### Style Utilities
- `clsx()` or `cn()` for conditional classes
- Tailwind CSS for all styling
- CSS variables in `src/styles/globals.css`
- Framer Motion for animations (`motion.div`, `AnimatePresence`)

---

## UI UX Pro Max Skill

> Based on [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill). Use this as the visual and UX source-of-truth for UI work in this repo.

### Invocation Rules

- Use this skill when the request is explicitly frontend design-oriented or when a UI-heavy task benefits from a stronger design profile.
- Use `ui-ux-pro-max` recommendations (style, palette, typography, UX rules) before implementing UI.
- Translate the chosen profile into this stack: React 18 + TypeScript + Tailwind CSS + Radix UI + Motion for React.

### Design Thinking

Before coding any new component or page, understand the context and commit to a **bold** aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it? (Students, Teachers, Admins — each audience may warrant a different feel.)
- **Tone**: Pick a clear direction: playful/toy-like for student dashboards, refined/editorial for teacher views, utilitarian/clean for admin panels. Other flavors to draw from: retro-futuristic, organic/natural, luxury/refined, brutalist/raw, art deco/geometric, soft/pastel, maximalist chaos, etc.
- **Constraints**: Must use the existing stack (React + TS + Tailwind + Radix UI primitives + `motion/react`). Mobile-first responsive. Accessible.
- **Differentiation**: What makes this **UNFORGETTABLE**? What's the one thing someone will remember about this screen?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is **intentionality**, not intensity.

Then implement working code that is:
- Production-grade, typed, and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

### Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the UI. Pair a distinctive display font with a refined body font. Import via Google Fonts `<link>` in `index.html` or `@import` in `src/styles/globals.css`.
- **Color & Theme**: Commit to a cohesive aesthetic. Use Tailwind CSS custom properties and `src/styles/globals.css` CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use `motion/react` (`motion.div`, `AnimatePresence`, staggered `variants`) for animations and micro-interactions. Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density. Tailwind's grid/flex utilities + arbitrary values make this easy.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Apply creative forms like gradient meshes (`bg-gradient-to-*`), noise textures, geometric patterns, layered transparencies (`backdrop-blur`, `bg-opacity-*`), dramatic shadows, decorative borders, and grain overlays.

**NEVER** use generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No two pages should look the same. Vary between light and dark themes, different fonts, different aesthetics. **NEVER** converge on common choices (Space Grotesk, for example) across generations.

### Implementation Rules (MathPulse-specific)

1. **Components**: Use Radix UI primitives from `src/components/ui/` as the accessible foundation, then style boldly with Tailwind.
2. **Animations**: Import from `motion/react` — never raw CSS keyframes when Motion can do it better.
   ```tsx
   import { motion, AnimatePresence } from 'motion/react';
   ```
3. **Responsive**: Mobile-first with Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
4. **Dark mode**: Respect `dark:` variant classes; the skill should produce designs that look excellent in both modes.
5. **Conditional classes**: Always use `cn()` (from `src/lib/utils` or `clsx`) — never string concatenation.
6. **CSS variables**: Extend the existing variables in `src/styles/globals.css`; don't create separate stylesheets.
7. **Icons**: Use Lucide React icons already in the project.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Don't hold back — show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
