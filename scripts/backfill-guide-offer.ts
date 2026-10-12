/**
 * Offer the first-use guide to accounts that existed before users/{uid}.guideOfferPending
 * and have never signed in, so their first login gets the Play / Skip question like a new account.
 * Accounts that have signed in, already carry the field (true or false), have no profile yet,
 * are disabled, or belong to the internal @mathpulse.ai seed/QA domain are left alone.
 * Run with `node scripts/backfill-guide-offer.ts [--apply]` (Node 22.18+). Default: dry-run.
 */

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { Firestore } from '../functions/node_modules/firebase-admin/lib/firestore/index.js';
import type { Auth } from '../functions/node_modules/firebase-admin/lib/auth/index.js';
import { z } from 'zod';

const requireAdmin = createRequire(new URL('../functions/package.json', import.meta.url));

const APPLY = process.argv.includes('--apply');
// Seeded demo, QA and e2e accounts use this domain; an offer dialog would interrupt e2e runs.
const INTERNAL_EMAIL_DOMAIN = '@mathpulse.ai';
const LIST_PAGE_SIZE = 1000;
// Firestore FAILED_PRECONDITION: the profile changed after it was read.
const FAILED_PRECONDITION = 9;
const firestoreErrorSchema = z.object({ code: z.number() });
const roleSchema = z.string().catch('unknown');

export interface GuideOfferCandidate {
  uid: string;
  role: string;
  createdAt: string;
}

export async function backfillGuideOffer(
  db: Pick<Firestore, 'collection'>,
  auth: Pick<Auth, 'listUsers'>,
  apply: boolean,
) {
  const candidates: GuideOfferCandidate[] = [];
  let scanned = 0;
  let signedIn = 0;
  let skippedInternalOrDisabled = 0;
  let missingProfile = 0;
  let alreadyDecided = 0;
  let changedDuringRun = 0;
  let pageToken: string | undefined;

  do {
    const page = await auth.listUsers(LIST_PAGE_SIZE, pageToken);
    for (const account of page.users) {
      scanned += 1;
      if (account.metadata.lastSignInTime) {
        signedIn += 1;
        continue;
      }
      if (account.disabled || account.email?.toLowerCase().endsWith(INTERNAL_EMAIL_DOMAIN)) {
        skippedInternalOrDisabled += 1;
        continue;
      }
      const profileRef = db.collection('users').doc(account.uid);
      const profile = await profileRef.get();
      // No profile yet: the first login creates one through createUserProfile, which sets the flag.
      if (!profile.exists) {
        missingProfile += 1;
        continue;
      }
      if (profile.get('guideOfferPending') !== undefined) {
        alreadyDecided += 1;
        continue;
      }
      if (apply) {
        try {
          // Only write over the exact profile that was read; a concurrent first login wins.
          await profileRef.update({ guideOfferPending: true }, { lastUpdateTime: profile.updateTime });
        } catch (error) {
          const parsedError = firestoreErrorSchema.safeParse(error);
          if (!parsedError.success || parsedError.data.code !== FAILED_PRECONDITION) throw error;
          changedDuringRun += 1;
          continue;
        }
      }
      candidates.push({
        uid: account.uid,
        role: roleSchema.parse(profile.get('role')),
        createdAt: account.metadata.creationTime,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return { candidates, scanned, signedIn, skippedInternalOrDisabled, missingProfile, alreadyDecided, changedDuringRun };
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    console.log(
      'Usage: node scripts/backfill-guide-offer.ts [--apply]\n'
      + 'Default: dry-run. Lists never-signed-in accounts whose profile lacks guideOfferPending;\n'
      + '--apply sets guideOfferPending: true on exactly those profiles.',
    );
    return;
  }
  const { initializeApp, cert }: typeof import('../functions/node_modules/firebase-admin/lib/app/index.js') = requireAdmin('firebase-admin/app');
  const { getFirestore }: typeof import('../functions/node_modules/firebase-admin/lib/firestore/index.js') = requireAdmin('firebase-admin/firestore');
  const { getAuth }: typeof import('../functions/node_modules/firebase-admin/lib/auth/index.js') = requireAdmin('firebase-admin/auth');
  initializeApp({
    credential: cert(process.env.FIREBASE_SERVICE_ACCOUNT_FILE
      ?? fileURLToPath(new URL('../.secrets/firebase-service-account.json', import.meta.url))),
  });

  const summary = await backfillGuideOffer(getFirestore(), getAuth(), APPLY);
  for (const candidate of summary.candidates) {
    console.log(`${APPLY ? 'offered' : 'would_offer'} uid=${candidate.uid} role=${candidate.role} created=${candidate.createdAt}`);
  }
  const byRole = new Map<string, number>();
  for (const candidate of summary.candidates) byRole.set(candidate.role, (byRole.get(candidate.role) ?? 0) + 1);
  const roleCounts = [...byRole].map(([role, count]) => `${role}:${count}`).join(',') || 'none';
  console.log(
    `scanned=${summary.scanned} signed_in=${summary.signedIn} skipped_internal_or_disabled=${summary.skippedInternalOrDisabled}`
    + ` missing_profile=${summary.missingProfile} already_decided=${summary.alreadyDecided}`
    + ` ${APPLY ? 'offered' : 'would_offer'}=${summary.candidates.length} (${roleCounts})`
    + ` changed_during_run=${summary.changedDuringRun} mode=${APPLY ? 'applied' : 'dry-run'}`,
  );
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: Error) => {
    console.error('[backfill-guide-offer] failed:', error.message);
    process.exit(1);
  });
}
