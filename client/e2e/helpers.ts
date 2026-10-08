import type { Locator, Page } from '@playwright/test';

export type Square = `${string}${string}`;

/** Click-click a move: select the from-square, then the to-square. */
export async function playMove(page: Page, from: Square, to: Square): Promise<void> {
  await page.locator(`[data-square="${from}"]`).click();
  await page.locator(`[data-square="${to}"]`).click();
}

/** Drag a piece from one square to another (pointer-drag path). */
export async function dragMove(page: Page, from: Square, to: Square): Promise<void> {
  const src = page.locator(`[data-square="${from}"]`);
  const dst = page.locator(`[data-square="${to}"]`);
  const sbox = await src.boundingBox();
  const dbox = await dst.boundingBox();
  if (!sbox || !dbox) throw new Error('squares not visible for drag');
  await page.mouse.move(sbox.x + sbox.width / 2, sbox.y + sbox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dbox.x + dbox.width / 2, dbox.y + dbox.height / 2, { steps: 12 });
  await page.mouse.up();
}

/** Center of a square, for off-board / chaos drags. */
export async function squareCenter(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('square not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Number of plies shown in the move list. */
export async function moveCount(page: Page): Promise<number> {
  return page.getByRole('log', { name: 'Move list' }).getByRole('button').count();
}

export async function expectMoves(page: Page, sans: string[]): Promise<void> {
  const log = page.getByRole('log', { name: 'Move list' });
  for (const san of sans) {
    await log.getByRole('button', { name: san, exact: true }).first().waitFor();
  }
}

/** Assert the move list stays empty (polls briefly to catch strays). */
export async function expectNoMoves(page: Page): Promise<void> {
  // With zero moves the list renders an empty-state note instead of the log.
  await page.getByText('No moves yet').first().waitFor({ timeout: 15_000 });
  // Give a rejected move a chance to (incorrectly) appear, then assert zero.
  await page.waitForTimeout(750);
  const stray = await page.getByRole('log', { name: 'Move list' }).count();
  if (stray !== 0) throw new Error('expected no moves, but the move list appeared');
}
