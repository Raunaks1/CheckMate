import { Router, type Request, type Response } from 'express';
import type { CreateRoomResponse } from 'checkmate-shared';
import { getTimeControl, isTimeControlId } from 'checkmate-shared';
import { RoomError, type RoomService } from '../rooms/service.js';
import { restLimit } from './rateLimit.js';
import { CreateRoomBodySchema, DeletePlayerIdSchema, RoomIdParamSchema } from '../validation.js';

function cappedId(value: unknown): string | null {
  const parsed = RoomIdParamSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createRoomRouter(
  service: RoomService,
  clientOrigin: string,
  hooks?: { onRoomDeleted?: (roomId: string) => void }
): Router {
  const router = Router();
  // 60 creates/cancels per minute per IP: strict enough to blunt room spam
  // and enumeration sweeps, loose enough for test suites and NAT sharing.
  const createLimit = restLimit(60, 60_000);
  const readLimit = restLimit(300, 60_000);

  router.post('/rooms', createLimit, (req: Request, res: Response) => {
    const parsed = CreateRoomBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID', message: 'Invalid room request' });
      return;
    }
    const rawName = parsed.data.name;
    const color = parsed.data.color;
    const timeControlId = parsed.data.timeControl;
    if (!isTimeControlId(timeControlId)) {
      res.status(400).json({ code: 'INVALID', message: 'unknown timeControl' });
      return;
    }
    try {
      const timeControl = getTimeControl(timeControlId);
      const {
        room,
        playerId,
        color: resolved,
      } = service.createRoom({
        name: rawName,
        colorChoice: color,
        timeControl,
      });
      const inviteUrl = `${clientOrigin.replace(/\/$/, '')}/game/${room.id}`;
      const payload: CreateRoomResponse = {
        roomId: room.id,
        playerId,
        color: resolved,
        inviteUrl,
      };
      res.status(201).json(payload);
    } catch (err) {
      if (err instanceof RoomError) {
        res.status(400).json({ code: err.code, message: err.message });
        return;
      }
      throw err;
    }
  });

  router.get('/rooms/:id', readLimit, (req: Request, res: Response) => {
    const id = cappedId(req.params.id);
    if (!id) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Room not found' });
      return;
    }
    try {
      const info = service.publicInfo(id);
      // Room ids are unguessable secrets: never allow caching of lobby lookups.
      res.setHeader('Cache-Control', 'no-store');
      res.json(info);
    } catch (err) {
      if (err instanceof RoomError && err.code === 'NOT_FOUND') {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Room not found' });
        return;
      }
      throw err;
    }
  });

  router.delete('/rooms/:id', createLimit, (req: Request, res: Response) => {
    const id = cappedId(req.params.id);
    if (!id) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Room not found' });
      return;
    }
    const rawPlayerId =
      (req.header('x-player-id') as string | undefined) ??
      (req.body as { playerId?: unknown }).playerId;
    const pidParsed = DeletePlayerIdSchema.safeParse(rawPlayerId ?? null);
    const playerId = pidParsed.success ? (pidParsed.data ?? null) : null;
    if (rawPlayerId !== undefined && playerId === null && rawPlayerId !== null) {
      res.status(400).json({ code: 'INVALID', message: 'Bad player id' });
      return;
    }
    try {
      const roomId = service.deleteRoom(id, playerId);
      hooks?.onRoomDeleted?.(roomId);
      res.json({ ok: true, roomId });
    } catch (err) {
      if (err instanceof RoomError) {
        const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 409;
        res.status(status).json({ code: err.code, message: err.message });
        return;
      }
      throw err;
    }
  });

  return router;
}
