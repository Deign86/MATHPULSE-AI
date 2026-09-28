# MathPulse AI — System Architecture & Gane & Sarson DFD Specification

> **Methodology:** Gane & Sarson Data Flow Diagram (DFD) Notation & 28-Entity ERD  
> **Target Standard:** Capstone Defense SAD & Active Codebase Alignment

---

## 1. Gane & Sarson Notation Standards Used

In the **Gane & Sarson** methodology:
1. **External Entities (Left):** Solid square/rectangular boxes representing the actors (**Student**, **Teacher**, **Administrator**). The dominant user (**Student**) is grouped prominently on the top-left.
2. **Processes (Center):** Rounded rectangles with whole-number header partitions (**`1, 2, 3, 4, 5, 6, 7, 8, 9`**), arranged sequentially based on the student/teacher educational lifecycle after login.
3. **Data Stores (Right):** Open-ended horizontal rectangles (**`D1` through `D9`**) representing the system's database storage collections.
4. **Data Flows:** Directed arrows labeled with concrete, tangible noun-phrase data packets.

---

## 2. The 28 Core System Entities (ERD Master List)

| # | Entity Name | Key Indicators (Col 1) | Attributes (Col 2) | Real Code Reference |
|:---:|---|---|---|---|
| **1** | **`USER`** | `PK uid` | `email`, `name`, `role`, `photo`, `createdAt` | `interface User` |
| **2** | **`STUDENT_PROFILE`** | `PK, FK uid` | `lrn`, `grade`, `school`, `level`, `currentXP`, `streak`, `overallRisk`, `hasTakenDiagnostic` | `interface StudentProfile` |
| **3** | **`TEACHER_PROFILE`** | `PK, FK uid` | `department`, `subject`, `yearsOfExperience`, `qualification` | `interface TeacherProfile` |
| **4** | **`ADMIN_PROFILE`** | `PK, FK uid` | `position`, `department` | `interface AdminProfile` |
| **5** | **`USER_SETTINGS`** | `PK, FK uid` | `notifications`, `appearance`, `privacy`, `learning`, `adminPanel` | `interface UserSettings` |
| **6** | **`CLASSROOM`** | `PK classId`<br>`FK teacherId` | `className`, `gradeLevel`, `section`, `strand`, `subject` | `AdminClassManagement` |
| **7** | **`CURRICULUM_VERSION_SET`** | `PK id` | `label`, `program`, `gradeLevel`, `isActive` | `CurriculumVersionSet` |
| **8** | **`DIAGNOSTIC_POLICY`** | `PK id`<br>`FK versionSetId` | `gradeLevel`, `thresholds` | `DiagnosticPolicy` |
| **9** | **`SUBJECT`** | `PK id`<br>`FK versionSetId` | `name`, `gradeLevel` | `curriculumData.ts` |
| **10** | **`MODULE`** | `PK id`<br>`FK subjectId` | `name`, `targetTopic` | `curriculumData.ts` |
| **11** | **`LESSON_CONTENT`** | `PK id`<br>`FK moduleId`<br>`FK authorId` | `title`, `targetSkill`, `contentUrl`, `isPublished` | `LessonViewer.tsx` |
| **12** | **`GENERATED_QUIZ`** | `PK id`<br>`FK teacherId` | `title`, `gradeLevel`, `totalPoints`, `status`, `source` | `GeneratedQuiz` |
| **13** | **`AI_QUIZ_QUESTION`** | `PK id`<br>`FK quizId` | `questionType`, `questionText`, `options`, `correctAnswer`, `bloomLevel`, `difficulty` | `AIQuizQuestion` |
| **14** | **`ASSIGNED_QUIZ`** | `PK id`<br>`FK quizId`<br>`FK lrn` | `subject`, `status`, `assignedAt`, `dueDate` | `AssignedQuiz` |
| **15** | **`DIAGNOSTIC_RESULT`** | `PK docId`<br>`FK uid` | `rawScore`, `percentage`, `proficiencyLevel`, `competencyScores`, `completedAt` | `AssessmentResult` |
| **16** | **`LEARNING_PATH_RECORD`** | `PK id`<br>`FK userId`<br>`FK lessonId` | `source`, `reason`, `generatedAt` | `LearningPathRecord` |
| **17** | **`INTERVENTION_RECORD`** | `PK id`<br>`FK lrn`<br>`FK teacherId` | `content`, `source`, `createdAt` | `InterventionRecord` |
| **18** | **`USER_PROGRESS`** | `PK, FK userId` | `totalLessonsCompleted`, `totalQuizzesCompleted`, `averageScore`, `updatedAt` | `UserProgress` |
| **19** | **`SUBJECT_PROGRESS`** | `PK id`<br>`FK userId`<br>`FK subjectId` | `progress`, `completedModules` | `SubjectProgress` |
| **20** | **`MODULE_PROGRESS`** | `PK id`<br>`FK subjectProgressId`<br>`FK moduleId` | `progress`, `lessonsCompleted` | `ModuleProgress` |
| **21** | **`LESSON_PROGRESS`** | `PK id`<br>`FK userId`<br>`FK lessonId` | `completed`, `timeSpent`, `score` | `LessonProgress` |
| **22** | **`QUIZ_ATTEMPT`** | `PK attemptId`<br>`FK userId`<br>`FK quizId` | `attemptNumber`, `score`, `completedAt` | `QuizAttempt` |
| **23** | **`QUIZ_ANSWER`** | `PK answerId`<br>`FK attemptId`<br>`FK questionId` | `selectedAnswer`, `isCorrect` | `QuizAnswer` |
| **24** | **`ACHIEVEMENTS`** | `PK, FK userId` | `achievements`, `totalAchievements`, `updatedAt` | `UserAchievements` |
| **25** | **`XP_ACTIVITY`** | `PK activityId`<br>`FK userId` | `type`, `xpEarned`, `description`, `timestamp` | `XPActivity` |
| **26** | **`CHAT_SESSION`** | `PK id`<br>`FK userId` | `title`, `isActive`, `createdAt` | `ChatSession` |
| **27** | **`CHAT_MESSAGE`** | `PK id`<br>`FK sessionId` | `role`, `content`, `timestamp` | `ChatMessage` |
| **28** | **`AUDIT_LOG`** | `PK id`<br>`FK userId` | `action`, `targetType`, `timestamp` | `AuditLog` |

