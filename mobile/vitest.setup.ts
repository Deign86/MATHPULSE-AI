// vitest.setup.ts
// Allow test files written with jest.* to work under vitest.
// Many of the existing mobile tests use jest.fn()/jest.mock() with
// ambient type declarations. We alias jest to vi at runtime so they
// can run under vitest without rewriting every test file.

import { vi } from 'vitest';

(globalThis as unknown as { jest: typeof vi }).jest = vi;

// React 19 deprecates react-test-renderer but still works. Setting
// IS_REACT_ACT_ENVIRONMENT = true tells React that calls to act() are
// expected in this environment, suppressing the noisy warning in stderr
// (tests still pass without it, but the deprecation warning is misleading
// since MathText.test.tsx legitimately uses act() for synchronous renders).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
