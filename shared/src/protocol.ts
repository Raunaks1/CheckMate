import type {
  Clocks,
  GameResult,
  MoveSummary,
  ResultReason,
  RoomSnapshot,
  SeatColor,
  Square,
  PromotionPiece,
  Turn,
} from './rooms.js';

export type ErrorCode =
  | 'NOT_FOUND'
  | 'INVALID'
  | 'ROOM_FULL'
  | 'NOT_A_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'ILLEGAL_MOVE'
  | 'GAME_OVER'
  | 'RATE_LIMITED'
  | 'RECONNECT_EXPIRED'
  | 'CLAIM_TOO_EARLY'
  | 'ALREADY_FINISHED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL';

export interface ServerError {
  code: ErrorCode;
  message: string;
}

// ---- REST ----

export interface CreateRoomRequest {
  name: string;
  color: 'white' | 'black' | 'random';
  timeControl: string;
}

export interface CreateRoomResponse {
  roomId: string;
  playerId: string;
  color: SeatColor;
  inviteUrl: string;
}

// ---- Client -> Server ----

export interface JoinRoomPayload {
  roomId: string;
  playerId?: string | null;
  name?: string;
}

export interface MovePayload {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

export interface RespondDrawPayload {
  accept: boolean;
}

export interface RespondRematchPayload {
  accept: boolean;
}

export interface ClientToServerEvents {
  join_room: (payload: JoinRoomPayload) => void;
  move: (payload: MovePayload) => void;
  resign: () => void;
  offer_draw: () => void;
  respond_draw: (payload: RespondDrawPayload) => void;
  request_rematch: () => void;
  respond_rematch: (payload: RespondRematchPayload) => void;
  claim_win: () => void;
  ping: () => void;
}

// ---- Server -> Client ----

export interface RoomStatePayload extends RoomSnapshot {
  /** Seat of this socket, null for spectators. */
  yourColor: SeatColor | null;
  isSpectator: boolean;
  /** Secret resume token for this seat. Null for spectators. Persist per room. */
  yourPlayerId: string | null;
}

export interface MoveMadePayload {
  move: MoveSummary;
  fen: string;
  pgn: string;
  turn: Turn;
  clocks: Clocks;
  san: string;
}

export interface ClockUpdatePayload extends Clocks {
  turn: Turn;
}

export interface OpponentConnectedPayload {
  color: SeatColor;
}

export interface OpponentDisconnectedPayload {
  color: SeatColor;
  /** Epoch ms after which the remaining player may claim the win. */
  graceUntil: number;
}

export interface DrawOfferedPayload {
  by: Turn;
}

export interface GameOverPayload {
  result: GameResult;
  reason: Exclude<ResultReason, null>;
  winner?: SeatColor | null;
}

export interface RematchOfferedPayload {
  by: Turn;
}

export interface RematchStartedPayload {
  newRoomId: string;
}

export interface RoomClosedPayload {
  reason: 'cancelled';
}

export interface ServerToClientEvents {
  room_state: (payload: RoomStatePayload) => void;
  move_made: (payload: MoveMadePayload) => void;
  clock_update: (payload: ClockUpdatePayload) => void;
  opponent_connected: (payload: OpponentConnectedPayload) => void;
  opponent_disconnected: (payload: OpponentDisconnectedPayload) => void;
  draw_offered: (payload: DrawOfferedPayload) => void;
  draw_declined: () => void;
  game_over: (payload: GameOverPayload) => void;
  rematch_offered: (payload: RematchOfferedPayload) => void;
  rematch_started: (payload: RematchStartedPayload) => void;
  /** Emitted to a stale socket when the same seat joins from a newer tab. */
  session_takeover: () => void;
  /** Emitted to room members when the room is deleted (host cancel). */
  room_closed: (payload: RoomClosedPayload) => void;
  error: (payload: ServerError) => void;
  pong: () => void;
}

export interface InterServerEvents {
  // Reserved for future cross-server messages.
  ping?: () => void;
}

export interface SocketData {
  roomId?: string;
  playerId?: string;
  color?: SeatColor | null;
  isSpectator?: boolean;
}