---

## 3. Gane & Sarson DFD Level 1 (Unified System Architecture)

```mermaid
graph LR
    %% Actors (Left Column)
    Student["Student (Dominant User)"]
    Teacher["Teacher"]
    Admin["Administrator"]

    %% Processes 1 to 9 (Center Column)
    P1("1: User Authentication & Accounts")
    P2("2: Academic Classroom Management")
    P3("3: Curriculum & Content Management")
    P4("4: Diagnostic Assessment & Path")
    P5("5: Quiz Creation & Examination")
    P6("6: Learning Progress & Gamification")
    P7("7: Real-Time Quiz Battle")
    P8("8: Remedial Intervention & Risk")
    P9("9: System Audit & AI Tutoring")

    %% Data Stores (Right Column - Open-Ended Gane & Sarson Stores)
    D1[("D1: Users (Profiles & Settings)")]
    D2[("D2: Classrooms (Sections & Classes)")]
    D3[("D3: Modules & Lessons (Curriculum)")]
    D4[("D4: Diagnostics (Results & Paths)")]
    D5[("D5: Quizzes & Attempts (Exams)")]
    D6[("D6: Progress & Gamification (XP)")]
    D7[("D7: Battle Records (Match State)")]
    D8[("D8: Interventions (At-Risk Logs)")]
    D9[("D9: Chat & Audit Logs (History)")]

    %% Process 1: Authentication & User Governance
    Student -->|Login Credentials / Profile Updates| P1
    Teacher -->|Login Credentials / Profile Updates| P1
    Admin -->|Login Credentials / Account Updates| P1
    P1 -->|Auth Session & Profile State| Student
    P1 -->|Auth Session & Profile State| Teacher
    P1 -->|Auth Session & User Records| Admin
    P1 --> D1
    D1 --> P1

    %% Process 2: Classroom Management
    Teacher -->|Class Sections & Grade Records File| P2
    P2 -->|Enrolled Class Sections Summary & Preview| Teacher
    P2 --> D2
    D2 --> P2

    %% Process 3: Curriculum & Content
    Teacher -->|Curriculum Source Materials| P3
    Admin -->|Curriculum Standards & Policies| P3
    Student -->|Module / Lesson Selection| P3
    P3 -->|Personalized Learning Path & Lessons| Student
    P3 -->|Published Curriculum Records| Teacher
    P3 -->|Curriculum Policy Records| Admin
    P3 --> D3
    D3 --> P3

    %% Process 4: Diagnostic Assessment
    Student -->|Diagnostic Assessment Answers| P4
    P4 -->|Diagnostic Questions & Placement| Student
    P4 --> D4
    D4 --> P4
    D3 --> P4

    %% Process 5: Quiz Creation & Examination
    Teacher -->|Quiz Generation Configuration| P5
    Student -->|Quiz & Exam Submissions| P5
    P5 -->|Generated Quiz & Preview| Teacher
    P5 -->|Quiz Evaluation & Feedback| Student
    P5 --> D5
    D5 --> P5
    D3 --> P5

    %% Process 6: Learning Progress & Gamification
    Student -->|Daily Claims, XP Purchases & Check-Ins| P6
    P6 -->|Progress, XP & Milestone Analytics| Student
    P6 --> D6
    D6 --> P6
    D5 --> P6

    %% Process 7: Real-Time Quiz Battle
    Student -->|1v1 Matchmaking Requests & Battle Submissions| P7
    P7 -->|Live Battle Questions & Match Results| Student
    P7 --> D7
    D7 --> P7
    D5 --> P7

    %% Process 8: Remedial Intervention & Risk
    Teacher -->|Analytics Query & Remedial Plan| P8
    P8 -->|Student Risk & Analytics Report| Teacher
    P8 -->|Remedial Task Alert & Notification| Student
    P8 --> D8
    D8 --> P8
    D6 --> P8

    %% Process 9: System Audit & AI Tutoring
    Student -->|AI Tutor Query / Chat Prompt| P9
    Admin -->|Security Audit Log Request| P9
    P9 -->|AI Tutor Explanation & Hints| Student
    P9 -->|Security Audit & System Health Report| Admin
    P9 --> D9
    D9 --> P9
    D3 --> P9
```

