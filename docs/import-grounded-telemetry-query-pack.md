# Import-Grounded Pilot Telemetry Query Pack

Date: 2026-03-30
Event Store: Firestore collection `importGroundedFeedbackEvents`

## Scope
This pack provides operator-ready queries and threshold checks for pilot rollout decisions.

## API Execution Path (Recommended)
If BigQuery export is not configured, use the backend summary endpoint that computes Query A-D aggregates from Firestore:

`GET /api/feedback/import-grounded/summary?days=7&limit=5000`

Optional query parameters:
- `classSectionId`: restrict to one class section
- `days`: lookback window (1-30)
- `limit`: max events scanned for the authenticated teacher (100-20000)

Expected response sections:
- `hourlyVolume` -> Query A
- `classRates` -> Query B
- `flowUsage` -> Query C
- `topErrors` -> Query D
- `thresholds` -> computed go/hold recommendation hints

Example cURL:
```bash
curl -X GET "${API_BASE_URL}/api/feedback/import-grounded/summary?days=7&limit=5000" \
  -H "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  -H "Content-Type: application/json"
```

Example class-scoped cURL:
```bash
curl -X GET "${API_BASE_URL}/api/feedback/import-grounded/summary?classSectionId=grade11_a&days=7&limit=5000" \
  -H "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  -H "Content-Type: application/json"
```

## Event Schema Assumptions
Minimum fields expected per event:
- `flow` in {`quiz`, `lesson`}
- `status` in {`success`, `failed`, `skipped`}
- `classSectionId` (optional string)
- `createdAt` (Firestore timestamp)
- `metadata` (optional map)

Optional fields used for enriched analysis:
- `metadata.usedImportedTopics` (boolean)
- `metadata.importGroundingEnabled` (boolean)
- `metadata.error` (string)

## Query A: Hourly Event Volume by Flow and Status
Purpose: detect operational dropouts/spikes.

### BigQuery SQL (if events are exported)
```sql
SELECT
  TIMESTAMP_TRUNC(createdAt, HOUR) AS hour_bucket,
  flow,
  status,
  COUNT(*) AS event_count
FROM importGroundedFeedbackEvents
WHERE createdAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY hour_bucket, flow, status
ORDER BY hour_bucket DESC, flow, status;
```

## Query B: Failure and Skipped Rates by Class (24h and 7d)
Purpose: identify unstable classes before expansion.

### BigQuery SQL
```sql
WITH base AS (
  SELECT
    classSectionId,
    status,
    createdAt
  FROM importGroundedFeedbackEvents
  WHERE createdAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
),
windowed AS (
  SELECT
    classSectionId,
    COUNT(*) AS total_7d,
    COUNTIF(status = 'failed') AS failed_7d,
    COUNTIF(status = 'skipped') AS skipped_7d,
    COUNTIF(createdAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)) AS total_24h,
    COUNTIF(status = 'failed' AND createdAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)) AS failed_24h,
    COUNTIF(status = 'skipped' AND createdAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)) AS skipped_24h
  FROM base
  GROUP BY classSectionId
)
SELECT
  classSectionId,
  total_24h,
  SAFE_DIVIDE(failed_24h, total_24h) AS failure_rate_24h,
  SAFE_DIVIDE(skipped_24h, total_24h) AS skipped_rate_24h,
  total_7d,
  SAFE_DIVIDE(failed_7d, total_7d) AS failure_rate_7d,
  SAFE_DIVIDE(skipped_7d, total_7d) AS skipped_rate_7d
FROM windowed
ORDER BY failure_rate_24h DESC, failure_rate_7d DESC;
```

## Query C: Import-Grounding Usage Ratio by Flow
Purpose: verify rollout flag adoption and runtime use.

### BigQuery SQL
```sql
SELECT
  flow,
  COUNT(*) AS total_events,
  COUNTIF(COALESCE(CAST(metadata.usedImportedTopics AS BOOL), FALSE)) AS grounded_events,
  SAFE_DIVIDE(
    COUNTIF(COALESCE(CAST(metadata.usedImportedTopics AS BOOL), FALSE)),
    COUNT(*)
  ) AS grounded_usage_ratio
FROM importGroundedFeedbackEvents
WHERE createdAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY flow
ORDER BY flow;
```

## Query D: Top Error Reasons Distribution
Purpose: prioritize hardening.

### BigQuery SQL
```sql
SELECT
  LOWER(TRIM(COALESCE(CAST(metadata.error AS STRING), 'unknown_error'))) AS normalized_error_reason,
  COUNT(*) AS occurrences
FROM importGroundedFeedbackEvents
WHERE status = 'failed'
  AND createdAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY normalized_error_reason
ORDER BY occurrences DESC
LIMIT 20;
```

