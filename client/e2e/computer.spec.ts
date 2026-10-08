import { expect, test } from '@playwright/test';
import { moveCount, playMove } from './helpers';

test('vs computer: engine replies to e4 with a legal move; undo works', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/play/computer');
  await page.getByRole('button', { name: 'Start game' }).click();

  // Wait for the engine to boot (board is locked while warming up).
  await expect(page.getByRole('button', { name: /Hint/ })).toBeEnabled({ timeout: 90_000 });

  // Human is White by default; play e4.
  await playMove(page, 'e2', 'e4');
  await expect.poll(() => moveCount(page)).toBe(1);

  // Engine boots WASM and must reply with exactly one legal black move.
  await expect.poll(() => moveCount(page), { timeout: 90_000 }).toBe(2);

  // Undo takes back the full round-trip.
  await page.getByRole('button', { name: 'Undo move' }).click();
  await expect.poll(() => moveCount(page)).toBe(0);

  // Engine is not stuck after undo: a new first move gets a fresh reply.
  await playMove(page, 'd2', 'd4');
  await expect.poll(() => moveCount(page)).toBe(1);
  await expect.poll(() => moveCount(page), { timeout: 90_000 }).toBe(2);

  // The reply must be a legal black move: exactly 2 plies and no page errors.
  const sans = await page
    .getByRole('log', { name: 'Move list' })
    .getByRole('button')
    .allTextContents();
  expect(sans).toHaveLength(2);
  expect(sans[0]).toMatch(/d4/);

  expect(errors).toEqual([]);
});
