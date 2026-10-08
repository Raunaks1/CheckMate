import { describe, expect, it } from 'vitest';
import { DEFAULT_PIECE_SET_ID, PIECE_SETS, pieceSrc } from './pieceSet';

describe('pieceSet registry', () => {
  it('defaults to merida', () => {
    expect(DEFAULT_PIECE_SET_ID).toBe('merida');
    expect(PIECE_SETS.merida.label).toBe('Merida');
    expect(PIECE_SETS.merida.base).toBe('/pieces/merida');
  });

  it('maps all 12 pieces to the expected filenames', () => {
    expect(pieceSrc('merida', 'w', 'k')).toBe('/pieces/merida/wK.svg');
    expect(pieceSrc('merida', 'b', 'p')).toBe('/pieces/merida/bP.svg');
    expect(pieceSrc('merida', 'w', 'q')).toBe('/pieces/merida/wQ.svg');
    expect(pieceSrc('merida', 'b', 'n')).toBe('/pieces/merida/bN.svg');
  });

  it('falls back to the default set for unknown ids (e.g. stale storage)', () => {
    expect(pieceSrc('nope', 'w', 'k')).toBe('/pieces/merida/wK.svg');
  });
});
