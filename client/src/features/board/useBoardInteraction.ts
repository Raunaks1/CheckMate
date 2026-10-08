import { useCallback, useRef, useState } from 'react';
import type { BoardPiece, LegalMove, Orientation, PromotionPiece, Square } from './types';
import { displayPosToSquare, squareToDisplayPos } from './coordinates';

export interface PendingPromotion {
  from: Square;
  to: Square;
  color: 'w' | 'b';
}

export interface DragState {
  from: Square;
  x: number;
  y: number;
  moved: boolean;
}

interface InteractionArgs {
  pieces: Partial<Record<Square, BoardPiece>>;
  legalMovesProvider?: (square: Square) => LegalMove[];
  onMove?: (from: Square, to: Square, promotion?: PromotionPiece) => void;
  interactive: boolean;
  orientation: Orientation;
}

const CLICK_THRESHOLD_PX = 5;

export function useBoardInteraction({
  pieces,
  legalMovesProvider,
  onMove,
  interactive,
  orientation,
}: InteractionArgs) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [focusSquare, setFocusSquare] = useState<Square>('e2');
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const pendingRef = useRef<PendingPromotion | null>(null);

  const getMoves = useCallback(
    (square: Square): LegalMove[] => {
      if (!interactive || !legalMovesProvider) return [];
      try {
        const moves = legalMovesProvider(square);
        return Array.isArray(moves) ? moves : [];
      } catch {
        return [];
      }
    },
    [interactive, legalMovesProvider]
  );

  const commitMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionPiece) => {
      setSelected(null);
      setDrag(null);
      dragOrigin.current = null;
      onMove?.(from, to, promotion);
    },
    [onMove]
  );

  const attemptMove = useCallback(
    (from: Square, to: Square): boolean => {
      // A pending promotion dialog blocks all other moves until resolved.
      // (handleSquareClick/handleSquareDown already guard, this covers drags.)
      const moves = getMoves(from);
      const found = moves.find((m) => m.to === to);
      if (!found) return false;
      if (found.isPromotion) {
        if (pendingRef.current) return true;
        const piece = pieces[from];
        const next = { from, to, color: piece?.color ?? 'w' } as PendingPromotion;
        pendingRef.current = next;
        setPendingPromotion(next);
        setSelected(null);
        return true;
      }
      commitMove(from, to);
      return true;
    },
    [getMoves, pieces, commitMove]
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      if (!interactive || pendingPromotion) return;
      setFocusSquare(square);
      if (selected === null) {
        if (getMoves(square).length > 0) setSelected(square);
        return;
      }
      if (square === selected) {
        setSelected(null);
        return;
      }
      const moved = attemptMove(selected, square);
      if (!moved) {
        if (getMoves(square).length > 0) setSelected(square);
        else setSelected(null);
      }
    },
    [interactive, pendingPromotion, selected, getMoves, attemptMove]
  );

  const handleSquareDown = useCallback(
    (square: Square, x: number, y: number) => {
      if (!interactive || pendingPromotion) return;
      setFocusSquare(square);
      const piece = pieces[square];
      if (!piece) return;
      if (getMoves(square).length === 0) return;
      dragOrigin.current = { x, y };
      setDrag({ from: square, x, y, moved: false });
    },
    [interactive, pendingPromotion, pieces, getMoves]
  );

  const handleDragMove = useCallback((x: number, y: number) => {
    setDrag((prev) => {
      if (!prev || !dragOrigin.current) return prev;
      const dx = x - dragOrigin.current.x;
      const dy = y - dragOrigin.current.y;
      const moved = prev.moved || Math.hypot(dx, dy) > CLICK_THRESHOLD_PX;
      if (!moved && prev.x === x && prev.y === y) return prev;
      return { ...prev, x, y, moved };
    });
  }, []);

  const handleDragEnd = useCallback(
    (target: Square | null) => {
      setDrag((prev) => {
        if (!prev) return prev;
        if (prev.moved) suppressClick.current = true;
        if (prev.moved && target && target !== prev.from) {
          // Defer move after state clear to avoid setState-in-setState
          queueMicrotask(() => attemptMove(prev.from, target));
        }
        dragOrigin.current = null;
        return null;
      });
    },
    [attemptMove]
  );

  const cancelDrag = useCallback(() => {
    setDrag(null);
    dragOrigin.current = null;
  }, []);

  const moveFocus = useCallback(
    (dRow: number, dCol: number) => {
      setFocusSquare((prev) => {
        const pos = squareToDisplayPos(prev, orientation);
        const next = displayPosToSquare(pos.row + dRow, pos.col + dCol, orientation);
        return next ?? prev;
      });
    },
    [orientation]
  );

  const handleSquareFocus = useCallback((square: Square) => {
    setFocusSquare(square);
  }, []);

  const handleBoardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (pendingPromotion) return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveFocus(-1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveFocus(1, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveFocus(0, -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveFocus(0, 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleSquareClick(focusSquare);
          break;
        case 'Escape':
          setSelected(null);
          cancelDrag();
          break;
      }
    },
    [pendingPromotion, moveFocus, handleSquareClick, focusSquare, cancelDrag]
  );

  const confirmPromotion = useCallback(
    (piece: PromotionPiece) => {
      const pending = pendingRef.current ?? pendingPromotion;
      if (!pending) return;
      const { from, to } = pending;
      pendingRef.current = null;
      setPendingPromotion(null);
      commitMove(from, to, piece);
    },
    [pendingPromotion, commitMove]
  );

  const cancelPromotion = useCallback(() => {
    // Restore the pawn selection so the user can pick another target
    // (or the same one) instead of being left with no selection.
    const pending = pendingRef.current;
    pendingRef.current = null;
    setPendingPromotion(null);
    if (pending) setSelected(pending.from);
  }, []);

  return {
    selected,
    focusSquare,
    pendingPromotion,
    drag,
    getMoves,
    handleSquareClick,
    handleSquareDown,
    handleDragMove,
    handleDragEnd,
    cancelDrag,
    handleSquareFocus,
    handleBoardKeyDown,
    confirmPromotion,
    cancelPromotion,
    setFocusSquare,
  };
}
