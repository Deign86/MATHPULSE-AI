/**
 * @file timestamp.test.ts
 * Regression tests for issue #155: zod-cloned Firestore Timestamps crash with
 * `TypeError: this.toMillis is not a function` when `.toDate()`/`.toMillis()`
 * are invoked off a plain-object clone. The shared `toDateSafe`/`toMillisSafe`
 * boundary helpers must never call methods off clones and must never throw.
 */
import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { toDateSafe, toMillisSafe } from '../../utils/timestamp';

const FALLBACK = new Date('2000-01-01T00:00:00.000Z');

describe('toDateSafe (issue #155)', () => {
  it('converts a real Firestore Timestamp via instanceof first', () => {
    const stamp = new Timestamp(1726300000, 500000000);
    const result = toDateSafe(stamp, FALLBACK);
    expect(result.getTime()).toBe(1726300000 * 1000 + 500);
  });

  it('handles a zod-cloned plain object {seconds, nanoseconds} without throwing', () => {
    // Simulates a zod looseObject parse or JSON round-trip: prototype stripped.
    const clone = JSON.parse(JSON.stringify({ seconds: 1726300000, nanoseconds: 0 }));
    expect(() => toDateSafe(clone, FALLBACK)).not.toThrow();
    expect(toDateSafe(clone, FALLBACK).getTime()).toBe(1726300000 * 1000);
  });

  it('never invokes a detached toDate reference off a non-Timestamp clone', () => {
    // A clone that kept a detached toDate (the #155 crash shape): must use
    // the numeric path instead of calling the detached method.
    const detached = {
      seconds: 1726300000,
      nanoseconds: 0,
      toDate: Timestamp.prototype.toDate,
    };
    expect(() => toDateSafe(detached, FALLBACK)).not.toThrow();
    expect(toDateSafe(detached, FALLBACK).getTime()).toBe(1726300000 * 1000);
  });

  it('passes Date instances through', () => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    expect(toDateSafe(now, FALLBACK).getTime()).toBe(now.getTime());
  });

  it('parses localStorage ISO strings', () => {
    const iso = new Date('2026-09-20T12:00:00.000Z').toISOString();
    const roundTripped = JSON.parse(JSON.stringify({ at: iso })).at;
    expect(toDateSafe(roundTripped, FALLBACK).toISOString()).toBe(iso);
  });

  it('accepts epoch-millis numbers', () => {
    expect(toDateSafe(1726300000000, FALLBACK).getTime()).toBe(1726300000000);
  });

  it('returns fallback for null/undefined/corrupt without throwing', () => {
    for (const corrupt of [null, undefined, 'not-a-date', { foo: 'bar' }, []]) {
      expect(() => toDateSafe(corrupt, FALLBACK)).not.toThrow();
      expect(toDateSafe(corrupt, FALLBACK)).toBe(FALLBACK);
    }
  });
});

describe('toMillisSafe (issue #155)', () => {
  it('converts a real Firestore Timestamp via instanceof first', () => {
    expect(toMillisSafe(new Timestamp(1726300000, 0), -1)).toBe(1726300000 * 1000);
  });

  it('handles a zod-cloned plain object {seconds, nanoseconds} without throwing', () => {
    const clone = { seconds: 1726300000, nanoseconds: 5000000 };
    expect(() => toMillisSafe(clone, -1)).not.toThrow();
    expect(toMillisSafe(clone, -1)).toBe(1726300000 * 1000 + 5);
  });

  it('handles Date, ISO string, and millis numbers', () => {
    expect(toMillisSafe(new Date(1726300000000), -1)).toBe(1726300000000);
    expect(toMillisSafe(new Date(1726300000000).toISOString(), -1)).toBe(1726300000000);
    expect(toMillisSafe(1726300000000, -1)).toBe(1726300000000);
  });

  it('returns fallback for null/corrupt without throwing', () => {
    for (const corrupt of [null, undefined, 'nope', { nope: true }]) {
      expect(() => toMillisSafe(corrupt, -1)).not.toThrow();
      expect(toMillisSafe(corrupt, -1)).toBe(-1);
    }
  });
});
