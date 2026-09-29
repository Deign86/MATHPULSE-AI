# MathPulse AI — Work Breakdown Structure Dictionary (WBSD) & Gantt Chart Schedule

## 1. WBS Numbering Conventions: `2.1.1` vs. `2.0.1`

### When to use `2.1.1` (Hierarchical Format — Recommended Standard)
In standard Project Management Institute (PMI) and academic thesis WBS standards:
- **Level 1**: System / Capstone Project (`MathPulse AI`)
- **Level 2**: Major Functional Phases (`1.1` through `1.13` in Capstone 1; `2.1` through `2.4` in Capstone 2)
- **Level 3**: Specific Deliverables / Tasks (`1.1.1`, `1.1.2`, ..., `2.1.1`, `2.2.1`, `2.3.1`, `2.4.1`)

**Use `2.1.1`, `2.2.1`, `2.3.1`, `2.4.1` when:**
You want Capstone 2 to mirror the exact hierarchical structure of Capstone 1. In Capstone 1, tasks were not listed as `1.0.1, 1.0.2...`; they were organized into logical work packages (`1.1 Auth`, `1.2 Ingestion`, `1.3 Risk`, `1.9 Testing`, `1.11 Deployment`, `1.12 Training`, `1.13 Launch`). 
Similarly in Capstone 2:
- **`2.1`**: Curriculum Learning Resources & RAG Integration (`2.1.1` to `2.1.3`)
- **`2.2`**: UI/UX Modernization & Responsive Redesign (`2.2.1` to `2.2.4`)
- **`2.3`**: System Optimization & Bulk Provisioning (`2.3.1` to `2.3.4`)
- **`2.4`**: Capstone 2 Testing & Evaluation (`2.4.1` to `2.4.4`)

---

### When to use `2.0.1` (Flat Iteration Format)
**Use `2.0.1`, `2.0.2`, `2.0.3` when:**
Your professor specifically instructs that all Capstone 2 additions belong to a single appended bucket (`2.0 Iteration 2 Additions`) and must simply be listed in sequential flat order (`2.0.1` through `2.0.15`) without creating sub-phases.

*The table below provides the primary hierarchical standard (`2.1.1`) along with the flat cross-reference (`2.0.x`) so your manuscript accommodates either preference seamlessly.*

---

## 2. Work Breakdown Structure Dictionary (WBSD)

> **Integrity Guarantee:**  
> - **Capstone 1 (`1.1` – `1.13.2`):** Retained 100% intact according to the original Gantt chart schedule across Months 1 to 4 (February to May). Month 4 tasks (`1.11.1` to `1.13.2`) are now fully incorporated.
> - **Capstone 2 Additions (`2.1.1` – `2.4.4` / `2.0.1` – `2.0.15`):** Appended strictly at the end.
> - **Absolute Final Phase:** Ends with **Testing & Evaluation**, concluding with **User Acceptance Testing (UAT)** with SSHS STEM students and teachers by **October 5**.

