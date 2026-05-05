"""
Rate limiting middleware using slowapi.
"""
import os
import logging

from fastapi import Request
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded as SlowAPIRateLimitExceeded

logger = logging.getLogger("mathpulse.ratelimit")

# Environment-based configuration with defaults
RATE_LIMIT_AI_RPM = int(os.getenv("RATE_LIMIT_AI_RPM", "20"))
RATE_LIMIT_QUIZ_GENERATE_RPM = int(os.getenv("RATE_LIMIT_QUIZ_GENERATE_RPM", "10"))
RATE_LIMIT_QUIZ_SUBMIT_RPM = int(os.getenv("RATE_LIMIT_QUIZ_SUBMIT_RPM", "30"))
RATE_LIMIT_AUTH_RPM = int(os.getenv("RATE_LIMIT_AUTH_RPM", "5"))
RATE_LIMIT_LEADERBOARD_RPM = int(os.getenv("RATE_LIMIT_LEADERBOARD_RPM", "60"))
RATE_LIMIT_DEFAULT_RPM = int(os.getenv("RATE_LIMIT_DEFAULT_RPM", "100"))
RATE_LIMIT_ADMIN_MULTIPLIER = int(os.getenv("RATE_LIMIT_ADMIN_MULTIPLIER", "10"))
RATE_LIMIT_TEACHER_MULTIPLIER = int(os.getenv("RATE_LIMIT_TEACHER_MULTIPLIER", "3"))

# Role multipliers for rate limit adjustment
ROLE_MULTIPLIERS = {
    "admin": RATE_LIMIT_ADMIN_MULTIPLIER,
    "teacher": RATE_LIMIT_TEACHER_MULTIPLIER,
    "student": 1,
}


def _get_user_identifier(request: Request) -> str:
    """
    Extract user identifier for rate limiting.
    Uses Firebase UID from request.state.user if authenticated, otherwise falls back to IP.
    """
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "uid") and user.uid:
        return f"uid:{user.uid}"

    if request.client:
        return f"ip:{request.client.host}"
    return "ip:unknown"


def _get_user_role(request: Request) -> str:
    """Get user role from request state for multiplier calculation."""
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "role") and user.role:
        return user.role
    return "student"


def _get_role_multiplier(request: Request) -> int:
    """Get rate limit multiplier based on user role."""
    role = _get_user_role(request)
    return ROLE_MULTIPLIERS.get(role, 1)


class MathPulseLimiter:
    """
    Rate limiter with role-aware multipliers for MathPulse AI.
    """

    def __init__(self) -> None:
        self._limiter = Limiter(
            key_func=_get_user_identifier,
            storage_uri="memory://",
            default_limits=[f"{RATE_LIMIT_DEFAULT_RPM}/minute"],
        )

    @property
    def limiter(self) -> Limiter:
        return self._limiter

    def _get_adjusted_limit(self, base_rpm: int, request: Request) -> int:
        """Apply role multiplier to base rate limit."""
        multiplier = _get_role_multiplier(request)
        return base_rpm * multiplier

    def ai_limit(self, request: Request) -> str:
        """Rate limit for AI endpoints with role adjustment."""
        limit = self._get_adjusted_limit(RATE_LIMIT_AI_RPM, request)
        return f"{limit}/minute"

    def quiz_generate_limit(self, request: Request) -> str:
        """Rate limit for quiz generation with role adjustment."""
        limit = self._get_adjusted_limit(RATE_LIMIT_QUIZ_GENERATE_RPM, request)
        return f"{limit}/minute"

    def quiz_submit_limit(self, request: Request) -> str:
        """Rate limit for quiz submission with role adjustment."""
        limit = self._get_adjusted_limit(RATE_LIMIT_QUIZ_SUBMIT_RPM, request)
        return f"{limit}/minute"

    def auth_limit(self, request: Request) -> str:
        """Rate limit for auth endpoints with role adjustment."""
        limit = self._get_adjusted_limit(RATE_LIMIT_AUTH_RPM, request)
        return f"{limit}/minute"

    def leaderboard_limit(self, request: Request) -> str:
        """Rate limit for leaderboard with role adjustment."""
        limit = self._get_adjusted_limit(RATE_LIMIT_LEADERBOARD_RPM, request)
        return f"{limit}/minute"

    def default_limit(self, request: Request) -> str:
        """Default rate limit with role adjustment."""
        limit = self._get_adjusted_limit(RATE_LIMIT_DEFAULT_RPM, request)
        return f"{limit}/minute"


# Global rate limiter instance
rate_limiter = MathPulseLimiter()


def setup_rate_limiting(app):
    """
    Set up rate limiting for the FastAPI application.
    """

    # Add limiter to app state
    app.state.limiter = rate_limiter.limiter

    # Add slowapi exception handler
    app.add_exception_handler(
        SlowAPIRateLimitExceeded,
        lambda request, exc: _rate_limit_exceeded_handler(request, exc)
    )

    logger.info(
        f"Rate limiting configured: AI={RATE_LIMIT_AI_RPM}/min, "
        f"QuizGen={RATE_LIMIT_QUIZ_GENERATE_RPM}/min, "
        f"Auth={RATE_LIMIT_AUTH_RPM}/min, "
        f"Admin={RATE_LIMIT_ADMIN_MULTIPLIER}x, Teacher={RATE_LIMIT_TEACHER_MULTIPLIER}x"
    )


def _rate_limit_exceeded_handler(request: Request, exc: SlowAPIRateLimitExceeded):
    """Handle rate limit exceeded errors with proper JSON response."""
    from fastapi.responses import JSONResponse

    retry_after = getattr(exc, "retry_after", 60)
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": retry_after,
        },
        headers={
            "Retry-After": str(retry_after),
            "Content-Type": "application/json",
        }
    )


# Decorator helpers
def ai_rate_limit():
    """Decorator for AI endpoint rate limiting."""
    return rate_limiter.limiter.limit(rate_limiter.ai_limit)


def quiz_generate_rate_limit():
    """Decorator for quiz generation rate limiting."""
    return rate_limiter.limiter.limit(rate_limiter.quiz_generate_limit)


def quiz_submit_rate_limit():
    """Decorator for quiz submit rate limiting."""
    return rate_limiter.limiter.limit(rate_limiter.quiz_submit_limit)


def auth_rate_limit():
    """Decorator for auth endpoint rate limiting."""
    return rate_limiter.limiter.limit(rate_limiter.auth_limit)


def leaderboard_rate_limit():
    """Decorator for leaderboard rate limiting."""
    return rate_limiter.limiter.limit(rate_limiter.leaderboard_limit)


def default_rate_limit():
    """Decorator for default rate limiting."""
    return rate_limiter.limiter.limit(rate_limiter.default_limit)