/**
 * scripts/backfill-notification-read-flag.ts
 *
 * Migrates notification documents onto the canonical `isRead` flag.
 *
 * Older notifications were written with a `read` field only (or with both
 * `isRead` and `read` disagreeing). The client reads `isRead` first and falls
 * back to `read` purely for migration, so those documents are only safe to
 * drop once this backfill has run and no `read`-only document remains.
 *
 * For every `notifications/{userId}/items/{notificationId}` document:
 *   - if `isRead` is missing and `read` is a boolean, set `isRead` from `read`
 *   - then delete the now-redundant `read` field
 * Documents that already carry a boolean `isRead` keep it and only lose `read`.
 *
 * Run (dry run, reports the planned changes without writing):
 *   npx tsx scripts/backfill-notification-read-flag.ts
 * Run (apply):
 *   npx tsx scripts/backfill-notification-read-flag.ts --apply
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

const serviceAccount = path.resolve(__dirname, '../.secrets/firebase-service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const APPLY = process.argv.includes('--apply');
const BATCH_LIMIT = 450;

/** Type predicate: a stored Firestore field decoded as a boolean flag. */
function isBooleanFlag(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** Fields this backfill writes onto a notification document. */
type ReadFlagPatch = { isRead?: boolean; read: null };

async function main() {
  const usersSnap = await db.collection('notifications').listDocuments();
  console.log(`Found ${usersSnap.length} notification owners.`);

  let scanned = 0;
  let migrated = 0;
  let droppedRedundant = 0;
  let batch = db.batch();
  let pendingWrites = 0;

  for (const userRef of usersSnap) {
    const itemsSnap = await userRef.collection('items').get();
    for (const item of itemsSnap.docs) {
      scanned += 1;
      const data = item.data();
      const hasIsRead = isBooleanFlag(data.isRead);
      const hasLegacyRead = isBooleanFlag(data.read);

      if (!hasIsRead && !hasLegacyRead) continue;
      if (hasIsRead && !hasLegacyRead) continue;

      const patch: ReadFlagPatch = { read: null };
      if (!hasIsRead && hasLegacyRead) {
        patch.isRead = data.read;
        migrated += 1;
      } else {
        droppedRedundant += 1;
      }

      if (APPLY) {
        batch.update(item.ref, patch);
        pendingWrites += 1;
        if (pendingWrites >= BATCH_LIMIT) {
          await batch.commit();
          batch = db.batch();
          pendingWrites = 0;
        }
      }
    }
  }

  if (APPLY && pendingWrites > 0) await batch.commit();

  console.log(
    [
      `scanned=${scanned}`,
      `isRead_backfilled=${migrated}`,
      `redundant_read_removed=${droppedRedundant}`,
      APPLY ? 'mode=applied' : 'mode=dry-run (pass --apply to write)',
    ].join(' '),
  );
}

main().catch((err) => {
  console.error('[backfill-notification-read-flag] failed:', err);
  process.exit(1);
});
