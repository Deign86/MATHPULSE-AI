import json
import time
from collections import OrderedDict
from dataclasses import dataclass
from hashlib import sha256
from threading import Lock
from typing import Any, Dict, Optional

try:
    import redis.asyncio as redis_async  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - optional dependency
    redis_async = None  # type: ignore[assignment]


@dataclass
class _CacheRecord:
    value: Any
    expires_at: float


class DeterministicResponseCache:
    """TTL + LRU response cache with optional Redis backing.

    - Local cache is always used for fast lookups.
    - Redis is optional and fail-open.
    - Values are normalized through JSON roundtrip to keep payloads serializable.
    """

    def __init__(
        self,
        *,
        enabled: bool,
        max_entries: int,
        redis_url: Optional[str] = None,
        redis_prefix: str = "mathpulse:det-cache:",
        logger: Any = None,
    ) -> None:
        self.enabled = bool(enabled)
        self.max_entries = max(1, int(max_entries))
        self.redis_prefix = redis_prefix
        self.logger = logger

        self._lock = Lock()
        self._local: OrderedDict[str, _CacheRecord] = OrderedDict()

        self._redis = None
        if self.enabled and redis_url and redis_async is not None:
            try:
                self._redis = redis_async.from_url(redis_url, encoding="utf-8", decode_responses=True)
            except Exception as err:
                self._warn(f"Redis cache disabled: failed to initialize client: {err}")
                self._redis = None

    def build_cache_key(self, namespace: str, payload: Dict[str, Any]) -> str:
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str, ensure_ascii=True)
        digest = sha256(canonical.encode("utf-8")).hexdigest()
        return f"{namespace}:{digest}"

    async def get(self, key: str) -> Optional[Any]:
        if not self.enabled:
            return None

        local_hit = self._get_local(key)
        if local_hit is not None:
            return local_hit

        if self._redis is None:
            return None

        redis_key = self._redis_key(key)
        try:
            raw = await self._redis.get(redis_key)
            if raw is None:
                return None
            decoded = json.loads(raw)

            ttl_seconds = await self._redis.ttl(redis_key)
            if isinstance(ttl_seconds, int) and ttl_seconds > 0:
                self._set_local(key, decoded, ttl_seconds)
            return decoded
        except Exception as err:
            self._warn(f"Redis cache get failed for {key}: {err}")
            return None

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        if not self.enabled:
            return

        ttl = int(ttl_seconds)
        if ttl <= 0:
            return

        normalized_value = self._normalize(value)
        self._set_local(key, normalized_value, ttl)

        if self._redis is None:
            return

        redis_key = self._redis_key(key)
        try:
            await self._redis.set(redis_key, json.dumps(normalized_value, separators=(",", ":"), default=str), ex=ttl)
        except Exception as err:
            self._warn(f"Redis cache set failed for {key}: {err}")

    async def clear(self) -> None:
        with self._lock:
            self._local.clear()

    def _normalize(self, value: Any) -> Any:
        # Keep payloads immutable enough for cache semantics and JSON-safe for Redis.
        return json.loads(json.dumps(value, default=str))

    def _redis_key(self, key: str) -> str:
        return f"{self.redis_prefix}{key}"

    def _get_local(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            self._prune_locked(now)
            record = self._local.get(key)
            if record is None:
                return None
            if record.expires_at <= now:
                self._local.pop(key, None)
                return None
            self._local.move_to_end(key, last=True)
            return record.value

    def _set_local(self, key: str, value: Any, ttl_seconds: int) -> None:
        expires_at = time.time() + ttl_seconds
        with self._lock:
            self._prune_locked(time.time())
            self._local[key] = _CacheRecord(value=value, expires_at=expires_at)
            self._local.move_to_end(key, last=True)
            while len(self._local) > self.max_entries:
                self._local.popitem(last=False)

    def _prune_locked(self, now: float) -> None:
        expired_keys = [cache_key for cache_key, record in self._local.items() if record.expires_at <= now]
        for cache_key in expired_keys:
            self._local.pop(cache_key, None)

    def _warn(self, message: str) -> None:
        if self.logger is not None:
            self.logger.warning(message)
