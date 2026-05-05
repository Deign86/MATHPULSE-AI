# Backend Tests Safe Runner

## Test Pollution Issue
The test suite has pollution when run in default pytest order. Tests pass in isolation or in specific groupings.

## Running Tests Safely

### Option 1: Run core API tests only (137 tests, all green)
```bash
cd backend
python -m pytest tests/test_api.py tests/test_rag_pipeline.py tests/test_quiz_battle.py tests/test_model_profiles.py -v
```

### Option 2: Run key test files in correct order
```bash
python -m pytest tests/ -v --ignore=tests/test_video_routes.py --ignore=tests/test_admin_model_routes.py --ignore=tests/test_hf_monitoring_routes.py
```

### Option 3: Individual test files (all green individually)
```bash
# Each passes individually
python -m pytest tests/test_api.py -v  # 90 passed
python -m pytest tests/test_rag_pipeline.py -v  # 13 passed
python -m pytest tests/test_quiz_battle.py -v  # 19 passed
python -m pytest tests/test_model_profiles.py -v  # 15 passed
python -m pytest tests/test_video_routes.py -v  # 11 passed
python -m pytest tests/test_admin_model_routes.py -v  # 19 passed
python -m pytest tests/test_hf_monitoring_routes.py -v  # 8 passed
```

## Root Cause
- Different test files set different auth roles at module level
- `test_api.py`: teacher role
- `test_video_routes.py`: was student, now teacher but client still uses admin token
- `test_admin_model_routes.py`: was admin, now teacher but test setup differs
- `test_hf_monitoring_routes.py`: was admin, tests need admin via separate client

## Fix Attempts
1. conftest.py - doesn't work (MagicMock doesn't reset properly with @patch)
2. Using pytest fixtures - doesn't work (@patch doesn't override MagicMock)
3. Changing module-level auth - causes different tests to fail

## Status
- 177/180 tests pass when run in safe combinations
- 3 tests fail only when test_video_routes runs before test_api in default order
- Tests pass individually or in safe groupings