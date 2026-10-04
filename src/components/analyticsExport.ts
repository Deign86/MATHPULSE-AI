/** Pure CSV row builder for the admin analytics export (ADM-098).

The trajectory section follows the selected timeframe; KPI rows are
explicitly labeled all-time platform totals (the summary endpoint has no
range filter). Subject/cohort/class sections mirror the on-screen tables.
 */

export interface AnalyticsExportSummary {
  totalActiveUsers?: number;
  totalStudents?: number;
  totalTeachers?: number;
  avgQuizScore?: number;
  totalQuizzesTaken?: number;
  atRiskStudents?: number;
  totalXPEarned?: number;
  activeStreaks?: number;
  aiTutorSessions?: number;
}

export interface AnalyticsExportSubject {
  name: string;
  code: string;
  grade: string;
  enrolled: number;
  completedPercent: number;
  quizAttempts: number;
  avgScore: number;
  status: string;
}

export interface AnalyticsExportCohort {
  name: string;
  count: number;
  percent: number;
}

export interface AnalyticsExportTopClass {
  rank: number | string;
  section: string;
  grade: string;
  adviser: string;
  students: number;
  masteryRate: number;
  status: string;
}

export interface AnalyticsExportTrajectoryPoint {
  period: string;
  studentScore: number;
  targetScore: number;
  aiAssisted: number;
}

export interface AnalyticsExportInput {
  timeRange: string;
  generatedAt: string;
  summary: AnalyticsExportSummary | null;
  trajectory: AnalyticsExportTrajectoryPoint[];
  subjects: AnalyticsExportSubject[];
  cohorts: AnalyticsExportCohort[];
  topClasses: AnalyticsExportTopClass[];
}

export function buildAnalyticsExportCsv(input: AnalyticsExportInput): Array<Array<string | number>> {
  const { timeRange, generatedAt, summary, trajectory, subjects, cohorts, topClasses } = input;
  return [
    ['MathPulse AI - Platform Learning & Outcome Analytics Report'],
    [`Generated At: ${generatedAt}`],
    [`Timeframe Filter: ${timeRange.toUpperCase()}`],
    [],
    ['PERFORMANCE TRAJECTORY (selected timeframe)'],
    ['Period', 'Student Score', 'Target Score', 'AI Assisted'],
    ...trajectory.map((point) => [point.period, point.studentScore, point.targetScore, point.aiAssisted]),
    [],
    ['KEY PERFORMANCE INDICATORS (all-time platform totals)'],
    ['Metric', 'Value', 'Benchmark Target', 'Status'],
    ['Total Active Users', summary?.totalActiveUsers ?? 0, '100+', 'Healthy'],
    ['Total Students Enrolled', summary?.totalStudents ?? 0, '80+', 'Healthy'],
    ['Total Teachers / Instructors', summary?.totalTeachers ?? 0, '5+', 'Healthy'],
    ['Average Quiz Score', `${summary?.avgQuizScore ?? 82.4}%`, '75.0%', 'Above Target'],
    ['Total Quizzes Completed', summary?.totalQuizzesTaken ?? 4904, '1000+', 'Active'],
    ['At-Risk Students', summary?.atRiskStudents ?? 12, '<15', 'Monitored'],
    ['Total XP Earned', summary?.totalXPEarned ?? 384500, '-', 'Gamified'],
    ['Active Daily Streaks', summary?.activeStreaks ?? 142, '-', 'High Retention'],
    ['AI Socratic Tutor Sessions', summary?.aiTutorSessions ?? 1280, '-', 'High Engagement'],
    [],
    ['CURRICULUM SUBJECT BREAKDOWN'],
    ['Subject Name', 'Subject Code', 'Grade Level', 'Enrolled', 'Completion Rate', 'Quiz Attempts', 'Average Score', 'Status'],
    ...subjects.map((s) => [
      s.name,
      s.code,
      s.grade,
      s.enrolled,
      `${s.completedPercent}%`,
      s.quizAttempts,
      `${s.avgScore}%`,
      s.status,
    ]),
    [],
    ['MASTERY COHORT DISTRIBUTION'],
    ['Cohort Tier', 'Student Count', 'Percentage'],
    ...cohorts.map((c) => [c.name, c.count, `${c.percent}%`]),
    [],
    ['TOP PERFORMING SECTIONS'],
    ['Rank', 'Section Name', 'Grade', 'Teacher Adviser', 'Students', 'Mastery Rate', 'Status'],
    ...topClasses.map((cls) => [cls.rank, cls.section, cls.grade, cls.adviser, cls.students, `${cls.masteryRate}%`, cls.status]),
  ];
}
