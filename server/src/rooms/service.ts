import { Chess } from 'chess.js';
import { nanoid } from 'nanoid';
import { randomInt } from 'node:crypto';
import type {
  ColorChoice,
  GameResult,
  MoveSummary,
  PromotionPiece,
  ResultReason,
  SeatColor,
  Square,
  TimeControl,
  Turn,
} from 'checkmate-shared';
import {
  RECONNECT_WINDOW_MS,
  ROOM_FINISHED_TTL_MS,
  ROOM_IDLE_TTL_MS,
  flagIsDraw,
  flagMaterialFromFen,
  sanitizeName,
} from 'checkmate-shared';
import type { GameRepository } from './repository.js';
import {
  colorOfPlayer,
  remainingForSideToMove,
  seatOf,
  seatToTurn,
  syncClocks,
  toPublicInfo,
  toSnapshot,
  turnToSeat,
  type Room,
} from './room.js';
import type { PublicRoomInfo, RoomSnapshot } from 'checkmate-shared';

export type ServiceNow = () => number;

export class RoomError extends Error {
  constructor(
    readonly code:
      | 'NOT_FOUND'
      | 'INVALID'
      | 'NOT_A_PLAYER'
      | 'NOT_YOUR_TURN'
      | 'ILLEGAL_MOVE'
      | 'GAME_OVER'
      | 'ALREADY_FINISHED'
      | 'CLAIM_TOO_EARLY'
      | 'RECONNECT_EXPIRED'
      | 'FORBIDDEN'
      | 'CONFLICT',
    message: string
  ) {
    super(message);
    this.name = 'RoomError';
  }
}

export interface CreateRoomInput {
  name: string;
  colorChoice: ColorChoice;
  timeControl: TimeControl;
}

export interface JoinRoomInput {
  playerId?: string | null;
  name?: string;
  socketId: string;
}

export interface MoveInput {
  from: string;
  to: string;
  promotion?: string;
}

const SQUARE_RE = /^[a-h][1-8]$/;
const PROMOTIONS = new Set(['q', 'r', 'b', 'n']);

function resolveColor(choice: ColorChoice): SeatColor {
  if (choice === 'random') return randomInt(2) === 0 ? 'white' : 'black';
  return choice;
}

function opposite(color: SeatColor): SeatColor {
  return color === 'white' ? 'black' : 'white';
}

/** Previous socket holding this seat, when a newer tab takes over. */
function prevSocket(current: string | null, incoming: string): string | null {
  if (current && current !== incoming) return current;
  return null;
}

function oppositeTurn(turn: Turn): Turn {
  return turn === 'w' ? 'b' : 'w';
}

function resultForWinner(winner: SeatColor): GameResult {
  return winner === 'white' ? '1-0' : '0-1';
}

export class RoomService {
  private now: ServiceNow;
  /** Called when a flag timeout fires so the socket layer can broadcast. */
  onTimeout: ((room: Room) => void) | null = null;

  constructor(
    private readonly repo: GameRepository,
    now?: ServiceNow
  ) {
    this.now = now ?? Date.now;
  }

  // ---------- creation / lookup ----------

  createRoom(
    input: CreateRoomInput,
    at?: number
  ): { room: Room; playerId: string; color: SeatColor } {
    const now = at ?? this.now();
    const name = sanitizeName(input.name);
    if (!name) throw new RoomError('INVALID', 'Name is required');
    const color = resolveColor(input.colorChoice);
    const playerId = nanoid(21);
    const room: Room = {
      id: nanoid(12),
      chess: new Chess(),
      moves: [],
      players: {
        [color]: {
          playerId,
          name,
          socketId: null,
          connected: false,
          disconnectedAt: null,
        },
      } as Room['players'],
      timeControl: input.timeControl,
      clocks: {
        whiteMs: input.timeControl.baseMs,
        blackMs: input.timeControl.baseMs,
      },
      lastTickAt: null,
      status: 'waiting',
      result: null,
      resultReason: null,
      drawOffer: null,
      rematchOffer: null,
      createdAt: now,
      lastActivity: now,
      timeoutTimer: null,
      createdBy: playerId,
    };
    this.repo.save(room);
    return { room, playerId, color };
  }

  getRoom(id: string): Room | undefined {
    return this.repo.get(id);
  }

  snapshot(roomId: string, at?: number): RoomSnapshot {
    const room = this.requireRoom(roomId);
    return toSnapshot(room, at ?? this.now());
  }

