# MathPulse AI — Quiz UI Fixes & Feature Completions
**Reference Document for AI Agent Implementation — v4**
> Last updated: 2026-05-04

---

## ⚠️ Critical Ground Rules for AI Agent

> **BOTH quiz pages must receive every fix listed here unless a fix is explicitly marked as single-file.**
> The two quiz pages are:
> - `src/components/QuizExperience.tsx` — Practice Center quiz
> - `src/components/InteractiveLesson.tsx` — Module quiz
>
> Fixes that say "InteractiveLesson.tsx" alone are specific to module quizzes.
> Fixes that say "Both quiz pages" mean BOTH files must be edited.

---

## Affected Files

| File | Role |
|---|---|
| `src/components/QuizExperience.tsx` | Practice Center quiz interface |
| `src/components/InteractiveLesson.tsx` | Module quiz interface |
| `src/components/LivePopup.tsx` | Achievement popup (shared, used by both quiz pages) |

---

## Fix 1 — Footer Visibility: Hint / Calculator Buttons Off-Screen

**Applies to:** `QuizExperience.tsx` only

**Root Cause:** `<main>` has `min-h-[500px]`. In a `flex flex-col h-screen` layout, this overflows the viewport and pushes the sticky footer off-screen. In fullscreen mode the viewport becomes tall enough for the footer to reappear — hence "only visible in fullscreen."

**Fix:**
- Remove `min-h-[500px]` from the `<main>` element.
- Keep outer wrapper: `fixed inset-0 flex flex-col overflow-hidden`.
- `<main>` must be exactly: `flex-1 overflow-y-auto` — no min-height.

---

## Fix 2 — Calculator Popup Completely Invisible (Both Quiz Pages)

**Applies to:** `QuizExperience.tsx` AND `InteractiveLesson.tsx`

**Root Cause (this must be understood clearly before touching the code):**

The calculator popup has `z-[9999]` but it is declared **inside** `<main className="... z-10">`. When an element has a `z-index` or `transform` or `opacity` applied, it creates a new CSS **stacking context**. A `position: fixed` child inside a stacking context does NOT escape to the root — it is clipped to the parent's stacking level. Since `<main z-10>` is lower than `<header z-[60]>` and `<footer z-[60]>`, the calculator always renders behind them — making it appear invisible.

**The ONLY correct fix:** Move the calculator popup **entirely outside** the `<div className="fixed inset-0 z-[100]...">` wrapper and render it via `createPortal` to `document.getElementById('modal-root')`. This is the same pattern already used for the quiz results modal in `QuizExperience.tsx`.

**Implementation steps (apply identically to BOTH files):**
1. Create a `calculatorPortal` variable using `createPortal`.
2. Return it alongside the main JSX (not nested inside it).
3. Set the portaled calculator wrapper to `fixed z-[9999]` with desired positioning.
4. The calculator toggle button in the footer can stay where it is — only the popup rendering moves.

```tsx
// OUTSIDE the main quiz wrapper div — render alongside it:
const calculatorPortal = showCalculator
  ? createPortal(
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
      >
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-sm font-bold text-[#0a1628] flex items-center gap-2">
              <Calculator size={16} className="text-purple-600" /> Calculator
            </h4>
            <button onClick={() => setShowCalculator(false)} ...><X size={16} /></button>
          </div>
          <ScientificCalculator isOpen={true} onClose={() => setShowCalculator(false)} inline />
        </div>
      </motion.div>,
      document.getElementById('modal-root')!
    )
  : null;

// In the return:
return (
  <>
    {calculatorPortal}
    <AnimatePresence>...</AnimatePresence>
    <div className="fixed inset-0 z-[100] ...">
      {/* entire quiz UI — calculator toggle button stays here in footer */}
      {/* DO NOT put the calculator popup inside this div */}
    </div>
  </>
);
```

---

## Fix 3 — "Correct!" Round Popup + Streak/Multiplier Pills (Both Quiz Pages)

**Applies to:** `QuizExperience.tsx` AND `InteractiveLesson.tsx` (+ redesign `LivePopup.tsx`)

**Final design decision:** The achievement notifications (streak started, multiplier increased) do NOT appear as a separate toast or separate popup. They appear as **pill badges INSIDE the existing "CORRECT!" centered popup modal** — the same popup that shows the mascot avatar and "+10 XP".

