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
- **Diagnostic Assessments** — Skill-level evaluation on first login to identify at-risk subjects and customize the learning journey
- **Personalized Learning Paths** — AI-generated study plans tailored to individual skill levels and weaknesses
- **Interactive Lessons** — Step-by-step lessons across Algebra, Geometry, Calculus, Trigonometry, Statistics, and more
- **Quiz Experiences** — Timed quizzes with instant feedback, detailed explanations, and score tracking
- **Practice Center** — Dedicated practice area for reinforcing concepts
- **AI Chat Tutor** — On-demand math help powered by Qwen/Qwen2.5-Math-7B-Instruct via Hugging Face Inference API, with optional self-consistency verification
- **Floating AI Tutor** — Always-accessible AI help widget available from any page
- **Gamification System** — Earn XP, level up (exponential curve), maintain daily streaks, and unlock 12+ achievements
- **XP Notifications** — Real-time animated XP gain notifications
- **Rewards & Achievements** — Track and showcase unlocked achievements with XP rewards
- **Leaderboard** — Compete with peers via global and section-based rankings
- **Grades Page** — View academic performance and grade breakdowns
- **Tasks Board** — Manage assigned tasks with priority levels and status tracking (todo/in-progress/completed)
- **Module & Subject Views** — Detailed module breakdowns and subject overviews with progress indicators
- **Profile Customization** — Edit profile with avatar selection
- **Notification Center** — Receive and manage in-app notifications (achievements, reminders, alerts)
- **Search** — Quick search across platform content
- **Settings** — Personalize app preferences

### 👩‍🏫 For Teachers
- **Teacher Dashboard** — Monitor student progress and performance at a glance
- **Student Management** — View individual student profiles with detailed academic metrics and at-risk indicators
- **AI-Generated Insights** — Daily AI-powered class analytics with actionable recommendations
- **Risk Classification** — ML-powered student risk prediction (High/Medium/Low) using zero-shot classification
- **Task Assignment** — Create and manage student tasks and assignments
- **Smart File Import** — Upload CSV/Excel/PDF class records with AI-powered column detection
- **Performance Analytics** — Track class-wide and per-student metrics with interactive charts

### 🔧 For Administrators
- **Admin Dashboard** — Platform-wide analytics and management tools
- **User Management** — Create, edit, and manage all user accounts across roles
- **Content Management** — Administer educational content and curriculum
- **Audit Logs** — Track all administrative actions with severity levels for accountability
- **System Settings** — Configure platform-wide settings and feature flags

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3.1 | UI framework with functional components and hooks |
| **TypeScript** | 5.9.3 | Type-safe development |
| **Vite** | 6.3.5 | Fast dev server, HMR, optimized builds (`@vitejs/plugin-react-swc`) |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS — integrated via dedicated `@tailwindcss/vite` plugin (no PostCSS) |
| **Radix UI** | Latest | Accessible, unstyled component primitives (48 UI components) |
| **Motion for React** | Latest | Animations and transitions — `AnimatePresence`, `motion.div`, layout animations (import from `motion/react`) |
| **Recharts** | 2.15.2 | Data visualization — `PieChart`, `BarChart`, `ResponsiveContainer` with custom labels |
| **Lucide React** | 0.487.0 | Icon library |
| **Sonner** | 2.0.3 | Toast notifications |
| **React Hook Form** | 7.55.0 | Form state management |
| **Zod** | 4.3.6 | Schema validation |
| **canvas-confetti** | Latest | Celebration animations |
| **embla-carousel-react** | 8.6.0 | Carousel component |
| **vaul** | 1.1.2 | Drawer component |
| **cmdk** | 1.1.1 | Command palette |
| **jsPDF + html2canvas** | Latest | Client-side PDF generation |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | ≥0.104 | High-performance Python API framework with automatic OpenAPI docs and `CORSMiddleware` |
| **Uvicorn** | ≥0.24 | ASGI server (standard extras) |
| **Hugging Face Hub** | ≥0.20 | AI model inference via `InferenceClient` — `chat_completion()`, `zero_shot_classification()` |
| **pandas** | ≥2.1 | Data processing for file uploads |
| **openpyxl** | ≥3.1 | Excel file parsing |
| **pdfplumber** | ≥0.10 | PDF table extraction |
| **python-docx** | ≥1.0 | DOCX document parsing |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Firebase Auth** | Email/password & Google OAuth authentication |
| **Cloud Firestore** | NoSQL real-time database for all app data |
| **Firebase Storage** | File and media storage |
| **Firebase Analytics** | Usage tracking (optional) |
| **Docker** | Containerized deployment (frontend + backend) |
| **Hugging Face Spaces** | Backend API hosting |

