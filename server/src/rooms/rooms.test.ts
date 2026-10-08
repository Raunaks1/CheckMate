import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  CreateRoomResponse,
  GameOverPayload,
  MoveMadePayload,
  PublicRoomInfo,
  RoomStatePayload,
  ServerError,
  ServerToClientEvents,
} from 'checkmate-shared';
import { createApp, type AppContext } from '../index.js';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let ctx: AppContext;
let baseUrl: string;
const sockets: ClientSocket[] = [];

function track(socket: ClientSocket): ClientSocket {
  sockets.push(socket);
  return socket;
}

function connect(): ClientSocket {
  const socket: ClientSocket = io(baseUrl, { transports: ['websocket'], forceNew: true });
  return track(socket);
}

function waitFor<T>(socket: ClientSocket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timed out waiting for ${event}`));
    }, timeoutMs);
    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.once(event as any, handler as any);
  });
}

function waitForConnect(socket: ClientSocket): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect timeout')), 5000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function createRoom(body: { name: string; color: string; timeControl: string }): Promise<{
  status: number;
  json: CreateRoomResponse & { code?: string; message?: string };
}> {
  const res = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as CreateRoomResponse & { code?: string; message?: string };
  return { status: res.status, json };
}

async function join(
  socket: ClientSocket,
  payload: { roomId: string; playerId?: string | null; name?: string }
): Promise<RoomStatePayload> {
  await waitForConnect(socket);
  const statePromise = waitFor<RoomStatePayload>(socket, 'room_state');
  socket.emit('join_room', payload);
  return statePromise;
}

beforeAll(async () => {
  ctx = createApp({ clientOrigin: 'http://localhost:5173' });
  await new Promise<void>((resolve) => {
    ctx.httpServer.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = ctx.httpServer.address();
  if (!addr || typeof addr === 'string') throw new Error('no address');
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterEach(() => {
  for (const s of sockets.splice(0)) {
    s.removeAllListeners();
    s.disconnect();
  }
});

afterAll(async () => {
  for (const s of sockets.splice(0)) {
    s.removeAllListeners();
    s.disconnect();
  }
  ctx.io.close();
  await new Promise<void>((resolve) => ctx.httpServer.close(() => resolve()));
});

describe('REST rooms', () => {
  it('creates a room and returns the public info', async () => {
    const { status, json } = await createRoom({
      name: 'Alice',
      color: 'white',
      timeControl: '10+0',
    });
    expect(status).toBe(201);
    expect(json.roomId).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(json.playerId).toBeTruthy();
    expect(json.color).toBe('white');
    expect(json.inviteUrl).toContain(`/game/${json.roomId}`);

    const res = await fetch(`${baseUrl}/api/rooms/${json.roomId}`);
    expect(res.status).toBe(200);
    const info = (await res.json()) as PublicRoomInfo;
    expect(info.id).toBe(json.roomId);
    expect(info.status).toBe('waiting');
    expect(info.whiteTaken).toBe(true);
    expect(info.blackTaken).toBe(false);
    expect(info.timeControl.id).toBe('10+0');
  });

  it('rejects unknown time controls and missing names', async () => {
    const bad = await createRoom({ name: 'Bob', color: 'white', timeControl: 'nope' });
    expect(bad.status).toBe(400);
    const empty = await createRoom({ name: '   ', color: 'black', timeControl: '5+0' });
    expect(empty.status).toBe(400);
  });

  it('sanitizes long names', async () => {
    const { status, json } = await createRoom({
      name: 'averylongdisplaynamethatexceedstwenty',
      color: 'black',
      timeControl: 'unlimited',
    });
    expect(status).toBe(201);
    const res = await fetch(`${baseUrl}/api/rooms/${json.roomId}`);
    const info = (await res.json()) as PublicRoomInfo;
    expect(info.blackName?.length).toBeLessThanOrEqual(20);
  });

  it('answers health checks', async () => {
    for (const path of ['/health', '/api/health']) {
      const res = await fetch(`${baseUrl}${path}`);
      expect(res.status).toBe(200);
      expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
    }
  });
});

describe('socket rooms', () => {
  it('second visitor takes the free color; third joins as spectator', async () => {
    const { json } = await createRoom({ name: 'Host', color: 'white', timeControl: 'unlimited' });
    const host = connect();
    const hostState = await join(host, { roomId: json.roomId, playerId: json.playerId });
    expect(hostState.yourColor).toBe('white');
    expect(hostState.isSpectator).toBe(false);

    const guest = connect();
    const guestState = await join(guest, { roomId: json.roomId, name: 'Guest' });
    expect(guestState.yourColor).toBe('black');
    expect(guestState.isSpectator).toBe(false);
    expect(guestState.yourPlayerId).toBeTruthy();
    expect(guestState.status).toBe('active');

    const watcher = connect();
    const watchState = await join(watcher, { roomId: json.roomId, name: 'Watcher' });
    expect(watchState.isSpectator).toBe(true);
    expect(watchState.yourColor).toBe(null);
    expect(watchState.yourPlayerId).toBe(null);
  });

  it('relays a legal move with authoritative clocks', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: '10+0' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    const whiteMove = waitFor<MoveMadePayload>(white, 'move_made');
    const blackMove = waitFor<MoveMadePayload>(black, 'move_made');
    white.emit('move', { from: 'e2', to: 'e4' });
    const [w, b] = await Promise.all([whiteMove, blackMove]);
    expect(w.move.san).toBe('e4');
    expect(b.fen).toContain(' b ');
    expect(w.clocks.whiteMs).not.toBe(null);
    expect(w.turn).toBe('b');
  });

  it('rejects illegal moves', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    const errPromise = waitFor<ServerError>(white, 'error');
    white.emit('move', { from: 'e2', to: 'e5' });
    const err = await errPromise;
    expect(err.code).toBe('ILLEGAL_MOVE');
  });

  it('rejects out-of-turn moves', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    const errPromise = waitFor<ServerError>(black, 'error');
    black.emit('move', { from: 'e7', to: 'e5' });
    const err = await errPromise;
    expect(err.code).toBe('NOT_YOUR_TURN');
  });

  it('spectators cannot move', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });
    const watcher = connect();
    await join(watcher, { roomId: json.roomId, name: 'Watch' });

    const errPromise = waitFor<ServerError>(watcher, 'error');
    watcher.emit('move', { from: 'e2', to: 'e4' });
    const err = await errPromise;
    expect(err.code).toBe('NOT_A_PLAYER');
  });

  it('resign ends the game', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    const over = waitFor<GameOverPayload>(white, 'game_over');
    black.emit('resign');
    const payload = await over;
    expect(payload.reason).toBe('resign');
    expect(payload.result).toBe('1-0');
    expect(payload.winner).toBe('white');
  });

  it('draw offer accepted ends in a draw; declined continues', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    const offered = waitFor<{ by: string }>(black, 'draw_offered');
    white.emit('offer_draw');
    expect((await offered).by).toBe('w');

    const declined = waitFor<unknown>(white, 'draw_declined');
    black.emit('respond_draw', { accept: false });
    await declined;

    // Offer again, this time accept.
    const offered2 = waitFor<{ by: string }>(black, 'draw_offered');
    white.emit('offer_draw');
    await offered2;
    const over = waitFor<GameOverPayload>(white, 'game_over');
    black.emit('respond_draw', { accept: true });
    const payload = await over;
    expect(payload.reason).toBe('draw-agreed');
    expect(payload.result).toBe('1/2-1/2');
  });

  it('detects checkmate (Fool\u2019s mate)', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    const moves: Array<{
      socket: ClientSocket;
      from: 'f2' | 'e7' | 'g2' | 'd8';
      to: 'f3' | 'e5' | 'g4' | 'h4';
    }> = [
      { socket: white, from: 'f2', to: 'f3' },
      { socket: black, from: 'e7', to: 'e5' },
      { socket: white, from: 'g2', to: 'g4' },
    ];
    for (const m of moves) {
      const done = waitFor<MoveMadePayload>(black, 'move_made');
      m.socket.emit('move', { from: m.from, to: m.to });
      await done;
    }
    const overWhite = waitFor<GameOverPayload>(white, 'game_over');
    const overBlack = waitFor<GameOverPayload>(black, 'game_over');
    black.emit('move', { from: 'd8', to: 'h4' });
    const [w, b] = await Promise.all([overWhite, overBlack]);
    expect(w.reason).toBe('checkmate');
    expect(w.result).toBe('0-1');
    expect(b.winner).toBe('black');
  });

  it('reconnect resumes the seat; early claim-win is rejected', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    const blackState = await join(black, { roomId: json.roomId, name: 'B' });
    const blackToken = blackState.yourPlayerId;
    expect(blackToken).toBeTruthy();

    // Black drops; white cannot claim immediately.
    const gone = waitFor<{ color: string }>(white, 'opponent_disconnected');
    black.disconnect();
    await gone;
    const tooEarly = waitFor<ServerError>(white, 'error');
    white.emit('claim_win');
    expect((await tooEarly).code).toBe('CLAIM_TOO_EARLY');

    // Black returns with the saved token and resumes the seat.
    const black2 = connect();
    const resumed = await join(black2, { roomId: json.roomId, playerId: blackToken, name: 'B' });
    expect(resumed.yourColor).toBe('black');
    expect(resumed.isSpectator).toBe(false);

    const done = waitFor<MoveMadePayload>(white, 'move_made');
    white.emit('move', { from: 'e2', to: 'e4' });
    await done;
  });

  it('claim-win succeeds after the reconnect window', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });
    const gone = waitFor<{ color: string }>(white, 'opponent_disconnected');
    black.disconnect();
    await gone;

    // Age the disconnect past the 60s window (white-box on the same service).
    const room = ctx.service.getRoom(json.roomId);
    const slot = room?.players.black;
    if (!slot) throw new Error('missing black slot');
    slot.disconnectedAt = Date.now() - 61_000;

    const over = waitFor<GameOverPayload>(white, 'game_over');
    white.emit('claim_win');
    const payload = await over;
    expect(payload.result).toBe('1-0');
    expect(payload.reason).toBe('opponent-disconnected');
  });

  it('flags on timeout with a per-room timer', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: '1+0' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    ctx.service.debugSetClocks(json.roomId, 250, 60_000);
    const over = waitFor<GameOverPayload>(white, 'game_over', 8000);
    const payload = await over;
    expect(payload.reason).toBe('timeout');
    expect(payload.result).toBe('0-1');
  });

  it('rematch creates a swapped-color game', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    const over = waitFor<GameOverPayload>(black, 'game_over');
    white.emit('resign');
    await over;

    const offered = waitFor<{ by: string }>(black, 'rematch_offered');
    white.emit('request_rematch');
    await offered;

    const startedWhite = waitFor<{ newRoomId: string }>(white, 'rematch_started');
    const startedBlack = waitFor<{ newRoomId: string }>(black, 'rematch_started');
    black.emit('respond_rematch', { accept: true });
    const [s1, s2] = await Promise.all([startedWhite, startedBlack]);
    expect(s1.newRoomId).toBeTruthy();
    expect(s1.newRoomId).toBe(s2.newRoomId);
    expect(s1.newRoomId).not.toBe(json.roomId);
  });

  it('cleans up finished rooms after 30 minutes', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });
    const over = waitFor<GameOverPayload>(white, 'game_over');
    white.emit('resign');
    await over;

    const room = ctx.service.getRoom(json.roomId);
    if (!room) throw new Error('missing room');
    room.lastActivity = Date.now() - 31 * 60 * 1000;
    const deleted = ctx.service.cleanup();
    expect(deleted).toContain(json.roomId);
    expect(ctx.service.getRoom(json.roomId)).toBeUndefined();
  });
});

describe('rate limiter', () => {
  it('allows bursts but caps sustained spam', async () => {
    const { RateLimiter } = await import('../rooms/rateLimit.js');
    const limiter = new RateLimiter(3, 1000);
    expect(limiter.check('s')).toBe(true);
    expect(limiter.check('s')).toBe(true);
    expect(limiter.check('s')).toBe(true);
    expect(limiter.check('s')).toBe(false);
  });
});

describe('room cancel (DELETE /api/rooms/:id)', () => {
  it('host can cancel a waiting room; room is gone afterwards', async () => {
    const { json } = await createRoom({ name: 'Host', color: 'white', timeControl: '10+0' });
    const res = await fetch(`${baseUrl}/api/rooms/${json.roomId}`, {
      method: 'DELETE',
      headers: { 'x-player-id': json.playerId },
    });
    expect(res.status).toBe(200);
    const gone = await fetch(`${baseUrl}/api/rooms/${json.roomId}`);
    expect(gone.status).toBe(404);
  });

  it('broadcasts room_closed to members on cancel', async () => {
    const { json } = await createRoom({ name: 'Host', color: 'white', timeControl: 'unlimited' });
    const host = connect();
    await join(host, { roomId: json.roomId, playerId: json.playerId });
    const closed = waitFor<{ reason: string }>(host, 'room_closed');
    const res = await fetch(`${baseUrl}/api/rooms/${json.roomId}`, {
      method: 'DELETE',
      headers: { 'x-player-id': json.playerId },
    });
    expect(res.status).toBe(200);
    expect((await closed).reason).toBe('cancelled');
  });

  it('rejects cancel by non-owners and for active rooms', async () => {
    const { json } = await createRoom({ name: 'Host', color: 'white', timeControl: 'unlimited' });
    const stranger = await fetch(`${baseUrl}/api/rooms/${json.roomId}`, {
      method: 'DELETE',
      headers: { 'x-player-id': 'nope' },
    });
    expect(stranger.status).toBe(403);
    const anonymous = await fetch(`${baseUrl}/api/rooms/${json.roomId}`, { method: 'DELETE' });
    expect(anonymous.status).toBe(403);

    const host = connect();
    await join(host, { roomId: json.roomId, playerId: json.playerId });
    const guest = connect();
    await join(guest, { roomId: json.roomId, name: 'Guest' });
    const active = await fetch(`${baseUrl}/api/rooms/${json.roomId}`, {
      method: 'DELETE',
      headers: { 'x-player-id': json.playerId },
    });
    expect(active.status).toBe(409);
  });

  it('returns 404 for unknown rooms', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/xxxxxxxx`, {
      method: 'DELETE',
      headers: { 'x-player-id': 'whatever' },
    });
    expect(res.status).toBe(404);
  });
});

