import { expect, test } from '@playwright/test';
import { expectMoves, expectNoMoves, playMove } from './helpers';

test('online: two contexts stay in sync, resign + rematch swap colors', async ({ browser }) => {
  // Host creates the room (white by default).
  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const hostErrors: string[] = [];
  host.on('pageerror', (err) => hostErrors.push(err.message));
  await host.goto('/play/online');
  await host.locator('#online-name').fill('Host');
  await host.getByRole('button', { name: 'Create game & copy link' }).click();
  await host.waitForURL(/\/game\//);
  const invite =
    (await host.getByRole('textbox', { name: 'Invite link' }).getAttribute('data-invite-url')) ??
    '';

  // Guest opens the invite link in a separate context (no shared storage).
  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  const guestErrors: string[] = [];
  guest.on('pageerror', (err) => guestErrors.push(err.message));
  await guest.goto(invite);
  await guest.locator('#join-name').fill('Guest');
  await guest.getByRole('button', { name: 'Join game', exact: true }).click();

  // Both boards appear; play a couple of moves.
  await host.locator('[data-square="e2"]').waitFor();
  await guest.locator('[data-square="e2"]').waitFor();
  await playMove(host, 'e2', 'e4');
  await playMove(guest, 'e7', 'e5');
  await expectMoves(host, ['e4', 'e5']);
  await expectMoves(guest, ['e4', 'e5']);

  // Host (white) resigns: both sides see Black wins 0-1.
  await host.getByRole('button', { name: 'Resign', exact: true }).click();
  await host.getByRole('button', { name: 'Resign game', exact: true }).click();
  await expect(host.getByRole('dialog', { name: 'Black wins' })).toContainText('0-1');
  await expect(guest.getByRole('dialog', { name: 'Black wins' })).toContainText('0-1');

  // Rematch swaps colors: host goes from white to black.
  const oldRoomId = invite.split('/game/')[1] ?? '';
  await host
    .getByRole('dialog', { name: 'Black wins' })
    .getByRole('button', { name: 'Rematch' })
    .click();
  await guest.getByRole('button', { name: 'Accept rematch' }).click();
  await host.waitForURL((url) => !url.toString().includes(oldRoomId), { timeout: 20_000 });
  const newUrl = host.url();
  expect(newUrl).toMatch(/\/game\//);
  await host.locator('[data-square="e2"]').waitFor();
  await expect(host.getByLabel(/Chess board/)).toHaveAttribute('aria-label', /black at the bottom/);
  await expect(guest.getByLabel(/Chess board/)).toHaveAttribute(
    'aria-label',
    /white at the bottom/
  );

  expect(hostErrors).toEqual([]);
  expect(guestErrors).toEqual([]);
  await hostCtx.close();
  await guestCtx.close();
});

test('online: spectator joins read-only and cannot move', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  await host.goto('/play/online');
  await host.locator('#online-name').fill('Host');
  await host.getByRole('button', { name: 'Create game & copy link' }).click();
  await host.waitForURL(/\/game\//);
  const invite =
    (await host.getByRole('textbox', { name: 'Invite link' }).getAttribute('data-invite-url')) ??
    '';

  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  await guest.goto(invite);
  await guest.locator('#join-name').fill('Guest');
  await guest.getByRole('button', { name: 'Join game', exact: true }).click();
  await guest.locator('[data-square="e2"]').waitFor();

  // Third visitor becomes a spectator.
  const watchCtx = await browser.newContext();
  const watcher = await watchCtx.newPage();
  const watcherErrors: string[] = [];
  watcher.on('pageerror', (err) => watcherErrors.push(err.message));
  await watcher.goto(invite);
  await watcher.locator('#join-name').fill('Watcher');
  await watcher.getByRole('button', { name: 'Join game', exact: true }).click();
  await watcher.locator('[data-square="e2"]').waitFor();
  await expect(watcher.getByText('Spectating')).toBeVisible({ timeout: 15_000 });

  // Spectator click-click does nothing: no moves appear anywhere.
  await watcher.locator('[data-square="e2"]').click();
  await watcher.locator('[data-square="e4"]').click();
  await expectNoMoves(host);
  await expectNoMoves(guest);

  // Players can still move while the spectator watches.
  await playMove(host, 'e2', 'e4');
  await expectMoves(watcher, ['e4']);

  expect(watcherErrors).toEqual([]);
  await hostCtx.close();
  await guestCtx.close();
  await watchCtx.close();
});

test('online: disconnect shows banner; out-of-turn move is rejected', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const hostErrors: string[] = [];
  host.on('pageerror', (err) => hostErrors.push(err.message));
  await host.goto('/play/online');
  await host.locator('#online-name').fill('Host');
  await host.getByRole('button', { name: 'Create game & copy link' }).click();
  await host.waitForURL(/\/game\//);
  const invite =
    (await host.getByRole('textbox', { name: 'Invite link' }).getAttribute('data-invite-url')) ??
    '';

  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  await guest.goto(invite);
  await guest.locator('#join-name').fill('Guest');
  await guest.getByRole('button', { name: 'Join game', exact: true }).click();
  await host.locator('[data-square="e2"]').waitFor();
  await guest.locator('[data-square="e2"]').waitFor();

  // Hostile: guest tries to move out of turn (white to move) — rejected.
  await playMove(guest, 'e7', 'e5');
  await expectNoMoves(host);
  await expectNoMoves(guest);

  // Guest disconnects mid-game: host sees the reconnect banner with Claim win.
  await guestCtx.close();
  await expect(host.getByText(/Opponent disconnected/)).toBeVisible({ timeout: 15_000 });
  await expect(host.getByRole('button', { name: 'Claim win' })).toBeVisible();

  // Early claim (inside the 60s grace window) is rejected — game continues.
  await host.getByRole('button', { name: 'Claim win' }).click();
  await host.locator('[data-square="e2"]').waitFor();

  expect(hostErrors).toEqual([]);
  await hostCtx.close();
});

test('online setup: slow server shows waking state, then creates the game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  // Simulate a Render cold start: hold the create-room request ~6s.
  await page.route('**/api/rooms', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 6_000));
    await route.continue();
  });

  await page.goto('/play/online');
  await page.locator('#online-name').fill('Host');
  await page.getByRole('button', { name: 'Create game & copy link' }).click();

  // Creation pends while the held request resolves (button shows its busy state).
  await expect(page.getByRole('button', { name: 'Creating…' })).toBeVisible({ timeout: 10_000 });

  // The held request resolves and the game is created normally
  // (host lands in the waiting lobby with an invite link).
  await page.waitForURL(/\/game\//, { timeout: 30_000 });
  await expect(page.getByRole('textbox', { name: 'Invite link' })).toBeVisible({
    timeout: 15_000,
  });

  expect(errors).toEqual([]);
});
