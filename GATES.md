# Gates: AI Change Audit survives a concurrent label create

Scope: `.github/workflows/ai-change-audit.yml` checks each label with getLabel and creates it on failure. Two audit runs at once (e.g. a re-run next to a fresh run) both miss the label and both create it; the loser got `422 already_exists`, uncaught, failing the audit check (seen on #340 and #342). Treat that specific 422 as success; any other error still fails the job.

- [x] G1: Race case (create returns 422 already_exists) completes and still applies labels; a real API error still fails; a clean create works
  EVIDENCE: harness runs the workflow's embedded github-script step (parsed with js-yaml) against stubbed APIs. Before: race -> threw 422 Validation Failed. After: race -> completed, addLabels called; 500 -> threw 500; clean create -> completed

- [x] G2: Workflow YAML still parses and the step script compiles
  EVIDENCE: js-yaml load + AsyncFunction compile of the step script succeed (same harness)

Post-merge check: the next PR's `audit` check passes even when it runs alongside another audit run.
