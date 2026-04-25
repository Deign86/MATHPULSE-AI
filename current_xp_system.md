# Current XP Earning System

This document outlines the existing gamification and XP system on the student side. This serves as a reference for balancing and polishing the system.

## How Students Earn XP

Students can earn XP through four main activities:
1. **Completing Lessons**
2. **Completing Quizzes**
3. **Daily Login Streaks**
4. **Unlocking Achievements**
5. **Quiz Battles** (PVP or Bot Matches)

---

## XP Rewards by Task

### Lessons
- **Completing a Lesson**: Earns a flat rate of **50 XP** by default.

### Quizzes
- **Completing a Quiz**: Earns **0 to 100 XP** depending on the student's score.
  - *Formula: `(Score / 100) * 100`*
  - Example: A score of 85% rewards 85 XP. A score of 100% rewards 100 XP.

### Quiz Battles (PVP & Bot Matches)
- **Winning a Match**: Earns **60 XP**
- **Drawing a Match**: Earns **40 XP**
- **Losing a Match**: Earns **20 XP**

### Streaks
- **Daily Login Streak**: Logging in on consecutive days rewards bonus XP.
  - *Formula: `Streak Days * 5 XP`*
  - *Cap*: The maximum bonus per day is **50 XP** (reached on a 10-day streak).

---

## Achievements and XP Caps

When students hit specific milestones, they unlock achievements which reward a bulk amount of bonus XP.

| Achievement Title | Requirement | XP Reward |
| :--- | :--- | :--- |
| **First Steps** | Complete your 1st lesson | **50 XP** |
| **Dedicated Learner** | Complete 10 lessons in total | **200 XP** |
| **Perfect Score** | Get 100% on any quiz | **150 XP** |
| **Week Warrior** | Maintain a 7-day login streak | **300 XP** |
| **Rising Star** | Reach Level 5 | **250 XP** |

---

## Leveling Up System

Levels are determined by the student's **Total Accumulated XP** (Lifetime XP). The required XP scales exponentially to make higher levels harder to reach.

- **Formula**: The base requirement for the next level multiplies by `1.5` each time.
- **Example Scaling**:
  - **Level 1 to 2**: Requires 100 Total XP
  - **Level 2 to 3**: Requires 250 Total XP *(100 + 150)*
  - **Level 3 to 4**: Requires 475 Total XP *(250 + 225)*
  - **Level 4 to 5**: Requires 812 Total XP *(475 + 337)*

---

## Spending XP (Currency System)

The system tracks two types of XP:
1. **Total XP**: Lifetime XP used solely for determining the student's Level. This never decreases.
2. **Current XP**: Spendable currency.

Students can spend their **Current XP** to purchase **Avatar Items** (clothing, shoes, accessories) from the Avatar Shop. Spending Current XP does not affect their Level or Total XP.
