export type SeatColor = 'white' | 'black';
export type ColorChoice = SeatColor | 'random';
export type Turn = 'w' | 'b';
export type RoomStatus = 'waiting' | 'active' | 'finished';
export type GameResult = '1-0' | '0-1' | '1/2-1/2' | null;

export type ResultReason =
  | 'checkmate'
  | 'resign'
  | 'timeout'
  | 'draw-agreed'
  | 'stalemate'
  | 'draw-insufficient'
  | 'draw-repetition'
  | 'draw-50-move'
  | 'opponent-disconnected'
  | null;

export type TimeControlId = 'unlimited' | '1+0' | '3+2' | '5+0' | '10+0' | '15+10' | '30+0';

export interface TimeControl {
  id: TimeControlId;
  label: string;
  baseMs: number | null;
  incrementSec: number;
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'unlimited', label: 'Unlimited', baseMs: null, incrementSec: 0 },
  { id: '1+0', label: 'Bullet 1+0', baseMs: 60_000, incrementSec: 0 },
  { id: '3+2', label: 'Blitz 3+2', baseMs: 180_000, incrementSec: 2 },
  { id: '5+0', label: 'Blitz 5+0', baseMs: 300_000, incrementSec: 0 },
  { id: '10+0', label: 'Rapid 10+0', baseMs: 600_000, incrementSec: 0 },
  { id: '15+10', label: 'Rapid 15+10', baseMs: 900_000, incrementSec: 10 },
  { id: '30+0', label: 'Classical 30+0', baseMs: 1_800_000, incrementSec: 0 },
];

export function getTimeControl(id: string): TimeControl {
  const found = TIME_CONTROLS.find((t) => t.id === id);
  if (found) return found;
  return { id: '10+0', label: 'Rapid 10+0', baseMs: 600_000, incrementSec: 0 };
}

export function isTimeControlId(id: string): id is TimeControlId {
  return TIME_CONTROLS.some((t) => t.id === id);
}

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';
export type Square =
  `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${'1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'}`;

export interface MoveSummary {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
  san: string;
}

/** Public (safe to send to any client, incl. spectators) seat info. */
export interface PublicPlayer {
  name: string;
  connected: boolean;
}

/** Full seat info held server-side. playerId is secret, never sent to opponent. */
export interface PlayerSlot {
  playerId: string;
  name: string;
  socketId: string | null;
  connected: boolean;
  disconnectedAt: number | null;
}

export interface Clocks {
  whiteMs: number | null;
  blackMs: number | null;
}

export interface DrawOffer {
  by: Turn;
}

export interface RematchOffer {
  by: Turn;
}

/** Full authoritative snapshot sent as `room_state`. */
export interface RoomSnapshot {
  id: string;
  fen: string;
  pgn: string;
  moves: MoveSummary[];
  sans: string[];
  players: {
    white?: PublicPlayer;
    black?: PublicPlayer;
  };
  whiteName: string;
  blackName: string;
  timeControl: TimeControl;
  clocks: Clocks;
  turn: Turn;
  status: RoomStatus;
  result: GameResult;
  resultReason: ResultReason;
  drawOffer: DrawOffer | null;
  rematchOffer: RematchOffer | null;
  createdAt: number;
  lastActivity: number;
}

/** What the owner / joiner needs after create + join. */
export interface JoinInfo {
  roomId: string;
  /** Seat color, or null for spectator. */
  color: SeatColor | null;
  /** Present only for the seat owner. Spectators get null. */
  playerId: string | null;
  isSpectator: boolean;
}

/** Public lobby info for GET /api/rooms/:id (no secrets). */
export interface PublicRoomInfo {
  id: string;
  status: RoomStatus;
  timeControl: TimeControl;
  whiteTaken: boolean;
  blackTaken: boolean;
  whiteName: string | null;
  blackName: string | null;
  fen: string;
  turn: Turn;
  moveCount: number;
}

export const RECONNECT_WINDOW_MS = 60_000;
export const ROOM_IDLE_TTL_MS = 2 * 60 * 60 * 1000;
export const ROOM_FINISHED_TTL_MS = 30 * 60 * 1000;
export const MAX_NAME_LENGTH = 20;

/** Non-king material on one side, for timeout-vs-insufficient-material rulings. */
export interface SideMaterial {
  pawns: number;
  /** Knights + bishops. */
  minors: number;
  /** Rooks + queens. */
  majors: number;
}

/**
 * Census non-king material for one side from a FEN piece-placement field
 * (the first field of a FEN string, e.g. `rnbqkbnr/pppppppp/...`).
 * Kings are ignored. Uppercase = white, lowercase = black.
 */
export function sideMaterialFromPlacement(placement: string, side: 'w' | 'b'): SideMaterial {
  const out: SideMaterial = { pawns: 0, minors: 0, majors: 0 };
  for (const ch of placement) {
    if (ch === '/') continue;
    if (ch >= '1' && ch <= '8') continue;
    const isWhite = ch >= 'A' && ch <= 'Z';
    if ((side === 'w') !== isWhite) continue;
    const p = ch.toLowerCase();
    if (p === 'k') continue;
    if (p === 'p') out.pawns += 1;
    else if (p === 'n' || p === 'b') out.minors += 1;
    else if (p === 'r' || p === 'q') out.majors += 1;
  }
  return out;
}

/** Census both sides from a full FEN string. */
export function flagMaterialFromFen(fen: string): { white: SideMaterial; black: SideMaterial } {
  const placement = fen.split(' ')[0] ?? '';
  return {
    white: sideMaterialFromPlacement(placement, 'w'),
    black: sideMaterialFromPlacement(placement, 'b'),
  };
}

/**
 * FIDE-flavoured timeout rule used when a flag falls: the flagger loses,
 * UNLESS the winner cannot possibly mate — bare king, or a single minor
 * against a bare king — in which case it is a draw.
 */
export function flagIsDraw(winner: SideMaterial, loser: SideMaterial): boolean {
  const winnerTotal = winner.pawns + winner.minors + winner.majors;
  if (winnerTotal === 0) return true;
  const loserTotal = loser.pawns + loser.minors + loser.majors;
  if (loserTotal === 0 && winner.pawns === 0 && winner.majors === 0 && winner.minors <= 1) {
    return true;
  }
  return false;
}

export function sanitizeName(name: string): string {
  // Strip control chars, collapse whitespace, cap at 20 chars.
  const stripped = name
    .split('')
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
  const cleaned = stripped.replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, MAX_NAME_LENGTH);
}
