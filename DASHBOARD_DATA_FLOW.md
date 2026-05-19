# Dashboard Data Flow

How PRs 110 (WRI), 111 (pipeline hardening), and 132 (dashboard wiring) work together end-to-end.

## End-to-End Flow

```
Student Activity (quiz/lesson/diagnostic)
  │
  ├─► progressService.completeQuiz() / completeLesson()
  │     → Writes to progress/{userId} (subjects, quizAttempts)
  │     → recalculateProgressAggregates():
  │         • Recomputes averageScore from all quizAttempts
  │         • Recomputes subjects.{id}.progress from modules
  │         • Syncs overallRisk to users/{userId}
  │     → Awards XP via awardXP()
  │     → Emits pipeline event (pipelineService)
  │
  ├─► gradesService.saveAssessmentResult()
  │     → Writes to users/{uid}/assessments/{docId}
  │     → Updates users/{uid}/gradeSummary/current (rolling averages)
  │
  └─► Backend diagnostic/automation pipeline
        → Computes WRI via /api/risk/compute
        → Writes to managedStudents/{studentId}:
            wri, riskStatus, diagnosticScore, externalGradesAvg,
            systemPerformanceAvg, riskHistory
        → Cloud Functions trigger further updates
```

## Collections & Who Reads Them

| Collection | Fields | Written By | Read By |
|---|---|---|---|
| `progress/{userId}` | subjects, quizAttempts, averageScore, totalLessonsCompleted | progressService | Admin (mastery, avgPerformance), Student (GradesPage), MasteryHeatmap |
| `users/{userId}` | overallRisk, level, currentXP, totalXP | progressService.syncOverallRisk(), awardXP() | Admin (at-risk count, top performers) |
| `users/{uid}/gradeSummary/current` | averageScore, quizzesCompleted, subjectPerformance | gradesService | Student (GradesPage fallback) |
| `users/{uid}/assessments/{docId}` | title, score, type, subject, completedAt | gradesService | Student (recent quizzes list) |
| `managedStudents/{studentId}` | riskStatus, wri, avgQuizScore, riskLevel (legacy) | riskService, backend pipeline, class imports | Admin (WRI at-risk), Teacher (student cards, analytics), useStudentRisk hook |
| `classrooms/{classId}` | avgScore, atRiskCount, studentCount | Class creation/import | Teacher (class cards — now with fallback computation) |
| `xpActivities/{docId}` | userId, type, xpEarned, timestamp | progressService.awardXP() | Admin (weekly activity chart) |

## Risk Classification

### WRI Pipeline (PR 110)
- **Source**: `managedStudents/{studentId}.riskStatus`
- **Formula**: `WRI = w1×D + w2×G + w3×P` (D=diagnostic, G=external grades, P=system performance)
- **Thresholds**: ≥88 safe, ≥80 watch, ≥75 intervene, ≥68 critical, <68 at_risk
- **Hook**: `useStudentRisk(studentId)` subscribes to managedStudents via onSnapshot

### Score-Based Fallback
- **Source**: `progress/{userId}.averageScore`
- **Rule**: `averageScore > 0 && averageScore < 60` → at-risk
- **Written to**: `users/{userId}.overallRisk` = 'High' | 'Low'

### Admin Dashboard Counting
Unions both sources (deduped by ID):
1. `users` where `overallRisk === 'High'`
2. `managedStudents` where `riskStatus` in ['intervene', 'critical', 'at_risk']

## Dashboard-Specific Wiring

### Admin Dashboard (`AdminDashboard.tsx` → `adminService.ts`)
- `getDashboardStats()`: Counts students from `users` + `managedStudents` for at-risk
- `getGlobalMastery()`: Reads `progress.averageScore` across all students
- `getSubjectBreakdown()`: Reads `progress.subjects.{id}.progress`
- `MasteryHeatmap`: Reads `progress.subjects.{id}.progress`
- `getTopPerformers()`: Reads `users` ordered by `level`

### Teacher Dashboard (`TeacherDashboard.tsx`)
- **Class cards**: `classrooms` docs (avgScore, atRiskCount) — stale, overridden by live computation
- **Analytics view**: Backend API `/api/analytics/class/{classId}` → falls back to computing from students
- **Student risk**: Prefers `managedStudents.riskStatus` (WRI) over legacy `riskLevel`
- **totalAtRisk**: Computed from `students.filter(s => s.riskLevel === 'high').length`
- **avgPerformance**: Computed from students' actual `avgScore` values

### Student Dashboard (`GradesPage.tsx`)
- **Subject performance**: `progress/{userId}.subjects` via `subscribeToUserProgress()`
- **Fallback**: `gradeSummary.subjectPerformance` (populated by diagnostic results)
- **Recent assessments**: `users/{uid}/assessments` via `subscribeToAssessments()`
- **Diagnostic summary**: `users/{uid}/dashboardSummary/heroBannerModal`

## Backfill

For existing test accounts with historical data:

```bash
npx tsx scripts/backfill-progress-aggregates.ts
```

This script:
1. Recomputes `averageScore` and subject progress on all `progress` docs
2. Syncs `overallRisk` to `users` from both score-based and WRI-based checks
3. Handles students with WRI data but no progress docs
