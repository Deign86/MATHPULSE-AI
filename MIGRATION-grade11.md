# Grade-11 Branch — Database Migration Required

Branch: `grade11-all-subjects-unlock` | Date: 2026-09-11

## Rule

Run the migration BEFORE deploying this branch. The code is Grade-11-only;
stored Firestore records may still carry Grade 12 values. New code normalizes
legacy values on read, but the migration makes stored data match.

## What migrates

| Collection | Field | From | To |
|---|---|---|---|
| `users` | `grade` | `Grade 12` | `Grade 11` |
| `progress` | `gradeLevel` | `Grade 12` | `Grade 11` |

Legacy readiness/gate fields (`g12Readiness*`, `grade12TransitionGate`,
`G12Candidate` tags, `g12-*` topic aliases) need NO rewrite: code reads them
through legacy aliases and normalizes to Grade 11. Test reset deletes both
old and new field names.

## Run

```bash
python backend/scripts/migrate_grade12_to_grade11.py
```

Auth: `FIREBASE_SERVICE_ACCOUNT_JSON` env var, or application-default
credentials. Batches of 500. Prints migrated counts at the end.

## Rollback

One-way script, no auto-rollback. To revert, re-set the two fields above
from backup before this branch goes live.
