// vitest.setup.ts
// Allow test files written with jest.* to work under vitest.
// Many of the existing mobile tests use jest.fn()/jest.mock() with
// ambient type declarations. We alias jest to vi at runtime so they
// can run under vitest without rewriting every test file.

import { vi } from 'vitest';

(globalThis as unknown as { jest: typeof vi }).jest = vi;
