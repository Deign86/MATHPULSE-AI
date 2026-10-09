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
2. **L.O.L.I. AI Math Tutor:** Logical Operations & Learning Intelligence powered by DeepSeek (`deepseek-flash` and `deepseek-v4-pro`), featuring streaming math expressions rendered in KaTeX, step-by-step problem solving, and contextual curriculum retrieval (RAG).
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
│  AI / LLM:       DeepSeek API (deepseek-flash for tutoring, deepseek-v4-pro for RAG)  │
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

## 4. The Official 9 Main Modules (In Order of Sequential Priority)

Per the professor's strict instructions, the processes are arranged sequentially following the **user educational lifecycle after login**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        OFFICIAL MAIN MODULES & DFD 1 PROCESSES                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  1. User Authentication & Account Management                                           │
│  2. Academic Classroom Management                                                      │
│  3. Curriculum & Content Management                                                    │
│  4. Diagnostic Assessment & Learning Path (IAR Engine)                                 │
│  5. Quiz Creation & Examination (AI Quiz Maker & Practice Center)                      │
│  6. Learning Progress & Gamification (XP, Avatar Shop, Rewards)                        │
│  7. Real-Time Quiz Battle (1v1 Online PvP & Bot Matchmaking)                           │
│  8. Remedial Intervention & Risk Monitoring (WRI Engine)                               │
│  9. System Audit & AI Tutoring (L.O.L.I. RAG Tutor & Security Logs)                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

> **Note on DFD 2+ & Activity Diagrams:** Exactly **9 Activity Diagrams** and **9 DFD Level 2 sub-diagrams** are created, corresponding 1-to-1 with these 9 modules.

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

## 6. Complete Database Schema (Grouped by Functional Domain)

The system utilizes the 28 core entities mapped across Cloud Firestore and Firebase Realtime Database:

### A. User Identity & Setup
1. **`USER`** — Master account credentials (`uid PK`, `email`, `name`, `role`, `photo`, `createdAt`).
2. **`STUDENT_PROFILE`** — Student metrics (`uid PK, FK`, `lrn`, `grade`, `school`, `XP`, `streak`, `risk`).
3. **`TEACHER_PROFILE`** — Teacher metadata (`uid PK, FK`, `department`, `subject`, `yearsOfExperience`, `qualification`).
4. **`ADMIN_PROFILE`** — Administrator record (`uid PK, FK`, `position`, `department`).
5. **`USER_SETTINGS`** — User preferences (`uid PK, FK`, `notifications`, `appearance`, `privacy`, `learning`).

### B. Classroom & Cohorts
6. **`CLASSROOM`** — Class section header (`classId PK`, `teacherId FK`, `className`, `gradeLevel`, `strand`, `subject`).

### C. Curriculum & Content
7. **`CURRICULUM_VERSION_SET`** — DepEd standards editions (`id PK`, `label`, `program`, `gradeLevel`, `isActive`).
8. **`DIAGNOSTIC_POLICY`** — Threshold rules (`id PK`, `versionSetId FK`, `gradeLevel`, `thresholds`).
9. **`SUBJECT`** — Math subjects (`id PK`, `versionSetId FK`, `name`, `gradeLevel`).
10. **`MODULE`** — Curriculum modules (`id PK`, `subjectId FK`, `name`, `targetTopic`).
11. **`LESSON_CONTENT`** — Instructional resources (`id PK`, `moduleId FK`, `authorId FK`, `title`, `targetSkill`, `contentUrl`).

### D. Assessments & Quizzes
12. **`DIAGNOSTIC_RESULT`** — Initial diagnostic scores (`docId PK`, `uid FK`, `rawScore`, `percentage`, `proficiencyLevel`).
13. **`LEARNING_PATH_RECORD`** — Adaptive sequence (`id PK`, `userId FK`, `lessonId FK`, `source`, `reason`).
14. **`GENERATED_QUIZ`** — Quiz headers (`id PK`, `teacherId FK`, `title`, `gradeLevel`, `status`).
15. **`AI_QUIZ_QUESTION`** — Question items (`id PK`, `quizId FK`, `questionType`, `options`, `correctAnswer`, `bloomLevel`).
16. **`ASSIGNED_QUIZ`** — Cohort assignments (`id PK`, `quizId FK`, `lrn FK`, `subject`, `status`, `dueDate`).
17. **`QUIZ_ATTEMPT`** — Student exam attempts (`attemptId PK`, `userId FK`, `quizId FK`, `score`, `completedAt`).
18. **`QUIZ_ANSWER`** — Per-item responses (`answerId PK`, `attemptId FK`, `questionId FK`, `selectedAnswer`, `isCorrect`).

