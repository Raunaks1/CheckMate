import type { FileLetter, Orientation, RankNumber, Square } from './types';

export const FILES: readonly FileLetter[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS: readonly RankNumber[] = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export function isSquare(value: string): value is Square {
  return /^[a-h][1-8]$/.test(value);
}

export function squareToCoords(square: Square): { file: number; rank: number } {
  const file = FILES.indexOf(square[0] as FileLetter);
  const rank = RANKS.indexOf(square[1] as RankNumber);
  return { file, rank };
}

export function coordsToSquare(file: number, rank: number): Square | null {
  const f = FILES[file];
  const r = RANKS[rank];
  if (!f || !r) return null;
  const sq = `${f}${r}`;
  return isSquare(sq) ? sq : null;
}

export function isLightSquare(square: Square): boolean {
  const { file, rank } = squareToCoords(square);
  return (file + rank) % 2 === 1;
}

export function squareToDisplayPos(
  square: Square,
  orientation: Orientation
): { row: number; col: number } {
  const { file, rank } = squareToCoords(square);
  if (orientation === 'white') {
    return { row: 7 - rank, col: file };
  }
  return { row: rank, col: 7 - file };
}

export function displayPosToSquare(
  row: number,
  col: number,
  orientation: Orientation
): Square | null {
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  if (orientation === 'white') {
    return coordsToSquare(col, 7 - row);
  }
  return coordsToSquare(7 - col, row);
}

export function getDisplaySquares(orientation: Orientation): Square[] {
  const out: Square[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = displayPosToSquare(row, col, orientation);
      if (sq) out.push(sq);
    }
  }
  return out;
}

const PIECE_LABELS: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

export function pieceLabel(type: string): string {
  return PIECE_LABELS[type] ?? type;
}

export function colorLabel(color: 'w' | 'b'): string {
  return color === 'w' ? 'white' : 'black';
}
