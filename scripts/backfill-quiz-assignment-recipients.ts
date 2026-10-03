/**
 * Add recipient UIDs to generated quizzes without replacing existing fields.
 * Run with `npx tsx scripts/backfill-quiz-assignment-recipients.ts --apply`.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import path from 'path';

initializeApp({
  credential: cert(path.resolve(__dirname, '../.secrets/firebase-service-account.json')),
});

const db = getFirestore();
const APPLY = process.argv.includes('--apply');
const assignmentRecipientsSchema = z.object({ quizId: z.string(), lrn: z.string() });
const legacyRecipientSchema = z.string();

async function main(): Promise<void> {
  const recipientByQuiz = new Map<string, Set<string>>();
  const assignments = await db.collection('quizAssignments').get();
  const quizzes = await db.collection('generatedQuizzes').get();
  const quizIds = new Set(quizzes.docs.map((quiz) => quiz.id));
  let orphans = 0;

  for (const assignment of assignments.docs) {
    const parsedAssignment = assignmentRecipientsSchema.safeParse(assignment.data());
    if (!parsedAssignment.success || !parsedAssignment.data.lrn) continue;
    const { quizId, lrn } = parsedAssignment.data;
    if (!quizIds.has(quizId)) {
      orphans += 1;
      console.warn(`[backfill-quiz-assignment-recipients] orphan assignment=${assignment.id} quizId=${quizId}`);
      continue;
    }
    const recipients = recipientByQuiz.get(quizId) ?? new Set<string>();
    recipients.add(lrn);
    recipientByQuiz.set(quizId, recipients);
  }

  for (const quiz of quizzes.docs) {
    const parsedLegacyRecipient = legacyRecipientSchema.safeParse(quiz.get('metadata.assignedTo'));
    if (!parsedLegacyRecipient.success || !parsedLegacyRecipient.data) continue;
    const legacyRecipient = parsedLegacyRecipient.data;
    const recipients = recipientByQuiz.get(quiz.id) ?? new Set<string>();
    recipients.add(legacyRecipient);
    recipientByQuiz.set(quiz.id, recipients);
  }

  let writes = 0;
  for (const [quizId, recipients] of recipientByQuiz) {
    for (const uid of recipients) {
      writes += 1;
      if (APPLY) {
        await db.collection('generatedQuizzes').doc(quizId).update({
          recipientUids: FieldValue.arrayUnion(uid),
        });
      }
    }
  }

  console.log(`recipient_updates=${writes} orphans=${orphans} mode=${APPLY ? 'applied' : 'dry-run'}`);
}

main().catch((error: Error) => {
  console.error('[backfill-quiz-assignment-recipients] failed:', error.message);
  process.exit(1);
});