  publicInfo(roomId: string, at?: number): PublicRoomInfo {
    const room = this.requireRoom(roomId);
    return toPublicInfo(room, at ?? this.now());
  }

  /** Host-only cancel while the room is still waiting. Returns the deleted room id. */
  deleteRoom(roomId: string, playerId: string | null | undefined): string {
    const room = this.requireRoom(roomId);
    if (!playerId || room.createdBy !== playerId) {
      throw new RoomError('FORBIDDEN', 'Only the host can cancel this room');
    }
    if (room.status !== 'waiting') {
      throw new RoomError('CONFLICT', 'Only waiting rooms can be cancelled');
    }
    this.clearTimer(room);
    this.repo.delete(room.id);
    return room.id;
  }

  // ---------- join / reconnect ----------

  joinRoom(
    roomId: string,
    input: JoinRoomInput,
    at?: number
  ): {
    room: Room;
    color: SeatColor | null;
    isSpectator: boolean;
    reconnected: boolean;
    /** Previous socket id for this seat when a newer tab takes over, else null. */
    takeoverFrom: string | null;
  } {
    const now = at ?? this.now();
    const room = this.requireRoom(roomId);
    if (room.status === 'finished') {
      // Finished rooms are watchable but not joinable as players.
      const existing = input.playerId ? colorOfPlayer(room, input.playerId) : null;
      if (existing) {
        const slot = seatOf(room, existing);
        if (slot) {
          const takeoverFrom = prevSocket(slot.socketId, input.socketId);
          slot.socketId = input.socketId;
          slot.connected = true;
          slot.disconnectedAt = null;
          if (input.name) {
            const n = sanitizeName(input.name);
            if (n) slot.name = n;
          }
          room.lastActivity = now;
          return { room, color: existing, isSpectator: false, reconnected: true, takeoverFrom };
        }
      }
      return { room, color: null, isSpectator: true, reconnected: false, takeoverFrom: null };
    }

    // Reconnect with secret token.
    if (input.playerId) {
      const color = colorOfPlayer(room, input.playerId);
      if (color) {
        const slot = seatOf(room, color);
        if (slot) {
          const takeoverFrom = prevSocket(slot.socketId, input.socketId);
          slot.socketId = input.socketId;
          slot.connected = true;
          slot.disconnectedAt = null;
          if (input.name) {
            const n = sanitizeName(input.name);
            if (n) slot.name = n;
          }
          room.lastActivity = now;
          this.maybeActivate(room, now);
          return { room, color, isSpectator: false, reconnected: true, takeoverFrom };
        }
      }
    }

    // Fresh seat claim: second visitor takes the free color.
    const name = sanitizeName(input.name ?? '');
    if (!name) throw new RoomError('INVALID', 'Name is required');
    const free: SeatColor | null = !room.players.white
      ? 'white'
      : !room.players.black
        ? 'black'
        : null;
    if (free) {
      const playerId = nanoid(21);
      room.players[free] = {
        playerId,
        name,
        socketId: input.socketId,
        connected: true,
        disconnectedAt: null,
      };
      // Preserve an existing playerId? No — new seat gets a fresh token.
      // Stash it so the handler can return it: reuse input object is not
      // possible, so attach via a side channel on the room is avoided;
      // instead the handler reads the seat after join.
      room.lastActivity = now;
      this.maybeActivate(room, now);
      return { room, color: free, isSpectator: false, reconnected: false, takeoverFrom: null };
    }

    // Room full: read-only spectator.
    room.lastActivity = now;
    return { room, color: null, isSpectator: true, reconnected: false, takeoverFrom: null };
  }

  /** After a seat claim, return the fresh token for that socket. */
  playerIdForSocket(roomId: string, socketId: string): string | null {
    const room = this.requireRoom(roomId);
    for (const color of ['white', 'black'] as const) {
      const slot = seatOf(room, color);
      if (slot && slot.socketId === socketId) return slot.playerId;
    }
    return null;
  }

  // ---------- moves ----------