| Level | Code (Hierarchical) | Code (Flat) | Name | Description | Predecessors | Duration (Days) | Owner |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| **2** | **1.1** | **1.1** | **Authentication & User Management** | Security protocols for user identification, role verification, and account management. | N/A | N/A | Lead Dev |
| 3 | 1.1.1 | 1.1.1 | Secure Login | System shall authenticate users using Firebase (Email/Pass) and Google OAuth. | N/A | 5 | Lead Dev |
| 3 | 1.1.2 | 1.1.2 | Role-Based Access | System shall restrict access based on role: Admin, Teacher, or Student. | 1.1.1 | 3 | Lead Dev |
| 3 | 1.1.3 | 1.1.3 | Student Profile | Students can customize profiles, select avatars, and set display names. | 1.1.1 | 2 | Design Lead/s |
| 3 | 1.1.4 | 1.1.4 | Settings | Users can configure personal app settings and notification preferences. | 1.1.1 | 2 | Design Lead/s |
| **2** | **1.2** | **1.2** | **Data Ingestion & Diagnostics** | Mechanisms for academic baselines, importing records, and initial assessments. | N/A | N/A | Lead Dev |
| 3 | 1.2.1 | 1.2.1 | Class Record Import | Teachers can upload class records in CSV, Excel, PDF, and DOCX formats. | 1.1.2 | 5 | Design Lead/s |
| 3 | 1.2.2 | 1.2.2 | Diagnostic Assessment | Students must complete a diagnostic assessment upon first login. | 1.1.2 | 7 | Design Lead/s |
| 3 | 1.2.3 | 1.2.3 | Data Parsing | System shall parse uploaded documents to extract quantitative academic records. | 1.2.1 | 8 | Lead Dev |
| 3 | 1.2.4 | 1.2.4 | Data Validation & Error Handling | Implement validation rules to detect malformed uploads and surface meaningful error messages to teachers. | 1.2.3 | 4 | Lead Dev |
| **2** | **1.3** | **1.3** | **Predictive Modeling & Risk** | AI-driven risk assessment to predict academic failure and classify risk levels. | N/A | N/A | Lead Dev |
| 3 | 1.3.1 | 1.3.1 | Risk Prediction | System shall analyze assessment data to predict a student's risk of failure. | 1.2.2, 1.2.3 | 10 | Lead Dev |
| 3 | 1.3.2 | 1.3.2 | Risk Classification | System shall automatically label students as High, Medium, or Low risk. | 1.3.1 | 3 | Lead Dev |
| 3 | 1.3.3 | 1.3.3 | Risk Visualization | Display color-coded risk indicators (Red/Yellow/Green) on teacher dashboard. | 1.3.2 | 4 | Design Lead/s |
| 3 | 1.3.4 | 1.3.4 | Teacher Override | Allow teachers to manually override the AI-assigned risk label. | 1.3.3 | 2 | Lead Dev |
| **2** | **1.4** | **1.4** | **AI-Driven Content & Tutoring** | Generation of personalized remedial materials and AI chat tutor interface. | N/A | N/A | Lead Dev |
| 3 | 1.4.1 | 1.4.1 | Personalized Learning | Generate dynamic study plans tailored to a student's specific learning gaps. | 1.3.2 | 7 | Lead Dev |
| 3 | 1.4.2 | 1.4.2 | AI Chat Tutor | Provide an on-demand chat interface for students to ask math-related questions. | N/A | 14 | Lead Dev |
| 3 | 1.4.3 | 1.4.3 | Floating Widget | Display a floating AI help widget accessible on all application pages. | 1.4.2 | 3 | Design Lead/s |
| 3 | 1.4.4 | 1.4.4 | Remedial Content | Generate adaptive quizzes and flashcards based on student weak points. | 1.4.1 | 8 | Lead Dev |
| 3 | 1.4.5 | 1.4.5 | Subject Organization | Display structured learning modules with individual progress indicators. | N/A | 5 | Design Lead/s |
| 3 | 1.4.6 | 1.4.6 | Content Quality Review | Review AI-generated quizzes and flashcards for accuracy, curriculum alignment, and age-appropriateness. | 1.4.4 | 3 | Docu Lead |
| **2** | **1.5** | **1.5** | **Workspace & Productivity** | Utilities for managing academic tasks, tracking grades, and organizing learning. | N/A | N/A | Design Lead/s |
| 3 | 1.5.1 | 1.5.1 | Task Management | Provide a Kanban-style board for students to track assigned tasks. | N/A | 6 | Design Lead/s |
| 3 | 1.5.2 | 1.5.2 | Performance Viewing | Allow students to view their own academic performance and grade breakdowns. | 1.2.3 | 4 | Design Lead/s |
| 3 | 1.5.3 | 1.5.3 | Content Search | Allow students to search for specific lessons, quizzes, or topics. | 1.4.5 | 5 | Lead Dev |
| 3 | 1.5.4 | 1.5.4 | Notifications | Alert students of friend requests, achievements, and upcoming deadlines. | 1.1.4 | 4 | Lead Dev |
| **2** | **1.6** | **1.6** | **Gamification & Social** | Engagement mechanics for motivation, including XP, leveling, and interaction. | N/A | N/A | Lead Dev |
| 3 | 1.6.1 | 1.6.1 | XP & Leveling | Award students XP and increase level upon completing activities. | 1.4.4, 1.5.1 | 5 | Lead Dev |
| 3 | 1.6.2 | 1.6.2 | Daily Streaks | Track consecutive login days for students to maintain a daily streak. | 1.1.1 | 2 | Lead Dev |
| 3 | 1.6.3 | 1.6.3 | Leaderboards | Display leaderboard allowing students to compare XP ranking against peers. | 1.6.1 | 4 | Design Lead/s |
| 3 | 1.6.4 | 1.6.4 | Social Networking | Allow students to send friend requests and view peer statistics. | 1.1.3 | 6 | Design Lead/s |
| 3 | 1.6.5 | 1.6.5 | Achievements | Award digital badges and XP bonuses for meeting specific milestones. | 1.6.1 | 4 | Design Lead/s |
| **2** | **1.7** | **1.7** | **Teacher Tools & Reporting** | Admin and analytical tools for monitoring performance and validating interventions. | N/A | N/A | Design Lead/s |
| 3 | 1.7.1 | 1.7.1 | Class Analytics | Provide real-time charts showing class performance trends and topic difficulty. | 1.2.3, 1.3.2 | 7 | Design Lead/s |
| 3 | 1.7.2 | 1.7.2 | Intervention Approval | Require teachers to validate AI-generated interventions before assignment. | 1.4.1 | 5 | Design Lead/s |
| 3 | 1.7.3 | 1.7.3 | Task Assignment | Allow teachers to manually create and assign tasks to specific students. | 1.1.2 | 4 | Design Lead/s |
| 3 | 1.7.4 | 1.7.4 | Report Export | Allow teachers to export class reports and worksheets as PDF files. | 1.7.1 | 3 | Lead Dev |
| **2** | **1.8** | **1.8** | **Admin & System Control** | High-level management capabilities for maintenance, user oversight, and configuration. | N/A | N/A | Project Lead |
| 3 | 1.8.1 | 1.8.1 | User Management | Administrators can create, edit, or suspend student and teacher accounts. | 1.1.2 | 5 | Lead Dev |
| 3 | 1.8.2 | 1.8.2 | Curriculum Management | Administrators can update educational content and standards. | N/A | 6 | Docu Lead |
| 3 | 1.8.3 | 1.8.3 | Audit Logs | Administrators can view logs of all administrative actions. | 1.8.1 | 4 | Lead Dev |
| 3 | 1.8.4 | 1.8.4 | System Configuration | Administrators can toggle feature flags (e.g., enable maintenance mode). | N/A | 3 | Project Lead |
| **2** | **1.9** | **1.9** | **Testing & Quality Assurance (Iteration 1)** | Structured verification and validation activities to ensure baseline features meet functional requirements. | N/A | N/A | Lead Dev |
| 3 | 1.9.1 | 1.9.1 | Unit Testing | Write and execute unit tests for all core services including authentication, gamification, risk prediction, and data parsing modules. | 1.4.4, 1.5.4, 1.6.5 | 7 | Lead Dev |
| 3 | 1.9.2 | 1.9.2 | Integration Testing | Validate end-to-end data flow across integrated system components (e.g., Firebase ↔ AI services ↔ frontend). | 1.9.1 | 6 | Lead Dev |
| 3 | 1.9.3 | 1.9.3 | User Acceptance Testing (UAT 1) | Conduct structured UAT sessions with representative student and teacher users to verify usability and requirement coverage. | 1.9.2 | 5 | Design Lead/s |
| 3 | 1.9.4 | 1.9.4 | Bug Fixing & Regression | Resolve all issues identified during UAT and perform regression testing to confirm no existing features are broken. | 1.9.3 | 5 | Lead Dev |
| 3 | 1.9.5 | 1.9.5 | Performance & Security Audit | Evaluate system response times, Firebase rule configurations, and API rate limits; remediate any security vulnerabilities found. | 1.9.2 | 3 | Lead Dev |
| **2** | **1.10** | **1.10** | **Deployment & Launch Preparation (Iteration 1)** | Activities for staging and baseline environment setup, documentation, and stakeholder demo. | N/A | N/A | Project Lead |
| 3 | 1.10.1 | 1.10.1 | Production Environment Setup | Configure Firebase production project, environment variables, hosting rules, and CI/CD pipeline for the live build. | 1.9.4 | 3 | Lead Dev |
| 3 | 1.10.2 | 1.10.2 | Data Migration & Seeding | Migrate test/staging data to production and seed curriculum content and initial system configuration. | 1.10.1 | 2 | Lead Dev |
| 3 | 1.10.3 | 1.10.3 | Final Documentation | Finalize Capstone 1 technical manual, user guide, and system documentation package for academic submission. | 1.9.4 | 5 | Docu Lead |
| 3 | 1.10.4 | 1.10.4 | Stakeholder Demo & Presentation | Conduct a formal live demonstration of the deployed system to panelists, advisers, or key stakeholders. | 1.10.2, 1.10.3 | 2 | Project Lead |
| 3 | 1.10.5 | 1.10.5 | Post-Launch Monitoring | Monitor live system for errors, usage anomalies, and performance degradation in the initial period following deployment. | 1.10.4 | 3 | Lead Dev |
| **2** | **1.11** | **1.11** | **Production Infrastructure & Deployment (Month 4)** | Provisioning and verification of live cloud infrastructure, domain routing, and production deployment. | N/A | N/A | Lead Dev |
| 3 | 1.11.1 | 1.11.1 | Pre-Deployment Staging & Environment Verification | Verify staging builds, environment variables, asset bundles, and cloud hosting assets prior to production provisioning. | 1.10.1, 1.10.2 | 5 | Lead Dev |
| 3 | 1.11.2 | 1.11.2 | Production Server Provisioning & Verification | Provision production server environments, configure domain routing, SSL certificates, and verify database cluster availability. | 1.11.1 | 5 | Lead Dev |
| 3 | 1.11.3 | 1.11.3 | Full System Deployment | Execute full production deployment of frontend PWA, backend FastAPI microservices, and live Firestore database rules. | 1.11.2 | 4 | Lead Dev |
| **2** | **1.12** | **1.12** | **Operational Security & Staff Training (Month 4)** | Security evaluation in live cloud environment and comprehensive training for institutional users. | N/A | N/A | Project Lead |
| 3 | 1.12.1 | 1.12.1 | Live Environment Security Testing | Perform live environment vulnerability scans, penetration testing on production endpoints, and verify Firebase authorization boundaries. | 1.11.3 | 6 | Lead Dev |
| 3 | 1.12.2 | 1.12.2 | Training Material & Guide Preparation | Author operational user manuals, quick-start guides, and video walkthroughs for administrative and teaching personnel. | 1.10.3, 1.11.3 | 3 | Docu Lead |
| 3 | 1.12.3 | 1.12.3 | Administrator & IT Staff Training | Conduct formal hands-on training for school administrators and IT staff on account management, audit logs, and maintenance. | 1.12.2 | 3 | Project Lead |
| **2** | **1.13** | **1.13** | **Institutional Onboarding & System Launch (Month 4)** | Institutional transition, educator onboarding, and baseline operational go-live. | N/A | N/A | Project Lead |
| 3 | 1.13.1 | 1.13.1 | Teacher Onboarding & System Walkthrough | Onboard Valenzuela City mathematics teachers, demonstrate class record uploading, diagnostic assessments, and intervention tools. | 1.12.3 | 2 | Design Lead/s |
| 3 | 1.13.2 | 1.13.2 | Official System Go-Live (Launch) | Formally release the initial baseline platform to student and faculty cohorts for baseline academic utilization. | 1.13.1 | 2 | Project Lead |
| **2** | **2.1** | **2.0** | **Curriculum Learning Resources & RAG Integration (Capstone 2)** | Integration of official Valenzuela City School of Mathematics and Science (SSHS) Senior High School learning modules into the AI tutoring pipeline. | N/A | N/A | Lead Dev |
| 3 | 2.1.1 | 2.0.1 | School Learning Resources Ingestion | Ingest Valenzuela City SSHS DepEd modules (PDF/DOCX) using LiteParse Markdown extraction. | 1.13.2 | 8 | Docu Lead |
| 3 | 2.1.2 | 2.0.2 | Chroma Vector Store Indexing & Semantic Search | Build and index local Chroma vector database using `BAAI/bge-small-en-v1.5` embeddings for curriculum-aligned semantic context retrieval. | 2.1.1 | 7 | Lead Dev |
| 3 | 2.1.3 | 2.0.3 | Dual-Model AI Architecture & RAG Pipeline | Implement intelligent LLM routing between `deepseek-reasoner` for step-by-step math reasoning/lesson generation and `deepseek-chat` for real-time tutoring. | 2.1.2 | 6 | Lead Dev |
| **2** | **2.2** | **2.0** | **UI/UX Modernization & Responsive Redesign (Capstone 2)** | High-fidelity overhaul of mobile and desktop user interfaces across student, teacher, and admin portals. | N/A | N/A | Design Lead/s |
| 3 | 2.2.1 | 2.0.4 | Mobile Viewport Optimization & Space Reclamation | Overhaul mobile responsiveness across student modules (~390px reclaimed), compact hero headers, single quarter dropdown pill, and slide-up filter sheets. | 1.5.3, 1.13.2 | 8 | Design Lead/s |
| 3 | 2.2.2 | 2.0.5 | Avatar Studio Split-Screen & Cyber-Podium Redesign | Redesign Avatar Studio with game-inspired mobile split-screen (pinned 3D cyber-podium stage + dynamic category drawer with active label expansion). | 1.6.1, 2.2.1 | 7 | Design Lead/s |
| 3 | 2.2.3 | 2.0.6 | Admin & Teacher Suite Modernization | Implement vibrant Bento stat cards, sticky footer pagination architecture, 2-column landscape modals, and responsive mobile bento cards for audit logs. | 1.7.1, 1.8.1, 2.2.1 | 7 | Design Lead/s |
| 3 | 2.2.4 | 2.0.7 | Quiz Battle HUD & Universal Notification Polish | Refine Quiz Battle in-game HUD (topic pills, momentum feedback, single celebration triggers) and universal amber-glow notification bell across all roles. | 1.6.4, 2.2.2 | 5 | Design Lead/s |
| **2** | **2.3** | **2.0** | **System Hardening & Performance Optimization (Capstone 2)** | Reliability, bulk user onboarding, and runtime fault tolerance optimizations. | N/A | N/A | Lead Dev |
| 3 | 2.3.1 | 2.0.8 | Bulk Student Provisioning & Brevo Email Integration | Implement bulk student CSV/Excel account provisioning with automated Firebase Auth creation, Firestore profile linking, and Brevo transactional email delivery. | 1.8.1, 1.13.2 | 6 | Lead Dev |
| 3 | 2.3.2 | 2.0.9 | Fault-Tolerant Quiz Engine & Safety Fallbacks | Harden lesson checkpoint quiz runtime with dynamic fallback question generators to eliminate white-screen crashes and handle sparse question sets. | 2.1.3, 1.4.4 | 6 | Lead Dev |
| 3 | 2.3.3 | 2.0.10 | Hybrid Weakness Tracking & Predictive Analytics Wiring | Connect hybrid academic weakness detection directly to student and teacher dashboard visualizations to monitor competency gaps in real time. | 1.3.1, 1.7.1, 2.3.2 | 7 | Lead Dev |
| 3 | 2.3.4 | 2.0.11 | PWA Offline Caching & Frontend Optimization | Optimize TanStack Query caching, service worker offline asset caching, and dynamic bundle splitting to achieve rapid mobile load times. | 2.2.1, 2.2.3 | 5 | Lead Dev |
| **2** | **2.4** | **2.0** | **Capstone 2 Comprehensive Testing & Evaluation (ABSOLUTE FINAL PHASE)** | Final phase of the project dedicated strictly to quality assurance, ISO 25010 evaluation by IT experts, and culminating in User Acceptance Testing (UAT) by October 5. | N/A | N/A | Project Lead |
| 3 | 2.4.1 | 2.0.12 | End-to-End Regression & Integration Testing | Conduct rigorous automated and manual test runs across RAG retrieval, mobile navigation, authentication flows, and quiz checkpoint mechanics. | 2.1.3, 2.2.4, 2.3.3, 2.3.4 | 8 | Lead Dev |
| 3 | 2.4.2 | 2.0.13 | Security Audit, Firebase Rules Hardening & Benchmarking | Audit Firestore and Realtime Database rules, verify role-based permissions, conduct API load benchmarking, and harden secrets management. | 2.3.1, 2.4.1 | 5 | Lead Dev |
| 3 | 2.4.3 | 2.0.14 | **IT Expert Testing & ISO/IEC 25010 Software Quality Evaluation** | Administer standardized software quality evaluation with IT professionals, software engineers, and faculty assessing Functional Suitability, Efficiency, Usability, Reliability, and Security. | 2.4.1, 2.4.2 | 7 | Project Lead / Lead Dev |
| 3 | 2.4.4 | 2.0.15 | **User Acceptance Testing (UAT) with SSHS STEM Students & Teachers** | **CULMINATING END OF PROJECT (UNTIL OCTOBER 5):** Conduct structured field UAT with Senior High School STEM students and mathematics faculty of Valenzuela City SSHS to evaluate educational efficacy, usability, and system satisfaction. | 2.4.3 | 10 | Design Lead/s / Project Lead |

