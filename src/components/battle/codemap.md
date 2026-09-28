# src/components/battle/

## Responsibility
- Small presentational parts of the live Quiz Battle experience: active-question body, opponent/status header, action footer, and timer bar.
- Files: BattleActiveContent, BattleFooter, BattleHeader, BattleTimerBar.

## Design
- Stateless or narrowly stateful pieces receive battle/question/timing values and callbacks; matchmaking and battle lifecycle remain in `QuizBattlePage` and battle hooks/services.
- Props carry opponent/player data, current question/answer state, timer progress, and action handlers (answer, quit/continue); local state is limited to transient interaction display.

## Flow
- Student joins battle via `QuizBattlePage` → RTDB matchmaking service pairs players and battle state updates → page passes current state into header/content/timer/footer → answer/action callback updates battle service → subscribed state rerenders opponent and round status.

## Integration
- Consumed by root `QuizBattlePage`; that page connects authenticated student profile/context, Quiz Battle service/hooks, Firebase Realtime Database matchmaking/room updates, and question data.
- Shared buttons/progress and other primitives come from `components/ui/`; child components do not own RTDB connections.