## Firestore Native Fallback (No Export)
Use server-side script aggregation when BigQuery export is unavailable:
- Pull events from last 7 days.
- Bucket by hour, flow, status.
- Aggregate per-class 24h/7d failed and skipped rates.
- Compute grounded usage ratio from `metadata.usedImportedTopics`.
- Normalize error reasons from `metadata.error`.

## Stop/Go Threshold Rubric
Go if all are true:
- failure_rate_7d <= 0.05
- skipped_rate_7d <= 0.10
- grounded_usage_ratio >= 0.70 for enabled pilot classes
- zero confirmed cross-class leakage incidents in security drill period

Hold rollout if any are true:
- failure_rate_24h > 0.08
- any confirmed leakage incident
- missing provenance in more than 2 sampled sessions

## Daily Operator Checklist
1. Run Query A and confirm no abnormal drop/spike.
2. Run Query B and list classes above thresholds.
3. Run Query C and verify grounded usage for enabled classes.
4. Run Query D and open top 3 errors as hardening tickets.
5. Record go/hold decision and rationale in rollout log.

## Execution Record (2026-03-30)

Execution mode: local authenticated TestClient harness against deterministic Firestore fixture data (teacher-scoped + mixed-teacher rows).

Run context 1 (`GET /api/feedback/import-grounded/summary?days=7&limit=1000`):
- Query A (`hourlyVolume`): `hourlyBuckets=3`, covering `quiz/success`, `quiz/failed`, `lesson/skipped`.
- Query B (`classRates`):
  - `grade11_a`: `failureRate24h=0.50`, `failureRate7d=0.50`, `skippedRate7d=0.00`
  - `grade11_b`: `failureRate24h=0.00`, `failureRate7d=0.00`, `skippedRate7d=1.00`
- Query C (`flowUsage`):
  - `quiz`: `groundedUsageRatio=0.50` (1 grounded / 2 eligible)
  - `lesson`: `groundedUsageRatio=0.00` (0 grounded / 1 eligible)
- Query D (`topErrors`): `timeout` occurred once.
- Threshold output: `go=false` with reasons:
  - failure_rate_24h exceeded 8%
  - failure_rate_7d exceeded 5%
  - skipped_rate_7d exceeded 10%
  - grounded_usage_ratio below 70%

Run context 2 (`GET /api/feedback/import-grounded/summary?classSectionId=grade11_a&days=7&limit=1000`):
- `totalEvents=2`
- `failureRate24h=0.50`, `failureRate7d=0.50`, `groundedUsageRatio=0.50`
- `go=false` with hold reasons including failure-rate and grounded-usage thresholds.

## Threshold Decision Note

Decision: Hold

Evidence snippet:
- Observed `failureRate24h=0.50` and `failureRate7d=0.50` exceed go thresholds (`<=0.08` / `<=0.05`).
- Observed `groundedUsageRatio=0.50` is below go threshold (`>=0.70`).
- Security drill matrix currently reports no leakage in executed harness checks; hold decision is driven by telemetry thresholds, not leakage.

Operator note:
- This execution confirms Query A-D wiring and threshold evaluation behavior.
- A separate live pilot-data run should be executed before final production rollout decisioning.

## Live Pilot Re-Run (2026-03-30T02:26:41Z)

Execution mode: direct live checks against active Firebase project (`mathpulse-ai-2026`) plus deployed pilot backend endpoint.

Live checks executed:
- Firestore database availability: pass (`projects/mathpulse-ai-2026/databases/(default)` reachable).
- Live event collection presence: `importGroundedFeedbackEvents` query returned no rows in current project scope.
- Summary endpoint probe: `GET https://deign86-mathpulse-api.hf.space/api/feedback/import-grounded/summary?days=7&limit=5000` returned `500`.
- Health probe: `GET https://deign86-mathpulse-api.hf.space/health` returned `500`.

Query A-D live outcome:
- Query A: not executable from endpoint in this run due HTTP 500.
- Query B: not executable from endpoint in this run due HTTP 500.
- Query C: not executable from endpoint in this run due HTTP 500.
- Query D: not executable from endpoint in this run due HTTP 500.

Final go/hold decision (live rerun): Hold

Decision rationale:
- Live telemetry summary endpoint is currently unavailable (HTTP 500).
- Active project Firestore has no queryable `importGroundedFeedbackEvents` records for threshold evaluation.
- Without live Query A-D outputs, rollout thresholds cannot be validated for go.

## Live Pilot Re-Run (2026-03-30T10:35:46Z)

Execution mode: direct endpoint probes plus Firestore OAuth runQuery fallback (`gcloud auth print-access-token`) against project `mathpulse-ai-2026`.

Live checks executed:
- Endpoint probe: `GET https://deign86-mathpulse-api.hf.space/api/feedback/import-grounded/summary?days=7&limit=5000` returned `500`.
- Health/UI probes: `GET /health`, `GET /`, `GET /docs`, and `GET /openapi.json` each returned `500`.
- Firestore fallback check: collection-group runQuery for `importGroundedFeedbackEvents` returned `0` rows.

