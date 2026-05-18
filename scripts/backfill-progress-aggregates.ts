/**
 * scripts/backfill-progress-aggregates.ts
 *
 * Reads all existing `progress/{userId}` documents and recomputes:
 * 1. averageScore — from quizAttempts array
 * 2. subjects.{subjectId}.progress — from module completions
 * 3. users/{userId}.overallRisk — 'High' if WRI at-risk OR averageScore < 60
 *
 * Also reads `managedStudents` to sync WRI riskStatus into the users collection
 * so the admin dashboard can count at-risk students from a single source.
 *
 * Run: npx tsx scripts/backfill-progress-aggregates.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

const serviceAccount = path.resolve(__dirname, '../.secrets/firebase-service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const WRI_AT_RISK_STATUSES = ['intervene', 'critical', 'at_risk'];

async function main() {
  // 1. Build WRI risk lookup from managedStudents
  const managedSnap = await db.collection('managedStudents').get();
  const wriRiskMap = new Map<string, string>();
  managedSnap.docs.forEach(d => {
    const rs = d.data().riskStatus as string | undefined;
    if (rs) wriRiskMap.set(d.id, rs);
  });
  console.log(`Loaded ${wriRiskMap.size} WRI risk profiles from managedStudents.`);

  // 2. Process progress documents
  const progressSnap = await db.collection('progress').get();
  console.log(`Found ${progressSnap.size} progress documents to backfill.`);

  let updated = 0;

  for (const docSnap of progressSnap.docs) {
    const userId = docSnap.id;
    const data = docSnap.data();
    const quizAttempts: Array<{ score: number }> = data.quizAttempts || [];

    // Compute averageScore
    const averageScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((sum, q) => sum + (q.score || 0), 0) / quizAttempts.length)
      : 0;

    // Compute per-subject progress from module completions
    const subjects = data.subjects || {};
    const subjectUpdates: Record<string, number> = {};
    for (const [subjectId, subjectData] of Object.entries(subjects) as [string, any][]) {
      const modules = subjectData?.modulesProgress || {};
      const moduleProgresses = Object.values(modules) as Array<{ progress?: number }>;
      if (moduleProgresses.length > 0) {
        const avgProgress = Math.round(
          moduleProgresses.reduce((sum, m) => sum + (m.progress || 0), 0) / moduleProgresses.length
        );
        subjectUpdates[`subjects.${subjectId}.progress`] = avgProgress;
      }
    }

    // Update progress document
    await docSnap.ref.update({ averageScore, ...subjectUpdates });

    // Determine overallRisk: High if WRI says at-risk OR score-based check
    const wriStatus = wriRiskMap.get(userId);
    const isWriAtRisk = wriStatus ? WRI_AT_RISK_STATUSES.includes(wriStatus) : false;
    const isScoreAtRisk = averageScore > 0 && averageScore < 60;
    const overallRisk = (isWriAtRisk || isScoreAtRisk) ? 'High' : 'Low';

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      await userRef.update({ overallRisk });
    }

    updated++;
    const riskSource = isWriAtRisk ? 'WRI' : isScoreAtRisk ? 'score' : 'none';
    console.log(`  [${updated}/${progressSnap.size}] ${userId}: avg=${averageScore}, risk=${overallRisk} (${riskSource})`);
  }

  // 3. Also sync WRI risk for students who have managedStudents docs but no progress docs
  const progressIds = new Set(progressSnap.docs.map(d => d.id));
  let extraSynced = 0;
  for (const [studentId, riskStatus] of wriRiskMap) {
    if (progressIds.has(studentId)) continue;
    if (!WRI_AT_RISK_STATUSES.includes(riskStatus)) continue;

    const userRef = db.collection('users').doc(studentId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      await userRef.update({ overallRisk: 'High' });
      extraSynced++;
      console.log(`  [WRI-only] ${studentId}: synced overallRisk=High from riskStatus=${riskStatus}`);
    }
  }

  console.log(`\nBackfill complete. Updated ${updated} progress docs, ${extraSynced} WRI-only syncs.`);
}

main().catch(console.error);