  applyMove(
    roomId: string,
    playerId: string,
    input: MoveInput,
    at?: number
  ): { room: Room; move: MoveSummary } {
    const now = at ?? this.now();
    const room = this.requireRoom(roomId);
    const color = colorOfPlayer(room, playerId);
    if (!color) throw new RoomError('NOT_A_PLAYER', 'Spectators cannot move');
    if (room.status === 'finished') throw new RoomError('GAME_OVER', 'Game is over');
    if (room.status !== 'active') throw new RoomError('INVALID', 'Game has not started');

    syncClocks(room, now);
    // Flag check before applying: side to move may have already run out.
    const remaining = remainingForSideToMove(room, now);
    if (remaining !== null && remaining <= 0) {
      this.finishOnFlag(room, turnToSeat(room.chess.turn()), now);
      throw new RoomError('GAME_OVER', 'Flagged — time out');
    }

    if (seatToTurn(color) !== room.chess.turn()) {
      throw new RoomError('NOT_YOUR_TURN', 'Not your turn');
    }
    if (!SQUARE_RE.test(input.from) || !SQUARE_RE.test(input.to)) {
      throw new RoomError('INVALID', 'Invalid squares');
    }
    let promotion: PromotionPiece | undefined;
    if (input.promotion !== undefined) {
      if (!PROMOTIONS.has(input.promotion)) throw new RoomError('INVALID', 'Invalid promotion');
      promotion = input.promotion as PromotionPiece;
    }

    let san: string;
    try {
      const result = promotion
        ? room.chess.move({ from: input.from, to: input.to, promotion })
        : room.chess.move({ from: input.from, to: input.to });
      san = result.san;
    } catch {
      throw new RoomError('ILLEGAL_MOVE', 'Illegal move');
    }

    const move: MoveSummary = {
      from: input.from as Square,
      to: input.to as Square,
      ...(promotion ? { promotion } : {}),
      san,
    };
    room.moves.push(move);

    // Increment goes to the player who just moved.
    if (room.clocks.whiteMs !== null && room.clocks.blackMs !== null) {
      const bonus = room.timeControl.incrementSec * 1000;
      if (bonus > 0) {
        if (color === 'white') room.clocks.whiteMs += bonus;
        else room.clocks.blackMs += bonus;
      }
    }
    room.lastTickAt = now;
    room.lastActivity = now;
    room.drawOffer = null;

    const terminal = this.checkTerminal(room, now);
    if (!terminal) this.armTimeout(room);

    return { room, move };
  }

  // ---------- resign / draw / rematch / claim ----------

  resign(roomId: string, playerId: string, at?: number): Room {
    const now = at ?? this.now();
    const room = this.requireRoom(roomId);
    const color = colorOfPlayer(room, playerId);
    if (!color) throw new RoomError('NOT_A_PLAYER', 'Spectators cannot resign');
    if (room.status === 'finished') throw new RoomError('ALREADY_FINISHED', 'Game is over');
    this.finish(room, resultForWinner(opposite(color)), 'resign', now);
    return room;
  }

  offerDraw(roomId: string, playerId: string, at?: number): Room {
    const now = at ?? this.now();
    const room = this.requireRoom(roomId);
    const color = colorOfPlayer(room, playerId);
    if (!color) throw new RoomError('NOT_A_PLAYER', 'Spectators cannot offer draws');
    if (room.status !== 'active') throw new RoomError('INVALID', 'Game is not active');
    room.drawOffer = { by: seatToTurn(color) };
    room.lastActivity = now;
    return room;
  }

  respondDraw(roomId: string, playerId: string, accept: boolean, at?: number): Room {
    const now = at ?? this.now();
    const room = this.requireRoom(roomId);
    const color = colorOfPlayer(room, playerId);
    if (!color) throw new RoomError('NOT_A_PLAYER', 'Spectators cannot respond to draws');
    if (room.status !== 'active') throw new RoomError('INVALID', 'Game is not active');
    if (!room.drawOffer) throw new RoomError('INVALID', 'No draw offer to answer');
    if (room.drawOffer.by === seatToTurn(color)) {
      throw new RoomError('INVALID', 'Cannot answer your own draw offer');
    }
    room.lastActivity = now;
    if (accept) {
      this.finish(room, '1/2-1/2', 'draw-agreed', now);
    } else {
      room.drawOffer = null;
    }
    return room;
  }

  requestRematch(roomId: string, playerId: string, at?: number): Room {
    const now = at ?? this.now();
    const room = this.requireRoom(roomId);
    const color = colorOfPlayer(room, playerId);
    if (!color) throw new RoomError('NOT_A_PLAYER', 'Spectators cannot request rematches');
    if (room.status !== 'finished') throw new RoomError('INVALID', 'Game is not over');
    room.rematchOffer = { by: seatToTurn(color) };
    room.lastActivity = now;
    return room;
  }

