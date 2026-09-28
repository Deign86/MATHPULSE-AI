# backend/middleware/

## Responsibility
Provides role-adjusted request rate limiting for the FastAPI backend through `rate_limiter.py` and its package-level exports.

## Design
- `MathPulseLimiter` wraps SlowAPI `Limiter` using in-memory storage and Firebase UID keys; unauthenticated requests key by client IP.
- RPM defaults are environment-configurable by category; `ROLE_MULTIPLIERS` scales limits for `admin` and `teacher`, with students/default roles at 1x.
- Decorator factories expose AI, quiz generation/submission, auth, leaderboard, and default limit policies.
- `setup_rate_limiting(app)` attaches the limiter to `app.state` and registers a JSON 429 handler with `Retry-After`.

## Flow
Request identity and role come from `request.state.user`; each category method computes base RPM × role multiplier and returns SlowAPI's `N/minute` policy. SlowAPI applies the policy and dispatches violations to `_rate_limit_exceeded_handler`.

## Integration
`backend/main.py` calls `setup_rate_limiting(app)` when available and adds authentication middleware that populates request user state. `middleware.__init__` exports `rate_limiter`, `setup_rate_limiting`, and `RateLimitExceeded`; route handlers can use `ai_rate_limit`, `quiz_generate_rate_limit`, `quiz_submit_rate_limit`, `auth_rate_limit`, `leaderboard_rate_limit`, or `default_rate_limit`.
