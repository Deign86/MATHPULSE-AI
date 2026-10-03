# Backend Tests

## Running the suite

The full suite runs green in default order — no ignores, subsets, or ordering workarounds needed:

```bash
cd backend
python -m pytest tests/ -v --tb=short
```

Run with `PYTHONPATH=<repo>/backend` and UTF-8 mode enabled (this is what CI does). Targeted runs:

```bash
python -m pytest backend/tests/<module>.py -q  # from repo root
```

Latest verified state: 579 passed, 0 failed.

## Fixtures (`conftest.py`)

- Firebase auth / Firebase Admin test doubles, so no production credentials are needed.
- Isolated-auth fixture: binds student/teacher claims per test module. Always apply it to auth-sensitive modules — suite-wide auth mocks previously leaked teacher claims into student cases (wrong role = wrong status codes, not real failures).

## Auth/authorization regression coverage

- `test_role_policies_regression.py` — matrix over `ROLE_POLICIES`; expectations live in `role_policy_expectations.py`.
- `test_diagnostic_iar_states.py`, `test_intervention_pipeline.py`, `test_quiz_battle_api.py`, `test_quiz_generation_regression.py`, `test_rag_regression.py`, `test_risk_wri_regression.py` — all assert 403-first rejection for unauthorized roles.

## History (resolved)

An older revision of this file described test pollution under default ordering (module-level auth roles, MagicMock resets). That failure mode is gone: the isolated-auth fixture plus per-module claim binding fixed it. If ordering failures ever return, check fixture isolation before reintroducing subsets or ignores.
