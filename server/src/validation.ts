import { z } from 'zod';

const SQUARE = z.string().regex(/^[a-h][1-8]$/, 'must be a square like e4');
const PROMOTION = z.enum(['q', 'r', 'b', 'n']);
const ROOM_ID = z.string().min(1).max(64);
const PLAYER_ID = z.string().min(1).max(128);
const NAME_RAW = z.string().max(512);

export const MovePayloadSchema = z
  .object({
    from: SQUARE,
    to: SQUARE,
    promotion: PROMOTION.optional(),
  })
  // Unknown keys (fen, clocks, turn, …) are stripped, never trusted.
  .catchall(z.unknown());

export const JoinRoomPayloadSchema = z.object({
  roomId: ROOM_ID,
  playerId: PLAYER_ID.nullish(),
  name: NAME_RAW.nullish(),
});

export const RespondDrawSchema = z.object({ accept: z.boolean() });
export const RespondRematchSchema = z.object({ accept: z.boolean() });

export const CreateRoomBodySchema = z.object({
  name: z.string().max(512),
  color: z.enum(['white', 'black', 'random']),
  timeControl: z.string().min(1).max(32),
});

export const RoomIdParamSchema = ROOM_ID;
export const DeletePlayerIdSchema = z.string().min(1).max(256).nullish();

export type MovePayloadInput = z.infer<typeof MovePayloadSchema>;
