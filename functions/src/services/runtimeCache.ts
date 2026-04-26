type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
};

interface RuntimeCacheOptions {
  defaultTtlMs?: number;
  maxEntries?: number;
}

const DEFAULT_TTL_MS = 60 * 1000;
const DEFAULT_MAX_ENTRIES = 800;

const normalizeKeyPart = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const createRuntimeCacheKey = (...parts: unknown[]): string =>
  parts.map((part) => normalizeKeyPart(part)).join("|");

export class RuntimeCache {
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  constructor(options: RuntimeCacheOptions = {}) {
    this.defaultTtlMs = Math.max(1000, Math.floor(options.defaultTtlMs ?? DEFAULT_TTL_MS));
    this.maxEntries = Math.max(50, Math.floor(options.maxEntries ?? DEFAULT_MAX_ENTRIES));
  }

  get<T>(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return null;
    }

    entry.lastAccessedAt = now;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const now = Date.now();
    const effectiveTtl = Math.max(1000, Math.floor(ttlMs ?? this.defaultTtlMs));

    this.entries.set(key, {
      value,
      expiresAt: now + effectiveTtl,
      lastAccessedAt: now,
    });

    this.pruneIfNeeded();
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  getOrSet<T>(key: string, loader: () => Promise<T> | T, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return Promise.resolve(cached);
    }

    return Promise.resolve(loader()).then((loaded) => {
      this.set(key, loaded, ttlMs);
      return loaded;
    });
  }

  private pruneIfNeeded(): void {
    const now = Date.now();

    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }

    if (this.entries.size <= this.maxEntries) {
      return;
    }

    const orderedByAccess = Array.from(this.entries.entries()).sort(
      (left, right) => left[1].lastAccessedAt - right[1].lastAccessedAt,
    );

    while (this.entries.size > this.maxEntries && orderedByAccess.length > 0) {
      const next = orderedByAccess.shift();
      if (!next) break;
      this.entries.delete(next[0]);
    }
  }
}

export const runtimeCache = new RuntimeCache({
  defaultTtlMs: DEFAULT_TTL_MS,
  maxEntries: DEFAULT_MAX_ENTRIES,
});