  respondRematch(roomId: string, playerId: string, accept: boolean, at?: number): Room | null {
    const now = at ?? this.now();
    const room = this.requireRoom(roomId);
    const color = colorOfPlayer(room, playerId);
    if (!color) throw new RoomError('NOT_A_PLAYER', 'Spectators cannot respond to rematches');
    if (!room.rematchOffer) throw new RoomError('INVALID', 'No rematch offer to answer');
    if (room.rematchOffer.by === seatToTurn(color)) {
      throw new RoomError('INVALID', 'Cannot answer your own rematch offer');
    }
    if (!accept) {
      room.rematchOffer = null;
      room.lastActivity = now;
      return null;
    }
    return this.createRematch(room, now);
  }

  claimWin(roomId: string, playerId: string, at?: number): Room {
    const now = at ?? this.now();
    const room = this.requireRoom(roomId);
    const color = colorOfPlayer(room, playerId);
    if (!color) throw new RoomError('NOT_A_PLAYER', 'Spectators cannot claim wins');
    if (room.status === 'finished') throw new RoomError('ALREADY_FINISHED', 'Game is over');
    const oppColor = opposite(color);
    const opp = seatOf(room, oppColor);
    if (!opp || opp.connected || opp.disconnectedAt === null) {
      throw new RoomError('CLAIM_TOO_EARLY', 'Opponent is still connected');
    }
    if (now - opp.disconnectedAt < RECONNECT_WINDOW_MS) {
      throw new RoomError('CLAIM_TOO_EARLY', 'Opponent is still within the reconnect window');
    }
    this.finish(room, resultForWinner(color), 'opponent-disconnected', now);
    return room;
  }

  /** Timeout poll (also used by the per-room timer). Returns true when flagged. */
  checkTimeout(roomId: string, at?: number): boolean {
    const now = at ?? this.now();
    const room = this.requireRoom(roomId);
    if (room.status !== 'active') return false;
    syncClocks(room, now);
    const remaining = remainingForSideToMove(room, now);
    if (remaining !== null && remaining <= 0) {
      this.finishOnFlag(room, turnToSeat(room.chess.turn()), now);
      return true;
    }
    this.armTimeout(room);
    return false;
  }

  // ---------- presence ----------

  handleSocketDisconnect(socketId: string, at?: number): { room: Room; color: SeatColor } | null {
    const now = at ?? this.now();
    for (const room of this.repo.all()) {
      for (const color of ['white', 'black'] as const) {
        const slot = seatOf(room, color);
        if (slot && slot.socketId === socketId && slot.connected) {
          slot.connected = false;
          slot.disconnectedAt = now;
          slot.socketId = null;
          room.lastActivity = now;
          return { room, color };
        }
      }
    }
    return null;
  }

  /** Test helper: override clocks directly. */
  debugSetClocks(
    roomId: string,
    whiteMs: number | null,
    blackMs: number | null,
    at?: number
  ): void {
    const room = this.requireRoom(roomId);
    room.clocks.whiteMs = whiteMs;
    room.clocks.blackMs = blackMs;
    room.lastTickAt = at ?? this.now();
    this.armTimeout(room);
  }

  cleanup(at?: number): string[] {
    const now = at ?? this.now();
    const deleted: string[] = [];
    for (const room of this.repo.all()) {
      const idleFor = now - room.lastActivity;
      const finishedExpired = room.status === 'finished' && idleFor > ROOM_FINISHED_TTL_MS;
      const idleExpired = idleFor > ROOM_IDLE_TTL_MS;
      if (finishedExpired || idleExpired) {
        this.clearTimer(room);
        this.repo.delete(room.id);
        deleted.push(room.id);
      }
    }
    return deleted;
  }

  // ---------- internals ----------

  private requireRoom(roomId: string): Room {
    const room = this.repo.get(roomId);
    if (!room) throw new RoomError('NOT_FOUND', 'Room not found');
    return room;
  }

  private maybeActivate(room: Room, now: number): void {
    if (room.status === 'waiting' && room.players.white && room.players.black) {
      room.status = 'active';
      room.lastActivity = now;
      // Clocks start on the first move, not on activation (lastTickAt stays null).
    }
  }

  /** Shared flag-fall ruling: loss unless the winner cannot possibly mate. */
  private finishOnFlag(room: Room, loser: SeatColor, now: number): void {
    const winner = opposite(loser);
    const { white, black } = flagMaterialFromFen(room.chess.fen());
    const draw = flagIsDraw(winner === 'white' ? white : black, loser === 'white' ? white : black);
    if (draw) this.finish(room, '1/2-1/2', 'draw-insufficient', now);
    else this.finish(room, resultForWinner(winner), 'timeout', now);
  }

