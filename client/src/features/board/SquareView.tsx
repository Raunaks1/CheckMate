import { memo } from 'react';
import { clsx } from 'clsx';
import type { PieceColor, PieceType, Square } from './types';
import { colorLabel, pieceLabel } from './coordinates';
import { PieceView } from './PieceView';

interface SquareViewProps {
  square: Square;
  pieceType: PieceType | null;
  pieceColor: PieceColor | null;
  isLight: boolean;
  isSelected: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  isLegalTarget: boolean;
  isCapture: boolean;
  isKeyboardFocus: boolean;
  tabIndex: number;
  slideDx: number;
  slideDy: number;
  animKey: string;
  dimPiece: boolean;
  showInsideCoord?: boolean;
  showFileLabel?: boolean;
  showRankLabel?: boolean;
  onSquareDown: (square: Square, e: React.PointerEvent) => void;
  onSquareClick: (square: Square) => void;
  onSquareFocus: (square: Square) => void;
}

function describeSquare(
  square: Square,
  type: PieceType | null,
  color: PieceColor | null,
  isLegal: boolean
): string {
  if (!type || !color) {
    return isLegal ? `${square}, empty, legal move` : `${square}, empty`;
  }
  const base = `${square}, ${colorLabel(color)} ${pieceLabel(type)}`;
  return isLegal ? `${base}, capturable` : base;
}

export const SquareView = memo(function SquareView({
  square,
  pieceType,
  pieceColor,
  isLight,
  isSelected,
  isLastMove,
  isCheck,
  isLegalTarget,
  isCapture,
  isKeyboardFocus,
  tabIndex,
  slideDx,
  slideDy,
  animKey,
  dimPiece,
  showInsideCoord = false,
  showFileLabel,
  showRankLabel,
  onSquareDown,
  onSquareClick,
  onSquareFocus,
}: SquareViewProps) {
  const file = square[0] as string;
  const rank = square[1] as string;
  const coordColor = isLight ? 'var(--coord-on-light)' : 'var(--coord-on-dark)';
  return (
    <button
      type="button"
      data-square={square}
      aria-label={describeSquare(square, pieceType, pieceColor, isLegalTarget)}
      aria-pressed={isSelected}
      tabIndex={tabIndex}
      onPointerDown={(e) => onSquareDown(square, e)}
      onClick={() => onSquareClick(square)}
      onFocus={() => onSquareFocus(square)}
      className={clsx(
        'relative aspect-square w-full touch-none overflow-hidden focus:outline-none'
      )}
      style={{
        backgroundColor: isLight ? 'var(--sq-light)' : 'var(--sq-dark)',
        boxShadow: isKeyboardFocus ? 'inset 0 0 0 2px var(--accent)' : undefined,
      }}
    >
      {isLastMove && (
        <span className="absolute inset-0" style={{ backgroundColor: 'var(--last-move)' }} />
      )}
      {isSelected && (
        <span
          className="absolute inset-0"
          style={{ boxShadow: 'inset 0 0 0 2px var(--selected)' }}
        />
      )}
      {isCheck && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className="h-[88%] w-[88%] rounded-full"
            style={{ backgroundColor: 'var(--check)' }}
          />
        </span>
      )}

      {isLegalTarget && !isCapture && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className="h-[26%] w-[26%] rounded-full"
            style={{ backgroundColor: 'var(--legal-dot)' }}
          />
        </span>
      )}
      {isLegalTarget && isCapture && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span
            className="h-[92%] w-[92%] rounded-full"
            style={{ border: '3px solid var(--capture-ring)' }}
          />
        </span>
      )}

      {pieceType && pieceColor && (
        <span className="absolute inset-[5%] block">
          <PieceView
            color={pieceColor}
            type={pieceType}
            slideDx={slideDx}
            slideDy={slideDy}
            dimmed={dimPiece}
            animKey={animKey}
          />
        </span>
      )}
      {showInsideCoord && (
        <span aria-hidden className="pointer-events-none absolute inset-1">
          {(showFileLabel ?? rank === '1') && (
            <span
              className="absolute right-0 bottom-0 font-mono text-[11px] leading-none"
              style={{ color: coordColor }}
            >
              {file}
            </span>
          )}
          {(showRankLabel ?? file === 'a') && (
            <span
              className="absolute top-0 left-0 font-mono text-[11px] leading-none"
              style={{ color: coordColor }}
            >
              {rank}
            </span>
          )}
        </span>
      )}
    </button>
  );
});