### E. Progress & Gamification
19. **`USER_PROGRESS`** — Global student metrics (`userId PK, FK`, `totalLessonsCompleted`, `averageScore`).
20. **`SUBJECT_PROGRESS`** — Subject percentage (`id PK`, `userId FK`, `subjectId FK`, `progress`).
21. **`MODULE_PROGRESS`** — Module percentage (`id PK`, `subjectProgressId FK`, `moduleId FK`, `progress`).
22. **`LESSON_PROGRESS`** — Lesson duration/score (`id PK`, `userId FK`, `lessonId FK`, `completed`, `timeSpent`).
23. **`ACHIEVEMENTS`** — Student milestone badges (`userId PK, FK`, `achievements`, `totalAchievements`).
24. **`XP_ACTIVITY`** — Experience transaction ledger (`activityId PK`, `userId FK`, `type`, `xpEarned`, `timestamp`).

### F. Support, Governance & Real-Time
25. **`INTERVENTION_RECORD`** — Teacher remedial tasks (`id PK`, `lrn FK`, `teacherId FK`, `content`, `source`).
26. **`CHAT_SESSION`** — AI math tutor threads (`id PK`, `userId FK`, `title`, `isActive`).
27. **`CHAT_MESSAGE`** — Chat messages (`id PK`, `sessionId FK`, `role`, `content`, `timestamp`).
28. **`AUDIT_LOG`** — System security audit trail (`id PK`, `userId FK`, `action`, `targetType`, `timestamp`).

---

## 7. Gane & Sarson DFD Level 1 Architecture Reference

### Data Store Strategy (Option A: Consolidated for Level 1 Clarity)
Per the professor's note (*"kung ano nasa erd ayun lang dapat nasa dfd — for level 1, pwede bawasan/ibaba"*), DFD Level 1 consolidates the database into **9 Clean Open-Ended Data Stores (`D1` to `D9`)** to keep the main diagram readable, while Level 2 sub-diagrams detail the underlying tables:

* **`D1: Users`** $\longrightarrow$ Maps to `USER`, `STUDENT_PROFILE`, `TEACHER_PROFILE`, `ADMIN_PROFILE`, `USER_SETTINGS`
* **`D2: Classrooms`** $\longrightarrow$ Maps to `CLASSROOM`
* **`D3: Modules & Lessons`** $\longrightarrow$ Maps to `CURRICULUM_VERSION_SET`, `DIAGNOSTIC_POLICY`, `SUBJECT`, `MODULE`, `LESSON_CONTENT`
* **`D4: Diagnostics`** $\longrightarrow$ Maps to `DIAGNOSTIC_RESULT`, `LEARNING_PATH_RECORD`
* **`D5: Quizzes & Attempts`** $\longrightarrow$ Maps to `GENERATED_QUIZ`, `AI_QUIZ_QUESTION`, `ASSIGNED_QUIZ`, `QUIZ_ATTEMPT`, `QUIZ_ANSWER`
* **`D6: Progress & Gamification`** $\longrightarrow$ Maps to `USER_PROGRESS`, `SUBJECT_PROGRESS`, `MODULE_PROGRESS`, `LESSON_PROGRESS`, `ACHIEVEMENTS`, `XP_ACTIVITY`
* **`D7: Battle Records`** $\longrightarrow$ Maps to Realtime Database battle matchmaking & match state
* **`D8: Interventions`** $\longrightarrow$ Maps to `INTERVENTION_RECORD`
* **`D9: Chat & Audit Logs`** $\longrightarrow$ Maps to `CHAT_SESSION`, `CHAT_MESSAGE`, `AUDIT_LOG`

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
