import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  GameOverPayload,
  InterServerEvents,
  SeatColor,
  ServerToClientEvents,
  SocketData,
} from 'checkmate-shared';
import { RECONNECT_WINDOW_MS } from 'checkmate-shared';
import { RoomError, type RoomService } from '../rooms/service.js';
import type { Room } from '../rooms/room.js';
import { colorOfPlayer } from '../rooms/room.js';
import { RateLimiter } from '../rooms/rateLimit.js';
import {
  JoinRoomPayloadSchema,
  MovePayloadSchema,
  RespondDrawSchema,
  RespondRematchSchema,
} from '../validation.js';

type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function gameOverPayload(room: Room): GameOverPayload {
  const winner =
    room.result === '1-0' ? ('white' as const) : room.result === '0-1' ? ('black' as const) : null;
  return {
    result: room.result,
    reason: (room.resultReason ?? 'draw-agreed') as GameOverPayload['reason'],
    winner,
  };
}

export function attachSockets(
  io: TypedServer,
  service: RoomService,
  limiter: RateLimiter,
  opts?: { joinLimiter?: RateLimiter }
): void {
  // Stricter burst cap for room joins, keyed by IP to blunt enumeration sweeps.
  const joinLimiter = opts?.joinLimiter ?? new RateLimiter(30, 60_000);
  service.onTimeout = (room: Room) => {
    io.to(room.id).emit('game_over', gameOverPayload(room));
    void emitRoomStates(io, service, room.id);
    io.to(room.id).emit('clock_update', {
      whiteMs: room.clocks.whiteMs,
      blackMs: room.clocks.blackMs,
      turn: room.chess.turn(),
    });
  };

  io.on('connection', (socket: TypedSocket) => {
    socket.data.roomId = undefined;
    socket.data.playerId = undefined;
    socket.data.color = undefined;
    socket.data.isSpectator = undefined;

    const limited = (): boolean => {
      if (!limiter.check(socket.id)) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many requests' });
        return true;
      }
      return false;
    };

    socket.on('join_room', (payload) => {
      if (limited()) return;
      const ip = socket.handshake.address ?? 'unknown';
      if (!joinLimiter.check(`join:${ip}`)) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many requests' });
        return;
      }
      try {
        const parsed = JoinRoomPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit('error', { code: 'INVALID', message: 'Bad join payload' });
          return;
        }
        const { roomId } = parsed.data;
        const { room, color, isSpectator, reconnected, takeoverFrom } = service.joinRoom(roomId, {
          playerId: parsed.data.playerId ?? null,
          name: parsed.data.name ?? '',
          socketId: socket.id,
        });
        void socket.join(room.id);
        socket.data.roomId = room.id;
        socket.data.color = color;
        socket.data.isSpectator = isSpectator;
        if (!isSpectator && color) {
          const token = service.playerIdForSocket(room.id, socket.id);
          socket.data.playerId = token ?? undefined;
        }
        // Full snapshot to the joiner.
        const snap = service.snapshot(room.id);
        const myToken = service.playerIdForSocket(room.id, socket.id);
        socket.emit('room_state', {
          ...snap,
          yourColor: color,
          isSpectator,
          yourPlayerId: isSpectator ? null : (myToken ?? null),
        });
        // Notify the rest of the room.
        if (!isSpectator && color) {
          if (reconnected) {
            socket.to(room.id).emit('opponent_connected', { color });
          } else if (room.players.white && room.players.black) {
            socket.to(room.id).emit('opponent_connected', { color });
          }
          void emitRoomStates(io, service, room.id, socket.id);
        }
        // A newer tab took this seat: tell the stale socket to stand down.
        if (takeoverFrom && takeoverFrom !== socket.id) {
          const stale = io.sockets.sockets.get(takeoverFrom) as TypedSocket | undefined;
          if (stale) {
            stale.emit('session_takeover');
            stale.data.roomId = undefined;
            stale.data.playerId = undefined;
            void stale.leave(room.id);
          }
        }
      } catch (err) {
        emitRoomError(socket, err);
      }
    });

    socket.on('move', (payload) => {
      if (limited()) return;
      const ctx = requireSeat(socket);
      if (!ctx) return;
      // Only from/to/promotion are read; anything else (fen, clocks, …) is ignored.
      const parsed = MovePayloadSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { code: 'INVALID', message: 'Bad move payload' });
        return;
      }
      const { from, to, promotion } = parsed.data;
      try {
        const { room, move } = service.applyMove(ctx.roomId, ctx.playerId, {
          from,
          to,
          promotion,
        });
        const snap = service.snapshot(room.id);
        io.to(room.id).emit('move_made', {
          move,
          fen: room.chess.fen(),
          pgn: room.chess.pgn(),
          turn: room.chess.turn(),
          clocks: { whiteMs: room.clocks.whiteMs, blackMs: room.clocks.blackMs },
          san: move.san,
        });
        io.to(room.id).emit('clock_update', {
          whiteMs: room.clocks.whiteMs,
          blackMs: room.clocks.blackMs,
          turn: room.chess.turn(),
        });
        void emitRoomStates(io, service, room.id);
        if (room.status === 'finished') {
          io.to(room.id).emit('game_over', gameOverPayload(room));
        }
        void snap;
      } catch (err) {
        emitRoomError(socket, err);
        // A flag can fell inside applyMove (pre-move flag check finishes the
        // game, then throws): the whole room must still learn the result.
        // Without this, only the mover gets an error and the opponent hangs.
        if (err instanceof RoomError && err.code === 'GAME_OVER') {
          const current = service.getRoom(ctx.roomId);
          if (current && current.status === 'finished') {
            io.to(current.id).emit('game_over', gameOverPayload(current));
            void emitRoomStates(io, service, current.id);
          }
        }
      }
    });

    socket.on('resign', () => {
      if (limited()) return;
      const ctx = requireSeat(socket);
      if (!ctx) return;
      try {
        const room = service.resign(ctx.roomId, ctx.playerId);
        io.to(room.id).emit('game_over', gameOverPayload(room));
        void emitRoomStates(io, service, room.id);
      } catch (err) {
        emitRoomError(socket, err);
      }
    });

    socket.on('offer_draw', () => {
      if (limited()) return;
      const ctx = requireSeat(socket);
      if (!ctx) return;
      try {
        const room = service.offerDraw(ctx.roomId, ctx.playerId);
        if (room.drawOffer) {
          io.to(room.id).emit('draw_offered', { by: room.drawOffer.by });
        }
        void emitRoomStates(io, service, room.id);
      } catch (err) {
        emitRoomError(socket, err);
      }
    });

    socket.on('respond_draw', (payload) => {
      if (limited()) return;
      const ctx = requireSeat(socket);
      if (!ctx) return;
      const parsed = RespondDrawSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { code: 'INVALID', message: 'accept must be a boolean' });
        return;
      }
      const accept = parsed.data.accept;
      try {
        const room = service.respondDraw(ctx.roomId, ctx.playerId, accept);
        if (room.status === 'finished') {
          io.to(room.id).emit('game_over', gameOverPayload(room));
        } else {
          io.to(room.id).emit('draw_declined');
        }
        void emitRoomStates(io, service, room.id);
      } catch (err) {
        emitRoomError(socket, err);
      }
    });

    socket.on('request_rematch', () => {
      if (limited()) return;
      const ctx = requireSeat(socket);
      if (!ctx) return;
      try {
        const room = service.requestRematch(ctx.roomId, ctx.playerId);
        if (room.rematchOffer) {
          io.to(room.id).emit('rematch_offered', { by: room.rematchOffer.by });
        }
        void emitRoomStates(io, service, room.id);
      } catch (err) {
        emitRoomError(socket, err);
      }
    });

    socket.on('respond_rematch', (payload) => {
      if (limited()) return;
      const ctx = requireSeat(socket);
      if (!ctx) return;
      const parsed = RespondRematchSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { code: 'INVALID', message: 'accept must be a boolean' });
        return;
      }
      const accept = parsed.data.accept;
      try {
        const oldRoom = service.getRoom(ctx.roomId);
        const result = service.respondRematch(ctx.roomId, ctx.playerId, accept);
        if (result && oldRoom) {
          // Move every socket in the old room into the new room.
          for (const s of socketsIn(io, oldRoom.id)) {
            void s.join(result.id);
            void s.leave(oldRoom.id);
            const pid = (s.data.playerId ?? null) as string | null;
            const newColor: SeatColor | null = pid ? colorOfPlayer(result, pid) : null;
            s.data.roomId = result.id;
            s.data.color = newColor;
            s.data.isSpectator = newColor === null;
          }
          // Sockets have left the old room above, so notify via the new room.
          io.to(result.id).emit('rematch_started', { newRoomId: result.id });
          void emitRoomStates(io, service, result.id);
        } else if (oldRoom) {
          void emitRoomStates(io, service, oldRoom.id);
        }
      } catch (err) {
        emitRoomError(socket, err);
      }
    });

    socket.on('claim_win', () => {
      if (limited()) return;
      const ctx = requireSeat(socket);
      if (!ctx) return;
      try {
        const room = service.claimWin(ctx.roomId, ctx.playerId);
        io.to(room.id).emit('game_over', gameOverPayload(room));
        void emitRoomStates(io, service, room.id);
      } catch (err) {
        emitRoomError(socket, err);
      }
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      limiter.reset(socket.id);
      joinLimiter.reset(`join:${socket.handshake.address ?? 'unknown'}`);
      const found = service.handleSocketDisconnect(socket.id);
      if (found) {
        io.to(found.room.id).emit('opponent_disconnected', {
          color: found.color,
          graceUntil: Date.now() + RECONNECT_WINDOW_MS,
        });
        void emitRoomStates(io, service, found.room.id);
      }
    });
  });
}

