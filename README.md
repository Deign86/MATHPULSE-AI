<div align="center">

# 🧮 MathPulse AI

### AI-Powered Math Education Platform

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An interactive, gamified math learning platform featuring AI-powered tutoring, role-based dashboards, and personalized learning paths for students, teachers, and administrators.

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🎓 For Students
- **Personalized Learning Paths** — AI-generated study plans tailored to individual skill levels
- **Interactive Lessons** — Step-by-step lessons across Algebra, Geometry, Calculus, and more
- **Quiz Experiences** — Timed quizzes with instant feedback and detailed explanations
- **Diagnostic Assessments** — Skill-level evaluation to customize the learning journey
- **AI Chat Tutor** — On-demand math help powered by Qwen 2.5 language model
- **Gamification System** — Earn XP, level up, maintain streaks, and unlock achievements
- **Leaderboard** — Compete with peers and track rankings
- **Friends & Social** — Add friends, compare stats, and learn together

### 👩‍🏫 For Teachers
- **Teacher Dashboard** — Monitor student progress and performance at a glance
- **Student Management** — View individual student profiles, grades, and at-risk indicators
- **Task Assignment** — Create and manage student tasks and assignments
- **Performance Analytics** — Track class-wide and per-student metrics with visual charts

### 🔧 For Administrators
- **Admin Dashboard** — Platform-wide analytics and management tools
- **User Management** — Create, edit, and manage all user accounts
- **Content Management** — Administer educational content and curriculum
- **Audit Logs** — Track all administrative actions for accountability
- **System Settings** — Configure platform-wide settings

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework with functional components and hooks |
| **TypeScript** | Type-safe development |
| **Vite** | Fast dev server and optimized builds |
| **Tailwind CSS 4** | Utility-first styling |
| **Radix UI** | Accessible, unstyled component primitives |
| **Framer Motion** | Smooth animations and transitions |
| **Recharts** | Data visualization and charts |
| **Lucide React** | Icon library |
| **Sonner** | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | Python API framework for AI endpoints |
| **Hugging Face Hub** | AI model inference (Qwen 2.5, BART) |
| **Firebase Auth** | Email/password & Google authentication |
| **Cloud Firestore** | NoSQL database for all app data |
| **Firebase Storage** | File and media storage |

### AI Models
| Model | Use Case |
|---|---|
| **Qwen/Qwen2.5-3B-Instruct** | Chat tutoring, learning path generation, student insights |
| **facebook/bart-large-mnli** | Student risk classification (zero-shot) |

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- **Python** ≥ 3.10 (for backend)
- A **Firebase** project ([setup guide](FIREBASE_SETUP.md))
- A **Hugging Face** API token (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Deign86/MATHPULSE-AI.git
   cd MATHPULSE-AI
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the project root:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the frontend dev server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`.

5. **Set up the backend** (optional, for AI features)
   ```bash
   cd backend
   pip install -r requirements.txt
   export HF_TOKEN=your_huggingface_token
   uvicorn main:app --reload --port 8000
   ```

### Build for Production
```bash
npm run build
```
Output will be in the `build/` directory.

## 🏗 Architecture

```
MATHPULSE-AI/
├── src/
│   ├── App.tsx                  # Root component with routing & layout
│   ├── main.tsx                 # Application entry point
│   ├── components/              # React components
│   │   ├── *Page.tsx            # Full-page views
│   │   ├── *Modal.tsx           # Dialog overlays
│   │   ├── *Widget.tsx          # Small reusable blocks
│   │   └── ui/                  # Radix-based primitives
│   ├── contexts/                # React context providers
│   │   ├── AuthContext.tsx      # Authentication state
│   │   └── ChatContext.tsx      # AI chat session state
│   ├── services/                # Firebase & API service layer
│   │   ├── authService.ts       # Auth operations
│   │   ├── progressService.ts   # Learning progress tracking
│   │   ├── gamificationService.ts # XP, levels, streaks
│   │   ├── friendsService.ts    # Social features
│   │   ├── chatService.ts       # AI chat management
│   │   └── ...
│   ├── types/
│   │   └── models.ts            # TypeScript type definitions
│   ├── data/
│   │   └── subjects.ts          # Static curriculum data
│   └── lib/
│       └── firebase.ts          # Firebase configuration
├── backend/
│   ├── main.py                  # FastAPI application
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Container configuration
├── firestore.rules              # Firestore security rules
└── firebase.json                # Firebase project config
```

### Key Design Patterns

- **Service Layer Abstraction** — All Firebase/API operations are isolated in `src/services/`. Components never make direct database calls.
- **Role-Based Access** — Single `users` collection with discriminated union types (`student | teacher | admin`) controlling UI rendering and data access.
- **Context-Based State** — `AuthContext` for global auth state, `ChatContext` for AI chat sessions, component-level `useState` for UI state.
- **Real-Time Data** — Firebase `onSnapshot` listeners for live data updates.

### Firestore Collections
```
users/              → User profiles (role-discriminated)
progress/           → Learning progress per user
xpActivities/       → XP earning history
achievements/       → User achievements
friendRequests/     → Pending friend requests
friendships/        → Active friendships
notifications/      → User notifications
tasks/              → Student tasks/assignments
chatSessions/       → AI chat sessions
chatMessages/       → Chat message history
```

## 📡 API Reference

The FastAPI backend exposes the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | Send a message to the AI tutor |
| `POST` | `/learning-path` | Generate a personalized learning path |
| `POST` | `/student-insights` | Get AI-powered student performance insights |
| `POST` | `/classify-risk` | Classify student risk level (zero-shot) |
| `POST` | `/upload-grades` | Upload and parse grade files (CSV/XLSX/PDF/DOCX) |
| `GET`  | `/health` | Health check endpoint |

Full API documentation is available at `/docs` when the backend is running.

## 🎮 Gamification System

| Feature | Details |
|---|---|
| **XP Rewards** | Fixed XP per action (e.g., 50 XP per lesson completion) |
| **Leveling** | Exponential curve: `XP_needed = 100 × 1.5^(level - 1)` |
| **Streaks** | Daily login tracking with bonus XP (5 XP × streak days, max 50) |
| **Achievements** | Unlocked via specific user actions and milestones |
| **Leaderboard** | Global and friend-based rankings |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Conventions
- **Components**: PascalCase in `src/components/`
- **Services**: camelCase in `src/services/`
- **Types**: Centralized in `src/types/models.ts`
- **Imports**: Relative paths (no path aliases)
- **Styling**: Tailwind CSS utility classes, mobile-first responsive design

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Deign86** — [GitHub](https://github.com/Deign86)

---

<div align="center">
  <sub>Built with ❤️ for math education</sub>
</div>
