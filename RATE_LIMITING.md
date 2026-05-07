# Rate Limiting Architecture

This document describes the multi-layer rate limiting implementation for MathPulse AI.

## Overview

Rate limiting is implemented at four layers to provide defense-in-depth:

1. **Nginx** - Edge rate limiting (DDoS protection, rough limits)
2. **FastAPI Backend** - Application-level rate limiting (role-aware, per-endpoint)
3. **Firebase Cloud Functions** - Serverless function rate limiting
4. **Frontend** - User-facing error handling and retry UI

## Rate Limits by Endpoint Group

### FastAPI Backend

| Endpoint Group | Default Limit | Admin (10x) | Teacher (3x) | Student |
|----------------|---------------|-------------|--------------|---------|
| `/api/ai/*` (chatbot, hints) | 20/min | 200/min | 60/min | 20/min |
| `/api/quiz/generate` | 10/min | 100/min | 30/min | 10/min |
| `/api/quiz/submit` | 30/min | 300/min | 90/min | 30/min |
| `/api/auth/*` | 5/min | 50/min | 15/min | 5/min |
| `/api/leaderboard` | 60/min | 600/min | 180/min | 60/min |
| All other `/api/*` | 100/min | 1000/min | 300/min | 100/min |

### Nginx

| Zone | Rate | Burst |
|------|------|-------|
| `global` | 60/min | 20 |
| `ai_endpoints` | 20/min | 5 |
| `auth_endpoints` | 5/min | 2 |
| `quiz_endpoints` | 30/min | 10 |

### Firebase Cloud Functions

| Function Type | Limit |
|--------------|-------|
| AI tutor / chatbot | 20 calls/min |
| Quiz generation | 10 calls/min |
| XP/reward awards | 50 calls/min |
| Admin bulk operations | 10 calls/min |
| All other functions | 60 calls/min |

## Configuration

Environment variables (see `.env.example`):

```env
RATE_LIMIT_AI_RPM=20
RATE_LIMIT_QUIZ_GENERATE_RPM=10
RATE_LIMIT_QUIZ_SUBMIT_RPM=30
RATE_LIMIT_AUTH_RPM=5
RATE_LIMIT_LEADERBOARD_RPM=60
RATE_LIMIT_DEFAULT_RPM=100
RATE_LIMIT_ADMIN_MULTIPLIER=10
RATE_LIMIT_TEACHER_MULTIPLIER=3
RATE_LIMIT_STORAGE_BACKEND=memory
```

## Architecture Details

### Nginx Layer
- Uses `limit_req_zone` directives in the `http` block
- Route-specific limits applied via nested `location` blocks
- Returns 429 with JSON body: `{"error": "rate_limit_exceeded", "message": "Too many requests. Please try again later."}`
- Acts as first line of defense against DDoS and excessive traffic

### FastAPI Layer
- Uses `slowapi` library (built on `limits`)
- Key function extracts Firebase UID from JWT (via `request.state.user`)
- Falls back to IP address for unauthenticated requests
- Role multipliers applied: Admin (10x), Teacher (3x), Student (1x)
- Returns 429 with JSON body including `retry_after` header
- Old `enforce_rate_limit()` function deprecated (no-op)

### Firebase Functions Layer
- Uses Firestore `_ratelimits/{uid}/{functionName}` sub-collection
- TTL-based: 60-second window, automatic reset
- Atomic transaction for distributed rate limiting
- Returns `RATE_LIMIT_EXCEEDED` error with `retryAfter` field
- Admin/teacher multipliers applied to base limits

### Frontend Layer
- `handleRateLimitError()` in `src/utils/rateLimitHandler.ts`
- Parses `retry-after` from response headers/body
- Shows toast notification via Sonner
- Dispatches `rate-limit-hit` custom event for UI components
- Logs to Firestore `_analytics/rateLimitHits/{uid}` for monitoring
- AI/chatbot buttons can listen for event to disable with countdown

## File Structure

```
backend/
├── middleware/
│   ├── __init__.py
│   └── rate_limiter.py     # slowapi integration, role multipliers
└── tests/
    └── test_rate_limiter.py # Unit tests

functions/src/
├── utils/
│   └── rateLimiter.ts      # Firestore-based rate limiting
└── ...

nginx.conf                    # Rate limiting zones and limits
src/
├── utils/
│   └── rateLimitHandler.ts # Frontend rate limit handling
└── services/
    └── apiService.ts        # Integration with handleRateLimitError

firestore.rules              # Security rules for _ratelimits collection
.env.example                 # Environment variable configuration
```

## Error Response Format

All rate limit errors return HTTP 429 with JSON:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

Headers include:
- `Retry-After: 60`
- `Content-Type: application/json`

## Implementation Notes

### Performance
- In-memory storage used by default (suitable for single-instance)
- Redis recommended for multi-instance production deployments
- Set `RATE_LIMIT_STORAGE_BACKEND=redis` with `REDIS_URL` env var

### User Experience
- Toast notifications via Sonner for rate limit hits
- AI submit buttons disabled during rate limit cooldown
- Countdown timer shows remaining wait time
- Events logged for admin monitoring

### Security
- Firestore rules restrict `_ratelimits` writes to Cloud Functions only
- Users can only read their own rate limit data
- Admin-only access to rate limit analytics
- Role multipliers prevent abuse by privileged users

## Testing

Run backend rate limiter tests:

```bash
cd backend
pytest tests/test_rate_limiter.py -v
```

Verify nginx configuration:

```bash
nginx -t
```

## Monitoring

Rate limit events are logged to:
- **Firestore**: `_analytics/rateLimitHits/{uid}` for user-facing monitoring
- **Backend logs**: `mathpulse.ratelimit` logger for infrastructure monitoring

## Future Improvements

1. Redis backend for distributed rate limiting across instances
2. Sliding window rate limiting for smoother limits
3. Per-endpoint custom limits via Firestore config
4. Rate limit analytics dashboard for admins
5. Automatic rate limit adjustment based on AI API costs