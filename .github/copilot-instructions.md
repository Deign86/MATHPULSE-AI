# MathPulse AI - Development Guide

## Architecture Overview

**Tech Stack**: React 18 + TypeScript + Vite + Firebase (Auth, Firestore, Storage)  
**UI Framework**: Radix UI primitives + Tailwind CSS + Framer Motion  
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
npm run dev          # Dev server on localhost:5173
npm run build        # Production build
```

### Firebase Configuration
- Config in `src/lib/firebase.ts` with fallback hardcoded values
- Environment variables in `.env.local` (VITE_FIREBASE_* prefix)
- Project ID: `mathpulse-ai-2026` (see `FIREBASE_CONNECTION_STATUS.md`)

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