describe('seat takeover', () => {
  it('newer tab takes the seat; stale tab gets session_takeover', async () => {
    const { json } = await createRoom({ name: 'Host', color: 'white', timeControl: 'unlimited' });
    const first = connect();
    await join(first, { roomId: json.roomId, playerId: json.playerId });
    const taken = waitFor<unknown>(first, 'session_takeover');
    const second = connect();
    await join(second, { roomId: json.roomId, playerId: json.playerId, name: 'Host' });
    await taken;
  });
});

describe('flag fall with insufficient material', () => {
  it('K vs K flag is a draw, not a loss', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: '1+0' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    // White-box: strip to bare kings, black to move and already flagged.
    const room = ctx.service.getRoom(json.roomId);
    if (!room) throw new Error('missing room');
    room.chess.load('8/8/4k3/8/8/4K3/8/8 b - - 0 1');
    ctx.service.debugSetClocks(json.roomId, 60_000, 0);

    const over = waitFor<GameOverPayload>(white, 'game_over');
    // Trigger the server-side timeout poll via a move attempt (flag path).
    white.emit('move', { from: 'e2', to: 'e4' });
    const payload = await over;
    expect(payload.result).toBe('1/2-1/2');
    expect(payload.reason).toBe('draw-insufficient');
  });

  it('K+Q vs K flag is still a loss for the flagger', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: '1+0' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    const room = ctx.service.getRoom(json.roomId);
    if (!room) throw new Error('missing room');
    // Black to move with only a bare king; white has K+Q and time left.
    room.chess.load('8/8/4k3/8/8/4K3/8/3Q4 b - - 0 1');
    ctx.service.debugSetClocks(json.roomId, 60_000, 0);

    const over = waitFor<GameOverPayload>(white, 'game_over');
    white.emit('move', { from: 'e2', to: 'e4' });
    const payload = await over;
    expect(payload.result).toBe('1-0');
    expect(payload.reason).toBe('timeout');
  });

  it('single minor vs bare king flag is a draw (FIDE)', async () => {
    const { flagIsDraw, flagMaterialFromFen } = await import('checkmate-shared');
    // K+N vs K, white (winner) has one minor and loser is bare.
    // NOTE: uppercase = white pieces in FEN placement.
    const { white, black } = flagMaterialFromFen('5N2/8/4k3/8/8/4K3/8/8 w - - 0 1');
    expect(flagIsDraw(white, black)).toBe(true);
    // K+B+N vs K can still mate.
    const m2 = flagMaterialFromFen('5BN1/8/4k3/8/8/4K3/8/8 w - - 0 1');
    expect(flagIsDraw(m2.white, m2.black)).toBe(false);
    // Any pawn means mating material exists.
    const m3 = flagMaterialFromFen('8/8/4k3/8/8/4K3/8/P7 w - - 0 1');
    expect(flagIsDraw(m3.white, m3.black)).toBe(false);
  });
});

