# MathPulse AI — Master System Architecture & Functional Specification

> **Document Type:** Master System Context & Knowledge Base  
> **Target Audience:** AI Assistants, System Evaluators, Capstone Defense Panel, and Core Developers  
> **System Name:** MathPulse AI  
> **Target Users:** Filipino Senior High School (Grade 11 & 12) STEM Students, Mathematics Teachers, and School Administrators

---

## 1. Executive Overview

**MathPulse AI** is an installable, repository-owned Progressive Web App (PWA) and native Android application designed to provide AI-powered, curriculum-aligned mathematics tutoring for Filipino Senior High School STEM students.

### Core Value Propositions:
1. **Curriculum-First Grounding:** Built directly around the **DepEd Strengthened SHS Mathematics Curriculum** (General Mathematics, Business Mathematics, Statistics & Probability, and Pre-Calculus). Lessons and tutor responses cite real DepEd modules.
2. **L.O.L.I. AI Math Tutor:** Logical Operations & Learning Intelligence powered by DeepSeek (`deepseek-chat` and `deepseek-reasoner`), featuring streaming math expressions rendered in KaTeX, step-by-step problem solving, and contextual curriculum retrieval (RAG).
3. **Predictive At-Risk Intervention (WRI Engine):** Calculates a **Weighted Risk Index ($WRI = 0.30D + 0.40G + 0.30P$)** to detect struggling students early and automate remedial interventions.
4. **Gamified Learning Ecosystem:** Deeply engaging mechanics including exponential level scaling, 7-day reward cycles, streak shields, lives, a layered composite avatar customizer, and 1v1 real-time multiplayer Quiz Battles.
5. **Three Role Studios:** Purpose-built dashboards with role-based access control (RBAC) for **Students**, **Teachers**, and **Administrators**.

---

## 2. Technology Stack & Infrastructure

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               MATHPULSE AI SYSTEM STACK                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Frontend:       React 18, TypeScript 5.9, Vite PWA, Tailwind CSS 4, Lucide Icons,     │
│                  KaTeX (Math rendering), Framer Motion, TanStack Query                 │
│  Mobile Native:  Capacitor 7.1 (Android APK release build)                             │
│  Backend API:    FastAPI (Python 3.11), Uvicorn, LiteParse (PDF parser)                │
│  AI / LLM:       DeepSeek API (deepseek-chat for tutoring, deepseek-reasoner for RAG)  │
│  Vector DB:      ChromaDB (Embeddings: BAAI/bge-small-en-v1.5)                         │
│  Cloud / DB:     Firebase Hosting, Firebase Authentication, Cloud Firestore (NoSQL),   │
│                  Firebase Realtime Database (Live Match Sync), Cloud Functions Node 22 │
│  Push Engine:    Firebase Cloud Messaging (FCM)                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Three User Studios (Role-Based Access)

### 🎓 1. Student Studio
* **Onboarding Initial Assessment & Readiness (IAR):** Diagnostic test measuring competency across 8 core domains to generate an adaptive, personalized learning path.
* **Curriculum Modules:** Interactive lessons with theory, slides, and interactive *"Try-It-Yourself"* step-by-step formula engines.
* **L.O.L.I. AI Chat:** 24/7 AI math tutor with OCR image input, LaTeX equation support, and topic-specific hint generation.
* **Practice Center:** AI-generated personalized drills with three difficulty tiers (*Practice*, *Challenge*, *Mastery*).
* **1v1 Quiz Battle:** Real-time online multiplayer PvP matchmaking and adaptive AI bot matches.
* **Gamification & Avatar Shop:** Login streak tracking, daily check-in rewards, XP multiplier boosts, uncapped lives, streak shields, and a composite avatar wardrobe customizer.
* **Analytics & Goal Tracker:** Weekly/monthly leaderboard rankings, study calendar, and student leadership goals.

---

### 👨‍🏫 2. Teacher Studio
* **Classroom & Section Management:** Class section creation, student enrollment, and CSV/Excel class roster import.
* **At-Risk Monitoring Dashboard:** Visual mastery heatmaps and student risk classification (*Safe*, *Watch*, *Intervene*, *Critical*, *At Risk*).
* **Remedial Intervention Dispatcher:** One-click assignment of personalized remedial tasks and custom study materials to struggling students.
* **AI Quiz Maker:** Automated quiz generation tool based on Bloom's Taxonomy, custom difficulty distribution, and DepEd MELC competency codes.
* **Student Performance Analytics:** Cohort averages, historical score trends, and topic breakdown analytics.

---