---

## 3. Weekly Gantt Chart Schedule (January to October 5)

### Quarter Breakdown Summary (40 Weeks Total)

| Quarter | Calendar Months | Academic Week Span | Phase Focus |
| :--- | :--- | :---: | :--- |
| **Quarter 1 (Q1)** | January – March | **Weeks 1 – 13** (13 Weeks) | **Capstone 1 Core Foundation:** Authentication, Data Ingestion, Diagnostics, AI Chat Tutor, Risk Modeling, and Workspace Utilities. |
| **Quarter 2 (Q2)** | April – June | **Weeks 14 – 26** (13 Weeks) | **Capstone 1 Advanced Features, Testing, Deployment & Month 4 Launch:** Gamification, Teacher Tools, Admin, Baseline Testing, Server Provisioning (`1.11`), Training (`1.12`), and Onboarding/Launch (`1.13`). |
| **Quarter 3 (Q3)** | July – August | **Weeks 27 – 35** (9 Weeks) | **Capstone 2 Enhancements:** Ingestion of SSHS Curriculum Modules (RAG), Mobile UI/UX Polish, Admin/Teacher Modernization, and Fault-Tolerant Optimizations. |
| **Quarter 4 (Q4)** | September – October 5 | **Weeks 36 – 40** (5 Weeks) | **ABSOLUTE FINAL PHASE — Comprehensive Testing & Quality Evaluation:** Integration Regression, Security Audits, ISO/IEC 25010 IT Expert Evaluation, and concluding with **User Acceptance Testing (UAT)** on October 5. |

