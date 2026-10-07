/**
 * Add recipient UIDs to generated quizzes without replacing existing fields.
 * Run with `node scripts/backfill-quiz-assignment-recipients.ts --apply` (Node 22.18+).
 */

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { Firestore } from '../functions/node_modules/firebase-admin/lib/firestore/index.js';
import type { Auth } from '../functions/node_modules/firebase-admin/lib/auth/index.js';
import { z } from 'zod';

const requireAdmin = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, cert }: typeof import('../functions/node_modules/firebase-admin/lib/app/index.js') = requireAdmin('firebase-admin/app');
const { FieldValue, getFirestore }: typeof import('../functions/node_modules/firebase-admin/lib/firestore/index.js') = requireAdmin('firebase-admin/firestore');

const APPLY = process.argv.includes('--apply');
const assignmentRecipientsSchema = z.object({ quizId: z.string().min(1), lrn: z.string().min(1), status: z.literal('pending') });
const authErrorSchema = z.object({ code: z.string() });

export async function backfillQuizAssignmentRecipients(
  db: Pick<Firestore, 'collection'>,
  auth: Pick<Auth, 'getUser'>,
  apply: boolean,
) {
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
      continue;
    }
    const recipients = recipientByQuiz.get(quizId) ?? new Set<string>();
    recipients.add(lrn);
    recipientByQuiz.set(quizId, recipients);
  }

  const validRecipients = new Map<string, boolean>();
  let invalidRecipients = 0;
  // A legacy metadata.assignedTo value alone cannot establish a pending assignment.
  // Validate the whole plan before granting access, including in --apply mode.
  for (const recipients of recipientByQuiz.values()) {
    for (const uid of recipients) {
      let valid = validRecipients.get(uid);
      if (valid === undefined) {
        try {
          const user = await auth.getUser(uid);
          valid = user.uid === uid && !user.disabled;
        } catch (error) {
          const parsedError = authErrorSchema.safeParse(error);
          if (!parsedError.success || !['auth/user-not-found', 'auth/invalid-uid'].includes(parsedError.data.code)) throw error;
          valid = false;
        }
        validRecipients.set(uid, valid);
        if (!valid) invalidRecipients += 1;
      }
      if (!valid) recipients.delete(uid);
    }
  }

  let writes = 0;
  for (const [quizId, recipients] of recipientByQuiz) {
    for (const uid of recipients) {
      writes += 1;
      if (apply) {
        await db.collection('generatedQuizzes').doc(quizId).update({
          recipientUids: FieldValue.arrayUnion(uid),
        });
      }
    }
  }

  return { recipientUpdates: writes, orphans, invalidRecipients };
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    console.log('Usage: node scripts/backfill-quiz-assignment-recipients.ts [--apply]\nDefault: dry-run. Review assignment Auth UIDs before applying recipient grants.');
    return;
  }
  initializeApp({
    credential: cert(fileURLToPath(new URL('../.secrets/firebase-service-account.json', import.meta.url))),
  });
  const { getAuth }: typeof import('../functions/node_modules/firebase-admin/lib/auth/index.js') = requireAdmin('firebase-admin/auth');
  const summary = await backfillQuizAssignmentRecipients(getFirestore(), getAuth(), APPLY);
  console.log(`recipient_updates=${summary.recipientUpdates} orphans=${summary.orphans} invalid_recipients=${summary.invalidRecipients} mode=${APPLY ? 'applied' : 'dry-run'}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: Error) => {
    console.error('[backfill-quiz-assignment-recipients] failed:', error.message);
    process.exit(1);
  });
}
