export function storageKey(roomId: string): string {
  return `checkmate:room:${roomId}:playerId`;
}

export function loadPlayerId(roomId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(roomId));
  } catch {
    return null;
  }
}

export function nameKey(roomId: string): string {
  return `checkmate:room:${roomId}:name`;
}

export function loadJoin(roomId: string): { playerId: string; name: string } | null {
  try {
    const playerId = window.localStorage.getItem(storageKey(roomId));
    if (!playerId) return null;
    const name = window.localStorage.getItem(nameKey(roomId)) ?? '';
    return { playerId, name };
  } catch {
    return null;
  }
}

export function saveJoin(roomId: string, playerId: string, name: string): void {
  try {
    window.localStorage.setItem(storageKey(roomId), playerId);
    if (name) window.localStorage.setItem(nameKey(roomId), name);
  } catch {
    // storage unavailable (private mode) — reconnect just won't survive reload
  }
}

export function savePlayerId(roomId: string, playerId: string): void {
  saveJoin(roomId, playerId, '');
}

export function resolveServerUrl(): string | undefined {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const url = env['VITE_SERVER_URL'];
  if (!url || url.length === 0) return undefined;
  return url.replace(/\/+$/, '');
}