---

### Master Weekly Timeline Matrix (Weeks 1 to 40)

| Task Code (H) | Task Code (F) | Task Name | Owner | Quarter | Calendar Weeks | Predecessors |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **1.1.1** | 1.1.1 | Secure Login | Lead Dev | Q1 | W1 – W2 | N/A |
| **1.1.2** | 1.1.2 | Role-Based Access | Lead Dev | Q1 | W2 – W3 | 1.1.1 |
| **1.1.3** | 1.1.3 | Student Profile | Design Lead/s | Q1 | W2 – W3 | 1.1.1 |
| **1.1.4** | 1.1.4 | Settings | Design Lead/s | Q1 | W3 – W4 | 1.1.1 |
| **1.2.1** | 1.2.1 | Class Record Import | Design Lead/s | Q1 | W3 – W5 | 1.1.2 |
| **1.2.2** | 1.2.2 | Diagnostic Assessment | Design Lead/s | Q1 | W4 – W6 | 1.1.2 |
| **1.2.3** | 1.2.3 | Data Parsing | Lead Dev | Q1 | W5 – W7 | 1.2.1 |
| **1.2.4** | 1.2.4 | Data Validation & Error Handling | Lead Dev | Q1 | W7 – W8 | 1.2.3 |
| **1.3.1** | 1.3.1 | Risk Prediction | Lead Dev | Q1 | W7 – W9 | 1.2.2, 1.2.3 |
| **1.3.2** | 1.3.2 | Risk Classification | Lead Dev | Q1 | W9 – W10 | 1.3.1 |
| **1.3.3** | 1.3.3 | Risk Visualization | Design Lead/s | Q1 | W10 – W11 | 1.3.2 |
| **1.3.4** | 1.3.4 | Teacher Override | Lead Dev | Q1 | W11 – W12 | 1.3.3 |
| **1.4.1** | 1.4.1 | Personalized Learning | Lead Dev | Q1 | W10 – W12 | 1.3.2 |
| **1.4.2** | 1.4.2 | AI Chat Tutor | Lead Dev | Q1 | W5 – W8 | N/A |
| **1.4.3** | 1.4.3 | Floating Widget | Design Lead/s | Q1 | W8 – W9 | 1.4.2 |
| **1.4.4** | 1.4.4 | Remedial Content | Lead Dev | Q1 | W11 – W13 | 1.4.1 |
| **1.4.5** | 1.4.5 | Subject Organization | Design Lead/s | Q1 | W4 – W6 | N/A |
| **1.4.6** | 1.4.6 | Content Quality Review | Docu Lead | Q1 | W12 – W13 | 1.4.4 |
| **1.5.1** | 1.5.1 | Task Management | Design Lead/s | Q1 | W3 – W5 | N/A |
| **1.5.2** | 1.5.2 | Performance Viewing | Design Lead/s | Q1 | W7 – W8 | 1.2.3 |
| **1.5.3** | 1.5.3 | Content Search | Lead Dev | Q1 | W6 – W7 | 1.4.5 |
| **1.5.4** | 1.5.4 | Notifications | Lead Dev | Q1 | W8 – W9 | 1.1.4 |
| **1.6.1** | 1.6.1 | XP & Leveling | Lead Dev | Q1 / Q2 | W12 – W14 | 1.4.4, 1.5.1 |
| **1.6.2** | 1.6.2 | Daily Streaks | Lead Dev | Q1 | W11 – W12 | 1.1.1 |
| **1.6.3** | 1.6.3 | Leaderboards | Design Lead/s | Q2 | W14 – W15 | 1.6.1 |
| **1.6.4** | 1.6.4 | Social Networking | Design Lead/s | Q2 | W14 – W16 | 1.1.3 |
| **1.6.5** | 1.6.5 | Achievements | Design Lead/s | Q2 | W15 – W16 | 1.6.1 |
| **1.7.1** | 1.7.1 | Class Analytics | Design Lead/s | Q1 / Q2 | W13 – W15 | 1.2.3, 1.3.2 |
| **1.7.2** | 1.7.2 | Intervention Approval | Design Lead/s | Q2 | W15 – W16 | 1.4.1 |
| **1.7.3** | 1.7.3 | Task Assignment | Design Lead/s | Q2 | W16 – W17 | 1.1.2 |
| **1.7.4** | 1.7.4 | Report Export | Lead Dev | Q2 | W16 – W17 | 1.7.1 |
| **1.8.1** | 1.8.1 | User Management | Lead Dev | Q1 | W4 – W6 | 1.1.2 |
| **1.8.2** | 1.8.2 | Curriculum Management | Docu Lead | Q1 | W6 – W8 | N/A |
| **1.8.3** | 1.8.3 | Audit Logs | Lead Dev | Q1 | W8 – W9 | 1.8.1 |
| **1.8.4** | 1.8.4 | System Configuration | Project Lead | Q1 | W9 – W10 | N/A |
| **1.9.1** | 1.9.1 | Unit Testing (C1) | Lead Dev | Q2 | W17 – W18 | 1.4.4, 1.5.4, 1.6.5 |
| **1.9.2** | 1.9.2 | Integration Testing (C1) | Lead Dev | Q2 | W18 – W19 | 1.9.1 |
| **1.9.3** | 1.9.3 | User Acceptance Testing (UAT 1) | Design Lead/s | Q2 | W19 – W20 | 1.9.2 |
| **1.9.4** | 1.9.4 | Bug Fixing & Regression | Lead Dev | Q2 | W20 – W21 | 1.9.3 |
| **1.9.5** | 1.9.5 | Performance & Security Audit | Lead Dev | Q2 | W19 – W20 | 1.9.2 |
| **1.10.1** | 1.10.1 | Production Environment Setup | Lead Dev | Q2 | W21 – W22 | 1.9.4 |
| **1.10.2** | 1.10.2 | Data Migration & Seeding | Lead Dev | Q2 | W21 – W22 | 1.10.1 |
| **1.10.3** | 1.10.3 | Final Documentation (C1) | Docu Lead | Q2 | W22 – W23 | 1.9.4 |
| **1.10.4** | 1.10.4 | Stakeholder Demo & Presentation | Project Lead | Q2 | W22 – W23 | 1.10.2, 1.10.3 |
| **1.10.5** | 1.10.5 | Post-Launch Monitoring | Lead Dev | Q2 | W23 – W24 | 1.10.4 |
| **1.11.1** | 1.11.1 | Pre-Deployment Staging & Environment Verification | Lead Dev | Q2 | W23 – W24 | 1.10.1, 1.10.2 |
| **1.11.2** | 1.11.2 | Production Server Provisioning & Verification | Lead Dev | Q2 | W24 – W25 | 1.11.1 |
| **1.11.3** | 1.11.3 | Full System Deployment | Lead Dev | Q2 | W24 – W25 | 1.11.2 |
| **1.12.1** | 1.12.1 | Live Environment Security Testing | Lead Dev | Q2 | W25 – W26 | 1.11.3 |
| **1.12.2** | 1.12.2 | Training Material & Guide Preparation | Docu Lead | Q2 | W25 – W26 | 1.10.3, 1.11.3 |
| **1.12.3** | 1.12.3 | Administrator & IT Staff Training | Project Lead | Q2 | W25 – W26 | 1.12.2 |
| **1.13.1** | 1.13.1 | Teacher Onboarding & System Walkthrough | Design Lead/s | Q2 | W26 | 1.12.3 |
| **1.13.2** | 1.13.2 | Official System Go-Live (Launch) | Project Lead | Q2 | W26 | 1.13.1 |
| **2.1.1** | 2.0.1 | School Learning Resources Ingestion | Docu Lead | Q3 | W27 – W28 | 1.13.2 |
| **2.1.2** | 2.0.2 | Chroma Vector Store Indexing & Semantic Search | Lead Dev | Q3 | W28 – W29 | 2.1.1 |
| **2.1.3** | 2.0.3 | Dual-Model AI Architecture & RAG Pipeline | Lead Dev | Q3 | W29 – W30 | 2.1.2 |
| **2.3.1** | 2.0.8 | Bulk Student Provisioning & Brevo Email Integration | Lead Dev | Q3 | W29 – W31 | 1.8.1, 1.13.2 |
| **2.2.1** | 2.0.4 | Mobile Viewport Optimization & Space Reclamation | Design Lead/s | Q3 | W30 – W32 | 1.5.3, 1.13.2 |
| **2.2.2** | 2.0.5 | Avatar Studio Split-Screen & Cyber-Podium Redesign | Design Lead/s | Q3 | W31 – W33 | 1.6.1, 2.2.1 |
| **2.2.3** | 2.0.6 | Admin & Teacher Suite Modernization | Design Lead/s | Q3 | W32 – W34 | 1.7.1, 1.8.1, 2.2.1 |
| **2.2.4** | 2.0.7 | Quiz Battle HUD & Universal Notification Polish | Design Lead/s | Q3 | W33 – W34 | 1.6.4, 2.2.2 |
| **2.3.2** | 2.0.9 | Fault-Tolerant Quiz Engine & Safety Fallbacks | Lead Dev | Q3 | W33 – W35 | 2.1.3, 1.4.4 |
| **2.3.3** | 2.0.10 | Hybrid Weakness Tracking & Predictive Analytics Wiring | Lead Dev | Q3 | W34 – W35 | 1.3.1, 1.7.1, 2.3.2 |
| **2.3.4** | 2.0.11 | PWA Offline Caching & Frontend Performance Optimization | Lead Dev | Q3 | W34 – W35 | 2.2.1, 2.2.3 |
| **2.4.1** | 2.0.12 | End-to-End Regression & Integration Testing | Lead Dev | Q4 | W36 – W37 | 2.1.3, 2.2.4, 2.3.3, 2.3.4 |
| **2.4.2** | 2.0.13 | Security Audit, Firebase Rules & Benchmarking | Lead Dev | Q4 | W37 – W38 | 2.3.1, 2.4.1 |
| **2.4.3** | 2.0.14 | **IT Expert Testing & ISO/IEC 25010 Software Quality Evaluation** | Project Lead / Lead Dev | Q4 | W38 – W39 | 2.4.1, 2.4.2 |
| **2.4.4** | 2.0.15 | **User Acceptance Testing (UAT) with SSHS STEM Students & Teachers** | Design Lead/s / Project Lead | **Q4 ★ (FINAL)** | **W39 – W40** | 2.4.3 |

> **★ Final Project Milestone:** The culminating row and bar on the Gantt chart in early October (Weeks 39 to 40, concluding strictly by **October 5**) is **User Acceptance Testing (UAT)** (`2.4.4` / `2.0.15`), evaluated directly with the primary beneficiaries (Valenzuela City SSHS Senior High School STEM students and mathematics faculty) after formal IT Expert evaluation (`2.4.3` / `2.0.14`).
>
> An interactive visual version of this schedule is available at [`docs/capstone2-gantt-chart.html`](file:///c:/xampp/htdocs/MATHPULSE-AI-FINAL-CLONE/docs/capstone2-gantt-chart.html) with instant switching between Hierarchical and Flat numbering modes.
