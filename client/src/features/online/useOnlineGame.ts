import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Chess } from 'chess.js';
import type {
  ClientToServerEvents,
  GameOverPayload,
  RoomSnapshot,
  SeatColor,
  ServerError,
  ServerToClientEvents,
  Square,
} from 'checkmate-shared';
import type { PromotionPiece } from '@/features/board';
import { playSound } from '../game/sound';
import { useSettingsStore } from '../game/useSettingsStore';
import { getRoomInfo, type RoomLookup } from './api';
import { loadJoin, loadPlayerId, resolveServerUrl, saveJoin } from './storage';

type ServerSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface OpponentGone {
  color: SeatColor;
  graceUntil: number;
}

export interface ClockBase {
  whiteMs: number | null;
  blackMs: number | null;
  turn: 'w' | 'b';
  at: number;
}

export type ConnStatus = 'connected' | 'reconnecting' | 'offline';

export interface PendingMove {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
  fen: string;
}

function winnerOf(result: RoomSnapshot['result']): SeatColor | null {
  if (result === '1-0') return 'white';
  if (result === '0-1') return 'black';
  return null;
}

const ROLLBACK_CODES = new Set(['ILLEGAL_MOVE', 'NOT_YOUR_TURN', 'GAME_OVER', 'NOT_A_PLAYER']);

