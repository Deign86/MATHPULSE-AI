/**
 * Backfill the default school for production student accounts.
 *
 * Before running with --commit, create a Firestore backup with
 * `firebase firestore:backup` (where available) or export the database from
 * the Firebase console.
 *
 * Commands:
 *   firebase use --project mathpulse-ai-2026
 *   node scripts/backfill-school-default.mjs --dry-run
 *   node scripts/backfill-school-default.mjs --commit
 *
 * Dependency: firebase-admin must be installed (already a project dependency,
 * or install it with `npm i -D firebase-admin`).
 * Credentials are read from FIREBASE_SERVICE_ACCOUNT_FILE or
 * .secrets/firebase-service-account.json; do not commit service-account files.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldPath, FieldValue, getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'mathpulse-ai-2026';
const DEFAULT_SCHOOL = 'Gen. T De Leon National High School';
const PAGE_SIZE = 400;
const mode = process.argv.slice(2);

if (mode.some((argument) => argument !== '--dry-run' && argument !== '--commit') || mode.includes('--dry-run') && mode.includes('--commit') || mode.length > 1) {
  console.error('Usage: node scripts/backfill-school-default.mjs [--dry-run|--commit]');
  process.exit(1);
}

const dryRun = !mode.includes('--commit');
const serviceAccountPath = path.resolve(
  process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '.secrets/firebase-service-account.json',
);

let serviceAccount;
try {
  serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error(`Unable to load service account from ${serviceAccountPath}: ${error.message}`);
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: PROJECT_ID,
});
const db = getFirestore(app);

let scanned = 0;
let wouldUpdate = 0;
let updated = 0;
let skipped = 0;
let failed = 0;
const previewUids = [];
let lastDocument;

try {
  while (true) {
    let pageQuery = db.collection('users')
      .where('role', '==', 'student')
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (lastDocument) pageQuery = pageQuery.startAfter(lastDocument);

    const page = await pageQuery.get();
    if (page.empty) break;

    const updates = [];
    for (const userDocument of page.docs) {
      scanned += 1;
      if (userDocument.get('school') === DEFAULT_SCHOOL) {
        skipped += 1;
        continue;
      }

      wouldUpdate += 1;
      if (previewUids.length < 20) previewUids.push(userDocument.id);
      updates.push(userDocument.ref);
    }

    if (!dryRun) {
      for (let offset = 0; offset < updates.length; offset += PAGE_SIZE) {
        const batch = db.batch();
        const chunk = updates.slice(offset, offset + PAGE_SIZE);
        for (const userRef of chunk) {
          batch.update(userRef, {
            school: DEFAULT_SCHOOL,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        try {
          await batch.commit();
          updated += chunk.length;
        } catch (error) {
          failed += chunk.length;
          console.error(`Batch of ${chunk.length} updates failed: ${error.message}`);
        }
      }
    }

    lastDocument = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE) break;
  }
} catch (error) {
  console.error(`Backfill scan failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  console.log(`Mode: ${dryRun ? 'dry-run' : 'commit'}`);
  console.log(`Scanned: ${scanned}`);
  console.log(`Would update: ${wouldUpdate}`);
  if (dryRun) {
    console.log(`First ${previewUids.length} UIDs: ${previewUids.join(', ') || '(none)'}`);
  } else {
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
    if (failed > 0) process.exitCode = 1;
  }
  await app.delete();
}
