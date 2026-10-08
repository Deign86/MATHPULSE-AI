import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeAssessmentPrompt =
  'if an Initial Assessment dialog is open, close it with Escape or its close button without pressing "Skip for now" or starting the assessment; otherwise do nothing';
const lockedReason = 'a teacher locked Avatar Studio (cosmetic_shop) for this student account';

describe('student avatar studio', { tags: ['student', 'avatar-studio'], timeout: 180_000 }, () => {
  test('the wardrobe tabs switch the shelf between Tops, Bottoms, Shoes, Accessories and Exclusive', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/avatar');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeAssessmentPrompt);
    const locked = screen.getByText('Avatar Studio Locked');
    await expect.poll(async () => (await screen.getByRole('tab', 'Tops').isVisible()) || (await locked.isVisible()), { timeout: 30_000 }).toBe(true);
    test.skip(await locked.isVisible(), lockedReason);

    await expect(screen.getByText('Live Hologram Stage')).toBeVisible();
    await expect(screen.getByRole('button', 'Surprise Outfit')).toBeVisible();
    await expect(screen.getByRole('tab', 'Tops')).toBeSelected();
    const tops = screen.getByRole('tabpanel', 'Tops');
    await expect(tops.getByRole('button', /Blue Uniform$/)).toBeVisible();
    await expect(tops.getByRole('button', /Pink Uniform$/)).toBeVisible();
    await expect(tops.getByRole('button', /Brown Vest$/)).toBeVisible();

    await screen.getByRole('tab', 'Bottoms').tap();
    await expect(screen.getByRole('tab', 'Bottoms')).toBeSelected();
    await expect(screen.getByRole('tabpanel', 'Bottoms').getByRole('button', /Black Pants$/)).toBeVisible();
    await expect(screen.getByRole('tabpanel', 'Tops')).toBeHidden();

    await screen.getByRole('tab', 'Shoes').tap();
    await expect(screen.getByRole('tab', 'Shoes')).toBeSelected();
    const shoes = screen.getByRole('tabpanel', 'Shoes');
    await expect(shoes.getByRole('button', /Black Shoes$/)).toBeVisible();
    await expect(shoes.getByRole('button', /Slippers$/)).toBeVisible();

    await screen.getByRole('tab', 'Accessories').tap();
    await expect(screen.getByRole('tab', 'Accessories')).toBeSelected();
    const accessories = screen.getByRole('tabpanel', 'Accessories');
    await expect(accessories.getByRole('button', /Leaf Clip$/)).toBeVisible();
    await expect(accessories.getByRole('button', /Blue Cap$/)).toBeVisible();
    await expect(accessories.getByRole('button', /Red Cap$/)).toBeVisible();
    await expect(accessories.getByRole('button', /Traffic Cone$/)).toBeVisible();

    await screen.getByRole('tab', 'Exclusive').tap();
    await expect(screen.getByRole('tab', 'Exclusive')).toBeSelected();
    const exclusive = screen.getByRole('tabpanel', 'Exclusive');
    await expect(exclusive.getByRole('button', /Gold Crown$/)).toBeVisible();
    await expect(exclusive.getByRole('button', /Naruto Set$/)).toBeVisible();
    await expect(exclusive.getByRole('button', 'Preview Set')).toBeVisible();

    await expect(screen.getByRole('button', 'RESET AVATAR')).toBeDisabled();
    await expect(screen.getByRole('button', 'SAVE CHANGES')).toBeDisabled();
  });

  test('Preview Set tries on the Naruto Set for three seconds, then reverts without buying or saving', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/avatar');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeAssessmentPrompt);
    const locked = screen.getByText('Avatar Studio Locked');
    await expect.poll(async () => (await screen.getByRole('tab', 'Tops').isVisible()) || (await locked.isVisible()), { timeout: 30_000 }).toBe(true);
    test.skip(await locked.isVisible(), lockedReason);

    await screen.getByRole('tab', 'Exclusive').tap();
    const previewSet = screen.getByRole('tabpanel', 'Exclusive').getByRole('button', 'Preview Set');
    await expect(previewSet).toBeEnabled();
    await previewSet.tap();

    await expect(previewSet).toBeDisabled();
    await expect(screen.getByText('Preview only!', { visible: true })).toBeVisible();
    await expect(screen.getByRole('button', 'SAVE CHANGES')).toBeDisabled();

    await expect(previewSet).toBeEnabled({ timeout: 10_000 });
    await expect(screen.getByRole('button', 'RESET AVATAR')).toBeDisabled();
    await expect(screen.getByRole('button', 'SAVE CHANGES')).toBeDisabled();
  });

  test('equipping a free top during a Gold Crown preview ends the preview and takes the crown off', { session: 'student', tags: ['known-bug'] }, async ({ app, agent, screen }) => {
    await app.open('/avatar');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeAssessmentPrompt);
    const locked = screen.getByText('Avatar Studio Locked');
    await expect.poll(async () => (await screen.getByRole('tab', 'Tops').isVisible()) || (await locked.isVisible()), { timeout: 30_000 }).toBe(true);
    test.skip(await locked.isVisible(), lockedReason);

    await screen.getByRole('tab', 'Exclusive').tap();
    const exclusive = screen.getByRole('tabpanel', 'Exclusive');
    await expect(exclusive.getByRole('button', 'Preview Set')).toBeVisible();
    const crownPreview = exclusive.getByRole('button', 'Preview');
    test.skip(await crownPreview.isHidden(), 'this student already owns the Gold Crown, so it has no Preview button');

    await crownPreview.tap();
    await screen.getByRole('tab', 'Tops').tap();
    await screen.getByRole('tabpanel', 'Tops').getByRole('button', /Blue Uniform$/).tap();

    await screen.getByRole('tab', 'Exclusive').tap();
    await expect(exclusive.getByRole('button', 'Gold Crown')).toBeVisible({ timeout: 10_000 });
  });

  test('Preview tries on the Gold Crown for three seconds, then takes it off without buying or saving', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/avatar');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeAssessmentPrompt);
    const locked = screen.getByText('Avatar Studio Locked');
    await expect.poll(async () => (await screen.getByRole('tab', 'Tops').isVisible()) || (await locked.isVisible()), { timeout: 30_000 }).toBe(true);
    test.skip(await locked.isVisible(), lockedReason);

    await screen.getByRole('tab', 'Exclusive').tap();
    const exclusive = screen.getByRole('tabpanel', 'Exclusive');
    const crownPreview = exclusive.getByRole('button', 'Preview');
    test.skip(await crownPreview.isHidden(), 'this student already owns the Gold Crown, so it has no Preview button');

    await crownPreview.tap();
    await expect(exclusive.getByRole('button', 'Preview Gold Crown')).toBeVisible();
    await expect(crownPreview).toBeDisabled();
    await expect(screen.getByRole('button', 'SAVE CHANGES')).toBeDisabled();

    await expect(exclusive.getByRole('button', 'Gold Crown')).toBeVisible({ timeout: 10_000 });
    await expect(crownPreview).toBeEnabled();
    await expect(screen.getByRole('button', 'RESET AVATAR')).toBeDisabled();
    await expect(screen.getByRole('button', 'SAVE CHANGES')).toBeDisabled();
  });

  test('Surprise Outfit randomizes the look and RESET AVATAR reverts any unsaved change', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/avatar');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeAssessmentPrompt);
    const locked = screen.getByText('Avatar Studio Locked');
    await expect.poll(async () => (await screen.getByRole('tab', 'Tops').isVisible()) || (await locked.isVisible()), { timeout: 30_000 }).toBe(true);
    test.skip(await locked.isVisible(), lockedReason);

    const surpriseOutfit = screen.getByRole('button', 'Surprise Outfit');
    const resetAvatar = screen.getByRole('button', 'RESET AVATAR');
    await surpriseOutfit.tap();
    await expect(screen.getByText(/^Surprise look!/, { visible: true })).toBeVisible();

    // A shuffle can land on the saved outfit, so shuffle again until it differs.
    for (let attempt = 0; attempt < 5 && (await resetAvatar.isDisabled()); attempt += 1) {
      await surpriseOutfit.tap();
    }
    await expect(resetAvatar).toBeEnabled();
    await expect(screen.getByRole('button', 'SAVE CHANGES')).toBeEnabled();

    await resetAvatar.tap();
    await expect(screen.getByText('Reverted to saved avatar.')).toBeVisible();
    await expect(resetAvatar).toBeDisabled();
    await expect(screen.getByRole('button', 'SAVE CHANGES')).toBeDisabled();
  });

  test('equipping a free item enables RESET AVATAR, which restores the saved outfit', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/avatar');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeAssessmentPrompt);
    const locked = screen.getByText('Avatar Studio Locked');
    await expect.poll(async () => (await screen.getByRole('tab', 'Tops').isVisible()) || (await locked.isVisible()), { timeout: 30_000 }).toBe(true);
    test.skip(await locked.isVisible(), lockedReason);

    await screen.getByRole('tab', 'Accessories').tap();
    await screen.getByRole('tabpanel', 'Accessories').getByRole('button', /Leaf Clip$/).tap();
    await expect(screen.getByRole('button', 'RESET AVATAR')).toBeEnabled();
    await expect(screen.getByRole('button', 'SAVE CHANGES')).toBeEnabled();

    await screen.getByRole('button', 'RESET AVATAR').tap();
    await expect(screen.getByText('Reverted to saved avatar.')).toBeVisible();
    await expect(screen.getByRole('button', 'RESET AVATAR')).toBeDisabled();
    await expect(screen.getByRole('button', 'SAVE CHANGES')).toBeDisabled();
  });

  test('leaving with an unsaved outfit opens the guard: X stays on the studio, Exit anyway discards and leaves', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/avatar');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeAssessmentPrompt);
    const locked = screen.getByText('Avatar Studio Locked');
    await expect.poll(async () => (await screen.getByRole('tab', 'Tops').isVisible()) || (await locked.isVisible()), { timeout: 30_000 }).toBe(true);
    test.skip(await locked.isVisible(), lockedReason);

    await screen.getByRole('tab', 'Accessories').tap();
    await screen.getByRole('tabpanel', 'Accessories').getByRole('button', /Leaf Clip$/).tap();
    await expect(screen.getByRole('button', 'RESET AVATAR')).toBeEnabled();

    const guardHeading = screen.getByRole('heading', 'You have unsaved changes in Avatar Studio');
    await screen.getByRole('button', 'Dashboard').tap();
    await expect(guardHeading).toBeVisible();
    await expect(screen.getByText('Would you like to save your new outfit before leaving?')).toBeVisible();
    await expect(screen.getByRole('button', 'Save and continue')).toBeVisible();
    await expect(screen.getByRole('button', 'Exit anyway')).toBeVisible();

    // The guard's X button has no accessible name, so it is found as the button just before the heading.
    await browser.locator('//h3[normalize-space()="You have unsaved changes in Avatar Studio"]/preceding-sibling::button').tap();
    await expect(guardHeading).toBeHidden();
    await expect(screen.getByRole('tab', 'Accessories')).toBeSelected();
    await expect(screen.getByRole('button', 'RESET AVATAR')).toBeEnabled();
    await expect(browser).toHaveURL('/avatar');

    await screen.getByRole('button', 'Dashboard').tap();
    await expect(guardHeading).toBeVisible();
    await screen.getByRole('button', 'Exit anyway').tap();
    await expect(browser).toHaveURL('/');
    await expect(guardHeading).toBeHidden();
    await expect(screen.getByRole('tab', 'Accessories')).toBeHidden();

    await screen.getByRole('button', 'Avatar Studio').tap();
    await expect(screen.getByRole('tab', 'Tops')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'RESET AVATAR')).toBeDisabled();
    await screen.getByRole('button', 'Dashboard').tap();
    await expect(browser).toHaveURL('/');
    await expect(guardHeading).toBeHidden();
  });

  test('Alt+D after reaching Avatar Studio from the sidebar still asks before dropping an unsaved outfit', { session: 'student', tags: ['known-bug'] }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeAssessmentPrompt);
    await expect(screen.getByRole('button', 'Avatar Studio')).toBeVisible();

    await screen.getByRole('button', 'Avatar Studio').tap();
    const locked = screen.getByText('Avatar Studio Locked');
    await expect.poll(async () => (await screen.getByRole('tab', 'Tops').isVisible()) || (await locked.isVisible()), { timeout: 30_000 }).toBe(true);
    test.skip(await locked.isVisible(), lockedReason);
    await expect(browser).toHaveURL('/avatar');

    await screen.getByRole('tab', 'Accessories').tap();
    const leafClip = screen.getByRole('tabpanel', 'Accessories').getByRole('button', /Leaf Clip$/);
    await leafClip.tap();
    await expect(screen.getByRole('button', 'RESET AVATAR')).toBeEnabled();

    const guardHeading = screen.getByRole('heading', 'You have unsaved changes in Avatar Studio');
    await leafClip.press('Alt+d');
    await expect(guardHeading).toBeVisible();
    await expect(browser).toHaveURL('/avatar');

    await screen.getByRole('button', 'Exit anyway').tap();
    await expect(browser).toHaveURL('/');
  });
});
