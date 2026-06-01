/**
 * vitest-globals.d.ts — Minimal type declarations for Vitest globals.
 *
 * This file is a lightweight shim so that test files can reference
 * describe/it/expect/vi without importing from 'vitest' (which is
 * not yet a dependency).  Replace this file with real vitest types
 * when test infra is set up.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface VitestMockFn<Args extends readonly unknown[] = any[], Return = any> {
  (...args: Args): Return;
  mockReturnValue(value: Return): this;
  mockResolvedValue(value: Awaited<Return>): this;
  mockRejectedValue(value: unknown): this;
  mockImplementation(fn: (...args: Args) => Return): this;
  mockReturnThis(): this;
  mockClear(): this;
  mockReset(): this;
  mockRestore(): this;
  getMockName(): string;
  mock: {
    calls: Args[];
    results: { type: 'return' | 'throw'; value: unknown }[];
    lastCall: Args | undefined;
  };
  mocked: <T>(item: T) => T extends (...args: infer A) => infer R
    ? VitestMockFn<A, R>
    : never;
}

interface VitestAssertion {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveProperty(prop: string, value?: unknown): void;
  toHaveLength(length: number): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(count: number): void;
  toHaveBeenCalledWith(...args: unknown[]): void;
  toThrow(expected?: string | Error | RegExp): void;
}

interface VitestFn {
  <Args extends readonly unknown[] = any[], Return = any>(
    fn?: (...args: Args) => Return
  ): VitestMockFn<Args, Return>;
  fn<Args extends readonly unknown[] = any[], Return = any>(
    impl?: (...args: Args) => Return
  ): VitestMockFn<Args, Return>;
  mock(
    path: string,
    factory?: () => Record<string, unknown>
  ): void;
  clearAllMocks(): void;
  mocked: <T>(item: T) => T extends (...args: infer A) => infer R
    ? VitestMockFn<A, R>
    : never;
}

declare const describe: (
  name: string,
  fn: () => void
) => void;
declare const it: (
  name: string,
  fn: () => void | Promise<void>
) => void;
declare const expect: (actual: unknown) => VitestAssertion;
declare const vi: VitestFn;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const afterEach: (fn: () => void | Promise<void>) => void;
declare const beforeAll: (fn: () => void | Promise<void>) => void;
declare const afterAll: (fn: () => void | Promise<void>) => void;
