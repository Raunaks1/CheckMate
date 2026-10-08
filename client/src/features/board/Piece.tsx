import { memo } from 'react';
import type { PieceColor, PieceType } from './types';
import { pieceAlt, pieceSrc } from './pieceSet';
import { useSettingsStore } from '../game/useSettingsStore';

interface PieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
  decorative?: boolean;
}

/**
 * Shared chess piece. Reads its artwork from the PIECE_SETS registry via
 * the persisted pieceSetId setting, so switching sets updates every piece
 * instantly with no reload. Plain <img>, explicit fill sizing, no filters,
 * no shadows.
 */
export const Piece = memo(function Piece({
  type,
  color,
  className,
  decorative = true,
}: PieceProps) {
  const setId = useSettingsStore((s) => s.pieceSetId);
  return (
    <img
      src={pieceSrc(setId, color, type)}
      alt={decorative ? '' : pieceAlt(color, type)}
      aria-hidden={decorative}
      draggable={false}
      decoding="async"
      width="100%"
      height="100%"
      className={className}
    />
  );
});