describe('input validation (zod)', () => {
  it('rejects malformed move payloads with INVALID', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    for (const bad of [
      { from: 'e2' },
      { from: 'e9', to: 'e4' },
      { from: 'e2', to: 'e4', promotion: 'k' },
      { from: 'e2', to: 'e4', promotion: 'qq' },
      'e2e4',
      null,
    ]) {
      const errPromise = waitFor<ServerError>(white, 'error');
      white.emit('move', bad as unknown as { from: string; to: string });
      const err = await errPromise;
      expect(['INVALID', 'ILLEGAL_MOVE']).toContain(err.code);
    }
  });

  it('ignores forged extra fields (fen, clocks, turn)', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });

    const done = waitFor<MoveMadePayload>(black, 'move_made');
    white.emit('move', {
      from: 'e2',
      to: 'e4',
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      clocks: { whiteMs: 999999, blackMs: 999999 },
    } as unknown as { from: string; to: string });
    const payload = await done;
    expect(payload.move.san).toBe('e4');
    // Server stayed authoritative: real game continued from the start.
    expect(payload.fen).toContain(' b ');
  });

  it('rejects malformed join and draw payloads', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: 'unlimited' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });

    const badJoin = waitFor<ServerError>(white, 'error');
    white.emit('join_room', { roomId: '', playerId: 42 });
    expect((await badJoin).code).toBe('INVALID');

    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });
    const badDraw = waitFor<ServerError>(white, 'error');
    white.emit('respond_draw', { accept: 'yes' });
    expect((await badDraw).code).toBe('INVALID');
  });

  it('rejects oversized REST bodies and bad room ids', async () => {
    const big = await createRoom({
      name: 'x'.repeat(600),
      color: 'white',
      timeControl: '10+0',
    });
    expect(big.status).toBe(400);
    const badColor = await createRoom({ name: 'W', color: 'whitee', timeControl: '10+0' });
    expect(badColor.status).toBe(400);
    const res = await fetch(`${baseUrl}/api/rooms/${'y'.repeat(65)}`);
    expect(res.status).toBe(404);
  });
});

describe('clock start', () => {
  it('clocks do not run until the first move', async () => {
    const { json } = await createRoom({ name: 'W', color: 'white', timeControl: '1+0' });
    const white = connect();
    await join(white, { roomId: json.roomId, playerId: json.playerId });
    const black = connect();
    await join(black, { roomId: json.roomId, name: 'B' });
    const before = ctx.service.getRoom(json.roomId);
    expect(before?.status).toBe('active');
    expect(before?.lastTickAt).toBe(null);

    const done = waitFor<MoveMadePayload>(black, 'move_made');
    white.emit('move', { from: 'e2', to: 'e4' });
    await done;
    const after = ctx.service.getRoom(json.roomId);
    expect(after?.lastTickAt).not.toBe(null);
  });
});