  private checkTerminal(room: Room, now: number): boolean {
    const chess = room.chess;
    if (chess.isCheckmate()) {
      const winner: SeatColor = chess.turn() === 'b' ? 'white' : 'black';
      this.finish(room, resultForWinner(winner), 'checkmate', now);
      return true;
    }
    if (chess.isStalemate()) {
      this.finish(room, '1/2-1/2', 'stalemate', now);
      return true;
    }
    if (chess.isInsufficientMaterial()) {
      this.finish(room, '1/2-1/2', 'draw-insufficient', now);
      return true;
    }
    if (chess.isThreefoldRepetition()) {
      this.finish(room, '1/2-1/2', 'draw-repetition', now);
      return true;
    }
    if (chess.isDrawByFiftyMoves()) {
      this.finish(room, '1/2-1/2', 'draw-50-move', now);
      return true;
    }
    // chess.js isDraw() covers stalemate/fifty/insufficient; label precisely.
    if (chess.isDraw()) {
      if (chess.isInsufficientMaterial()) {
        this.finish(room, '1/2-1/2', 'draw-insufficient', now);
      } else if (chess.isDrawByFiftyMoves()) {
        this.finish(room, '1/2-1/2', 'draw-50-move', now);
      } else if (chess.isThreefoldRepetition()) {
        this.finish(room, '1/2-1/2', 'draw-repetition', now);
      } else {
        this.finish(room, '1/2-1/2', 'stalemate', now);
      }
      return true;
    }
    return false;
  }

  private finish(
    room: Room,
    result: GameResult,
    reason: Exclude<ResultReason, null>,
    now: number
  ): void {
    room.status = 'finished';
    room.result = result;
    room.resultReason = reason;
    room.drawOffer = null;
    room.lastActivity = now;
    this.clearTimer(room);
  }

  /** Arm (or re-arm) the per-room flag timer. */
  armTimeout(room: Room): void {
    this.clearTimer(room);
    if (room.status !== 'active') return;
    if (room.clocks.whiteMs === null || room.clocks.blackMs === null) return;
    const turn = room.chess.turn();
    const remaining = turn === 'w' ? room.clocks.whiteMs : room.clocks.blackMs;
    if (remaining === null) return;
    if (room.lastTickAt === null) return;
    // Recompute from now: remaining already synced by callers; schedule fire.
    const delay = Math.max(0, remaining);
    // Cap timer at 2^31-1 (Node setTimeout limit) — rooms live max 2h anyway.
    const capped = Math.min(delay, 2_147_483_647);
    room.timeoutTimer = setTimeout(() => {
      room.timeoutTimer = null;
      const flagged = this.checkTimeout(room.id);
      if (flagged && this.onTimeout) this.onTimeout(room);
    }, capped);
    // Don't keep the process alive just for a chess clock.
    room.timeoutTimer.unref?.();
  }

  private clearTimer(room: Room): void {
    if (room.timeoutTimer) {
      clearTimeout(room.timeoutTimer);
      room.timeoutTimer = null;
    }
  }

  private createRematch(oldRoom: Room, now: number): Room {
    const white = oldRoom.players.white;
    const black = oldRoom.players.black;
    const newRoom: Room = {
      id: nanoid(12),
      chess: new Chess(),
      moves: [],
      // Swap colors for fairness.
      players: {
        ...(black
          ? {
              white: {
                playerId: black.playerId,
                name: black.name,
                socketId: black.socketId,
                connected: black.connected,
                disconnectedAt: black.disconnectedAt,
              },
            }
          : {}),
        ...(white
          ? {
              black: {
                playerId: white.playerId,
                name: white.name,
                socketId: white.socketId,
                connected: white.connected,
                disconnectedAt: white.disconnectedAt,
              },
            }
          : {}),
      } as Room['players'],
      timeControl: oldRoom.timeControl,
      clocks: {
        whiteMs: oldRoom.timeControl.baseMs,
        blackMs: oldRoom.timeControl.baseMs,
      },
      lastTickAt: null,
      status: 'waiting',
      result: null,
      resultReason: null,
      drawOffer: null,
      rematchOffer: null,
      createdAt: now,
      lastActivity: now,
      timeoutTimer: null,
      createdBy: oldRoom.createdBy,
    };
    if (newRoom.players.white && newRoom.players.black) {
      newRoom.status = 'active';
    }
    oldRoom.rematchOffer = null;
    this.repo.save(newRoom);
    return newRoom;
  }
}

export { oppositeTurn };