export function useOnlineGame(roomId: string) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [yourColor, setYourColor] = useState<SeatColor | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [conn, setConn] = useState<ConnStatus>('reconnecting');
  const [roomStatus, setRoomStatus] = useState<RoomLookup | null>(null);
  const [actionError, setActionError] = useState<ServerError | null>(null);
  const [opponentGone, setOpponentGone] = useState<OpponentGone | null>(null);
  const [rematchNewRoomId, setRematchNewRoomId] = useState<string | null>(null);
  const [takenOver, setTakenOver] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [clockBase, setClockBase] = useState<ClockBase>({
    whiteMs: null,
    blackMs: null,
    turn: 'w',
    at: Date.now(),
  });

  const socketRef = useRef<ServerSocket | null>(null);
  const joinArgsRef = useRef<{ name: string } | null>(null);
  const pendingRef = useRef<PendingMove | null>(null);
  const snapshotRef = useRef<RoomSnapshot | null>(null);
  snapshotRef.current = snapshot;
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const setPendingBoth = useCallback((move: PendingMove | null) => {
    pendingRef.current = move;
    setPending(move);
  }, []);

  // --- REST prefetch: 404 vs unreachable vs ready ---
  const prefetch = useCallback(async () => {
    setRoomStatus(null);
    setRoomStatus(await getRoomInfo(roomId));
  }, [roomId]);

  useEffect(() => {
    void prefetch();
  }, [prefetch]);

  // --- connection lifecycle (one socket per roomId) ---
  useEffect(() => {
    const socket: ServerSocket = io(resolveServerUrl(), { transports: ['websocket'] });
    socketRef.current = socket;

    const emitJoin = () => {
      const args = joinArgsRef.current;
      if (!args) return;
      socket.emit('join_room', {
        roomId,
        playerId: loadPlayerId(roomId),
        name: args.name,
      });
    };

    socket.on('connect', () => {
      setConn('connected');
      emitJoin();
    });
    socket.on('disconnect', () => {
      setConn(socket.active ? 'reconnecting' : 'offline');
    });
    socket.on('connect_error', () => {
      setConn(socket.active ? 'reconnecting' : 'offline');
    });

    socket.on('room_state', (state) => {
      setSnapshot(state);
      setYourColor(state.yourColor);
      setIsSpectator(state.isSpectator);
      setTakenOver(false);
      if (state.yourPlayerId) {
        const stored = loadJoin(roomId);
        saveJoin(roomId, state.yourPlayerId, joinArgsRef.current?.name ?? stored?.name ?? '');
      }
      setPendingBoth(null);
      setClockBase({
        whiteMs: state.clocks.whiteMs,
        blackMs: state.clocks.blackMs,
        turn: state.turn,
        at: Date.now(),
      });
      if (state.status === 'finished') {
        setOpponentGone(null);
      } else if (state.players.white?.connected && state.players.black?.connected) {
        setOpponentGone(null);
      }
    });
    socket.on('move_made', (payload) => {
      playSound('move', soundRef.current);
      setPendingBoth(null);
      setClockBase({
        whiteMs: payload.clocks.whiteMs,
        blackMs: payload.clocks.blackMs,
        turn: payload.turn,
        at: Date.now(),
      });
    });
    socket.on('clock_update', (payload) => {
      setClockBase({
        whiteMs: payload.whiteMs,
        blackMs: payload.blackMs,
        turn: payload.turn,
        at: Date.now(),
      });
    });
    socket.on('opponent_connected', () => setOpponentGone(null));
    socket.on('opponent_disconnected', (payload) => {
      setOpponentGone({ color: payload.color, graceUntil: payload.graceUntil });
    });
    socket.on('draw_offered', () => undefined);
    socket.on('draw_declined', () => undefined);
    socket.on('game_over', () => {
      playSound('end', soundRef.current);
      setPendingBoth(null);
    });
    socket.on('rematch_offered', () => undefined);
    socket.on('rematch_started', (payload) => setRematchNewRoomId(payload.newRoomId));
    socket.on('session_takeover', () => setTakenOver(true));
    socket.on('room_closed', () => setRoomClosed(true));
    socket.on('error', (payload) => {
      if (pendingRef.current && ROLLBACK_CODES.has(payload.code)) setPendingBoth(null);
      setActionError(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, setPendingBoth]);

  const join = useCallback(
    (name: string) => {
      setActionError(null);
      setTakenOver(false);
      joinArgsRef.current = { name };
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit('join_room', { roomId, playerId: loadPlayerId(roomId), name });
      } else {
        socket?.connect();
      }
    },
    [roomId]
  );

  const retry = useCallback(() => {
    setActionError(null);
    void prefetch();
    const socket = socketRef.current;
    if (socket && !socket.connected) socket.connect();
  }, [prefetch]);

  const sendMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionPiece) => {
      // One in-flight move at a time: a second move before the server
      // acknowledges the first would rebase on a stale fen and desync.
      if (pendingRef.current) {
        setActionError({ code: 'INVALID', message: 'Wait for your move to send' });
        return;
      }
      setActionError(null);
      const base = snapshotRef.current;
      if (!base) return;
      // Optimistic: apply locally first; rollback if the server rejects.
      // (There is no in-flight move here — the guard above returned — so
      // the authoritative snapshot fen is always the correct base.)
      const baseFen = base.fen;
      try {
        const local = new Chess(baseFen);
        if (promotion) local.move({ from, to, promotion });
        else local.move({ from, to });
        setPendingBoth({ from, to, promotion, fen: local.fen() });
      } catch {
        // Locally illegal — still send so the server returns a typed error.
        setPendingBoth(null);
      }
      socketRef.current?.emit('move', promotion ? { from, to, promotion } : { from, to });
    },
    [setPendingBoth]
  );

  const resign = useCallback(() => {
    socketRef.current?.emit('resign');
  }, []);

  const offerDraw = useCallback(() => {
    socketRef.current?.emit('offer_draw');
  }, []);

  const respondDraw = useCallback((accept: boolean) => {
    socketRef.current?.emit('respond_draw', { accept });
  }, []);

  const requestRematch = useCallback(() => {
    socketRef.current?.emit('request_rematch');
  }, []);

  const respondRematch = useCallback((accept: boolean) => {
    socketRef.current?.emit('respond_rematch', { accept });
  }, []);

  const claimWin = useCallback(() => {
    socketRef.current?.emit('claim_win');
  }, []);

  const takeBack = useCallback(() => {
    const stored = loadJoin(roomId);
    join(stored?.name || joinArgsRef.current?.name || 'Player');
  }, [roomId, join]);

  const clearActionError = useCallback(() => setActionError(null), []);

  const gameOver: GameOverPayload | null = useMemo(() => {
    if (!snapshot || snapshot.status !== 'finished') return null;
    return {
      result: snapshot.result,
      reason: (snapshot.resultReason ?? 'draw-agreed') as GameOverPayload['reason'],
      winner: winnerOf(snapshot.result),
    };
  }, [snapshot]);

  const displayFen = pending?.fen ?? snapshot?.fen ?? START_FEN;

  return {
    snapshot,
    displayFen,
    pendingMove: pending,
    yourColor,
    isSpectator,
    conn,
    roomStatus,
    actionError,
    opponentGone,
    rematchNewRoomId,
    takenOver,
    roomClosed,
    clockBase,
    gameOver,
    join,
    retry,
    sendMove,
    resign,
    offerDraw,
    respondDraw,
    requestRematch,
    respondRematch,
    claimWin,
    takeBack,
    clearActionError,
  };
}