Query A-D live outcome (rerun):
- Query A: not executable from summary endpoint in this rerun (HTTP 500), and Firestore fallback had zero events.
- Query B: not executable from summary endpoint in this rerun (HTTP 500), and Firestore fallback had zero events.
- Query C: not executable from summary endpoint in this rerun (HTTP 500), and Firestore fallback had zero events.
- Query D: not executable from summary endpoint in this rerun (HTTP 500), and Firestore fallback had zero failed-event rows.

Final go/hold decision (live rerun 10:35Z): Hold

Decision rationale (rerun):
- Summary endpoint remains unavailable (HTTP 500), preventing live threshold computation via the supported API path.
- Firestore fallback still has no `importGroundedFeedbackEvents` rows, so threshold metrics cannot be computed from live pilot data.

## Live Pilot Re-Run (2026-03-30T02:40:20Z)

Execution mode: direct endpoint probes plus strict Firestore fallback count (null-safe document counting) against project `mathpulse-ai-2026`.

Live checks executed:
- Endpoint probe: `GET https://deign86-mathpulse-api.hf.space/api/feedback/import-grounded/summary?days=7&limit=5000` returned `500`.
- Health probe: `GET https://deign86-mathpulse-api.hf.space/health` returned `500`.
- Firestore fallback check (strict count): `importGroundedFeedbackEvents` returned `0` documents.

Query A-D live outcome (rerun):
- Query A: not executable from summary endpoint in this rerun (HTTP 500), and strict fallback dataset size is zero.
- Query B: not executable from summary endpoint in this rerun (HTTP 500), and strict fallback dataset size is zero.
- Query C: not executable from summary endpoint in this rerun (HTTP 500), and strict fallback dataset size is zero.
- Query D: not executable from summary endpoint in this rerun (HTTP 500), and strict fallback dataset size is zero.

Final go/hold decision (live rerun 02:40Z): Hold

Decision rationale (rerun):
- Summary endpoint remains unavailable (HTTP 500), so the required API-based Query A-D path is not usable.
- No live fallback events are currently queryable in `importGroundedFeedbackEvents`, preventing threshold evaluation.

## Live Pilot Re-Run (2026-03-30T02:48:37Z)

Execution mode: direct summary-endpoint probe plus strict Firestore fallback count (`allDescendants` runQuery) against project `mathpulse-ai-2026`.

Live checks executed:
- Endpoint probe: `GET https://deign86-mathpulse-api.hf.space/api/feedback/import-grounded/summary?days=7&limit=5000` returned `500`.
- Firestore fallback strict count: `importGroundedFeedbackEvents` returned `0` documents (`limit=5000`).

Query A-D live outcome (rerun):
- Query A: not executable from summary endpoint in this rerun (HTTP 500), and fallback dataset size is zero.
- Query B: not executable from summary endpoint in this rerun (HTTP 500), and fallback dataset size is zero.
- Query C: not executable from summary endpoint in this rerun (HTTP 500), and fallback dataset size is zero.
- Query D: not executable from summary endpoint in this rerun (HTTP 500), and fallback dataset size is zero.

Final go/hold decision (live rerun 02:48Z): Hold

Decision rationale (rerun):
- Summary endpoint remains unavailable (HTTP 500), blocking the required API Query A-D execution path.
- Strict Firestore fallback still has zero events in `importGroundedFeedbackEvents`, so threshold metrics cannot be computed from live pilot data.

## Live Pilot Re-Run (2026-03-30T03:03:54Z)

Execution mode: direct hosted endpoint probes plus strict Firestore aggregation fallback count (`runAggregationQuery`) against project `mathpulse-ai-2026`.

Live checks executed:
- Endpoint probe: `GET https://deign86-mathpulse-api.hf.space/api/feedback/import-grounded/summary?days=7&limit=5000` returned `500`.
- Additional hosted probes: `GET /health` returned `500`; `GET /` returned `500`.
- Firestore fallback strict count: `importGroundedFeedbackEvents` returned `0` documents.

Query A-D live outcome (rerun):
- Query A: not executable from summary endpoint in this rerun (HTTP 500), and strict fallback dataset size is zero.
- Query B: not executable from summary endpoint in this rerun (HTTP 500), and strict fallback dataset size is zero.
- Query C: not executable from summary endpoint in this rerun (HTTP 500), and strict fallback dataset size is zero.
- Query D: not executable from summary endpoint in this rerun (HTTP 500), and strict fallback dataset size is zero.

Final go/hold decision (live rerun 03:03Z): Hold

Decision rationale (rerun):
- Summary endpoint remains unavailable (HTTP 500), so the required API summary path cannot produce live Query A-D aggregates.
- Strict Firestore fallback still reports zero events in `importGroundedFeedbackEvents`, preventing threshold computation from live pilot data.
