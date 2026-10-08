import { parseFenBoard } from '@/features/board/fen';
import type { PieceColor, PieceType } from '@/features/board';

const START_COUNTS: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const DISPLAY_ORDER: PieceType[] = ['q', 'r', 'b', 'n', 'p'];

export interface MaterialInfo {
  whiteCaptured: PieceType[];
  blackCaptured: PieceType[];
  whitePoints: number;
  blackPoints: number;
  leader: PieceColor | null;
  advantage: number;
}

export function getMaterialInfo(fen: string): MaterialInfo {
  const pieces = parseFenBoard(fen);
  const counts: Record<PieceColor, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  for (const sq of Object.keys(pieces)) {
    const piece = pieces[sq as keyof typeof pieces];
    if (piece) counts[piece.color][piece.type] += 1;
  }

  const whiteCaptured: PieceType[] = [];
  const blackCaptured: PieceType[] = [];
  const count = (color: PieceColor, type: PieceType): number => counts[color]?.[type] ?? 0;
  for (const t of DISPLAY_ORDER) {
    const missingBlack = Math.max(0, (START_COUNTS[t] ?? 0) - count('b', t));
    const missingWhite = Math.max(0, (START_COUNTS[t] ?? 0) - count('w', t));
    for (let i = 0; i < missingBlack; i++) whiteCaptured.push(t);
    for (let i = 0; i < missingWhite; i++) blackCaptured.push(t);
  }

  let whitePoints = 0;
  let blackPoints = 0;
  for (const t of DISPLAY_ORDER) {
    whitePoints += count('w', t) * (VALUES[t] ?? 0);
    blackPoints += count('b', t) * (VALUES[t] ?? 0);
  }
  const diff = whitePoints - blackPoints;
  return {
    whiteCaptured,
    blackCaptured,
    whitePoints,
    blackPoints,
    leader: diff > 0 ? 'w' : diff < 0 ? 'b' : null,
    advantage: Math.abs(diff),
  };
}
