import { normalizeCacheText, stableHash } from './cacheKeys';

interface HintCacheEntry {
  value: string;
  expiresAt: number;
}

interface HintCacheStorageShape {
  entries: Record<string, HintCacheEntry>;
}

interface BuildHintCacheKeyInput {
  userId: string;
  prompt: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const STORAGE_KEY = 'mathpulse:chat-hint-cache:v1';
const DEFAULT_HINT_CACHE_TTL_MS = 20 * 60 * 1000;
const HISTORY_CONTEXT_WINDOW = 4;

const hintCacheMemory = new Map<string, HintCacheEntry>();

const isBrowser = (): boolean => typeof window !== 'undefined';

const nowMs = (): number => Date.now();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isHintCacheEntry = (value: unknown): value is HintCacheEntry =>
  isRecord(value)
  && typeof value.value === 'string'
  && typeof value.expiresAt === 'number'
  && Number.isFinite(value.expiresAt);

const readStorage = (): HintCacheStorageShape => {
  if (!isBrowser()) {
    return { entries: {} };
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: {} };
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.entries)) {
      return { entries: {} };
    }

    const entries: Record<string, HintCacheEntry> = {};
    for (const [key, entry] of Object.entries(parsed.entries)) {
      if (!isHintCacheEntry(entry)) {
        continue;
      }

      const trimmedValue = entry.value.trim();
      if (!trimmedValue) {
        continue;
      }

      entries[key] = {
        value: trimmedValue,
        expiresAt: entry.expiresAt,
      };
    }

    return { entries };
  } catch {
    return { entries: {} };
  }
};

const writeStorage = (entries: Record<string, HintCacheEntry>): void => {
  if (!isBrowser()) return;

  try {
    const payload: HintCacheStorageShape = { entries };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota/errors and keep in-memory cache only.
  }
};

const pruneExpiredEntries = (entries: Record<string, HintCacheEntry>): Record<string, HintCacheEntry> => {
  const currentTime = nowMs();
  const nextEntries: Record<string, HintCacheEntry> = {};

  for (const [key, entry] of Object.entries(entries)) {
    if (entry.expiresAt > currentTime && entry.value.trim()) {
      nextEntries[key] = entry;
    }
  }

  return nextEntries;
};

const updateMemoryFromStorage = (entries: Record<string, HintCacheEntry>): void => {
  hintCacheMemory.clear();
  for (const [key, value] of Object.entries(entries)) {
    hintCacheMemory.set(key, value);
  }
};

const syncHintCache = (): void => {
  try {
    const storage = readStorage();
    const pruned = pruneExpiredEntries(storage.entries);
    updateMemoryFromStorage(pruned);
    writeStorage(pruned);
  } catch {
    hintCacheMemory.clear();
    writeStorage({});
  }
};

const normalizeHistoryContext = (history: Array<{ role: 'user' | 'assistant'; content: string }>): string => {
  const tail = history.slice(-HISTORY_CONTEXT_WINDOW);
  return tail
    .map((entry) => `${entry.role}:${normalizeCacheText(entry.content)}`)
    .join('|');
};

export const isHintPrompt = (prompt: string): boolean => {
  const normalized = normalizeCacheText(prompt);
  if (!normalized) return false;

  return /\b(hint|clue|nudge|guide me|without giving( me)? the answer|step by step|next step)\b/.test(normalized);
};

export const buildChatHintCacheKey = ({ userId, prompt, history = [] }: BuildHintCacheKeyInput): string => {
  const normalizedPrompt = normalizeCacheText(prompt);
  const historySignature = normalizeHistoryContext(history);

  return [
    'chat-hint',
    userId || 'anon',
    stableHash(normalizedPrompt),
    stableHash(historySignature || 'no-history'),
  ].join(':');
};

export const getHintCacheResponse = (key: string): string | null => {
  syncHintCache();

  const entry = hintCacheMemory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    hintCacheMemory.delete(key);
    writeStorage(Object.fromEntries(hintCacheMemory.entries()));
    return null;
  }

  return entry.value;
};

export const setHintCacheResponse = (
  key: string,
  value: string,
  ttlMs: number = DEFAULT_HINT_CACHE_TTL_MS,
): void => {
  const normalizedValue = (value || '').trim();
  if (!normalizedValue) return;

  syncHintCache();

  const entry: HintCacheEntry = {
    value: normalizedValue,
    expiresAt: nowMs() + Math.max(1000, ttlMs),
  };

  hintCacheMemory.set(key, entry);
  writeStorage(Object.fromEntries(hintCacheMemory.entries()));
};

export const clearHintCache = (): void => {
  hintCacheMemory.clear();

  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore cleanup failures.
  }
};
