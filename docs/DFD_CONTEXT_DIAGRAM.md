# MathPulse AI — Context Diagram (DFD Level 0)

> **Document Type:** Context Diagram Specification  
> **Target Standard:** Capstone Defense SAD & 1NF Database Architecture Alignment

---

## 1. Previous Version (Original Draft)

```text
0 MathPulse AI System

Interactions with TEACHER
IN (to System): Analytics Request
IN (to System): Quiz Configuration
IN (to System): Curriculum Source Materials (PDF/Links)
IN (to System): CSV/Excel Class Records File
IN (to System): Profile Updates
IN (to System): Login Credentials
OUT (to Teacher): Auth Token / Session State
OUT (to Teacher): Parsed & Imported Student Records
OUT (to Teacher): Generated Quiz & Preview
OUT (to Teacher): Analytics Report

Interactions with STUDENT
IN (to System): Login Credentials
IN (to System): Profile Updates
IN (to System): Diagnostic Answers
IN (to System): Module / Lesson Selection
IN (to System): AI Tutor Query / Chat Prompt
IN (to System): Quiz & Battle Submissions
IN (to System): Item Selection / XP Purchase
IN (to System): Daily Check-In Claim
OUT (to Student): Engagement, Progress & Data
OUT (to Student): Quiz Results / Feedback
OUT (to Student): AI Tutor Response
OUT (to Student): Learning Content & Assessments
OUT (to Student): Diagnostic Questions
OUT (to Student): Auth Token / Session State

Interactions with ADMINISTRATOR
IN (to System): Audit Log Request
IN (to System): Content Updates
IN (to System): User Updates
IN (to System): Login Credentials
OUT (to Administrator): Auth Token / Session State
OUT (to Administrator): User Records
OUT (to Administrator): Content Records
OUT (to Administrator): Audit Log Report
OUT (to Administrator): System Health & AI Usage Report
```

---

## 2. Revisions Needed & Professor Rule Compliance

1. **Remove the "0" from Title and Bubble:**
   - *Professor's Rule:* *"Context Diagram (DFD 0): Remove the '0' from the diagram's name."*
   - The number `0` was removed from the top header of the central system process bubble and from the document title. The central box is named **`MathPulse AI System`**, and the diagram is titled **`Context Diagram`**.
2. **Add Missing Module 8 Remedial Intervention Flows for Teacher:**
   - The previous diagram had no flow for submitting remedial interventions, leaving table `INTERVENTION_RECORD` disconnected. Added `Remedial Intervention Plan` (IN) and `Intervention Status Confirmation` (OUT).
3. **Add Missing Module 1 & 7 Peer Social & Battle Invites for Student:**
   - Added `Friend Request / Battle Invite` (IN) and `Peer Leaderboard & Friend Notifications` (OUT) to align with normalized tables `FRIENDSHIP` and `QUIZ_BATTLE_QUEUE`.
4. **Standardize Vague Labels into Tangible Reports:**
   - Changed *"Engagement, Progress & Data"* $\rightarrow$ `Progress, XP & Milestone Achievements`.
   - Changed *"CSV/Excel Class Records File"* $\rightarrow$ `Class Roster & Grade Records File`.

---

## 3. New Master List (Context Diagram)

### Interactions with STUDENT (Dominant User)
* **IN (to System):**
  1. `Login Credentials` *(Module 1)*
  2. `Profile & Settings Updates` *(Module 1)*
  3. `Friend Request / Battle Invite` *(Module 1 & 7)*
  4. `Diagnostic Assessment Answers` *(Module 4)*
  5. `Module / Lesson Selection` *(Module 3 & 6)*
  6. `Quiz & Live Battle Submissions` *(Module 5 & 7)*
  7. `Daily Check-In & Reward Claims` *(Module 6)*
  8. `AI Tutor Query / Chat Prompt` *(Module 9)*
* **OUT (to Student):**
  1. `Auth Token / Session State`
  2. `Diagnostic Questions & Placement`
  3. `Personalized Learning Path & Lessons`
  4. `Quiz Evaluation & Battle Results`
  5. `Progress, XP & Milestone Achievements`
  6. `Peer Leaderboard & Friend Notifications`
  7. `AI Tutor Explanation / Response`

---

### Interactions with TEACHER
* **IN (to System):**
  1. `Login Credentials` *(Module 1)*
  2. `Profile Updates` *(Module 1)*
  3. `Class Roster & Grade Records File` *(Module 2)*
  4. `Curriculum Source Materials (PDF/Links)` *(Module 3)*
  5. `Quiz Generation Configuration` *(Module 5)*
  6. `Remedial Intervention Plan` *(Module 8)*
  7. `Analytics & Risk Query Request` *(Module 2 & 8)*
* **OUT (to Teacher):**
  1. `Auth Token / Session State`
  2. `Parsed & Enrolled Student Roster`
  3. `Generated Quiz & Question Preview`
  4. `Student Risk & Analytics Report`
  5. `Intervention Status Confirmation`

---

### Interactions with ADMINISTRATOR
* **IN (to System):**
  1. `Login Credentials` *(Module 1)*
  2. `User Account Modifications` *(Module 1)*
  3. `Curriculum Standards & Diagnostic Policies` *(Module 3)*
  4. `Security Audit Log Request` *(Module 9)*
* **OUT (to Administrator):**
  1. `Auth Token / Session State`
  2. `User Management Records`
  3. `Curriculum Policy & Settings Records`
  4. `Security Audit Log Report`
  5. `System Health & AI Usage Report`

---

## 4. Mermaid Code (Draw.io Compatible)

```mermaid
graph LR
    Student["Student (Dominant User)"]
    Teacher["Teacher"]
    Admin["Administrator"]

    System["MathPulse AI System"]

    Student -->|Login Credentials| System
    Student -->|Profile & Settings Updates| System
    Student -->|Friend Request / Battle Invite| System
    Student -->|Diagnostic Assessment Answers| System
    Student -->|Module / Lesson Selection| System
    Student -->|Quiz & Live Battle Submissions| System
    Student -->|Daily Check-In & Reward Claims| System
    Student -->|AI Tutor Query / Chat Prompt| System

    System -->|Auth Token / Session State| Student
    System -->|Diagnostic Questions & Placement| Student
    System -->|Personalized Learning Path & Lessons| Student
    System -->|Quiz Evaluation & Battle Results| Student
    System -->|Progress, XP & Milestone Achievements| Student
    System -->|Peer Leaderboard & Friend Notifications| Student
    System -->|AI Tutor Explanation / Response| Student

    Teacher -->|Login Credentials| System
    Teacher -->|Class Roster & Grade Records File| System
    Teacher -->|Curriculum Source Materials| System
    Teacher -->|Quiz Generation Configuration| System
    Teacher -->|Remedial Intervention Plan| System
    Teacher -->|Analytics & Risk Query Request| System

    System -->|Auth Token / Session State| Teacher
    System -->|Parsed & Enrolled Student Roster| Teacher
    System -->|Generated Quiz & Question Preview| Teacher
    System -->|Student Risk & Analytics Report| Teacher
    System -->|Intervention Status Confirmation| Teacher

    Admin -->|Login Credentials| System
    Admin -->|User Account Modifications| System
    Admin -->|Curriculum Standards & Diagnostic Policies| System
    Admin -->|Security Audit Log Request| System

    System -->|Auth Token / Session State| Admin
    System -->|User Management Records| Admin
    System -->|Curriculum Policy & Settings Records| Admin
    System -->|Security Audit Log Report| Admin
    System -->|System Health & AI Usage Report| Admin
```
