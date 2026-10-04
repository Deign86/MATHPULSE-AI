/** Export builder coverage (ADM-098): timeframe stamps, trajectory per range, honest headers. */
import { describe, expect, it } from 'vitest';

import { buildAnalyticsExportCsv } from './analyticsExport';

const input = {
  timeRange: '7d',
  generatedAt: '2026-10-04',
  summary: null,
  trajectory: [
    { period: 'Day 1', studentScore: 76.2, targetScore: 80, aiAssisted: 78.5 },
    { period: 'Day 2', studentScore: 77.8, targetScore: 80, aiAssisted: 80.1 },
  ],
  subjects: [
    {
      name: 'General Mathematics',
      code: 'GENMATH',
      grade: 'Grade 11',
      enrolled: 30,
      completedPercent: 50,
      quizAttempts: 12,
      avgScore: 80,
      status: 'On Track',
    },
  ],
  cohorts: [{ name: 'Advanced (90-100%)', count: 5, percent: 17 }],
  topClasses: [
    {
      rank: 1,
      section: 'STEM-A',
      grade: 'Grade 11',
      adviser: 'Reyes',
      students: 30,
      masteryRate: 82,
      status: 'Leading',
    },
  ],
};

describe('buildAnalyticsExportCsv (ADM-098)', () => {
  it('stamps the selected timeframe and includes its trajectory series', () => {
    const rows = buildAnalyticsExportCsv(input);
    expect(rows).toContainEqual(['Timeframe Filter: 7D']);
    expect(rows).toContainEqual(['PERFORMANCE TRAJECTORY (selected timeframe)']);
    expect(rows).toContainEqual(['Day 1', 76.2, 80, 78.5]);
    expect(rows).toContainEqual(['Day 2', 77.8, 80, 80.1]);
  });

  it('labels KPIs as all-time totals and falls back without fabricating range data', () => {
    const rows = buildAnalyticsExportCsv(input);
    expect(rows).toContainEqual(['KEY PERFORMANCE INDICATORS (all-time platform totals)']);
    expect(rows).toContainEqual(['Average Quiz Score', '82.4%', '75.0%', 'Above Target']);
  });

  it('includes subject, cohort, and section tables', () => {
    const rows = buildAnalyticsExportCsv(input);
    expect(rows).toContainEqual([
      'General Mathematics',
      'GENMATH',
      'Grade 11',
      30,
      '50%',
      12,
      '80%',
      'On Track',
    ]);
    expect(rows).toContainEqual(['Advanced (90-100%)', 5, '17%']);
    expect(rows).toContainEqual([1, 'STEM-A', 'Grade 11', 'Reyes', 30, '82%', 'Leading']);
  });
});
