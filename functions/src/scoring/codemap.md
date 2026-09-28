# functions/src/scoring/

## Responsibility
Provides pure Quiz Battle round-point and match-XP calculations with caps and auditable breakdown types.

## Design
`scoringEngine.ts` computes difficulty/streak/speed awards and match XP from supplied values; it has no database or network side effects. Unit tests pin multipliers, bounds, and caps.

## Flow
Quiz Battle submission or timer resolution → `computeRoundScoreBreakdown`; completed match → `computeMatchXP` → caller persists breakdown and totals to match/stat records.

## Integration
Consumed by `triggers/quizBattleApi.ts`; uses `utils/math.clamp`. The trigger reads `quizBattleMatches` and writes match metadata plus `studentBattleStats`, `quizBattleHistory`, `studentBattleLeaderboard`, `users`, and `xpActivities`.
