/**
 * scripts/backfill-competency-matrix.ts
 *
 * Backfills the competency matrix for all students by reading existing
 * progress data (quizAttempts, subjects.*.modulesProgress) and quizSubmissions,
 * then computing and caching scores in users/{userId}/competencyMatrix/{moduleId}.
 *
 * Run: npx tsx scripts/backfill-competency-matrix.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import path from 'path';

const serviceAccount = path.resolve(__dirname, '../.secrets/firebase-service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── Module definitions (mirrors src/data/subjects.ts) ───────────────────────

const MODULES = [
  {
    id: 'gm-1',
    title: 'Functions and Their Graphs',
    lessonIds: ['gm-1-l1','gm-1-l2','gm-1-l3','gm-1-l4','gm-1-l5','gm-1-l6','gm-1-l7','gm-1-l8','gm-1-l9','gm-1-l10'],
    quizIds: ['gm-1-q1','gm-1-q2'],
    // Curriculum module IDs that map to this module
    curriculumIds: ['gm-q1-functions-graphs', 'gm-q1-patterns-sequences-series'],
    // Topic keywords for matching quizSubmissions
    topicKeywords: ['function', 'graph', 'rational', 'exponential', 'logarithmic', 'domain', 'range', 'inverse', 'composite', 'pattern', 'sequence'],
  },
  {
    id: 'gm-2',
    title: 'Business Mathematics',
    lessonIds: ['gm-2-l1','gm-2-l2','gm-2-l3','gm-2-l4','gm-2-l5','gm-2-l6'],
    quizIds: ['gm-2-q1','gm-2-q2'],
    curriculumIds: ['gm-q1-business-finance', 'gm-q1-financial-application-sequences-series', 'gm-q1-bf'],
    topicKeywords: ['interest', 'annuit', 'loan', 'stock', 'bond', 'business', 'finance', 'amortiz', 'present value', 'future value'],
  },
  {
    id: 'gm-3',
    title: 'Logic',
    lessonIds: ['gm-3-l1','gm-3-l2','gm-3-l3','gm-3-l4','gm-3-l5'],
    quizIds: ['gm-3-q1','gm-3-q2'],
    curriculumIds: ['gm-q1-logic'],
    topicKeywords: ['logic', 'proposition', 'truth', 'connective', 'equivalence', 'quantifier', 'argument', 'negation', 'implication'],
  },
];

// Map a quiz/lesson ID or subject string to a module
function resolveModuleId(id: string, subject?: string): string | null {
  if (!id) return null;
  // Direct match on lesson/quiz IDs
  for (const mod of MODULES) {
    if (mod.lessonIds.includes(id) || mod.quizIds.includes(id)) return mod.id;
    if (mod.curriculumIds.includes(id)) return mod.id;
    // Check if ID starts with a curriculum module ID (e.g. "gm-q1-business-finance-q1")
    if (mod.curriculumIds.some(cid => id.startsWith(cid))) return mod.id;
  }
  // Keyword match on subject/topic string
  if (subject) {
    const lower = subject.toLowerCase();
    for (const mod of MODULES) {
      if (mod.topicKeywords.some(kw => lower.includes(kw))) return mod.id;
    }
  }
  // Keyword match on the ID itself
  const lowerid = id.toLowerCase();
  for (const mod of MODULES) {
    if (mod.topicKeywords.some(kw => lowerid.includes(kw))) return mod.id;
  }
  // Prefix match (e.g. "gm-1-xxx" → gm-1)
  for (const mod of MODULES) {
    if (id.startsWith(mod.id + '-') || id.startsWith(mod.id)) return mod.id;
  }
  return null;
}

interface QuizScore {
  moduleId: string;
  score: number;
  questionType: string;
}

async function main() {
  console.log('=== Competency Matrix Backfill ===\n');

  // 1. Read all progress documents
  const progressSnap = await db.collection('progress').get();
  console.log(`Found ${progressSnap.size} progress documents.`);

  // 2. Read all quizSubmissions (global collection)
  const submissionsSnap = await db.collection('quizSubmissions').get();
  console.log(`Found ${submissionsSnap.size} quiz submissions.`);

  // Index submissions by LRN/userId
  const submissionsByUser = new Map<string, Array<{ score: number; subject: string; moduleId?: string; quizId: string }>>();
  for (const d of submissionsSnap.docs) {
    const data = d.data();
    const userId = data.lrn || data.userId || '';
    if (!userId) continue;
    if (!submissionsByUser.has(userId)) submissionsByUser.set(userId, []);
    submissionsByUser.get(userId)!.push({
      score: data.score ?? 0,
      subject: data.subject || '',
      moduleId: data.moduleId,
      quizId: data.quizId || d.id,
    });
  }
  console.log(`Indexed submissions for ${submissionsByUser.size} users.\n`);

  // 3. Read xpActivities for lesson completions (supplements progress doc)
  const xpSnap = await db.collection('xpActivities').get();
  const lessonsByUser = new Map<string, string[]>();
  const quizScoresByUser = new Map<string, Array<{ quizId: string; score: number }>>();
  for (const d of xpSnap.docs) {
    const data = d.data();
    const userId = data.userId || '';
    if (!userId) continue;
    if (data.type === 'lesson_complete' && data.description) {
      const match = data.description.match(/lesson:\s*(.+)/);
      if (match) {
        if (!lessonsByUser.has(userId)) lessonsByUser.set(userId, []);
        lessonsByUser.get(userId)!.push(match[1].trim());
      }
    }
    if (data.type === 'quiz_complete' && data.description) {
      const match = data.description.match(/quiz:\s*(.+?)\s*\(Score:\s*(\d+)%\)/);
      if (match) {
        if (!quizScoresByUser.has(userId)) quizScoresByUser.set(userId, []);
        quizScoresByUser.get(userId)!.push({ quizId: match[1].trim(), score: parseInt(match[2]) });
      }
    }
    // Manual lesson completions (e.g. 'Completed "Represent business transactions..."')
    if (data.type === 'manual' && data.description && data.xpEarned === 10) {
      const match = data.description.match(/^Completed "(.+)"$/);
      if (match) {
        if (!lessonsByUser.has(userId)) lessonsByUser.set(userId, []);
        // Use keyword matching to assign to a module
        lessonsByUser.get(userId)!.push(match[1].trim());
      }
    }
    // Manual quiz completions (e.g. 'Quiz Completed! +60 XP') — count as quiz activity
    if (data.type === 'manual' && data.description && data.xpEarned >= 50) {
      const isQuiz = /quiz\s*(complete|completed)/i.test(data.description);
      if (isQuiz) {
        if (!quizScoresByUser.has(userId)) quizScoresByUser.set(userId, []);
        // No specific quiz ID or score — use XP as proxy (50-140 XP → estimate 40-80% score)
        const estimatedScore = Math.min(100, Math.round((data.xpEarned / 140) * 100));
        quizScoresByUser.get(userId)!.push({ quizId: '_manual_quiz', score: estimatedScore });
      }
    }
  }
  console.log(`Indexed ${lessonsByUser.size} users with lesson XP, ${quizScoresByUser.size} with quiz XP.\n`);

  let processed = 0;
  let skipped = 0;

  for (const progressDoc of progressSnap.docs) {
    const userId = progressDoc.id;
    const data = progressDoc.data();

    // Gather quiz scores from multiple sources
    const quizScores: QuizScore[] = [];

    // Source 1: progress.quizAttempts
    const attempts: Array<{ quizId?: string; score?: number; moduleId?: string }> = data.quizAttempts || [];
    for (const a of attempts) {
      const modId = resolveModuleId(a.quizId || '', a.moduleId);
      if (modId) {
        quizScores.push({ moduleId: modId, score: a.score || 0, questionType: 'multiple_choice' });
      }
    }

    // Source 2: progress.subjects.*.modulesProgress (for lesson/quiz completion counts)
    const subjects = data.subjects || {};
    // SAFETY: Firestore progress docs are parsed permissively during this one-off backfill.
    const moduleCompletions: Record<string, { lessons: string[]; quizzes: string[] }> = {};
    // SAFETY: Firestore progress docs are parsed permissively during this one-off backfill.
    for (const [, subjectData] of Object.entries(subjects) as [string, any][]) {
      const modulesProgress = subjectData?.modulesProgress || {};
      // SAFETY: module progress entries are parsed permissively during this one-off backfill.
      for (const [mpId, mp] of Object.entries(modulesProgress) as [string, any][]) {
        const modId = resolveModuleId(mpId);
        if (!modId) continue;
        if (!moduleCompletions[modId]) moduleCompletions[modId] = { lessons: [], quizzes: [] };
        moduleCompletions[modId].lessons.push(...(mp.lessonsCompleted || []));
        moduleCompletions[modId].quizzes.push(...(mp.quizzesCompleted || []));
      }
    }

    // Source 3: quizSubmissions collection
    const userSubmissions = submissionsByUser.get(userId) || [];
    for (const sub of userSubmissions) {
      const modId = resolveModuleId(sub.quizId, sub.subject) || resolveModuleId(sub.moduleId || '', sub.subject);
      if (modId) {
        quizScores.push({ moduleId: modId, score: sub.score, questionType: 'multiple_choice' });
      }
    }

    // Source 4: xpActivities quiz scores
    const userXpQuizzes = quizScoresByUser.get(userId) || [];
    for (const xq of userXpQuizzes) {
      if (xq.quizId === '_manual_quiz') {
        // Assign manual quizzes to the module with most existing data, or gm-2 as default
        const primaryMod = quizScores.length > 0
          ? quizScores[0].moduleId
          : (Object.keys(moduleCompletions)[0] || 'gm-2');
        quizScores.push({ moduleId: primaryMod, score: xq.score, questionType: 'multiple_choice' });
      } else {
        const modId = resolveModuleId(xq.quizId);
        if (modId) {
          quizScores.push({ moduleId: modId, score: xq.score, questionType: 'multiple_choice' });
        }
      }
    }

    // Source 5: xpActivities lesson completions → add to moduleCompletions
    const userXpLessons = lessonsByUser.get(userId) || [];
    for (const lessonId of userXpLessons) {
      // Try resolving by ID first, then by keyword matching on the description text
      const modId = resolveModuleId(lessonId) || resolveModuleId('', lessonId);
      if (modId) {
        if (!moduleCompletions[modId]) moduleCompletions[modId] = { lessons: [], quizzes: [] };
        moduleCompletions[modId].lessons.push(lessonId);
      }
    }

    // Check if there's any data at all
    const hasData = quizScores.length > 0 || Object.keys(moduleCompletions).length > 0;
    if (!hasData) {
      skipped++;
      continue;
    }

    // Compute scores per module and write to Firestore
    for (const mod of MODULES) {
      const modQuizzes = quizScores.filter(q => q.moduleId === mod.id);
      const completions = moduleCompletions[mod.id] || { lessons: [], quizzes: [] };

      const lessonCount = new Set(completions.lessons).size;
      const quizCount = new Set(completions.quizzes).size;
      const totalLessons = mod.lessonIds.length;
      const totalQuizzes = mod.quizIds.length;

      // Overall Mastery: average quiz score
      const overallMastery = modQuizzes.length > 0
        ? Math.round(modQuizzes.reduce((s, q) => s + q.score, 0) / modQuizzes.length)
        : 0;

      // Concept Grasp: slightly below mastery (no question-type breakdown available)
      const conceptGrasp = Math.round(overallMastery * 0.95);

      // Application: slightly below mastery
      const application = Math.round(overallMastery * 0.88);

      // Engagement: based on lesson + quiz completion ratio
      const lessonPct = Math.min(100, (lessonCount / totalLessons) * 100);
      const quizPct = Math.min(100, (quizCount / totalQuizzes) * 100);
      const engagement = Math.round(Math.min(100, (lessonPct + quizPct) / 2 + modQuizzes.length * 8));

      // Consistency: inverse of score variance
      let consistency = 0;
      if (modQuizzes.length >= 2) {
        const scores = modQuizzes.map(q => q.score);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / Math.max(mean, 1);
        consistency = Math.round(Math.max(0, Math.min(100, (1 - cv) * 100)));
      } else if (modQuizzes.length === 1) {
        consistency = Math.round(60 + engagement * 0.3);
      } else if (engagement > 0) {
        consistency = Math.round(engagement * 0.7);
      }

      // Only write if there's meaningful data
      if (overallMastery === 0 && engagement === 0) continue;

      await db.collection('users').doc(userId).collection('competencyMatrix').doc(mod.id).set({
        moduleId: mod.id,
        moduleName: mod.title,
        overallMastery,
        conceptGrasp,
        application,
        engagement: Math.min(100, engagement),
        consistency: Math.min(100, consistency),
        computedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    processed++;
    console.log(`  [${processed}] ${userId}: ${quizScores.length} quiz scores, ${Object.keys(moduleCompletions).length} modules with completions`);
  }

  console.log(`\n✅ Done. Processed: ${processed}, Skipped (no data): ${skipped}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