### 🛡️ 3. Administrator Studio
* **Platform Overview:** High-level platform health, active users, total completed lessons/quizzes, and engagement time.
* **User & Role Governance:** User provisioning, account activation/deactivation, role assignments, and password enforcement.
* **Curriculum & Policy Manager:** Management of curriculum version sets (Legacy K-12, Strengthened SHS Pilot 2025/2026) and diagnostic passing thresholds.
* **RAG Knowledge Base Manager:** Uploading, chunking, and indexing official DepEd curriculum PDFs into the ChromaDB vector store.
* **AI Token & Cost Monitoring:** Real-time tracking of DeepSeek API token consumption, feature-by-feature cost attribution, and rate-limiting controls.
* **Security Audit Logs:** Comprehensive immutable event logs capturing user actions, IP addresses, and administrative events.

---

## 4. The 9 Core Functional Modules

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE 9 CORE FUNCTIONAL MODULES                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Module 1: User Authentication & Account Management                                    │
│  Module 2: Academic Classroom Management                                               │
│  Module 3: Curriculum & Content Management                                             │
│  Module 4: Diagnostic Assessment & Learning Path (IAR Engine)                          │
│  Module 5: Quiz Creation & Examination (AI Quiz Maker & Practice Center)               │
│  Module 6: Learning Progress & Gamification (XP, Avatar Shop, Rewards)                 │
│  Module 7: Real-Time Quiz Battle (1v1 PvP & Bot Matchmaking)                           │
│  Module 8: Remedial Intervention & Risk Monitoring (WRI Engine)                        │
│  Module 9: System Audit & AI Tutoring (L.O.L.I. RAG Tutor & Admin Logs)                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Algorithmic Engines & Key Formulas

### 1. Weighted Risk Index (WRI Engine)
$$WRI = (0.30 \times D) + (0.40 \times G) + (0.30 \times P)$$
* **$D$ (Diagnostic Baseline):** Initial Assessment normalized score ($0-100$).
* **$G$ (External Grade Average):** Teacher-imported classroom quarterly grades.
* **$P$ (System Performance):** Rolling average of student quiz and lesson practice scores.
* **Risk Classifications:**
  * $WRI \ge 75\%$: **Safe / On Track**
  * $60\% \le WRI < 75\%$: **Watch**
  * $50\% \le WRI < 60\%$: **Intervene**
  * $WRI < 50\%$: **Critical / At Risk** (Triggers automated remedial intervention).

---

### 2. Gamification XP & Leveling Formula
* **Level Progression:** $\text{Level} = \lfloor \sqrt{\frac{\text{Total XP}}{100}} \rfloor + 1$
* **XP Multipliers:** Temporary boosts ($1.5\times$, $2.0\times$) applied during daily reward streaks.
* **Streak Protection:** Streak Shields automatically consume to preserve login streaks on missed days.

---

### 3. RAG Retrieval Pipeline (Curriculum Grounding)
1. **Document Parsing:** LiteParse extracts markdown and clean mathematical formulas from DepEd SSHS learning modules.
2. **Embedding & Vector Storage:** Text chunks embedded via `BAAI/bge-small-en-v1.5` and stored in ChromaDB.
3. **Retrieval & Reranking:** Similarity search retrieves top-$k$ relevant curriculum passages.
4. **Generation:** DeepSeek Reasoner/Chat synthesizes the tutor response, strictly citing curriculum sources.

---

## 6. Database Architecture & 28 Core Entities

The system utilizes a 28-entity data schema across Cloud Firestore and Firebase Realtime Database:

