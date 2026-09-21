import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

const secondsNanosValue = z.looseObject({
  seconds: z.number(),
  nanoseconds: z.number().optional(),
});

interface SecondsNanos {
  seconds: number;
  nanoseconds?: number;
}

const readSecondsNanos = <V>(value: V): SecondsNanos | null => {
  const parsed = secondsNanosValue.safeParse(value);
  if (!parsed.success || !Number.isFinite(parsed.data.seconds)) return null;
  const nanos = parsed.data.nanoseconds;
  if (nanos !== undefined && !Number.isFinite(nanos)) return { seconds: parsed.data.seconds };
  return { seconds: parsed.data.seconds, nanoseconds: nanos };
};

const millisFromParts = (parts: SecondsNanos): number =>
  parts.seconds * 1000 + Math.floor((parts.nanoseconds ?? 0) / 1e6);

export const toDateSafe = <V>(value: V, fallback: Date = new Date()): Date => {
  try {
    if (value === null || value === undefined) return fallback;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? fallback : value;
    }
    if (value instanceof Timestamp) return value.toDate();

    const asNumber = z.number().safeParse(value);
    if (asNumber.success) {
      if (!Number.isFinite(asNumber.data)) return fallback;
      return new Date(asNumber.data);
    }

    const asString = z.string().safeParse(value);
    if (asString.success) {
      const parsed = Date.parse(asString.data);
      return Number.isNaN(parsed) ? fallback : new Date(parsed);
    }

    const parts = readSecondsNanos(value);
    if (parts) return new Date(millisFromParts(parts));
    return fallback;
  } catch {
    return fallback;
  }
};

export const toMillisSafe = <V>(value: V, fallback = 0): number => {
  try {
    if (value === null || value === undefined) return fallback;
    if (value instanceof Date) {
      const time = value.getTime();
      return Number.isNaN(time) ? fallback : time;
    }
    if (value instanceof Timestamp) return value.toMillis();

    const asNumber = z.number().safeParse(value);
    if (asNumber.success) {
      return Number.isFinite(asNumber.data) ? asNumber.data : fallback;
    }

    const asString = z.string().safeParse(value);
    if (asString.success) {
      const parsed = Date.parse(asString.data);
      return Number.isNaN(parsed) ? fallback : parsed;
    }

    const parts = readSecondsNanos(value);
    if (parts) return millisFromParts(parts);
    return fallback;
  } catch {
    return fallback;
  }
};
