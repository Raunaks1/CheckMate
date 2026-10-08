import type {
  Clocks,
  DrawOffer,
  GameResult,
  MoveSummary,
  PlayerSlot,
  PublicRoomInfo,
  RematchOffer,
  RoomSnapshot,
  ResultReason,
  RoomStatus,
  SeatColor,
  TimeControl,
  Turn,
} from 'checkmate-shared';
import { Chess } from 'chess.js';

/** Server-side room: public snapshot fields + authoritative chess instance. */
export interface Room {
  id: string;
  chess: Chess;
  moves: MoveSummary[];
  players: {
    white?: PlayerSlot;
    black?: PlayerSlot;
  };
  timeControl: TimeControl;
  clocks: Clocks;
  /** Last time clocks were synced (epoch ms). Null until the first move is played. */
  lastTickAt: number | null;
  /** Secret token of the room creator; only they may cancel (DELETE) while waiting. */
  createdBy: string;
  status: RoomStatus;
  result: GameResult;
  resultReason: ResultReason;
  drawOffer: DrawOffer | null;
  rematchOffer: RematchOffer | null;
  createdAt: number;
  lastActivity: number;
  /** Active flag-timeout timer for this room. */
  timeoutTimer: NodeJS.Timeout | null;
}

export function roomTurn(room: Room): Turn {
  return room.chess.turn();
}

export function toSnapshot(room: Room, now: number): RoomSnapshot {
  syncClocks(room, now);
  const turn = room.chess.turn();
  return {
    id: room.id,
    fen: room.chess.fen(),
    pgn: room.chess.pgn(),
    moves: [...room.moves],
    sans: room.moves.map((m) => m.san),
    players: {
      ...(room.players.white
        ? { white: { name: room.players.white.name, connected: room.players.white.connected } }
        : {}),
      ...(room.players.black
        ? { black: { name: room.players.black.name, connected: room.players.black.connected } }
        : {}),
    },
    whiteName: room.players.white?.name ?? 'White',
    blackName: room.players.black?.name ?? 'Black',
    timeControl: room.timeControl,
    clocks: { whiteMs: room.clocks.whiteMs, blackMs: room.clocks.blackMs },
    turn,
    status: room.status,
    result: room.result,
    resultReason: room.resultReason,
    drawOffer: room.drawOffer ? { ...room.drawOffer } : null,
    rematchOffer: room.rematchOffer ? { ...room.rematchOffer } : null,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity,
  };
}

export function toPublicInfo(room: Room, now: number): PublicRoomInfo {
  syncClocks(room, now);
  return {
    id: room.id,
    status: room.status,
    timeControl: room.timeControl,
    whiteTaken: room.players.white !== undefined,
    blackTaken: room.players.black !== undefined,
    whiteName: room.players.white?.name ?? null,
    blackName: room.players.black?.name ?? null,
    fen: room.chess.fen(),
    turn: room.chess.turn(),
    moveCount: room.moves.length,
  };
}

export function seatOf(room: Room, color: SeatColor): PlayerSlot | undefined {
  return color === 'white' ? room.players.white : room.players.black;
}

export function colorOfPlayer(room: Room, playerId: string): SeatColor | null {
  if (room.players.white?.playerId === playerId) return 'white';
  if (room.players.black?.playerId === playerId) return 'black';
  return null;
}

export function turnToSeat(turn: Turn): SeatColor {
  return turn === 'w' ? 'white' : 'black';
}

export function seatToTurn(color: SeatColor): Turn {
  return color === 'white' ? 'w' : 'b';
}

/**
 * Deduct elapsed wall-clock from the side to move.
 * No-op for unlimited, finished games, or games that never started.
 */
export function syncClocks(room: Room, now: number): void {
  if (room.status === 'finished') return;
  if (room.clocks.whiteMs === null || room.clocks.blackMs === null) return;
  if (room.lastTickAt === null) return;
  if (room.status !== 'active') return;
  const elapsed = now - room.lastTickAt;
  if (elapsed <= 0) return;
  const turn = room.chess.turn();
  if (turn === 'w') {
    room.clocks.whiteMs = Math.max(0, room.clocks.whiteMs - elapsed);
  } else {
    room.clocks.blackMs = Math.max(0, room.clocks.blackMs - elapsed);
  }
  room.lastTickAt = now;
}

/** Remaining ms for side to move (0 when flagged). Null when unlimited. */
export function remainingForSideToMove(room: Room, now: number): number | null {
  syncClocks(room, now);
  const turn = room.chess.turn();
  const remaining = turn === 'w' ? room.clocks.whiteMs : room.clocks.blackMs;
  return remaining;
}