| # | Entity Name | Primary Key | Key Foreign Keys | Purpose / Stored Fields |
|:---:|---|---|---|---|
| **1** | `USER` | `uid` | None | Master account, email, name, role, photo, timestamp |
| **2** | `STUDENT_PROFILE` | `uid` | `uid` $\rightarrow$ `USER` | LRN, grade, school, XP, level, streak, risk status |
| **3** | `TEACHER_PROFILE` | `uid` | `uid` $\rightarrow$ `USER` | Department, subject, years of experience, qualification |
| **4** | `ADMIN_PROFILE` | `uid` | `uid` $\rightarrow$ `USER` | Position, department, administrative scope |
| **5** | `USER_SETTINGS` | `uid` | `uid` $\rightarrow$ `USER` | Notification toggles, theme, study goals, privacy |
| **6** | `CLASSROOM` | `classId` | `teacherId` $\rightarrow$ `TEACHER_PROFILE` | Section name, grade level, strand, subject |
| **7** | `CURRICULUM_VERSION_SET` | `id` | None | DepEd curriculum editions (Pilot 2025, Full 2026) |
| **8** | `DIAGNOSTIC_POLICY` | `id` | `versionSetId` | Mastery, review, and critical gap thresholds |
| **9** | `SUBJECT` | `id` | `versionSetId` | Math subjects (General Math, Statistics) |
| **10** | `MODULE` | `id` | `subjectId` | Topic modules within a subject |
| **11** | `LESSON_CONTENT` | `id` | `moduleId`, `authorId` | Lesson markdown, target skills, content URL |
| **12** | `GENERATED_QUIZ` | `id` | `teacherId` | AI-generated quiz headers and metadata |
| **13** | `AI_QUIZ_QUESTION` | `id` | `quizId` | Question stem, options array, correct answer, Bloom level |
| **14** | `ASSIGNED_QUIZ` | `id` | `quizId`, `lrn` | Specific quiz instances assigned to students/cohorts |
| **15** | `DIAGNOSTIC_RESULT` | `docId` | `uid` | Raw score, percentage, proficiency level, breakdown |
| **16** | `LEARNING_PATH_RECORD`| `id` | `userId`, `lessonId` | Dynamic adaptive learning sequences |
| **17** | `INTERVENTION_RECORD` | `id` | `lrn`, `teacherId` | Remedial logs and teacher intervention orders |
| **18** | `USER_PROGRESS` | `userId` | `userId` $\rightarrow$ `STUDENT_PROFILE` | Aggregated lesson & quiz completion summary |
| **19** | `SUBJECT_PROGRESS` | `id` | `userId`, `subjectId` | Subject-level progress percentage |
| **20** | `MODULE_PROGRESS` | `id` | `subjectProgressId`, `moduleId` | Module-level progress percentage |
| **21** | `LESSON_PROGRESS` | `id` | `userId`, `lessonId` | Lesson-level time spent, completion status, score |
| **22** | `QUIZ_ATTEMPT` | `attemptId` | `userId`, `quizId` | Exam attempt logs, time taken, final score |
| **23** | `QUIZ_ANSWER` | `answerId` | `attemptId`, `questionId` | Per-question student response and correctness |
| **24** | `ACHIEVEMENTS` | `userId` | `userId` $\rightarrow$ `STUDENT_PROFILE` | Student achievement badge unlock ledger |
| **25** | `XP_ACTIVITY` | `activityId` | `userId` $\rightarrow$ `STUDENT_PROFILE` | Immutable transaction ledger of awarded XP points |
| **26** | `CHAT_SESSION` | `id` | `userId` $\rightarrow$ `USER` | L.O.L.I. AI tutor conversation threads |
| **27** | `CHAT_MESSAGE` | `id` | `sessionId` | Individual prompt/response messages with math context |
| **28** | `AUDIT_LOG` | `id` | `userId` $\rightarrow$ `USER` | Administrative security and action event log |

---

## 7. Gane & Sarson DFD Level 1 Architecture Reference

* **Left Column (External Entities):** `Student (Dominant User)`, `Teacher`, `Administrator`.
* **Center Column (Processes 1 to 9):**
  1. `1: User Authentication & Accounts`
  2. `2: Academic Classroom Management`
  3. `3: Curriculum & Content Management`
  4. `4: Diagnostic Assessment & Path`
  5. `5: Quiz Creation & Examination`
  6. `6: Learning Progress & Gamification`
  7. `7: Real-Time Quiz Battle`
  8. `8: Remedial Intervention & Risk`
  9. `9: System Audit & AI Tutoring`
* **Right Column (Open-Ended Data Stores):**
  * `D1: Users` *(Profiles & Settings)*
  * `D2: Classrooms` *(Sections & Rosters)*
  * `D3: Modules & Lessons` *(Curriculum & Content)*
  * `D4: Diagnostics` *(Results & Paths)*
  * `D5: Quizzes & Attempts` *(Exams & Submissions)*
  * `D6: Progress & Gamification` *(XP & Badges)*
  * `D7: Battle Records` *(Live Match State)*
  * `D8: Interventions` *(At-Risk Logs & Orders)*
  * `D9: Chat & Audit Logs` *(Chat History & Audits)*

---

## 8. Directory & Codebase Mapping

```
MATHPULSE-AI/
├── src/
│   ├── components/       # UI components (Student, Teacher, Admin studios)
│   ├── contexts/         # React Context providers (Auth, Theme, Sound)
│   ├── services/         # API wrappers (adminService, quizService, etc.)
│   ├── data/             # Curriculum data, DepEd MELC constants
│   ├── types/            # TypeScript interfaces (models.ts, assessment.ts)
│   └── lib/              # Firebase initialization & query client
├── backend/              # FastAPI Python backend
│   ├── main.py           # Entry point & role policies
│   ├── routes/           # API routes (rag_routes.py, practice_routes.py)
│   ├── rag/              # ChromaDB vector store ingestion pipeline
│   └── datasets/         # SSHS curriculum PDFs and vector indexes
├── functions/            # Firebase Cloud Functions (Node 22, push alerts)
└── docs/                 # System architecture, DFD & ERD specifications
```
