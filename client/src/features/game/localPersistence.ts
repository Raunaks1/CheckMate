import type { Orientation, PromotionPiece, Square } from '@/features/board';

export const LOCAL_GAME_KEY = 'checkmate-local-game';
export const COMPUTER_GAME_KEY = 'checkmate-computer-game';
export const LOCAL_PREFS_KEY = 'checkmate-local-prefs';

export interface SavedMove {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

export interface SavedLocalGame {
  version: 1;
  moves: SavedMove[];
  whiteName: string;
  blackName: string;
  timeControlId: string;
  whiteMs: number | null;
  blackMs: number | null;
  orientation: Orientation;
  difficultyId?: string;
}

export interface LocalPrefs {
  rotateBoardEachTurn: boolean;
  tabletopMode: boolean;
}

function isSquare(value: unknown): value is Square {
  return typeof value === 'string' && /^[a-h][1-8]$/.test(value);
}

function isSavedMove(value: unknown): value is SavedMove {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  if (!isSquare(m.from) || !isSquare(m.to)) return false;
  if (m.promotion !== undefined && !['q', 'r', 'b', 'n'].includes(m.promotion as string)) {
    return false;
  }
  return true;
}

export function loadSavedGame(key: string): SavedLocalGame | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    if (p.version !== 1 || !Array.isArray(p.moves) || p.moves.length === 0) return null;
    if (!p.moves.every(isSavedMove)) return null;
    if (typeof p.whiteName !== 'string' || typeof p.blackName !== 'string') return null;
    if (typeof p.timeControlId !== 'string') return null;
    if (p.whiteMs !== null && typeof p.whiteMs !== 'number') return null;
    if (p.blackMs !== null && typeof p.blackMs !== 'number') return null;
    if (p.orientation !== 'white' && p.orientation !== 'black') return null;
    return {
      version: 1,
      moves: p.moves as SavedMove[],
      whiteName: p.whiteName as string,
      blackName: p.blackName as string,
      timeControlId: p.timeControlId as string,
      whiteMs: p.whiteMs as number | null,
      blackMs: p.blackMs as number | null,
      orientation: p.orientation as Orientation,
      ...(typeof p.difficultyId === 'string' ? { difficultyId: p.difficultyId } : {}),
    };
  } catch {
    return null;
  }
}

export function loadLocalGame(): SavedLocalGame | null {
  return loadSavedGame(LOCAL_GAME_KEY);
}

export function saveGame(key: string, game: SavedLocalGame): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(game));
  } catch {
    // Storage full or unavailable — game continues without persistence
  }
}

export function saveLocalGame(game: SavedLocalGame): void {
  saveGame(LOCAL_GAME_KEY, game);
}

export function clearGame(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearLocalGame(): void {
  clearGame(LOCAL_GAME_KEY);
}

export function loadLocalPrefs(): LocalPrefs {
  try {
    const raw = window.localStorage.getItem(LOCAL_PREFS_KEY);
    if (!raw) return { rotateBoardEachTurn: false, tabletopMode: false };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { rotateBoardEachTurn: false, tabletopMode: false };
    }
    const p = parsed as Record<string, unknown>;
    return {
      rotateBoardEachTurn: p.rotateBoardEachTurn === true,
      tabletopMode: p.tabletopMode === true,
    };
  } catch {
    return { rotateBoardEachTurn: false, tabletopMode: false };
  }
}

export function saveLocalPrefs(prefs: LocalPrefs): void {
  try {
    window.localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