**Reference image provided by user:** The "CORRECT!" popup shows:
- Mascot avatar at top
- "CORRECT!" headline in green
- "+10 XP" pill below

**New layout when streak/multiplier is triggered:**
```
┌──────────────────────────────────┐
│       [mascot avatar]            │
│                                  │
│          CORRECT!                │
│                                  │
│        [ + 10 XP ]               │  ← existing XP pill
│   [ 🔥 Streak Started! ]         │  ← NEW: achievement pill (if triggered)
│   [ ⚡ Multiplier ×2! ]          │  ← OR this (not both at once)
└──────────────────────────────────┘
```

**Achievement pill style:**
- Pill shape: `rounded-full px-4 py-1.5 text-sm font-bold`
- Streak pill: `bg-orange-500/20 text-orange-400 border border-orange-500/30`  — icon: 🔥 Flame
- Multiplier pill: `bg-amber-500/20 text-amber-400 border border-amber-500/30` — icon: ⚡ Zap

**Only 2 achievement triggers (remove all others):**

| Trigger | Pill Text | Icon |
|---|---|---|
| `newStreak === 2` | "Streak Started!" | 🔥 Flame |
| Multiplier becomes ×2 (`newStreak === 3, comboMultiplier < 2`) | "Multiplier ×2!" | ⚡ Zap |
| Multiplier becomes ×3 (`newStreak === 5, comboMultiplier < 3`) | "Multiplier ×3!" | ⚡ Zap |

**Remove entirely:** 'First Correct', 'Streak Milestone', 'New High Score', 'Perfect Score' triggers.

**Implementation approach:**
- Add state: `const [achievementPill, setAchievementPill] = useState<'streak' | 'multiplier2' | 'multiplier3' | null>(null)`
- Set `achievementPill` when the correct trigger condition is met (inside `handleSubmitAnswer` / `handleAnswer`).
- Clear it when the popup auto-closes (in the `setTimeout` that calls `handleNextQuestion`/`handleNext`).
- Inside the `showRoundResult` popup JSX, conditionally render the achievement pill below the XP pill.
- **`LivePopup.tsx` is no longer needed** — it can be removed entirely or left as an empty stub. All achievement display is now inside `showRoundResult`.

**Popup auto-dismiss timing:** The `showRoundResult` popup already dismisses in ~1.5s before auto-advancing. Keep this timing.

**Applies to both quiz files:**

| File | Current State | Required Action |
|---|---|---|
| `QuizExperience.tsx` | ✅ Has `showRoundResult` popup, uses `LivePopup` separately | Add `achievementPill` state + pill rendering inside popup; remove `LivePopup` usage |
| `InteractiveLesson.tsx` | ✅ Has `showRoundResult` popup, does NOT use `LivePopup` | Add `achievementPill` state + pill rendering inside popup; add trigger logic |
| `LivePopup.tsx` | Separate component | Can be removed or left unused |

---

## Fix 4 — AnimatedCounter XP Build-Up (Practice Center Result Modal)

**Status: ✅ Already working.** No changes needed.

---

## Fix 5 — Module Quiz Result Modal: Apply Same Design as Practice Center

**Applies to:** `InteractiveLesson.tsx` only

**Root Cause:** `InteractiveLesson.tsx` result screen uses Trophy icon + stats grid layout — not the mascot avatar + AnimatedCounter design from `QuizExperience.tsx`.

**Fix:** Replace the entire `InteractiveLesson.tsx` result screen (`if (showResult) { return (...) }`) with:
- Render via `createPortal` to `#modal-root`
- Scrim: `fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40` (NO backdrop-blur)
- Modal: `w-full max-w-xs sm:max-w-sm bg-white border-2 border-slate-200 rounded-[2rem] p-4 sm:p-5 text-center`
- Mascot avatar with spring rotate + scale animation (matching `QuizExperience.tsx` lines 690–697)
- Result headline: `EXCELLENT!` / `GOOD JOB!` / `KEEP TRYING!` (≥80%, 50–79%, <50%)
- Subtitle: `"Quiz Complete • Score: X/Y"`
- `AnimatedCounter` for Correct Answers (delay 500ms) and Total XP (delay 800ms)
- Final Accuracy % with delayed fade-in (1200ms)
- Button: `RETAKE QUIZ` + `BACK TO MODULE` (calls `onComplete(percentage, totalXP)`)
- Extract `AnimatedCounter` to `src/components/ui/AnimatedCounter.tsx` and import in both quiz files

