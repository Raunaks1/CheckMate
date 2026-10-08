import type { BoardPiece, PieceColor, PieceType, Square } from './types';
import { isSquare } from './coordinates';

function parsePieceChar(ch: string): BoardPiece | null {
  const lower = ch.toLowerCase();
  if (
    lower !== 'p' &&
    lower !== 'n' &&
    lower !== 'b' &&
    lower !== 'r' &&
    lower !== 'q' &&
    lower !== 'k'
  ) {
    return null;
  }
  const type = lower as PieceType;
  const color: PieceColor = ch === lower ? 'b' : 'w';
  return { type, color };
}

/** Parse only the piece-placement field of a FEN string. Never throws. */
export function parseFenBoard(fen: string): Partial<Record<Square, BoardPiece>> {
  const placement = fen.trim().split(/\s+/)[0] ?? '';
  const rows = placement.split('/');
  const pieces: Partial<Record<Square, BoardPiece>> = {};
  if (rows.length !== 8) return pieces;

  for (let r = 0; r < 8; r++) {
    const row = rows[r];
    if (!row) continue;
    const rank = String(8 - r);
    let file = 0;
    for (const ch of row) {
      if (file >= 8) break;
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
      } else {
        const piece = parsePieceChar(ch);
        const sq = `${String.fromCharCode(97 + file)}${rank}`;
        if (piece && isSquare(sq)) {
          pieces[sq] = piece;
        }
        file += 1;
      }
    }
  }
  return pieces;
}
