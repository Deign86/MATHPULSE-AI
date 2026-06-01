/* eslint-disable @typescript-eslint/no-unused-vars */

// Minimal type declarations for vitest so that test files compile
// without vitest being installed as a dependency.

type MockFn<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> =
  T & {
    mock: { calls: unknown[][]; results: unknown[] };
    mockResolvedValue: (value: unknown) => T;
    mockImplementation: (impl: (...args: unknown[]) => unknown) => T;
    mockReturnValue: (value: unknown) => T;
  };

interface VitestMatchers<T> {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toStrictEqual(expected: unknown): void;
  toBeDefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(item: unknown): void;
  toHaveLength(length: number): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(count: number): void;
  toHaveBeenCalledWith(...args: unknown[]): void;
  toHaveReturned(): void;
  toHaveReturnedWith(value: unknown): void;
  toThrow(expected?: string | Error): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toMatch(expected: string | RegExp): void;
  toMatchObject(expected: Record<string, unknown>): void;
  resolves: Omit<VitestMatchers<T>, 'resolves' | 'rejects'>;
  rejects: Omit<VitestMatchers<T>, 'resolves' | 'rejects'>;
}

interface VitestExpect {
  <T>(actual: T): VitestMatchers<T>;
}

interface VitestObject {
  fn: <T extends (...args: unknown[]) => unknown>(
    impl?: T,
  ) => MockFn<T>;
  mock: (path: string, factory?: () => unknown) => void;
  clearAllMocks: () => void;
  resetAllMocks: () => void;
  restoreAllMocks: () => void;
}

declare module 'vitest' {
  export function describe(name: string, fn: () => void): void;
  export function it(
    name: string,
    fn: (ctx?: Record<string, unknown>) => void | Promise<void>,
    timeout?: number,
  ): void;
  export function test(
    name: string,
    fn: (ctx?: Record<string, unknown>) => void | Promise<void>,
    timeout?: number,
  ): void;
  export const expect: VitestExpect;
  export const vi: VitestObject;
  export function beforeEach(fn: () => void): void;
  export function afterEach(fn: () => void): void;
  export function beforeAll(fn: () => void): void;
  export function afterAll(fn: () => void): void;
}
