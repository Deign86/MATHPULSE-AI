import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('student quiz battle', { tags: ['student', 'quiz-battle'] }, () => {
  test('battle sound switch hides the volume slider and both settings survive a reload', { session: 'student', timeout: 180_000 }, async ({ app, agent, screen, browser }) => {
    await app.open('/battle');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

    await screen.getByRole('button', /^VS Bot/).tap();
    await expect(screen.getByText('Battle Sound FX')).toBeVisible();
    const soundSwitch = screen.getByRole('switch');
    const volume = screen.getByRole('slider', 'Battle sound volume');
    if (!(await soundSwitch.isChecked())) {
      await soundSwitch.tap();
    }
    await expect(soundSwitch).toBeChecked();
    await expect(volume).toBeVisible();

    await volume.press('Home');
    await expect(volume).toHaveValue('0');
    await expect(screen.getByText('0%')).toBeVisible();
    await volume.press('End');
    await expect(volume).toHaveValue('100');
    await expect(screen.getByText('100%')).toBeVisible();

    await soundSwitch.tap();
    await expect(soundSwitch).toBeChecked({ checked: false });
    await expect(volume).toBeHidden();

    await browser.reload();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
    await screen.getByRole('button', /^VS Bot/).tap();
    await expect(soundSwitch).toBeChecked({ checked: false });
    await expect(volume).toBeHidden();

    await soundSwitch.tap();
    await expect(soundSwitch).toBeChecked();
    await expect(volume).toHaveValue('100');

    await screen.getByRole('button', 'Back to Arena Hub').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
  });

  test('Match History lists match logs and the outcome filters narrow the list', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/battle');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

    await screen.getByRole('button', 'View All →').tap();
    await expect(screen.getByRole('heading', 'Match History')).toBeVisible();
    await expect(screen.getByText('Match Logs')).toBeVisible();
    await expect(screen.getByText(/^\d+ Matches Played$/)).toBeVisible();
    for (const pill of [/^All \(\d+\)$/, /^VS Players \(\d+\)$/, /^VS Bot \(\d+\)$/, /^Wins \(\d+\)$/, /^Losses \(\d+\)$/]) {
      await expect(screen.getByRole('button', pill)).toBeVisible();
    }
    const emptyFilter = screen.getByRole('heading', 'No Matches in This Filter');

    await screen.getByRole('button', /^Wins \(\d+\)$/).tap();
    await expect
      .poll(async () => (await emptyFilter.count()) + (await screen.getByText('VICTORY').count()), { timeout: 15_000 })
      .toBeGreaterThan(0);
    await expect(screen.getByText('DEFEAT')).toHaveCount(0);
    await expect(screen.getByText('DRAW')).toHaveCount(0);

    await screen.getByRole('button', /^Losses \(\d+\)$/).tap();
    await expect
      .poll(async () => (await emptyFilter.count()) + (await screen.getByText('DEFEAT').count()), { timeout: 15_000 })
      .toBeGreaterThan(0);
    await expect(screen.getByText('VICTORY')).toHaveCount(0);
    await expect(screen.getByText('DRAW')).toHaveCount(0);

    await screen.getByRole('button', /^VS Bot \(\d+\)$/).tap();
    await expect
      .poll(async () => (await emptyFilter.count()) + (await screen.getByText('Practice Bot').count()), { timeout: 15_000 })
      .toBeGreaterThan(0);
    // The header's own 1v1 Match button is the one match, so no VS Player entry is listed.
    await expect(screen.getByText('1v1 Match')).toHaveCount(1);

    await screen.getByRole('button', /^All \(\d+\)$/).tap();
    const rematch = screen.getByRole('button', 'Rematch');
    const playNow = screen.getByRole('button', 'Play a Match Now');
    await expect
      .poll(async () => (await rematch.count()) + (await playNow.count()), { timeout: 15_000 })
      .toBeGreaterThan(0);
    if ((await rematch.count()) > 0) {
      await rematch.first().tap();
    } else {
      await playNow.tap();
    }
    await expect(screen.getByRole('button', 'Start Battle')).toBeVisible();

    await screen.getByRole('button', 'Back to Arena Hub').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
  });

  test('My Stats opens Player Stats with the combat record and badges', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/battle');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

    await screen.getByRole('button', 'View Stats →').tap();
    await expect(screen.getByText('Player Stats')).toBeVisible();
    await expect(screen.getByRole('heading', /^combat record$/i)).toBeVisible();
    await expect(screen.getByText(/^\d+W - \d+L$/)).toBeVisible();
    await expect(screen.getByText(/^\d+ Total Matches$/)).toBeVisible();
    await expect(screen.getByRole('heading', /^badges$/i)).toBeVisible();
    await expect(screen.getByText(/^[0-4] \/ 4 Unlocked$/)).toBeVisible();
    for (const badge of ['Lightning Reflexes', 'Win Streak Master', 'Math Marksman', 'Match Veteran']) {
      await expect(screen.getByText(badge)).toBeVisible();
    }

    await screen.getByRole('button', 'Practice Bot').tap();
    await expect(screen.getByRole('button', 'Start Battle')).toContainText(/start bot battle/i);
    await expect(screen.getByText('AI Opponent')).toBeVisible();

    await screen.getByRole('button', 'Back to Arena Hub').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
    await screen.getByRole('button', 'View Stats →').tap();
    await expect(screen.getByText('Player Stats')).toBeVisible();
    await screen.getByRole('button', 'Back to Arena Hub').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
  });

  test('Hall of Fame shows Arena Standings, the time pills, and the duel shortcuts', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/battle');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
    await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

    await screen.getByRole('heading', 'Hall of Fame').tap();
    const hallOfFame = screen.getByRole('heading', 'Hall of Fame', { level: 1 });
    await expect(hallOfFame).toBeVisible();
    await expect(screen.getByText('Battle Arena Champions')).toBeVisible();
    await expect(screen.getByRole('heading', 'Arena Standings')).toBeVisible();
    await expect(screen.getByText('Senior High STEM Duelists')).toBeVisible();
    await expect(screen.getByText(/^\d+ Duelists$/)).toBeVisible();
    await expect(screen.getByText(/^#\d+$/)).toBeVisible();
    await expect(screen.getByRole('button', 'Battle')).toBeVisible();

    const allTime = screen.getByRole('button', 'All Time');
    const seasonOne = screen.getByRole('button', 'Season 1');
    await expect(browser).toHaveClass(allTime, /from-amber-400/);
    await seasonOne.tap();
    await expect(browser).toHaveClass(seasonOne, /from-amber-400/);
    await expect(browser).not.toHaveClass(allTime, /from-amber-400/);
    await allTime.tap();
    await expect(browser).toHaveClass(allTime, /from-amber-400/);

    await screen.getByRole('button', 'Practice Bot').tap();
    await expect(screen.getByRole('button', 'Start Battle')).toContainText(/start bot battle/i);
    await screen.getByRole('button', 'Back to Arena Hub').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

    await screen.getByRole('heading', 'Hall of Fame').tap();
    await expect(hallOfFame).toBeVisible();
    await screen.getByRole('button', 'Enter Duel').tap();
    await expect(screen.getByText('Matchmaking Mode')).toBeVisible();
    await expect(screen.getByRole('button', 'Start Battle')).toContainText(/find duel opponent|host duel room/i);
    await screen.getByRole('button', 'Back to Arena Hub').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

    await screen.getByRole('heading', 'Hall of Fame').tap();
    await expect(hallOfFame).toBeVisible();
    await screen.getByRole('button', 'Back to Hub').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();
  });

  // Quiz Battle resumes any live match, room, or queue of the signed-in account on mount.
  // These tests start or hold one, so they use their own account and run in order; on the
  // shared student they would hijack every other Quiz Battle test running in parallel.
  describe('live battle sessions', { serial: true, session: 'student2', tags: ['live-match'] }, () => {
    test('VS Bot battle plays every round, shows the results, and returns to the hub', { timeout: 240_000 }, async ({ app, agent, screen }) => {
      await app.open('/battle');
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
      await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

      await screen.getByRole('button', /^VS Bot/).tap();
      const start = screen.getByRole('button', 'Start Battle');
      await expect(start).toContainText(/start bot battle/i);
      await expect(screen.getByText('AI Opponent')).toBeVisible();
      await expect(screen.getByRole('heading', 'Tactician Bot')).toBeVisible();

      await screen.getByRole('button', /^Easy/).tap();
      await expect(screen.getByRole('heading', 'Recruit Bot')).toBeVisible();
      await screen.getByRole('button', '3 Qs').tap();
      await screen.getByRole('button', '20s').tap();
      await expect(screen.getByText('3 Rounds • 20s Blitz')).toBeVisible();

      await start.tap();
      await expect(screen.getByRole('button', 'Leave battle')).toBeVisible({ timeout: 60_000 });
      for (const round of [1, 2, 3]) {
        await expect(screen.getByText(`${round} / 3`)).toBeVisible({ timeout: 45_000 });
        await screen.getByRole('button', /^A/).tap();
      }

      await expect(screen.getByRole('heading', /^(victory!|defeat|draw match)$/i)).toBeVisible({ timeout: 45_000 });
      await expect(screen.getByText(/^final score: \d+ - \d+$/i)).toBeVisible();
      await expect(screen.getByRole('heading', /^battle score$/i)).toBeVisible();
      await expect(screen.getByRole('heading', /^match reward$/i)).toBeVisible();
      await expect(screen.getByText(/^(Victory|Draw|Participation) Reward$/)).toBeVisible({ timeout: 10_000 });
      await expect(screen.getByRole('button', 'REMATCH')).toBeVisible();

      await screen.getByRole('button', 'BACK TO ARENA').tap();
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 15_000 });
      await expect(screen.getByRole('button', 'Leave battle')).toBeHidden();
      await expect(screen.getByRole('button', /^VS Bot/)).toBeVisible();
    });

    test('Leave during a bot battle asks first, Keep playing resumes, and Leave forfeits', { timeout: 180_000 }, async ({ app, agent, screen }) => {
      await app.open('/battle');
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
      await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

      await screen.getByRole('button', /^VS Bot/).tap();
      await screen.getByRole('button', '3 Qs').tap();
      const start = screen.getByRole('button', 'Start Battle');
      await expect(start).toContainText(/start bot battle/i);
      await start.tap();
      await expect(screen.getByRole('button', 'Leave battle')).toBeVisible({ timeout: 60_000 });
      await expect(screen.getByText(/^[1-3] \/ 3$/)).toBeVisible({ timeout: 30_000 });

      await screen.getByRole('button', 'Leave battle').tap();
      const leaveDialog = screen.getByRole('alertdialog', 'Leave battle?');
      await expect(leaveDialog).toBeVisible();
      await expect(leaveDialog.getByText('This counts as a loss.')).toBeVisible();
      await leaveDialog.getByRole('button', 'Keep playing').tap();
      await expect(leaveDialog).toBeHidden();
      await expect(screen.getByRole('button', 'Leave battle')).toBeVisible();

      await screen.getByRole('button', 'Leave battle').tap();
      await expect(leaveDialog).toBeVisible();
      await leaveDialog.getByRole('button', 'Leave').tap();
      await expect(screen.getByText('You left the battle.')).toBeVisible({ timeout: 45_000 });
      await expect(screen.getByRole('button', 'Leave battle')).toBeHidden();
      await expect(start).toBeEnabled();
      await expect(start).toContainText(/start bot battle/i);
    });

    test('VS Player private room shows a room code and Cancel Room closes it', { timeout: 150_000 }, async ({ app, agent, screen }) => {
      await app.open('/battle');
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
      await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

      await screen.getByRole('button', /^VS Player/).tap();
      const start = screen.getByRole('button', 'Start Battle');
      await expect(start).toContainText(/find duel opponent/i);
      await expect(screen.getByText('Matchmaking Mode')).toBeVisible();
      await expect(screen.getByRole('heading', 'Live Challenger')).toBeVisible();
      await expect(screen.getByRole('button', /^Public Queue/)).toBeVisible();

      await screen.getByRole('button', /^Private Room/).tap();
      await expect(screen.getByRole('heading', 'Classmate Room')).toBeVisible();
      const roomCode = screen.getByPlaceholder('Leave blank to create new room');
      await expect(roomCode).toHaveValue('');
      await expect(start).toContainText(/host duel room/i);

      await roomCode.fill('ab12c9');
      await expect(roomCode).toHaveValue('AB12C9');
      await expect(start).toContainText(/join duel room/i);
      await roomCode.clear();
      await expect(roomCode).toHaveValue('');
      await expect(start).toContainText(/host duel room/i);

      const cancelRoom = screen.getByRole('button', 'Cancel Room');
      try {
        await start.tap();
        await expect(screen.getByText('Private room created. Share code:')).toBeVisible({ timeout: 45_000 });
        await expect(screen.getByRole('button', /^code: \S+$/i)).toBeVisible();
        await expect(start).toBeDisabled();
        await cancelRoom.tap();
        await expect(screen.getByText('Private room cancelled.')).toBeVisible({ timeout: 30_000 });
        await expect(cancelRoom).toBeHidden();
        await expect(start).toBeEnabled();
      } finally {
        if (await cancelRoom.isVisible()) {
          await cancelRoom.tap();
        }
      }
    });

    test('Practice Bot after looking at a Private Room still starts a bot battle', { timeout: 180_000, tags: ['known-bug'] }, async ({ app, agent, screen }) => {
      await app.open('/battle');
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 45_000 });
      await agent.act('if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing');
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

      await screen.getByRole('button', /^VS Player/).tap();
      await screen.getByRole('button', /^Private Room/).tap();
      await expect(screen.getByRole('heading', 'Classmate Room')).toBeVisible();
      await screen.getByRole('button', 'Back to Arena Hub').tap();
      await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible();

      await screen.getByRole('button', 'View Stats →').tap();
      await screen.getByRole('button', 'Practice Bot').tap();
      const start = screen.getByRole('button', 'Start Battle');
      await expect(start).toContainText(/start bot battle/i);
      await screen.getByRole('button', '3 Qs').tap();
      await start.tap();
      await expect(screen.getByText('Fix the highlighted setup fields before starting.')).toBeHidden();
      await expect(screen.getByRole('button', 'Leave battle')).toBeVisible({ timeout: 60_000 });

      await screen.getByRole('button', 'Leave battle').tap();
      const leaveDialog = screen.getByRole('alertdialog', 'Leave battle?');
      await leaveDialog.getByRole('button', 'Leave').tap();
      await expect(screen.getByText('You left the battle.')).toBeVisible({ timeout: 45_000 });
    });
  });
});
