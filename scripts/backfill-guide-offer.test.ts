import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import type { Firestore } from '../functions/node_modules/firebase-admin/lib/firestore/index.js';
import type { Auth } from '../functions/node_modules/firebase-admin/lib/auth/index.js';

interface AccountFixture {
  uid: string;
  email?: string;
  disabled?: boolean;
  lastSignInTime?: string;
}

const firstPage: AccountFixture[] = [
  { uid: 'fresh-student', email: 'juan@gmail.com' },
  { uid: 'returning-student', email: 'ana@gmail.com', lastSignInTime: 'Mon, 12 Oct 2026 03:07:00 GMT' },
  { uid: 'skipped-offer', email: 'ben@gmail.com' },
  { uid: 'post-deploy-account', email: 'cara@gmail.com' },
  { uid: 'no-profile-yet', email: 'dan@gmail.com' },
  { uid: 'disabled-student', email: 'eve@gmail.com', disabled: true },
  { uid: 'qa-student', email: 'QA.Student.A@MathPulse.ai' },
];
const secondPage: AccountFixture[] = [
  { uid: 'fresh-teacher', email: 'ms.reyes@school.edu.ph' },
  { uid: 'raced-student', email: 'gil@gmail.com' },
];
const profiles = new Map<string, { role: string; guideOfferPending?: boolean }>([
  ['fresh-student', { role: 'student' }],
  ['returning-student', { role: 'student' }],
  ['skipped-offer', { role: 'student', guideOfferPending: false }],
  ['post-deploy-account', { role: 'student', guideOfferPending: true }],
  ['disabled-student', { role: 'student' }],
  ['qa-student', { role: 'student' }],
  ['fresh-teacher', { role: 'teacher' }],
  ['raced-student', { role: 'student' }],
]);

interface RecordedWrite {
  uid: string;
  fields: { guideOfferPending: boolean };
  precondition: { lastUpdateTime: string };
}

function fakeAuth() {
  const pageTokens: (string | undefined)[] = [];
  // SAFETY: the Auth boundary supplies only listUsers with the uid, email, disabled and metadata fields the backfill reads.
  const auth = {
    listUsers: async (_maxResults: number, pageToken?: string) => {
      pageTokens.push(pageToken);
      const accounts = pageToken === 'page-2' ? secondPage : firstPage;
      return {
        users: accounts.map((account) => ({
          uid: account.uid,
          email: account.email,
          disabled: account.disabled ?? false,
          metadata: { lastSignInTime: account.lastSignInTime, creationTime: 'Mon, 05 Oct 2026 01:00:00 GMT' },
        })),
        pageToken: pageToken === 'page-2' ? undefined : 'page-2',
      };
    },
  } as Pick<Auth, 'listUsers'>;
  return { auth, pageTokens };
}

function fakeFirestore(failingUpdates = new Map<string, Error>()) {
  const writes: RecordedWrite[] = [];
  // SAFETY: the Firestore boundary supplies only users/{uid} get and update, the operations the backfill uses.
  const db = {
    collection: () => ({
      doc: (uid: string) => ({
        get: async () => {
          const profile = profiles.get(uid);
          return {
            exists: profile !== undefined,
            updateTime: `read-at-${uid}`,
            get: (field: 'role' | 'guideOfferPending') => profile?.[field],
          };
        },
        update: async (fields: RecordedWrite['fields'], precondition: RecordedWrite['precondition']) => {
          const failure = failingUpdates.get(uid);
          if (failure) throw failure;
          writes.push({ uid, fields, precondition });
        },
      }),
    }),
  } as Pick<Firestore, 'collection'>;
  return { db, writes };
}

test('help resolves from outside the repository without contacting Firebase', () => {
  const scriptPath = fileURLToPath(new URL('./backfill-guide-offer.ts', import.meta.url));
  const invocation = spawnSync(process.execPath, [scriptPath, '--help'], { cwd: tmpdir(), encoding: 'utf8' });

  assert.equal(invocation.status, 0, invocation.stderr);
  assert.match(invocation.stdout, /--apply/);
  assert.match(invocation.stdout, /dry-run/);
  assert.doesNotMatch(invocation.stdout, /scanned=/);
});

test('dry-run lists only never-signed-in accounts whose profile has no answer yet, and writes nothing', async () => {
  const backfill = await import('./backfill-guide-offer.ts');
  const { auth, pageTokens } = fakeAuth();
  const { db, writes } = fakeFirestore();

  const summary = await backfill.backfillGuideOffer(db, auth, false);

  assert.deepEqual(summary.candidates.map((candidate) => [candidate.uid, candidate.role]), [
    ['fresh-student', 'student'],
    ['fresh-teacher', 'teacher'],
    ['raced-student', 'student'],
  ]);
  assert.deepEqual(writes, []);
  assert.deepEqual(pageTokens, [undefined, 'page-2']);
  assert.equal(summary.scanned, 9);
  assert.equal(summary.signedIn, 1);
  assert.equal(summary.skippedInternalOrDisabled, 2);
  assert.equal(summary.missingProfile, 1);
  assert.equal(summary.alreadyDecided, 2);
});

test('apply flags exactly the profiles it read, and leaves a profile that changed mid-run alone', async () => {
  const backfill = await import('./backfill-guide-offer.ts');
  const { auth } = fakeAuth();
  const changedProfile = Object.assign(new Error('9 FAILED_PRECONDITION: the stored version does not match'), { code: 9 });
  const { db, writes } = fakeFirestore(new Map([['raced-student', changedProfile]]));

  const summary = await backfill.backfillGuideOffer(db, auth, true);

  assert.deepEqual(writes, [
    { uid: 'fresh-student', fields: { guideOfferPending: true }, precondition: { lastUpdateTime: 'read-at-fresh-student' } },
    { uid: 'fresh-teacher', fields: { guideOfferPending: true }, precondition: { lastUpdateTime: 'read-at-fresh-teacher' } },
  ]);
  assert.deepEqual(summary.candidates.map((candidate) => candidate.uid), ['fresh-student', 'fresh-teacher']);
  assert.equal(summary.changedDuringRun, 1);
});

test('apply stops on an unexpected write failure instead of reporting it as done', async () => {
  const backfill = await import('./backfill-guide-offer.ts');
  const { auth } = fakeAuth();
  const denied = Object.assign(new Error('7 PERMISSION_DENIED'), { code: 7 });
  const { db } = fakeFirestore(new Map([['fresh-teacher', denied]]));

  await assert.rejects(backfill.backfillGuideOffer(db, auth, true), denied);
});
