import type { PieceType, PromotionPiece, Square } from '@/features/board';

export type GameStatus =
  | 'playing'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw-insufficient'
  | 'draw-repetition'
  | 'draw-50-move'
  | 'resigned'
  | 'timeout'
  | 'draw-agreed';

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | null;

export interface VerboseHistoryItem {
  from: Square;
  to: Square;
  san: string;
  promotion?: PromotionPiece;
  captured?: PieceType;
  isCastle: boolean;
}

export interface TimeControl {
  id: string;
  label: string;
  baseMs: number | null;
  incrementSec: number;
}

export const TERMINAL_STATUSES: readonly GameStatus[] = [
  'checkmate',
  'stalemate',
  'draw-insufficient',
  'draw-repetition',
  'draw-50-move',
  'resigned',
  'timeout',
  'draw-agreed',
] as const;

export function isTerminalStatus(status: GameStatus): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}