---

## Fix 6 — Hint: Elimination Mechanic with Correct Answer Locked

**Applies to:** `InteractiveLesson.tsx` (module quiz)

**How Hint works:**
1. Each click eliminates one **randomly selected wrong choice** (greyed out, disabled, line-through).
2. Costs 1 key per use.
3. User can keep using hints as long as keys remain.
4. User can still answer from the remaining active choices normally.

**When all wrong choices are eliminated (only correct answer remains):**
- The correct answer is **highlighted GREEN** (`bg-emerald-50 border-emerald-400 text-emerald-800`) — visually revealed.
- The correct answer button is **DISABLED** — the user **CANNOT click it** and **CANNOT earn points** from it.
- All options are disabled at this point.
- The "Next Question" button appears in the footer.
- No score is awarded for this question.

```ts
const allWrongEliminated =
  shuffledOptions.length > 0 &&
  (eliminatedByHint[currentIndex] || []).length >= shuffledOptions.length - 1;

// In options rendering:
if (allWrongEliminated) {
  if (optionText === currentQuestion.correctAnswer)
    bgColor = 'bg-emerald-50 border-emerald-400 text-emerald-800'; // green but DISABLED
  else
    bgColor = 'bg-slate-100 text-slate-400 opacity-40 line-through'; // greyed out
  // button disabled={true} in all cases when allWrongEliminated
}
```

**State tracking:**
```ts
const [eliminatedByHint, setEliminatedByHint] = useState<Record<number, string[]>>({});
```

**Remove:** Old single-use `hintsUsed[currentIndex]` flag. Replace entirely with `eliminatedByHint`.

**HINT button disabled when:** `keysCount <= 0` OR `isAnswered` OR `revealUsed[currentIndex]` OR `showExplainPanel` OR `allWrongEliminated`

---

## Fix 7 — "Next Question" Button: Precise Activation Conditions

**Applies to:** `InteractiveLesson.tsx` (module quiz)

**The button appears ONLY in these exact states:**

| Condition | Footer displays |
|---|---|
| Normal state (no special action) | `[HINT] [REVEAL] [EXPLAIN] [🔢]` |
| After REVEAL clicked | `[EXPLAIN] [Next Question →]` |
| After EXPLAIN clicked | `[Next Question →]` only |
| All wrong choices eliminated via HINT | `[Next Question →]` only |
| User exhausted all wrong attempts | `[Next Question →]` only |
| Correct answer submitted | *(round popup auto-advances — no button shown)* |
| Viewing a past question (`viewIndex < currentIndex`) | `[Ask AI to Explain 🤖]` (full-width) |

```ts
const showNextButton =
  (isAnswered && !isCorrect) ||
  revealUsed[currentIndex] ||
  showExplainPanel ||
  allWrongEliminated;
```

**Footer JSX logic:**
```tsx
{viewIndex < currentIndex ? (
  <button onClick={toggleExplainPanel}>Ask AI to Explain 🤖</button>
) : showExplainPanel ? (
  <button onClick={handleNext}>Next Question →</button>
) : revealUsed[currentIndex] ? (
  <>
    <button onClick={toggleExplainPanel}>Explain</button>
    <button onClick={handleNext}>Next Question →</button>
  </>
) : showNextButton ? (
  <button onClick={handleNext}>Next Question →</button>
) : (
  <>
    <button onClick={handleHintUse} disabled={...}>HINT</button>
    <button onClick={handleRevealUse} disabled={revealUsed[currentIndex]}>REVEAL</button>
    <button onClick={toggleExplainPanel}>EXPLAIN</button>
    <button onClick={() => setShowCalculator(p => !p)}>🔢</button>
  </>
)}
```

---

## Fix 8 — Reveal: Free, No Score Awarded

**Applies to:** `InteractiveLesson.tsx`

**Updated behavior:**
- ~~Costs 2 keys~~ → **FREE. Zero key cost.** Remove `setKeysCount(k => k - 2)`.
- **No score/XP awarded** for this question — the question is marked as bypassed.
- Correct answer is highlighted green. All wrong options are dimmed. All options disabled.
- Footer switches to `[EXPLAIN] [Next Question →]`.
- Remove `showTransientPopup('Answer Revealed')` toast — the visual reveal is self-evident.

