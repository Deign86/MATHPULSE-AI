# MathPulse AI — DFD Level 1: Administrator View (Gane & Sarson)

> **Methodology:** Gane & Sarson Data Flow Diagram (DFD) Notation  
> **Target Standard:** 1NF Relational Database & DFD Alignment for Capstone Defense

---

## 1. Gane & Sarson Notation Standards Used

In the **Gane & Sarson** DFD convention:
1. **External Entities (Left):** Solid square/rectangular boxes representing the governance actor (`Administrator`).
2. **Processes (Center):** Rounded rectangles partitioned with a whole number (`1, 3, 9`) in the top section and the process name below.
3. **Data Stores (Right):** Open-ended rectangles (open on the right) with the store identifier on the left.
4. **Data Flows:** Directed arrows carrying labeled data packets without clutter.

---

## 2. Previous Version (Original Draft)

```text
MATHPULSE AI - DFD LEVEL 1 (ADMIN SIDE) ORIGINAL DRAFT
1.0 Admin Authentication
IN: Login Credentials (from Admin)
IN: Admin Credentials (from D1 Users)
OUT: Auth Session (to Admin)

2.0 User Account Governance
IN: User Account Modifications (from Admin)
OUT: User Account Records (to Admin)
OUT: Updated Users (to D1 Users)

3.0 Curriculum & Policy Configuration
IN: Curriculum Standards & Policy Rules (from Admin)
OUT: Saved Policies (to D3 Curriculum)
OUT: Policy Confirmation (to Admin)

4.0 System Audit & Health Monitoring
IN: Security Audit Log Request (from Admin)
IN: Audit Data & Token Usage (from D8 System Logs)
OUT: Security Audit Log Report (to Admin)
OUT: System Health & AI Usage Report (to Admin)
```

---

## 3. Revisions Needed & Gane & Sarson Adjustments

1. **Whole-Number Process Numbering (Gane & Sarson Rule):**
   - *Professor's Rule:* *"Use whole numbers (1, 2, 3, 4, 5) instead of decimals (1.0, 2.0)."*
   - Standardized to global whole-number process IDs: `1`, `3`, `9`.
2. **Connected to 1NF Open-Ended Data Stores:**
   - Mapped directly to `D1 USER`, `D4 ADMIN_PROFILE`, `D5 USER_SETTINGS`, `D9 CURRICULUM_VERSION_SET`, `D10 DIAGNOSTIC_POLICY`, `D33 CHAT_SESSION`, `D34 CHAT_MESSAGE`, and `D35 AUDIT_LOG`.
3. **Standardized Tangible Outputs:**
   - Outputs are named formal tangible reports (`Security Audit Log Report`, `System Health & AI Usage Report`).

---

## 4. Gane & Sarson Master Input/Output List (Administrator)

### **Process 1: User Authentication & Account Management**
* **IN (from Admin):** `Login Credentials`, `User Account Modifications & Role Assignments`
* **IN (from Data Stores):** `D1 USER`, `D2 STUDENT_PROFILE`, `D3 TEACHER_PROFILE`, `D4 ADMIN_PROFILE`, `D5 USER_SETTINGS`
* **OUT (to Admin):** `Auth Session & State`, `User Management Records & Account Summaries`
* **OUT (to Data Stores):** Updates `D1`, `D2`, `D3`, `D4`, `D5`

---

### **Process 3: Curriculum & Content Management**
* **IN (from Admin):** `Curriculum Standards & Diagnostic Policy Configuration`
* **IN (from Data Stores):** `D9 CURRICULUM_VERSION_SET`, `D10 DIAGNOSTIC_POLICY`
* **OUT (to Admin):** `Curriculum Policy & Settings Records`
* **OUT (to Data Stores):** `D9 CURRICULUM_VERSION_SET`, `D10 DIAGNOSTIC_POLICY`

---

### **Process 9: System Audit & AI Tutoring**
* **IN (from Admin):** `Security Audit Log Request`
* **IN (from Data Stores):** `D33 CHAT_SESSION`, `D34 CHAT_MESSAGE`, `D35 AUDIT_LOG`
* **OUT (to Admin):** `Security Audit Log Report`, `System Health & AI Usage Report`
* **OUT (to Data Stores):** `D35 AUDIT_LOG`

---

## 5. Mermaid Code (Gane & Sarson Format / Draw.io Safe)

```mermaid
graph LR
    Admin["Administrator"]

    P1("1: User Authentication & Accounts")
    P3("3: Curriculum & Content Management")
    P9("9: System Audit & AI Tutoring")

    D_Auth[("D1-D5: User & Role Profiles")]
    D_Curr[("D9, D10: Curriculum Standards & Policy")]
    D_Logs[("D33-D35: Chat & Audit Logs")]

    Admin -->|Login Credentials / Account Updates| P1
    P1 -->|Auth Session & User Records| Admin
    P1 --> D_Auth
    D_Auth --> P1

    Admin -->|Curriculum Standards & Diagnostic Policy| P3
    P3 -->|Curriculum Policy & Settings Records| Admin
    P3 --> D_Curr
    D_Curr --> P3

    Admin -->|Security Audit Log Request| P9
    P9 -->|Security Audit & System Health Report| Admin
    P9 --> D_Logs
    D_Logs --> P9
```