### AI Models
| Model | Use Case |
|---|---|
| **Qwen/Qwen2.5-Math-7B-Instruct** | Chat tutoring (low-temperature, step-by-step verified), learning path generation, daily class insights, document column detection, math verification (self-consistency, code-based, LLM judge) |
| **facebook/bart-large-mnli** | Student risk classification via zero-shot classification |

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- **Python** ≥ 3.10 (for backend)
- A **Firebase** project ([Firebase Console](https://console.firebase.google.com/))
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
   # Firebase (required)
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # Backend API (optional — defaults to hosted HF Spaces)
   VITE_API_URL=https://deign86-mathpulse-api.hf.space

   # Import-grounded generation rollout flags (frontend)
   VITE_ENABLE_IMPORT_GROUNDED_QUIZ=true
   VITE_ENABLE_IMPORT_GROUNDED_LESSON=true
   VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS=true
   VITE_ENABLE_ASYNC_GENERATION=true
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
   export ENABLE_IMPORT_GROUNDED_QUIZ=true
   export ENABLE_IMPORT_GROUNDED_LESSON=true
   export ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS=true
   uvicorn main:app --reload --host 0.0.0.0 --port 7860
   ```
   > **Note:** The hosted backend at `https://deign86-mathpulse-api.hf.space` is used by default. Local backend is only needed for development. Port 7860 matches Hugging Face Spaces convention; Docker maps it to 8000.

### Build for Production
```bash
npm run build
```
Output will be in the `build/` directory.

### Backend Regression Gate (Local)
```bash
# API contracts + behavior checks
python -m pytest backend/tests/test_api.py -q

# Lightweight typed checks on critical backend files
python -m mypy --config-file mypy.ini backend/main.py backend/analytics.py

# Or run both via npm
npm run check:backend
```

### Import-Grounded Pilot Operations
```bash
# Telemetry summary (Query A-D equivalent) for the authenticated teacher
curl -X GET "${VITE_API_URL:-https://deign86-mathpulse-api.hf.space}/api/feedback/import-grounded/summary?days=7&limit=5000" \
   -H "Authorization: Bearer <firebase_id_token>" \
   -H "Content-Type: application/json"
```

Operational artifacts:
- `docs/import-grounded-telemetry-query-pack.md`
- `docs/import-grounded-e2e-verification-log.md`
- `docs/import-grounded-security-drill-matrix.md`

## 🏗 Architecture

## Hugging Face PRO Architecture

MathPulse now supports a PRO-oriented architecture for fast demos, low-cost experimentation, and reproducible offline evaluation.

- Inference provider switch: backend/services/inference_client.py routes requests to either local Space or Hugging Face Inference Providers, with retries, timeout controls, and fallback models.
- HF Jobs for offline runs: jobs/eval_math_model.py and jobs/generate_variants.py support model evaluation and synthetic variant generation.
- Private datasets flow: datasets/ structure plus scripts/push_dataset_to_hf.py and scripts/pull_dataset_from_hf.py for private Hub sync.

Flow overview:

1. Backend API calls route through the inference client and can switch provider mode by env.
2. Offline evaluation and generation jobs consume datasets/eval and write artifacts to jobs/output and datasets/synthetic.
3. Curated dataset artifacts sync to private Hugging Face Datasets repositories.

### Chat-Only HF Inference Profile (Keep Full UI)

If you only want the AI chatbot to use HF inference while the rest of the app stays on normal backend/provider paths, use this routing profile:

INFERENCE_PROVIDER=hf_inference
INFERENCE_GPU_PROVIDER=hf_inference
INFERENCE_CPU_PROVIDER=hf_inference
INFERENCE_GPU_REQUIRED_TASKS=chat

This keeps your unique React UI and Firebase flows unchanged, while chat generation is handled through the configured HF inference provider.

### Quickstart: Run locally

1. Install Python dependencies for Space and jobs:
   python -m pip install -r requirements.txt
2. Install backend dependencies:
   python -m pip install -r backend/requirements.txt
3. Copy config/env.sample values into your local environment.
4. Run backend API:
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 7860

### Quickstart: Run evaluation jobs on Hugging Face

1. Set INFERENCE_PROVIDER=hf_inference and HF_TOKEN in the job environment.
2. Enable Pro-priority routing for background jobs:
   INFERENCE_PRO_ENABLED=true
   INFERENCE_PRO_PRIORITY_TASKS=eval_generation,variant_generation
3. Run evaluation via launcher:
   python jobs/hf_jobs_launcher.py --job eval --mode local --subset algebra --limit 100
4. Run synthetic generation via launcher:
   python jobs/hf_jobs_launcher.py --job variants --mode local --limit 200 --variants-per-item 3
5. Submit a Hugging Face Jobs CLI run (dry-run first):
   python jobs/hf_jobs_launcher.py --job eval --mode hf --flavor cpu-basic --dry-run --env HF_TOKEN=<token>
6. Sync curated artifacts to private dataset repo:
   python scripts/push_dataset_to_hf.py --repo Deign86/mathpulse-private-datasets

### Async generation + Pro metrics endpoints

- Submit heavy generation requests without blocking:
   - POST /api/lesson/generate-async
   - POST /api/quiz/generate-async
- Poll task state and result payload:
   - GET /api/tasks/{task_id}
- List recent task records for the current user (admin sees all):
   - GET /api/tasks?limit=50&status=queued|running|cancelling|completed|failed|cancelled
- Cancel queued/running tasks:
   - POST /api/tasks/{task_id}/cancel
- Admin-only inference routing summary:
   - GET /api/ops/inference-metrics

Operational note:
- If the backend returns 404 for async routes, set VITE_ENABLE_ASYNC_GENERATION=false to force synchronous generation calls while keeping all other PRO features enabled.

Enable async task mode via env:
- ENABLE_ASYNC_GENERATION=true
- ASYNC_TASK_TTL_SECONDS=3600
- ASYNC_TASK_MAX_ITEMS=400

### Cost Optimization Notes

- Use smaller backup models in config/models.yaml for burst traffic or low-priority flows.
- Run expensive experiments through Inference Providers with strict per-run limits in Jobs.
- Keep eval/generation datasets private and compact to reduce iteration cost.
- Use task_model_map in config/models.yaml to route low-risk tasks (e.g. daily_insight) to smaller models.
- Use structured inference logs (task_type, request_tag, route, fallback_depth) to compare cost/quality before widening rollout.

```
MATHPULSE-AI/
├── src/
│   ├── App.tsx                  # Root component with routing & layout
│   ├── main.tsx                 # Application entry point
│   ├── index.css                # Global CSS imports
│   ├── components/              # React components (40+ files)
│   │   ├── *Page.tsx            # Full-page views (Modules, AI Chat, Grades, Leaderboard)
│   │   ├── *Modal.tsx           # Dialog overlays (Profile, Settings, Rewards, Diagnostic)
│   │   ├── *Widget.tsx          # Small reusable blocks (QuickStats)
│   │   ├── *Dashboard.tsx       # Role-based dashboards (Teacher, Admin)
│   │   ├── LoginPage.tsx        # Firebase authentication (email/password + Google)
│   │   ├── InteractiveLesson.tsx # Lesson renderer
│   │   ├── QuizExperience.tsx   # Quiz engine with scoring
│   │   ├── LearningPath.tsx     # AI-generated learning path view
│   │   ├── PracticeCenter.tsx   # Practice problems area
│   │   ├── FloatingAITutor.tsx  # Always-on AI help widget
│   │   ├── TasksBoard.tsx       # Kanban-style task management
│   │   ├── Sidebar.tsx          # Main navigation sidebar
│   │   ├── CollapsibleSidebar.tsx # Sidebar collapse behavior
│   │   └── ui/                  # Radix-based primitives (48 components)
│   ├── contexts/                # React context providers
│   │   ├── AuthContext.tsx      # Authentication state & useAuth() hook
│   │   └── ChatContext.tsx      # AI chat session state
│   ├── services/                # Firebase & API service layer
│   │   ├── apiService.ts        # FastAPI backend client
│   │   ├── authService.ts       # Auth operations (sign in/up/out, profiles)
│   │   ├── progressService.ts   # Learning progress tracking
│   │   ├── gamificationService.ts # XP, levels, streaks, achievements
│   │   ├── chatService.ts       # AI chat session management
│   │   ├── notificationService.ts # User notifications
│   │   ├── taskService.ts       # Task CRUD operations
│   │   └── studentService.ts    # Student data operations
│   ├── types/
│   │   └── models.ts            # TypeScript type definitions (230+ lines)
│   ├── data/
│   │   └── subjects.ts          # Static curriculum data (subjects, modules, lessons)
│   ├── lib/
│   │   └── firebase.ts          # Firebase SDK initialization & exports
│   └── styles/
│       └── globals.css          # Tailwind CSS + custom CSS variables
├── backend/
│   ├── main.py                  # FastAPI application (all-in-one: API, verification system)
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Container configuration (Python 3.11)
├── docker-compose.yml           # Multi-service orchestration (frontend + backend)
├── Dockerfile                   # Multi-stage build (frontend + production)
├── nginx.conf                   # Nginx config for production serving
├── firestore.rules              # Firestore security rules
├── firebase.json                # Firebase project config
└── deploy-hf.py                 # Hugging Face Spaces deployment script
```

### Key Design Patterns

- **Service Layer Abstraction** — All Firebase/API operations are isolated in `src/services/`. Components never make direct Firestore calls.
- **Role-Based Access** — Single `users` collection with discriminated union types (`StudentProfile | TeacherProfile | AdminProfile`) controlling UI rendering and data access.
- **Context-Based State** — `AuthContext` for global auth state (`useAuth()` hook), `ChatContext` for AI chat sessions, component-level `useState` for UI state.
- **Real-Time Data** — Firebase `onSnapshot` listeners for live data updates.
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
| `POST` | `/api/chat` | AI Math Tutor conversation (Llama 3 Instruct, temp=0.2, optional verification) |
| `POST` | `/api/verify-solution` | Full multi-method verification of a math solution |
| `POST` | `/api/predict-risk` | Single student risk classification (BART zero-shot) |
| `POST` | `/api/predict-risk/batch` | Batch risk prediction for multiple students |
| `POST` | `/api/learning-path` | Generate personalized learning path by weaknesses |
| `POST` | `/api/analytics/daily-insight` | Generate daily AI insights for teacher dashboard |
| `POST` | `/api/upload/class-records` | Upload and parse class records (CSV/XLSX/PDF) with AI column detection |
| `GET`  | `/api/upload/class-records/risk-refresh/recent` | Recent class-record risk refresh jobs (teacher scoped, optional class filter) |
| `POST` | `/api/upload/course-materials` | Upload and parse course materials (PDF/DOCX/TXT) with topic extraction |
| `GET`  | `/api/upload/course-materials/recent` | Recent course-material artifacts (teacher scoped, optional class filter) |
| `GET`  | `/api/course-materials/topics` | Normalized topic map from imported materials (optional class/material filters) |
| `POST` | `/api/lesson/generate` | Generate class lesson plans grounded on imported topics + class signals |

Interactive API documentation is available at `/docs` (Swagger UI) or `/redoc` when the backend is running.

### Request/Response Types

| Endpoint | Request Body | Response Body |
|---|---|---|
| `/api/chat` | `{ message, history[{role, content}], userId?, verify? }` | `{ response, verified?, confidence?, warning? }` |
| `/api/verify-solution` | `{ problem, solution }` | `{ overall_verified, aggregated_confidence, self_consistency, code_verification, llm_judge, warnings[] }` |
| `/api/predict-risk` | `{ engagementScore, avgQuizScore, attendance, assignmentCompletion }` | `{ riskLevel, confidence, analysis{labels, scores} }` |
| `/api/learning-path` | `{ weaknesses[], gradeLevel, learningStyle? }` | `{ learningPath }` |
| `/api/analytics/daily-insight` | `{ students[{name, engagementScore, avgQuizScore, attendance, riskLevel}] }` | `{ insight }` |
| `/api/upload/class-records` | `FormData(file)` — CSV/XLSX/PDF | `{ success, students[], columnMapping, totalRows }` |
| `/api/upload/class-records/risk-refresh/recent` | `Query(limit?, classSectionId?)` | `{ success, classSectionId?, stats, jobs[], warnings[] }` |
| `/api/upload/course-materials` | `FormData(files, classSectionId?, className?)` | `{ success, files?, topics[], sections[], warnings[] }` |
| `/api/upload/course-materials/recent` | `Query(limit?, classSectionId?)` | `{ success, classSectionId?, materials[], warnings[] }` |
| `/api/course-materials/topics` | `Query(classSectionId?, materialId?, limit?)` | `{ success, topics[], materials[], warnings[] }` |
| `/api/lesson/generate` | `{ gradeLevel, classSectionId?, className?, materialId?, focusTopics? }` | `{ success, blocks[], provenanceSummary[], warnings[] }` |

### Import Retention and Audit Cadence

- Import artifacts (class records and course materials) are persisted with retention metadata (`retentionDays`, `expiresAtEpoch`).
- Read endpoints exclude expired artifacts and return warnings when retention filtering removes records.
- Teacher reads are always scoped by authenticated `teacherId`, and can be further constrained with `classSectionId` for class-specific views.
- Access events for upload/read operations are written to `accessAuditLogs` with endpoint path, actor, status, and class scope metadata.
- Import-grounded pilot feedback events are written to `importGroundedFeedbackEvents` via `/api/feedback/import-grounded` when feedback logging is enabled.
- Rollout checklist recommendation: review import-access audit logs weekly during pilot, then at least monthly after stabilization.

### Import-Grounded Rollout Flags

- `ENABLE_IMPORT_GROUNDED_QUIZ` controls backend import-grounded topic injection for quiz generation.
- `ENABLE_IMPORT_GROUNDED_LESSON` controls backend import-grounded topic injection for lesson generation.
- `ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS` controls backend storage of pilot feedback events.
- `VITE_ENABLE_IMPORT_GROUNDED_QUIZ` controls frontend request preference for import-grounded quiz generation.
- `VITE_ENABLE_IMPORT_GROUNDED_LESSON` controls frontend request preference for import-grounded lesson generation.
- `VITE_ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS` controls frontend feedback event reporting to the backend.
- `VITE_ENABLE_ASYNC_GENERATION` controls frontend use of async submit/poll generation endpoints for quiz and lesson workflows.
- All flags default to `true`; set any flag to `false` to disable that behavior without code changes.

> **Fallback:** The frontend works with or without the backend. If the backend is unavailable, the app uses the hosted API at `https://deign86-mathpulse-api.hf.space`.

### Math Verification System

The backend includes a multi-method verification pipeline to reduce math hallucinations:

| Method | How It Works |
|---|---|
| **Self-Consistency** | Generates 3 independent responses (temp=0.7), extracts final answers, checks agreement. Confidence: high (100% agree), medium (≥60%), low (<60%). |
| **Code Verification** | Asks the model to write Python code that numerically verifies the answer, then executes it in a sandboxed environment. |
| **LLM Judge** | A second LLM call (temp=0.1) reviews the solution for correct formula usage, arithmetic accuracy, and logical reasoning. Returns a confidence score. |

The `/api/verify-solution` endpoint runs all three methods and returns an aggregated confidence score (0.0–1.0). The `/api/chat` endpoint supports an optional `verify: true` flag to trigger self-consistency checking inline.

## 🎮 Gamification System

| Feature | Details |
|---|---|
| **XP Rewards** | Fixed XP per action (e.g., 50 XP per lesson completion) |
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