function requireSeat(socket: TypedSocket): { roomId: string; playerId: string } | null {
  const roomId = socket.data.roomId;
  const playerId = socket.data.playerId;
  if (!roomId || !playerId) {
    socket.emit('error', { code: 'NOT_A_PLAYER', message: 'Join a room first' });
    return null;
  }
  if (socket.data.isSpectator) {
    socket.emit('error', { code: 'NOT_A_PLAYER', message: 'Spectators cannot act' });
    return null;
  }
  return { roomId, playerId };
}

function emitRoomError(socket: TypedSocket, err: unknown): void {
  if (err instanceof RoomError) {
    const code =
      err.code === 'ALREADY_FINISHED'
        ? ('GAME_OVER' as const)
        : err.code === 'RECONNECT_EXPIRED'
          ? ('NOT_FOUND' as const)
          : err.code;
    socket.emit('error', { code, message: err.message });
    return;
  }
  socket.emit('error', { code: 'INTERNAL', message: 'Internal error' });
}

function socketsIn(io: TypedServer, roomId: string): TypedSocket[] {
  const out: TypedSocket[] = [];
  for (const s of io.sockets.sockets.values() as IterableIterator<TypedSocket>) {
    if (s.rooms.has(roomId)) out.push(s);
  }
  return out;
}

async function emitRoomStates(
  io: TypedServer,
  service: RoomService,
  roomId: string,
  exceptSocketId?: string
): Promise<void> {
  const room = service.getRoom(roomId);
  if (!room) return;
  const snap = service.snapshot(roomId);
  for (const s of socketsIn(io, roomId)) {
    if (exceptSocketId && s.id === exceptSocketId) continue;
    const color = (s.data.color ?? null) as SeatColor | null;
    const isSpectator = s.data.isSpectator ?? color === null;
    const token = isSpectator ? null : (s.data.playerId ?? service.playerIdForSocket(roomId, s.id));
    s.emit('room_state', {
      ...snap,
      yourColor: color,
      isSpectator,
      yourPlayerId: token ?? null,
    });
  }
}
