# scripts/

## Responsibility
One-off Node maintenance, sync-check, and Firestore backfill utilities run manually or from CI hooks; not part of any runtime bundle.

## Design
- `setup-git-hooks.mjs`: installs the Oxlint anti-slop pre-commit hook (runs on `npm run prepare`).
- `sync-models.mjs`: verifies `backend/config/models.yaml` is in sync (`npm run check:models` gate in CI).
- `backfill-quiz-assignment-recipients.ts`: reconciles quiz-assignment recipients from assignments plus legacy `metadata.assignedTo`; parses Firestore payloads with Zod at the I/O boundary, reports orphan assignments, and writes only with `--apply`.

## Flow
Operator or CI invokes the script directly with `node`/`tsx`; backfills read Firestore collections, log per-record actions, and exit non-zero on validation failure.

## Integration
Consumed by: `package.json` scripts (`prepare`, `check:models`). Firestore access uses `firebase-admin` with application-default or service-account credentials; never import these scripts from app or functions code.
