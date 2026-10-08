import { useEffect, useRef } from 'react';
import type { PieceColor, PromotionPiece } from './types';
import { Piece } from './Piece';

interface PromotionChooserProps {
  color: PieceColor;
  onSelect: (piece: PromotionPiece) => void;
  onCancel: () => void;
  anchorStyle: { left: string; top: string; width: string };
  opensUpward: boolean;
}

const OPTIONS: PromotionPiece[] = ['q', 'r', 'b', 'n'];
const NAMES: Record<PromotionPiece, string> = {
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
};

export function PromotionChooser({
  color,
  onSelect,
  onCancel,
  anchorStyle,
  opensUpward,
}: PromotionChooserProps) {
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <>
      <button
        type="button"
        aria-label="Cancel promotion"
        onClick={onCancel}
        className="absolute inset-0 z-20 cursor-default bg-black/40"
      />
      <div
        role="dialog"
        aria-label="Choose promotion piece"
        className="absolute z-30 max-w-[calc(100vw-16px)] rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface-2)] p-1"
        style={anchorStyle}
      >
        <div className={`flex ${opensUpward ? 'flex-col-reverse' : 'flex-col'} gap-1`}>
          {OPTIONS.map((opt, i) => (
            <button
              key={opt}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              aria-label={`Promote to ${NAMES[opt]}`}
              title={NAMES[opt]}
              onClick={() => onSelect(opt)}
              className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-transparent p-1 hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-3)]"
            >
              <Piece color={color} type={opt} className="h-full w-full" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
