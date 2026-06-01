// No backend gamification endpoints exist. All methods are stubs
// that log a warning and return safe defaults so screens still render.
// Screens have MOCK_WEEKLY / MOCK_LEADERS fallbacks when these return empty.

export async function addXP(
  _amount: number,
  _userId: string,
  _token?: string,
): Promise<{ newTotal: number; leveledUp: boolean }> {
  console.warn('[gamificationService.addXP] Backend endpoint not yet implemented; returning default');
  return { newTotal: 0, leveledUp: false };
}

export async function getLeaderboard(
  _period?: 'weekly' | 'monthly' | 'all',
): Promise<any[]> {
  console.warn('[gamificationService.getLeaderboard] Backend endpoint not yet implemented; returning empty result');
  return [];
}

export async function claimDailyReward(
  _userId: string,
  _dayIndex: number,
  _token?: string,
): Promise<{ reward: any; claimed: boolean }> {
  console.warn('[gamificationService.claimDailyReward] Backend endpoint not yet implemented; returning default');
  return { reward: null, claimed: false };
}