```ts
const handleRevealUse = () => {
  if (revealUsed[currentIndex] || isAnswered || showExplainPanel) return;
  setRevealUsed(prev => ({ ...prev, [currentIndex]: true }));
  // No key deduction. No score awarded.
};
```

---

## Fix 9 — Explain: Free, No Score Awarded, Reveals Answer Simultaneously

**Applies to:** `InteractiveLesson.tsx`

**Updated behavior:**
- **FREE. Zero key cost.** No deduction of any resource.
- **No score/XP awarded** for this question — question is bypassed.
- Clicking Explain: correct answer turns green (highlighted), all wrong options dim and disable, explanation text appears below choices.
- Footer switches to `[Next Question →]` only.
- Works whether clicked before or after answering.

**Remove auto-show "Correct! [explanation]"** from the question body (the block that shows when `isCurrentlyAnswered` is true). Explanation ONLY renders when `showExplainPanel === true`.

**`showExplainPanel` drives option display (same as reveal):**
```ts
const isRevealedOrExplained = revealUsed[currentIndex] || showExplainPanel || allWrongEliminated;
// When true: highlight correct answer green, dim/disable all others
```

**Explanation panel renders below choices when `showExplainPanel` is true:**
```tsx
{showExplainPanel && (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full mt-4">
    <div className="flex items-center gap-3 mb-3">
      <img src="/mascot/modules_avatar.png" className="w-10 h-10" alt="Explain" />
      <div>
        <h3 className="font-bold text-slate-800 text-sm">Explanation</h3>
        <p className="text-xs text-slate-500">{lesson.title}</p>
      </div>
    </div>
    <div className="border-2 rounded-2xl p-4 bg-sky-50 border-sky-200">
      <p className="text-slate-700 leading-relaxed text-sm">
        {currentQuestion.explanation || `The correct answer is: ${currentQuestion.correctAnswer}`}
      </p>
    </div>
    {/* BACKEND HANDOFF NOTE:
        This is a placeholder. Backend must provide:
        - explanationText: string (markdown-supported AI explanation)
        - correctAnswerId: string (ID of correct choice)
        - optional explanationMedia: string (URL)
        The Explain button should call the AI explanation API with question context.
        Until then, `question.explanation` is used as static placeholder. */}
  </motion.div>
)}
```

---

## Fix 10 — Update Hint Icon to `quiz_key.png`

**Applies to:** `InteractiveLesson.tsx` only (`QuizExperience.tsx` already correct ✅)

Replace the inline SVG inside the Hint button:
```tsx
<img src="/icons/quiz_key.png" alt="Hint" className="w-5 h-5 object-contain" />
```

---

## New Feature — Lives Ran Out Popup (Both Quiz Pages)

**Applies to:** `QuizExperience.tsx` AND `InteractiveLesson.tsx`

**Trigger:** `heartsCount === 0` after a wrong answer is submitted.

**Behavior:**
- A modal popup immediately appears, covering the quiz.
- The quiz is effectively paused — user cannot continue answering.
- The user can choose to exit and review lessons, or wait for hearts to recover.

**Modal design:**
- Render via `createPortal` to `#modal-root`.
- Scrim: `fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50`.
- Modal: `bg-white rounded-[2rem] p-6 max-w-xs w-full text-center border-2 border-rose-200 shadow-[0_25px_60px_rgba(0,0,0,0.15)]`.

**Modal content:**
```
[💔 hearts icon — large, animated pulse]

Out of Lives!

Your hearts have run out. You can wait for them to refill
or head back and review your lessons in the meantime.

[ ❤️ 0 / 15 hearts ]

⏱ Next heart in:  [MM:SS countdown]
(15 minutes per heart)

[📚 Review Lessons]   [↩ Exit Quiz]
```

