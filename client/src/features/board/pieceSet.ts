import type { PieceColor, PieceType } from './types';

export interface PieceSetDef {
  label: string;
  base: string;
}

/**
 * Piece-set registry. To add a set (e.g. Cburnett):
 * 1. add one entry here with the same 12 filenames,
 * 2. drop the SVGs into /pieces/<id>/,
 * 3. add the 12 preload links in index.html + sw.js CORE.
 * Entries without shipped SVGs must NOT be registered (tiles would 404).
 */
export const PIECE_SETS = {
  merida: { label: 'Merida', base: '/pieces/merida' },
} as const satisfies Record<string, PieceSetDef>;

export type PieceSetId = keyof typeof PIECE_SETS;
export const DEFAULT_PIECE_SET_ID: PieceSetId = 'merida';

const FILES: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: 'wK.svg', q: 'wQ.svg', r: 'wR.svg', b: 'wB.svg', n: 'wN.svg', p: 'wP.svg' },
  b: { k: 'bK.svg', q: 'bQ.svg', r: 'bR.svg', b: 'bB.svg', n: 'bN.svg', p: 'bP.svg' },
};

function resolveSetId(setId: string): PieceSetId {
  return setId in PIECE_SETS ? (setId as PieceSetId) : DEFAULT_PIECE_SET_ID;
}

export function pieceSrc(setId: string, color: PieceColor, type: PieceType): string {
  const id = resolveSetId(setId);
  return `${PIECE_SETS[id].base}/${FILES[color][type]}`;
}

export function pieceAlt(color: PieceColor, type: PieceType): string {
  const names: Record<PieceType, string> = {
    k: 'king',
    q: 'queen',
    r: 'rook',
    b: 'bishop',
    n: 'knight',
    p: 'pawn',
  };
  return `${color === 'w' ? 'White' : 'Black'} ${names[type]}`;
}
