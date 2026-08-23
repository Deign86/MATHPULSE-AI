# GATES — Fix all anti-slop findings to zero

Status: ALL GATES CHECKED (branch `fix/anti-slop-cleanup`)

- [x] G1 oxlint reports 0 anti-slop errors repo-wide
  CHECK: npx oxlint 2>&1 | grep -c "error anti-slop"
  EXPECT: 0
  EVIDENCE: 0 (baseline was 1,708)
- [x] G2 TypeScript typecheck passes — all 108 handoff errors repaired (types only, no behavior changes)
  CHECK: npx tsc --noEmit
  EXPECT: exit code 0, no errors
  EVIDENCE: 0 errors measured after repair pass (see PLAN-antislop.md t7 for per-file notes)
- [x] G3 ESLint passes
  CHECK: npm run lint
  EXPECT: exit code 0
  EVIDENCE: exit 0, no findings (only node util._extend deprecation warning from tooling)
- [x] G4 Frontend vitest suite passes
  CHECK: npm test
  EXPECT: exit code 0
  EVIDENCE: Test Files 27 passed (27); Tests 178 passed (178). Notification test fixes:
    icon spies removed (lucide exports forwardRef objects — spyOn requires functions; real
    SVGs render fine in jsdom), delete button located by aria-label, onSnapshot spy created,
    leaked mockRejectedValue scoped with mockRejectedValueOnce.
- [x] G5 Firebase Functions build + tests pass
  CHECK: cd functions && npm run build && npm test
  EXPECT: exit code 0 for both
  EVIDENCE: build clean (tsc); tests 46 pass / 0 fail.
- [x] G6 No anti-slop rule weakened or removed in oxlint.config.ts
  CHECK: node -e "const c=require('fs').readFileSync('oxlint.config.ts','utf8'); console.log((c.match(/anti-slop\/g)||[]).length >= 15, /allowInTypeGuards/.test(c))"
  EXPECT: true true
  EVIDENCE: true true — 15 rules registered at error severity; only documented allowInTypeGuards option present.
- [x] G7 Delivered on branch `fix/anti-slop-cleanup`
  CHECK: git log --oneline -1 fix/anti-slop-cleanup
  EXPECT: this commit on the branch
  EVIDENCE: this commit

## Repair-pass conventions that kept lint + tsc green simultaneously

The anti-slop rules ban both `Record<string, T>` annotations on bindings (no-known-value-widening)
and bare casts without adjacent `// SAFETY:` lines. Working patterns established this session:

1. Literal-keyed lookup maps stay inferred; free-form-string access goes through
   `recordGet(map, key)` from `src/utils/memberOf.ts`.
2. Value-shape validation uses `satisfies Record<...>` (contextual typing, no widening flag).
3. Stub-to-realtype casts use a comparable supertype intermediate annotated with a named type
   (`Partial<Auth>` → cast to `Auth`), never `as unknown as`.
4. Lucide icon components are forwardRef objects: vi.spyOn cannot stub them; render real icons.

## Continuation notes

None blocking. Remaining optional work before merge: fresh-context reviewer pass and push/merge of
`fix/anti-slop-cleanup` into main.
