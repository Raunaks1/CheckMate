import type { CreateRoomResponse, PublicRoomInfo } from 'checkmate-shared';
import { resolveServerUrl } from './storage';

export function apiBase(): string {
  return resolveServerUrl() ?? '';
}

export type RoomLookup =
  | { kind: 'ready'; info: PublicRoomInfo }
  | { kind: 'not-found' }
  | { kind: 'unreachable'; message: string };

export async function getRoomInfo(roomId: string): Promise<RoomLookup> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/rooms/${roomId}`);
  } catch {
    return { kind: 'unreachable', message: 'Could not reach the game server.' };
  }
  if (res.status === 404) return { kind: 'not-found' };
  if (!res.ok) return { kind: 'unreachable', message: `Server error (${res.status}).` };
  const info = (await res.json()) as PublicRoomInfo;
  return { kind: 'ready', info };
}

export async function postRoom(input: {
  name: string;
  color: 'white' | 'black' | 'random';
  timeControl: string;
}): Promise<CreateRoomResponse> {
  const res = await fetch(`${apiBase()}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Create failed (${res.status})`);
  }
  return (await res.json()) as CreateRoomResponse;
}

export type DeleteResult = { ok: true } | { ok: false; status: number; message: string };

export async function deleteRoom(roomId: string, playerId: string | null): Promise<DeleteResult> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: playerId ? { 'x-player-id': playerId } : {},
    });
  } catch {
    return { ok: false, status: 0, message: 'Could not reach the game server.' };
  }
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return {
    ok: false,
    status: res.status,
    message: body?.message ?? `Delete failed (${res.status})`,
  };
}
