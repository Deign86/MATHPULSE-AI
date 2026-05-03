# MathPulse AI — Product Context

## User Roles & Flows

### Students
- Sign up via email/password or Google OAuth
- Complete IAR diagnostic on first login (`iar_only` or `iar_plus_diagnostic` mode)
- BrowseModules page → select topic → start lesson/quiz
- AI Chat page for 1:1 math tutoring (L.O.L.I. — Learning Optimizer with Layered Intelligence)
- Quiz Battle for real-time multiplayer matches (XP rewards)
- Grades page to view performance, TeacherDashboard to see class progress
- Leaderboard for global rankings, Avatar Studio for customization

### Teachers
- TeacherDashboard: class overview, student list with risk indicators (🚨 high, ⚠️ medium, ✅ low)
- Generate curriculum content: AI-powered lessons and quizzes
- Upload class records (CSV/Excel) with AI column mapping
- View daily AI insights for classroom management
- Student progress tracking and intervention assignment

### Admins
- AdminDashboard with analytics, user management, content management
- AI monitoring: track DeepSeek and HuggingFace usage/spend
- Audit log for system changes
- Runtime AI model configuration (switch profiles: dev/budget/prod)

## Core Feature Flows

### IAR (Initial Assessment & Review)
1. Student completes diagnostic assessment on first login
2. Results determine learning path placement
3. At-risk students flagged for `deep_diagnostic_required`
4. Automatic reassessment sweeps every 30 days for inactive students

### Quiz Generation (AI)
1. Teacher requests quiz via TeacherDashboard or QuizMaker
2. Backend calls DeepSeek with Bloom's Taxonomy prompt
3. Generated quiz saved to Firestore, published to assigned students
4. Student receives notification, completes quiz
5. Quiz submission triggers `onQuizSubmitted` function → risk recalculation

### Quiz Battle Matchmaking
1. Student joins public queue (Firebase Realtime Database)
2. `quizBattleResolvePublicMatchmakingSweep` matches players by skill tier
3. Match starts → 10 rounds of timed math questions
4. Results saved, XP awarded to participants

### RAG Lesson Generation
1. Teacher selects weak topic from diagnostic results
2. Backend retrieves curriculum context from vector store (BAAI/bge-small-en-v1.5)
3. DeepSeek reasoner generates lesson grounded in DepEd curriculum
4. Lesson displayed in LessonViewer with interactive elements

### Chat (L.O.L.I.)
1. Student sends message in AI Chat page
2. Frontend streams to `/api/chat/stream` (SSE)
3. Backend verifies math accuracy via self-consistency + code execution
4. Streaming response with continue-on-timeout support
5. Chat history persisted in Firestore per session

## Gamification System

| Element | Description |
|---------|-------------|
| **XP** | Awarded for lessons completed, quizzes passed, battles won. Formula: `100 * 1.5^level` |
| **Streaks** | Daily activity tracked. Bonus XP for consecutive days |
| **Achievements** | Unlockable milestones: first lesson, perfect score, week streak, etc. |
| **Levels** | Exponential curve starting at 0. Each level requires more XP |
| **Leaderboard** | Global rankings + scoped by time period |
| **Avatar Shop** | In-app currency to purchase avatar customization items |

## Notification System

- Firebase Cloud Messaging for push notifications
- In-app notification bell with real-time subscriptions
- Notification types: quiz assigned, IAR completed, streak reminder, leaderboard update, etc.

## Settings & Privacy

- Per-user settings: notifications, appearance (theme), privacy, learning preferences
- Data export: users can request their data snapshot
- Account deletion with data purge option

## Content Generation Limits

| Resource | Limit |
|----------|-------|
| Upload max file size | 5MB |
| Upload max rows | 2000 |
| Upload max columns | 60 |
| Upload max PDF pages | 20 |
| Chat stream idle timeout | 90s |
| Chat stream total timeout | 900s |