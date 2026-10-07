import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import type { Firestore } from '../functions/node_modules/firebase-admin/lib/firestore/index.js';
import type { Auth } from '../functions/node_modules/firebase-admin/lib/auth/index.js';

test('backfill help resolves the functions Admin SDK from outside the repository without contacting Firestore', () => {
  const scriptPath = fileURLToPath(new URL('./backfill-quiz-assignment-recipients.ts', import.meta.url));
  const invocation = spawnSync(process.execPath, [scriptPath, '--help'], { cwd: tmpdir(), encoding: 'utf8' });

  assert.equal(invocation.status, 0, invocation.stderr);
  assert.match(invocation.stdout, /--apply/);
  assert.match(invocation.stdout, /dry-run/);
  assert.doesNotMatch(invocation.stdout, /recipient_updates=/);
});

test('backfill grants only pending assignments for existing students, without trusting legacy quiz metadata', async () => {
  const backfill = await import('./backfill-quiz-assignment-recipients.ts');
  const writes: string[] = [];
  const authLookups: string[] = [];
  // SAFETY: this offline Firestore boundary supplies only collection.get and doc.update, used by the backfill.
  const db = {
    collection: (name: string) => ({
      get: async () => ({ docs: name === 'quizAssignments' ? [
        { id: 'valid', data: () => ({ quizId: 'quiz', lrn: 'active-student', status: 'pending' }) },
        { id: 'deleted-account', data: () => ({ quizId: 'quiz', lrn: 'deleted-student', status: 'pending' }) },
        { id: 'completed', data: () => ({ quizId: 'quiz', lrn: 'completed-student', status: 'completed' }) },
        { id: 'valid-again', data: () => ({ quizId: 'quiz-2', lrn: 'active-student', status: 'pending' }) },
        { id: 'deleted-again', data: () => ({ quizId: 'quiz-2', lrn: 'deleted-student', status: 'pending' }) },
        { id: 'disabled', data: () => ({ quizId: 'quiz-2', lrn: 'disabled-student', status: 'pending' }) },
      ] : [{ id: 'quiz', get: () => 'legacy-student' }, { id: 'quiz-2', get: () => 'legacy-student' }] }),
      doc: (quizId: string) => ({ update: async () => { writes.push(quizId); } }),
    }),
  } as Pick<Firestore, 'collection'>;
  // SAFETY: the Auth boundary exposes only uid and disabled, the eligibility fields used by the backfill.
  const auth = {
    getUser: async (uid: string) => {
      authLookups.push(uid);
      if (uid === 'deleted-student') throw Object.assign(new Error('Account deleted'), { code: 'auth/user-not-found' });
      return { uid, disabled: uid === 'disabled-student' };
    },
  } as Pick<Auth, 'getUser'>;

  const summary = await backfill.backfillQuizAssignmentRecipients(db, auth, true);

  assert.deepEqual(writes, ['quiz', 'quiz-2']);
  assert.deepEqual(authLookups, ['active-student', 'deleted-student', 'disabled-student']);
  assert.equal(summary.recipientUpdates, 2);
  assert.equal(summary.invalidRecipients, 2);
});

test('backfill aborts before any writes when Auth validation fails unexpectedly', async () => {
  const backfill = await import('./backfill-quiz-assignment-recipients.ts');
  const writes: string[] = [];
  // SAFETY: this offline boundary supplies only the collection reads and update operation used by the backfill.
  const db = {
    collection: (name: string) => ({
      get: async () => ({ docs: name === 'quizAssignments' ? [
        { id: 'valid', data: () => ({ quizId: 'quiz', lrn: 'active-student', status: 'pending' }) },
        { id: 'unverified', data: () => ({ quizId: 'quiz', lrn: 'unverified-student', status: 'pending' }) },
      ] : [{ id: 'quiz', get: () => undefined }] }),
      doc: (quizId: string) => ({ update: async () => { writes.push(quizId); } }),
    }),
  } as Pick<Firestore, 'collection'>;
  const unavailable = new Error('Auth service unavailable');
  // SAFETY: the Auth fixture supplies only the getUser operation and eligibility fields consumed by the backfill.
  const auth = {
    getUser: async (uid: string) => {
      if (uid === 'unverified-student') throw unavailable;
      return { uid, disabled: false };
    },
  } as Pick<Auth, 'getUser'>;

  await assert.rejects(backfill.backfillQuizAssignmentRecipients(db, auth, true), unavailable);
  assert.deepEqual(writes, []);
});