---

## 4. Gane & Sarson Process & Data Store Master Checklist

| DFD 1 Process | Process Description | Connected Data Store ID & Name | Mapped ERD Entities |
|---|---|---|---|
| **1** | User Authentication & Accounts | **`D1: Users`** | `USER`, `STUDENT_PROFILE`, `TEACHER_PROFILE`, `ADMIN_PROFILE`, `USER_SETTINGS` |
| **2** | Academic Classroom Management | **`D2: Classrooms`** | `CLASSROOM` |
| **3** | Curriculum & Content Management | **`D3: Modules & Lessons`** | `CURRICULUM_VERSION_SET`, `DIAGNOSTIC_POLICY`, `SUBJECT`, `MODULE`, `LESSON_CONTENT` |
| **4** | Diagnostic Assessment & Path | **`D4: Diagnostics`** | `DIAGNOSTIC_RESULT`, `LEARNING_PATH_RECORD` |
| **5** | Quiz Creation & Examination | **`D5: Quizzes & Attempts`** | `GENERATED_QUIZ`, `AI_QUIZ_QUESTION`, `ASSIGNED_QUIZ`, `QUIZ_ATTEMPT`, `QUIZ_ANSWER` |
| **6** | Learning Progress & Gamification | **`D6: Progress & Gamification`** | `USER_PROGRESS`, `SUBJECT_PROGRESS`, `MODULE_PROGRESS`, `LESSON_PROGRESS`, `ACHIEVEMENTS`, `XP_ACTIVITY` |
| **7** | Real-Time Quiz Battle | **`D7: Battle Records`** | Realtime Database battle state & match history |
| **8** | Remedial Intervention & Risk | **`D8: Interventions`** | `INTERVENTION_RECORD` |
| **9** | System Audit & AI Tutoring | **`D9: Chat & Audit Logs`** | `CHAT_SESSION`, `CHAT_MESSAGE`, `AUDIT_LOG` |
