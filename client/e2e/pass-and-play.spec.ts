import { expect, test } from '@playwright/test';
import { dragMove, moveCount, playMove, squareCenter } from './helpers';

test('pass & play: scholar\u2019s mate ends with checkmate modal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/play/local');
  await page.getByRole('button', { name: 'Start game' }).click();

  // Scholar's mate, both sides on the same screen.
  const moves = [
    ['e2', 'e4'],
    ['e7', 'e5'],
    ['d1', 'h5'],
    ['b8', 'c6'],
    ['f1', 'c4'],
    ['g8', 'f6'],
    ['h5', 'f7'],
  ] as const;
  for (const [from, to] of moves) {
    await playMove(page, from, to);
  }

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('White wins');
  await expect(dialog).toContainText('1-0');

  // Mate took exactly 7 plies; the game-over modal blocks further input.
  await expect.poll(() => moveCount(page)).toBe(7);

  // Hostile: even force-dispatched clicks behind the modal are rejected —
  // the store guard drops post-terminal moves and the count never grows.
  await page.locator('[data-square="e2"]').click({ force: true });
  await page.locator('[data-square="e4"]').click({ force: true });
  await expect.poll(() => moveCount(page)).toBe(7);

  expect(errors).toEqual([]);
});

test('pass & play: illegal castling attempt is rejected', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/play/local');
  await page.getByRole('button', { name: 'Start game' }).click();

  // King-side castle on move 1 is illegal (pieces block + rights require
  // clearing): the board must ignore it and the move list stays empty.
  await playMove(page, 'e1', 'g1');
  await expect.poll(() => moveCount(page)).toBe(0);

  // Legal kingside castle after clearing: e4 e5 Nf3 Nc6 Bc4 Bc5 O-O.
  const setup = [
    ['e2', 'e4'],
    ['e7', 'e5'],
    ['g1', 'f3'],
    ['b8', 'c6'],
    ['f1', 'c4'],
    ['f8', 'c5'],
  ] as const;
  for (const [from, to] of setup) await playMove(page, from, to);
  await playMove(page, 'e1', 'g1');
  await expect.poll(() => moveCount(page)).toBe(7);

  expect(errors).toEqual([]);
});

test('pass & play: en passant capture works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/play/local');
  await page.getByRole('button', { name: 'Start game' }).click();

  await playMove(page, 'e2', 'e4');
  await playMove(page, 'a7', 'a6');
  await playMove(page, 'e4', 'e5');
  await playMove(page, 'd7', 'd5');
  // En passant: exd6 e.p.
  await playMove(page, 'e5', 'd6');
  await expect.poll(() => moveCount(page)).toBe(5);
  const log = page.getByRole('log', { name: 'Move list' });
  await log.getByRole('button', { name: 'exd6', exact: true }).first().waitFor();

  expect(errors).toEqual([]);
});

test('pass & play: promotion chooser offers all four pieces', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/play/local');
  await page.getByRole('button', { name: 'Start game' }).click();

  // Verified promotion line (b-file avoids giving check on the way):
  // a4 b5 axb5 Na6 b6 e6 b7 Be7, then b7xb8 opens the chooser.
  const setup = [
    ['a2', 'a4'],
    ['b7', 'b5'],
    ['a4', 'b5'],
    ['b8', 'a6'],
    ['b5', 'b6'],
    ['e7', 'e6'],
    ['b6', 'b7'],
    ['f8', 'e7'],
  ] as const;
  for (const [from, to] of setup) await playMove(page, from, to);
  await expect.poll(() => moveCount(page)).toBe(8);

  // b7xb8 opens the chooser; all four options must render.
  await page.locator('[data-square="b7"]').click();
  await page.locator('[data-square="b8"]').click();
  const chooser = page.getByRole('dialog', { name: 'Choose promotion piece' });
  await expect(chooser).toBeVisible();
  for (const name of ['Queen', 'Rook', 'Bishop', 'Knight']) {
    await expect(chooser.getByRole('button', { name: `Promote to ${name}` })).toBeVisible();
  }
  // Escape cancels and restores the pawn selection (no move recorded).
  await page.keyboard.press('Escape');
  await expect(chooser).toBeHidden();
  await expect.poll(() => moveCount(page)).toBe(8);
  // The pawn stays selected after cancel, so a single click on the target
  // reopens the chooser; promote to knight (underpromotion path).
  await page.locator('[data-square="b8"]').click();
  await expect(page.getByRole('dialog', { name: 'Choose promotion piece' })).toBeVisible();
  await page.getByRole('button', { name: 'Promote to Knight' }).click();
  await expect.poll(() => moveCount(page)).toBe(9);

  expect(errors).toEqual([]);
});

test('pass & play: hostile input — double-click, off-board drag, resize', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/play/local');
  await page.getByRole('button', { name: 'Start game' }).click();

  // Rapid double-click on e2 selects then deselects: no move recorded.
  const e2 = page.locator('[data-square="e2"]');
  await e2.click();
  await e2.click();
  await expect.poll(() => moveCount(page)).toBe(0);

  // Drag e2 pawn off the board and release: no move, no crash.
  const start = await squareCenter(e2);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 400, start.y - 400, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => moveCount(page)).toBe(0);

  // Resize mid-drag: start a drag, resize the viewport, then drop on e4.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 5, start.y - 5, { steps: 2 });
  await page.setViewportSize({ width: 900, height: 900 });
  const e4 = page.locator('[data-square="e4"]');
  const dest = await squareCenter(e4);
  await page.mouse.move(dest.x, dest.y, { steps: 10 });
  await page.mouse.up();
  // Either the drag completed (1 ply) or was safely cancelled (0 plies) —
  // both are acceptable; a phantom/illegal move is not.
  const count = await moveCount(page);
  expect(count === 0 || count === 1).toBe(true);

  // Drag path for a full legal move works after the chaos above.
  if (count === 0) await dragMove(page, 'e2', 'e4');
  await expect.poll(() => moveCount(page)).toBe(1);

  expect(errors).toEqual([]);
});