**Frontend-only timer implementation:**
```ts
const HEART_RECOVERY_MS = 15 * 60 * 1000; // 15 minutes per heart

// Track when lives ran out
const [livesRanOutAt, setLivesRanOutAt] = useState<number | null>(null);
const [showNoLivesModal, setShowNoLivesModal] = useState(false);
const [nextHeartCountdown, setNextHeartCountdown] = useState(HEART_RECOVERY_MS);

// When heartsCount hits 0:
useEffect(() => {
  if (heartsCount === 0 && !livesRanOutAt) {
    setLivesRanOutAt(Date.now());
    setShowNoLivesModal(true);
  }
}, [heartsCount]);

// Countdown timer
useEffect(() => {
  if (!showNoLivesModal || !livesRanOutAt) return;
  const interval = setInterval(() => {
    const elapsed = Date.now() - livesRanOutAt;
    const remaining = Math.max(0, HEART_RECOVERY_MS - elapsed);
    setNextHeartCountdown(remaining);
  }, 1000);
  return () => clearInterval(interval);
}, [showNoLivesModal, livesRanOutAt]);

// Format for display
const formatCountdown = (ms: number) => {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
```

**Buttons:**
- "Review Lessons" → calls `onBack()` / `onClose()` (exits quiz back to module or practice center).
- "Exit Quiz" → same, or closes entirely.

**Note:** Full heart recovery with backend persistence (Firestore timer) is a backend task. This frontend implementation shows the countdown UI only — hearts do not actually recover on the frontend without a backend call. Document this as a backend handoff.

```
// BACKEND HANDOFF NOTE:
// Heart recovery requires backend support:
// - Store timestamp of when lives ran out in Firestore under user profile.
// - On quiz load, check if enough time has passed to recover hearts.
// - Recovery rate: 1 heart per 15 minutes, up to max (15 hearts).
// - Until backend is ready, the countdown is UI-only and hearts don't actually recover.
```

---

## Summary Table (v4)

| # | Issue | File(s) | Priority |
|---|---|---|---|
| 1 | Footer off-screen (remove `min-h-[500px]`) | `QuizExperience.tsx` | 🔴 Critical |
| 2 | **Calculator invisible — portal fix (stacking context)** | `QuizExperience.tsx`, `InteractiveLesson.tsx` | 🔴 Critical |
| 3 | LivePopup: achievement pill inside "CORRECT!" popup | `QuizExperience.tsx`, `InteractiveLesson.tsx`, `LivePopup.tsx` | 🔴 Critical |
| 4 | AnimatedCounter XP build-up | — | ✅ Already working |
| 5 | Module quiz result modal (mascot + AnimatedCounter design) | `InteractiveLesson.tsx` | 🟠 High |
| 6 | Hint: elimination mechanic + correct answer locked when all wrong eliminated | `InteractiveLesson.tsx` | 🔴 Critical |
| 7 | "Next Question" precise activation conditions | `InteractiveLesson.tsx` | 🔴 Critical |
| 8 | Reveal: FREE (no key cost), no score awarded | `InteractiveLesson.tsx` | 🟠 High |
| 9 | Explain: FREE, reveals answer + explanation simultaneously, no score | `InteractiveLesson.tsx` | 🔴 Critical |
| 10 | Hint icon → `/icons/quiz_key.png` | `InteractiveLesson.tsx` | 🟡 Low |
| 11 | **Lives Ran Out popup modal with countdown timer** | `QuizExperience.tsx`, `InteractiveLesson.tsx` | 🟠 High |

---

## Z-Index Scale (Do Not Violate)

| Layer | Z-Index |
|---|---|
| Quiz wrapper | `z-[100]` |
| Header / Footer | `z-[60]` |
| Stats bar | `z-[50]` |
| Main content | `z-10` |
| Round result popup ("CORRECT!") | `z-[100]` via portal |
| No Lives popup | `z-[200]` via portal |
| Result modal (end of quiz) | `z-[200]` via portal |
| Calculator popup | `z-[9999]` via portal |

> **RULE (non-negotiable):** Every floating popup — calculator, result modal, no-lives modal, round popup — MUST be rendered via `createPortal(node, document.getElementById('modal-root'))`. Never nest them inside `<main>` or any element with a `z-index`, `transform`, or `opacity` applied. This is why the calculator is invisible — it is trapped inside a stacking context.

---

## Assets Reference

| Asset | Path | Used for |
|---|---|---|
| Hint / Keys | `/icons/quiz_key.png` | Hint button, Keys stat |
| Hearts | `/icons/quiz_heart.png` | Hearts stat, No Lives popup |
| Streak | `/icons/quiz_streak.png` | Streak stat |
| Mascot | `/mascot/modules_avatar.png` | CORRECT! popup, Explain header, Result modal |
