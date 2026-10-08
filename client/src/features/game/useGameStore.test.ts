import { beforeEach, describe, expect, it } from 'vitest';
import type { Square } from '@/features/board';
import { useGameStore } from './useGameStore';

function move(from: Square, to: Square): boolean {
  return useGameStore.getState().makeMove(from, to);
}

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('useGameStore', () => {
  it("detects Scholar's mate as checkmate for White", () => {
    const moves: [Square, Square][] = [
      ['e2', 'e4'],
      ['e7', 'e5'],
      ['d1', 'h5'],
      ['b8', 'c6'],
      ['f1', 'c4'],
      ['g8', 'f6'],
      ['h5', 'f7'],
    ];
    for (const [from, to] of moves) {
      expect(move(from, to)).toBe(true);
    }
    const s = useGameStore.getState();
    expect(s.status).toBe('checkmate');
    expect(s.result).toBe('1-0');
    expect(s.sans).toHaveLength(7);
    expect(s.checkSquare).not.toBeNull();
  });

  it('detects stalemate with black to move and no legal moves', () => {
    const ok = useGameStore.getState().loadFen('7k/5Q2/8/8/8/8/8/6K1 b - - 0 1');
    expect(ok).toBe(true);
    const s = useGameStore.getState();
    expect(s.status).toBe('stalemate');
    expect(s.result).toBe('1/2-1/2');
  });

  it('detects threefold repetition', () => {
    const moves: [Square, Square][] = [
      ['g1', 'f3'],
      ['g8', 'f6'],
      ['f3', 'g1'],
      ['f6', 'g8'],
      ['g1', 'f3'],
      ['g8', 'f6'],
      ['f3', 'g1'],
      ['f6', 'g8'],
    ];
    for (const [from, to] of moves) {
      expect(move(from, to)).toBe(true);
    }
    const s = useGameStore.getState();
    expect(s.status).toBe('draw-repetition');
    expect(s.result).toBe('1/2-1/2');
  });

  it('detects insufficient material (K vs K)', () => {
    const ok = useGameStore.getState().loadFen('8/8/4k3/8/8/4K3/8/8 w - - 0 1');
    expect(ok).toBe(true);
    const s = useGameStore.getState();
    expect(s.status).toBe('draw-insufficient');
    expect(s.result).toBe('1/2-1/2');
  });

  it('undo takes back one half-move and restores turn', () => {
    expect(move('e2', 'e4')).toBe(true);
    expect(move('e7', 'e5')).toBe(true);
    const before = useGameStore.getState();
    expect(before.sans).toHaveLength(2);
    expect(before.turn).toBe('w');
    useGameStore.getState().undo();
    const after = useGameStore.getState();
    expect(after.sans).toHaveLength(1);
    expect(after.turn).toBe('b');
    expect(after.status).toBe('playing');
  });

  it('flag sets timeout with the correct winner', () => {
    expect(move('e2', 'e4')).toBe(true);
    useGameStore.getState().flag('w');
    const s = useGameStore.getState();
    expect(s.status).toBe('timeout');
    expect(s.result).toBe('0-1');
    expect(s.resultReason).toContain('flagged');
  });

  it('rejects illegal moves', () => {
    expect(move('e2', 'e5')).toBe(false);
    expect(useGameStore.getState().sans).toHaveLength(0);
  });

  it('resign and draw agreement end the game', () => {
    useGameStore.getState().resign('b');
    expect(useGameStore.getState().status).toBe('resigned');
    expect(useGameStore.getState().result).toBe('1-0');
    useGameStore.getState().reset();
    useGameStore.getState().agreeDraw();
    expect(useGameStore.getState().result).toBe('1/2-1/2');
  });

  it('blocks moves after terminal positions (mate, stalemate, draws)', () => {
    const mates: [Square, Square][] = [
      ['e2', 'e4'],
      ['e7', 'e5'],
      ['d1', 'h5'],
      ['b8', 'c6'],
      ['f1', 'c4'],
      ['g8', 'f6'],
      ['h5', 'f7'],
    ];
    for (const [from, to] of mates) expect(move(from, to)).toBe(true);
    expect(useGameStore.getState().status).toBe('checkmate');
    expect(move('e2', 'e4')).toBe(false);
    expect(useGameStore.getState().sans).toHaveLength(7);
    // Resign / draw after mate are no-ops.
    useGameStore.getState().resign('w');
    expect(useGameStore.getState().status).toBe('checkmate');
    useGameStore.getState().agreeDraw();
    expect(useGameStore.getState().status).toBe('checkmate');
  });

  it('flag with mating material is a loss; flag on terminal games is ignored', () => {
    expect(move('e2', 'e4')).toBe(true);
    useGameStore.getState().flag('w');
    let s = useGameStore.getState();
    expect(s.status).toBe('timeout');
    expect(s.result).toBe('0-1');

    // Bare-king positions are already terminal (insufficient), so a late
    // flag must not overwrite the result.
    expect(useGameStore.getState().loadFen('8/8/4k3/8/8/4K3/8/8 w - - 0 1')).toBe(true);
    expect(useGameStore.getState().status).toBe('draw-insufficient');
    useGameStore.getState().flag('b');
    s = useGameStore.getState();
    expect(s.status).toBe('draw-insufficient');
    expect(s.result).toBe('1/2-1/2');
  });

  it('flag-draw census follows the FIDE rule', async () => {
    const { flagIsDraw, flagMaterialFromFen } = await import('checkmate-shared');
    // Bare king winner -> draw.
    const bare = flagMaterialFromFen('8/8/4k3/8/8/4K3/8/8 w - - 0 1');
    expect(flagIsDraw(bare.black, bare.white)).toBe(true);
    // Single minor vs bare king -> draw.
    const minor = flagMaterialFromFen('5n2/8/4k3/8/8/4K3/8/8 w - - 0 1');
    expect(flagIsDraw(minor.white, minor.black)).toBe(true);
    // Rook or pawn remaining -> winner keeps mating material -> loss.
    const rook = flagMaterialFromFen('5R2/8/4k3/8/8/4K3/8/8 w - - 0 1');
    expect(flagIsDraw(rook.white, rook.black)).toBe(false);
  });

  it('detects fifty-move rule draw', () => {
    // 50 full moves without pawn move or capture: K+R shuffling
    // (rook keeps mating material, so only the fifty-move rule fires).
    const ok = useGameStore.getState().loadFen('7k/8/8/8/8/8/5R2/7K w - - 99 50');
    expect(ok).toBe(true);
    expect(useGameStore.getState().status).toBe('playing');
    expect(move('h1', 'g1')).toBe(true);
    const s = useGameStore.getState();
    expect(s.status).toBe('draw-50-move');
    expect(s.result).toBe('1/2-1/2');
  });
});
