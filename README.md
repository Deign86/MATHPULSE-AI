<div align="center">

# 🧮 MathPulse AI

### AI-Powered Math Education Platform

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-API-171PA1?logo=robot&logoColor=white)](https://deepseek.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An interactive, gamified math learning platform featuring AI-powered tutoring via DeepSeek, role-based dashboards, and personalized learning paths for students, teachers, and administrators.

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🎓 For Students
- **Diagnostic Assessments** — Skill-level evaluation on first login to identify at-risk subjects and customize the learning journey
- **Personalized Learning Paths** — AI-generated study plans tailored to individual skill levels and weaknesses
- **Interactive Lessons** — Step-by-step lessons across Algebra, Geometry, Calculus, Trigonometry, Statistics, and more
- **Quiz Experiences** — Timed quizzes with instant feedback, detailed explanations, and score tracking
- **Practice Center** — Dedicated practice area for reinforcing concepts
- **AI Chat Tutor** — On-demand math help via DeepSeek with smart streaming, continuation detection, and automatic completion repair
- **Floating AI Tutor** — Always-accessible AI help widget available from any page
- **Daily Check-In** — 7-day reward cycle with escalating XP (20 → 100 XP), Firestore-backed streak tracking
- **Gamification System** — Earn XP, level up (exponential curve), maintain daily streaks, and unlock 12+ achievements
- **XP Notifications** — Real-time animated XP gain notifications
- **Rewards & Achievements** — Track and showcase unlocked achievements with XP rewards
- **Leaderboard** — Compete with peers via global and section-based rankings
- **Grades Page** — View academic performance and grade breakdowns
- **Tasks Board** — Manage assigned tasks with priority levels and status tracking (todo/in-progress/completed)
- **Module & Subject Views** — Detailed module breakdowns and subject overviews with progress indicators
- **Profile Customization** — Edit profile with avatar selection
- **Notification Center** — Real-time in-app notifications (achievements, reminders, alerts, grades) via Firestore subscriptions
- **Search** — Quick search across platform content
- **Settings** — Personalize app preferences

### 👩‍🏫 For Teachers
- **Teacher Dashboard** — Monitor student progress and performance at a glance
- **Student Management** — View individual student profiles with detailed academic metrics and at-risk indicators
- **AI-Generated Insights** — Daily AI-powered class analytics with actionable recommendations
- **Risk Classification** — Dual pipeline: DeepSeek structured-output classification and supervised ML scoring (XGBoost/RandomForest with SHAP explanations)
- **Task Assignment** — Create and manage student tasks and assignments
- **Smart File Import** — Upload CSV/Excel/PDF class records with AI-powered column detection
- **Performance Analytics** — Track class-wide and per-student metrics with interactive charts

### 🔧 For Administrators
- **Admin Dashboard** — Platform-wide analytics and management tools
- **User Management** — Create, edit, and manage all user accounts across roles
- **Content Management** — Administer educational content and curriculum
- **Audit Logs** — Track all administrative actions with severity levels for accountability
- **System Settings** — Configure platform-wide settings, feature flags, and AI model routing

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3.1 | UI framework with functional components and hooks |
| **TypeScript** | 5.9.3 | Type-safe development |
| **Vite** | 6.3.5 | Fast dev server, HMR, optimized builds (`@vitejs/plugin-react-swc`) |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS — integrated via dedicated `@tailwindcss/vite` plugin (no PostCSS) |
| **Radix UI** | Latest | Accessible, unstyled component primitives (48+ UI components) |
| **Motion for React** | 12.38 | Animations and transitions — `AnimatePresence`, `motion.div`, layout animations |
| **Recharts** | 2.15.4 | Data visualization — `PieChart`, `BarChart`, `LineChart` with custom labels |
| **Lucide React** | 0.487.0 | Icon library |
| **Sonner** | 2.0.7 | Toast notifications |
| **React Hook Form** | 7.74.0 | Form state management |
| **Zod** | 4.3.6 | Schema validation |
| **canvas-confetti** | Latest | Celebration animations |
| **embla-carousel-react** | 8.6.0 | Carousel component |
| **vaul** | 1.1.2 | Drawer component |
| **cmdk** | 1.1.1 | Command palette |
| **jsPDF + html2canvas** | Latest | Client-side PDF generation |
| **date-fns** | 3.6.0 | Date manipulation |
| **KaTeX** | Latest | Math rendering (loaded globally) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | ≥0.104 | High-performance Python API framework with automatic OpenAPI docs and `CORSMiddleware` |
| **Uvicorn** | ≥0.24 | ASGI server |
| **DeepSeek API** | — | AI inference via OpenAI-compatible client (`openai` package) |
| **pandas** | ≥2.1 | Data processing for file uploads |
| **openpyxl** | ≥3.1 | Excel file parsing |
| **pdfplumber** | ≥0.10 | PDF table extraction |
| **python-docx** | ≥1.0 | DOCX document parsing |
| **XGBoost / scikit-learn** | — | Supervised risk classification model |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Firebase Auth** | Email/password & Google OAuth authentication |
| **Cloud Firestore** | NoSQL real-time database for all app data |
| **Firebase Storage** | File and media storage |
| **Firebase Analytics** | Usage tracking (optional) |
| **Firebase Cloud Functions** | Event-driven automation (TypeScript) |
| **Docker** | Containerized deployment (frontend + backend) |
| **Hugging Face Spaces** | Backend API hosting |

### AI Models (Current Runtime)

#### DeepSeek Models (`config/models.yaml`)
| Model | Primary Use |
|---|---|
| **deepseek-chat** | Global default for all tasks: chat, verification, lesson/quiz generation, learning paths, daily insights, risk classification |
| **deepseek-reasoner** | Extended reasoning for complex RAG and curriculum search tasks |

Runtime model override system with Firestore persistence. Model profiles: `dev`, `budget`, `prod` — switchable via admin panel at runtime without redeployment.

#### Risk Classification Models
| Model | Method |
|---|---|
| **DeepSeek (structured output)** | Zero-shot risk classification via chat completion with JSON schema enforcement |
| **XGBoostClassifier / RandomForestClassifier** | Supervised risk model; serialized to `models/risk_classifier.joblib`, trained via `/api/predict-risk/train-model` |

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- **Python** ≥ 3.10 (for backend)
- A **Firebase** project ([Firebase Console](https://console.firebase.google.com/))
- A **DeepSeek API key** (for AI features) — get one at [platform.deepseek.com](https://platform.deepseek.com)

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
   # Firebase (required)
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # DeepSeek API (required for AI features)
   DEEPSEEK_API_KEY=your_deepseek_api_key
   DEEPSEEK_BASE_URL=https://api.deepseek.com

   # Backend API (optional — defaults to hosted HF Spaces)
   VITE_API_URL=https://deign86-mathpulse-api-v3test.hf.space

   # Import-grounded generation rollout flags (frontend)
   VITE_ENABLE_IMPORT_GROUNDED_QUIZ=true
   VITE_ENABLE_IMPORT_GROUNDED_LESSON=true
   VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS=true
   VITE_ENABLE_ASYNC_GENERATION=true
   ```

   Deploying to Hugging Face Spaces:
   - Add all `VITE_FIREBASE_*` values, `DEEPSEEK_API_KEY`, and `VITE_API_URL` as GitHub Actions secrets.
   - The `deploy-hf.yml` workflow writes a `.env.production` at build time so Vite bakes in the correct config.

4. **Start the frontend dev server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`. Runs `predev` first (sync models + mypy typecheck, no pytest).

5. **Set up the backend** (optional, for AI features)
   ```bash
   cd backend
   pip install -r requirements.txt
   export DEEPSEEK_API_KEY=your_deepseek_api_key
   export ENABLE_IMPORT_GROUNDED_QUIZ=true
   export ENABLE_IMPORT_GROUNDED_LESSON=true
   export ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS=true
   uvicorn main:app --reload --host 0.0.0.0 --port 7860
   ```
   > **Note:** The hosted backend at `https://deign86-mathpulse-api-v3test.hf.space` is used by default. Local backend is only needed for development. Port 7860 matches Hugging Face Spaces convention; Docker maps it to 8000.

### Build for Production
```bash
npm run build
```
Output will be in the `build/` directory.

### Backend Regression Gate (Local)
```bash
# Full checks: pytest tests + mypy
npm run check:backend

# Quick mypy only (no pytest — used by npm run dev predev)
npm run check:backend:dev

# Fast pytest on critical test file only
npm run check:backend:quick
```

## 🏗 Architecture

### DeepSeek AI Integration

The backend was migrated from HuggingFace Inference API to DeepSeek API. Key changes:

- **DeepSeek client** (`services/ai_client.py`) wraps the OpenAI-compatible client for DeepSeek endpoints
- **Runtime model routing** (`backend/services/inference_client.py`) dispatches tasks to configured models with fallback chains
- **Model profiles** (`dev`, `budget`, `prod`) switchable at runtime via admin API
- **Structured output** for risk classification replaces BART zero-shot classification
- `HF_TOKEN` is no longer required for AI inference (retained only for HuggingFace dataset operations)

### Firebase Cloud Functions (`functions/src/`)

Event-driven automation triggers for student lifecycle:

| Module | Trigger | Purpose |
|---|---|---|
| `diagnosticProcessor.ts` | `POST /api/automation/diagnostic-completed` | Orchestrates full post-diagnostic workflow: risk classification, badges, weak topics, ML scoring, learning paths, remedial quizzes, interventions |
| `riskAnalyzer.ts` | Internal | Rule-based subject risk classification (At Risk / On Track) with configurable thresholds |
| `notificationSender.ts` | Internal | Creates Firestore notification documents (grade, reminder, message, achievement) |
| `quizProcessor.ts` | Internal | Builds remedial quiz configurations from risk profiles |
| `learningPathEngine.ts` | Internal | Recommends next topic groups based on risk profile and weak areas |
| `iarAssessmentScoring.ts` | Internal | Initial Assessment Results scoring with topic-level insights |
| `reassessmentEngine.ts` | Internal | Handles student reassessment logic |

Risk thresholds: `AT_RISK_THRESHOLD` = 60%, configurable per-topic weak topic thresholds.

### Async Generation + Task Queue

Heavy generation requests (lessons, quizzes) are processed asynchronously:

```
POST /api/lesson/generate-async    → { taskId }
POST /api/quiz/generate-async      → { taskId }
GET  /api/tasks/{task_id}          → { status, result?, error? }
GET  /api/tasks?limit=50&status=completed
POST /api/tasks/{task_id}/cancel
```

Enable via `ENABLE_ASYNC_GENERATION=true`, `ASYNC_TASK_TTL_SECONDS=3600`.

### Pre-Deployment Validation

`backend/pre_deploy_check.py` and `backend/startup_validation.py` run at startup and during CI to validate:
- File structure and import integrity
- Environment variables (`DEEPSEEK_API_KEY`, model IDs)
- Configuration file parsing
- InferenceClient initialization

### Chat Reliability Features

- **Smart streaming** with real-time chunk display
- **Continuation detection** — recognizes "go", "continue", "yes", etc. to extend incomplete answers
- **End-marker detection** — waits for `</answer>`, `<done>`, etc. before concluding
- **Automatic completion repair** — retries with alternate prompts on truncated responses
- **Fallback responses** — offline math tutor responses when backend is unavailable
- **Think-tag stripping** — removes `<think>` blocks from DeepSeek reasoner output

### Math Rendering Pipeline

- Proper LaTeX delimiters: `$...$` (inline), `$$...$$` (display)
- Bare TeX command wrapping (`\boxed{}`, `\frac{}`, etc.) for proper rendering
- Multiline bracket normalization for display math
- KaTeX CSS loaded globally, rehype-katex tolerant of malformed input

### Directory Structure
```
MATHPULSE-AI/
├── config/                     # Shared model/inference configuration
│   ├── env.sample
│   └── models.yaml
├── src/
│   ├── components/              # Student/teacher/admin UI, quiz + lesson workflows
│   ├── contexts/                # AuthContext, ChatContext
│   ├── features/
│   │   └── notifications/      # NotificationBell, NotificationPanel, useDailyCheckInReminder
│   ├── services/                # Firebase + FastAPI service layer, daily check-in service
│   ├── data/                    # Subject/module curriculum data
│   ├── types/                   # Shared frontend models
│   ├── styles/                  # Styling system and globals
│   ├── utils/                   # Math rendering, scope detection, streaming utils
│   ├── App.tsx
│   └── main.tsx
├── backend/
│   ├── services/               # DeepSeek inference client, email, logging, caching
│   ├── tests/                   # Backend API regression tests
│   ├── config/                  # Backend-local model/env mirrors
│   ├── analytics.py             # Risk, competency, recommendation engines
│   ├── automation_engine.py     # Event-driven automation workflows
│   ├── main.py                  # FastAPI API surface
│   ├── startup_validation.py    # Startup guardrail checks
│   └── pre_deploy_check.py      # Deployment safety checks
├── functions/
│   └── src/                     # Firebase Cloud Functions (TypeScript)
├── jobs/                        # Offline eval + synthetic generation jobs
├── datasets/                    # Evaluation + metadata datasets
├── scripts/                     # Utility scripts (backend gate, seed users, model sync)
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── firebase.json
└── firestore.rules
```

### Key Design Patterns

- **Service Layer Abstraction** — All Firebase/API operations are isolated in `src/services/`. Components never make direct Firestore calls.
- **Role-Based Access** — Single `users` collection with discriminated union types (`StudentProfile | TeacherProfile | AdminProfile`) controlling UI rendering and data access.
- **Context-Based State** — `AuthContext` for global auth state (`useAuth()` hook), `ChatContext` for AI chat sessions, component-level `useState` for UI state.
- **Real-Time Data** — Firebase `onSnapshot` listeners for live data updates and notification subscriptions.
- **Animation Architecture** — Motion for React (`motion/react`) with `AnimatePresence` for enter/exit transitions and layout animations.
- **Tailwind CSS v4** — Zero-config styling via `@tailwindcss/vite` plugin (replaces PostCSS-based setup from Tailwind v3).

### Firestore Collections
```
users/              → User profiles (role-discriminated: student | teacher | admin)
progress/           → Learning progress per user (lessons, quizzes, modules)
xpActivities/       → XP earning history (lesson_complete, quiz_complete, streak_bonus)
achievements/       → User achievements (12+ types with conditions)
notifications/      → User notifications (achievement, message, grade, reminder, alerts)
tasks/              → Student tasks (priority levels, kanban statuses)
chatSessions/       → AI chat sessions (per user)
chatMessages/       → Chat message history (user/assistant/system roles)
```

### Firebase Project
- **Project ID:** `mathpulse-ai-2026`
- **Auth:** Email/Password + Google OAuth
- **Config:** `src/lib/firebase.ts` (env vars with hardcoded fallbacks)

## 📡 API Reference

The FastAPI backend exposes the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/` | Root info (name, version, docs link) |
| `GET`  | `/health` | Health check with model status |
| `POST` | `/api/chat` | AI Math Tutor conversation (DeepSeek-powered, streaming capable) |
| `POST` | `/api/chat/stream` | Streaming tutor responses (SSE) |
| `POST` | `/api/verify-solution` | Full multi-method verification of a math solution |
| `POST` | `/api/predict-risk` | Single student risk classification (DeepSeek structured output) |
| `POST` | `/api/predict-risk/enhanced` | Supervised ML risk scoring with optional LLM intervention recommendations |
| `POST` | `/api/predict-risk/batch` | Batch risk prediction for multiple students |
| `POST` | `/api/risk/train-model` | Train/retrain supervised risk model (admin) |
| `POST` | `/api/learning-path` | Generate personalized learning path by weaknesses |
| `POST` | `/api/analytics/daily-insight` | Generate daily AI insights for teacher dashboard |
| `POST` | `/api/lesson/generate` | Generate class lesson plans grounded on imported topics + class signals |
| `POST` | `/api/lesson/generate-async` | Async lesson generation submission |
| `POST` | `/api/quiz/preview` | Preview quiz items before full generation |
| `POST` | `/api/quiz/generate` | Generate import-grounded or curriculum quiz sets |
| `POST` | `/api/quiz/generate-async` | Async quiz generation submission |
| `GET`  | `/api/tasks/{task_id}` | Poll async task status/result |
| `GET`  | `/api/tasks` | List async tasks by status/user scope |
| `POST` | `/api/tasks/{task_id}/cancel` | Cancel queued/running async task |
| `GET`  | `/api/ops/inference-metrics` | Admin inference routing + fallback metrics |
| `GET`  | `/api/hf/monitoring` | DeepSeek API health + usage metrics |
| `POST` | `/api/upload/class-records` | Upload and parse class records (CSV/XLSX/PDF) with AI column detection |
| `GET`  | `/api/upload/class-records/risk-refresh/recent` | Recent class-record risk refresh jobs |
| `POST` | `/api/upload/course-materials` | Upload and parse course materials (PDF/DOCX/TXT) with topic extraction |
| `GET`  | `/api/upload/course-materials/recent` | Recent course-material artifacts |
| `GET`  | `/api/course-materials/topics` | Normalized topic map from imported materials |
| `POST` | `/api/feedback/import-grounded` | Submit import-grounded feedback events |
| `GET`  | `/api/feedback/import-grounded/summary` | Aggregate pilot telemetry summaries |
| `GET`  | `/api/import-grounded/access-audit` | Access-audit log query for import workflows |
| `POST` | `/api/automation/diagnostic-completed` | Trigger diagnostic completion automation workflow |
| `POST` | `/api/automation/quiz-submitted` | Trigger post-quiz automation workflow |
| `POST` | `/api/automation/student-enrolled` | Trigger student enrollment automation |
| `GET`  | `/api/admin/model-config` | Get current model config + available profiles |
| `POST` | `/api/admin/model-config/profile` | Switch model profile (dev/budget/prod) |
| `POST` | `/api/admin/model-config/override` | Set individual model override |
| `DELETE` | `/api/admin/model-config/reset` | Clear all model overrides |

Interactive API documentation is available at `/docs` (Swagger UI) or `/redoc` when the backend is running.

### Math Verification System

The backend includes a multi-method verification pipeline to reduce math hallucinations:

| Method | How It Works |
|---|---|
| **Self-Consistency** | Generates 3 independent responses (temp=0.7), extracts final answers, checks agreement. Confidence: high (100% agree), medium (≥60%), low (<60%). |
| **Code Verification** | Asks the model to write Python code that numerically verifies the answer, then executes it in a sandboxed environment. |
| **LLM Judge** | A second LLM call (temp=0.1) reviews the solution for correct formula usage, arithmetic accuracy, and logical reasoning. Returns a confidence score. |

## 🎮 Gamification System

| Feature | Details |
|---|---|
| **XP Rewards** | Fixed XP per action (e.g., 50 XP per lesson completion) |
| **Daily Check-In** | 7-day cycle, escalating XP (20 → 100 XP), streak bonuses |
| **Leveling** | Exponential curve: `XP_needed = 100 × 1.5^(level - 1)` |
| **Streaks** | Daily login tracking with bonus XP (5 XP × streak days, max 50) |
| **Achievements** | Unlocked via specific user actions and milestones |
| **Leaderboard** | Global and section-based rankings |

## 🐳 Docker

The project includes Docker support for consistent development and production environments.

```bash
# Development mode (hot reload for frontend + backend)
docker compose up

# Production mode (Nginx serving optimized build)
docker compose --profile prod up

# Stop all services
docker compose down
```

| Service | Port | Description |
|---|---|---|
| Frontend (dev) | `3000` | Vite dev server with hot reload |
| Backend | `8000` | FastAPI (mapped from container port 7860) |
| Production | `80` | Nginx serving production build |

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