# MathPulse AI - Setup Instructions

## 🚀 Firebase Backend Integration

This project is now fully integrated with Firebase for authentication, database, and storage.

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Firebase account

### Setup Steps

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the project: **mathpulse-ai-edu**
3. Navigate to **Project Settings** > **General** > **Your apps**
4. Find your Web App and copy the configuration values

#### 3. Set Environment Variables

1. Copy the environment template:
   ```bash
   copy .env.example .env.local
   ```
   
2. Edit `.env.local` and replace `your_api_key_here` with your actual Firebase API key
3. The other values should already be correct for the mathpulse-ai-edu project

#### 4. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

This will deploy the security rules that protect your data.

#### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 🎯 Features Integrated with Firebase

#### Authentication
- ✅ Email/Password sign-up and sign-in
- ✅ Google Sign-In (configured)
- ✅ User roles (Student, Teacher, Admin)
- ✅ Profile management

#### Database (Firestore)
- ✅ User profiles with role-based data
- ✅ Progress tracking (lessons, quizzes, modules)
- ✅ Gamification (XP, levels, streaks, achievements)
- ✅ Leaderboards (global and friends)
- ✅ Friends system (requests, friendships)
- ✅ Notifications
- ✅ Tasks/To-do lists
- ✅ AI Chat sessions and messages

#### Security
- ✅ Comprehensive Firestore security rules
- ✅ Role-based access control
- ✅ User data isolation
- ✅ Admin and teacher access levels

### 📁 Project Structure

```
src/
├── lib/
│   └── firebase.ts              # Firebase initialization
├── services/
│   ├── authService.ts           # Authentication functions
│   ├── progressService.ts       # Progress tracking
│   ├── gamificationService.ts   # XP, levels, achievements
│   ├── friendsService.ts        # Friends functionality
│   ├── notificationService.ts   # Notifications
│   ├── taskService.ts           # Task management
│   └── chatService.ts           # AI chat integration
├── types/
│   └── models.ts                # TypeScript interfaces
├── contexts/
│   ├── AuthContext.tsx          # Authentication context
│   └── ChatContext.tsx          # Chat context
└── components/
    └── ...                      # UI components

firebase.json                     # Firebase configuration
firestore.rules                   # Security rules
.env.example                      # Environment template
.env.local                        # Your actual config (not in git)
```

### 🔧 Available Services

#### Authentication Service (`authService.ts`)
```typescript
import { signInWithEmail, signUpWithEmail, signOutUser } from './services/authService';

// Sign up
await signUpWithEmail(email, password, name, role);

// Sign in
await signInWithEmail(email, password);

// Sign out
await signOutUser();
```

#### Progress Service (`progressService.ts`)
```typescript
import { completeLesson, completeQuiz, getUserProgress } from './services/progressService';

// Complete a lesson
await completeLesson(userId, subjectId, moduleId, lessonId, timeSpent, xpReward);

// Complete a quiz
await completeQuiz(userId, subjectId, moduleId, quizId, score, answers, timeSpent);
```

#### Gamification Service (`gamificationService.ts`)
```typescript
import { awardXP, updateStreak, getLeaderboard } from './services/gamificationService';

// Award XP
await awardXP(userId, xpAmount, type, description);

// Update daily streak
await updateStreak(userId);

// Get leaderboard
const leaderboard = await getLeaderboard(userId, friendsOnly, timeRange, limit);
```

### 🎮 Demo Accounts

The app includes demo accounts for testing:

- **Student**: demo-student@mathpulse.ai
- **Teacher**: demo-teacher@mathpulse.ai
- **Admin**: demo-admin@mathpulse.ai
- **Password**: Demo@123456

These accounts will be created automatically when you first sign in using the "Quick Access" buttons.

### 🔒 Security

- All sensitive data is protected by Firestore security rules
- User authentication is required for all operations
- Role-based access control for admin and teacher features
- Environment variables keep API keys secure

### 📝 Next Steps

1. **Get your Firebase API key**: Go to Firebase Console and copy your web app's API key
2. **Update .env.local**: Add the API key to your `.env.local` file
3. **Deploy rules**: Run `firebase deploy --only firestore:rules`
4. **Start coding**: The backend is ready to use!

### 🆘 Troubleshooting

**Issue**: Authentication errors
- Check that your API key in `.env.local` is correct
- Verify that Email/Password auth is enabled in Firebase Console

**Issue**: Permission denied errors
- Deploy the Firestore rules: `firebase deploy --only firestore:rules`
- Check that your user has the correct role in Firestore

**Issue**: Data not saving
- Check browser console for errors
- Verify Firestore rules are deployed
- Ensure you're authenticated

### 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [React + Firebase Tutorial](https://firebase.google.com/docs/web/setup)

---

Happy coding! 🎉
