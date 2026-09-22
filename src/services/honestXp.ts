export interface HonestXpInput {
  quizScore: number;
  hintsUsed: number;
  streakDays: number;
}

function streakMultiplier(streakDays: number): number {
  if (streakDays >= 14) return 1.5;
  if (streakDays >= 7) return 1.25;
  if (streakDays >= 3) return 1.1;
  return 1.0;
}

export function computeHonestXp({ quizScore, hintsUsed, streakDays }: HonestXpInput): number {
  const rawXp = 30 + Math.round((quizScore / 100) * 50) - hintsUsed * 5;
  return Math.floor(Math.max(10, rawXp * streakMultiplier(streakDays)));
}
