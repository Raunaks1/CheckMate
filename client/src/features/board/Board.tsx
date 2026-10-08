import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { BoardProps, Square } from './types';
import {
  displayPosToSquare,
  getDisplaySquares,
  isLightSquare,
  squareToCoords,
  squareToDisplayPos,
} from './coordinates';
import { parseFenBoard } from './fen';
import { HintArrow } from './HintArrow';
import { SquareView } from './SquareView';
import { Piece } from './Piece';
import { PromotionChooser } from './PromotionChooser';
import { useBoardInteraction } from './useBoardInteraction';

function getRookCastleSlide(
  lastMove: { from: Square; to: Square } | null | undefined,
  pieces: Partial<Record<Square, { type: string; color: string }>>
): { rookFrom: Square; rookTo: Square } | null {
  if (!lastMove) return null;
  const king = pieces[lastMove.to];
  if (!king || king.type !== 'k') return null;
  const from = squareToCoords(lastMove.from);
  const to = squareToCoords(lastMove.to);
  if (from.rank !== to.rank || Math.abs(to.file - from.file) !== 2) return null;
  const rankChar = lastMove.to[1] as string;
  const kingside = to.file > from.file;
  const rookFrom = `${kingside ? 'h' : 'a'}${rankChar}` as Square;
  const rookTo = `${kingside ? 'f' : 'd'}${rankChar}` as Square;
  return { rookFrom, rookTo };
}

export function Board({
  fen,
  orientation = 'white',
  onMove,
  interactive = true,
  lastMove = null,
  legalMovesProvider,
  checkSquare = null,
  theme = 'classic',
  animationsEnabled = true,
  hintArrow = null,
  coordinates = 'outside',
  fixedWidth,
  bleed = false,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  const pieces = useMemo(() => parseFenBoard(fen), [fen]);
  const displaySquares = useMemo(() => getDisplaySquares(orientation), [orientation]);

  const {
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
  } = useBoardInteraction({ pieces, legalMovesProvider, onMove, interactive, orientation });

  const legalTargets = useMemo(() => {
    if (!selected) return new Map<Square, { isCapture: boolean }>();
    const moves = getMoves(selected);
    return new Map(moves.map((m) => [m.to, { isCapture: m.isCapture }]));
  }, [selected, getMoves]);

  const castle = useMemo(
    () =>
      getRookCastleSlide(
        lastMove,
        pieces as Partial<Record<Square, { type: string; color: string }>>
      ),
    [lastMove, pieces]
  );

  // Keep DOM focus in sync for arrow-key navigation
  useEffect(() => {
    const root = boardRef.current;
    if (!root) return;
    if (!root.contains(document.activeElement)) return;
    const el = root.querySelector<HTMLButtonElement>(`[data-square="${focusSquare}"]`);
    el?.focus();
  }, [focusSquare]);

  const toRelative = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: clientX - rect.left, y: clientY - rect.top, rect };
  };

  const squareFromPoint = (x: number, y: number): Square | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor((x / rect.width) * 8);
    const row = Math.floor((y / rect.height) * 8);
    return displayPosToSquare(row, col, orientation);
  };

  const onSquareDown = useCallback(
    (square: Square, e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;
      handleSquareDown(square, e.clientX - rect.left, e.clientY - rect.top);
    },
    [handleSquareDown]
  );

  const promotionAnchor = useMemo(() => {
    if (!pendingPromotion) return null;
    const pos = squareToDisplayPos(pendingPromotion.to, orientation);
    const opensUpward = pos.row > 3;
    const topRow = opensUpward ? pos.row - 3 : pos.row;
    return {
      style: {
        left: `${pos.col * 12.5}%`,
        top: `${topRow * 12.5}%`,
        width: '12.5%',
      },
      opensUpward,
      pos,
    };
  }, [pendingPromotion, orientation]);

  const files = displaySquares.slice(0, 8).map((s) => s[0]);
  const ranks = displaySquares.filter((_, i) => i % 8 === 0).map((s) => s[1]);

  return (
    <div
      className={
        bleed
          ? 'w-full lg:mx-auto lg:w-[max(240px,min(100%,640px,calc(100dvh-300px)))]'
          : 'mx-auto w-[max(240px,min(100%,640px,calc(100dvh-300px)))]'
      }
      style={fixedWidth ? { width: fixedWidth, maxWidth: '100%' } : undefined}
    >
      <div
        role="group"
        aria-label={`Chess board, ${orientation === 'white' ? 'white' : 'black'} at the bottom. Use arrow keys to move between squares, Enter to select.`}
        data-board-theme={theme}
        onKeyDown={handleBoardKeyDown}
        className="relative select-none"
      >
        {/* Midnight Studio plate: surface-1, 1px border, 6px radius. Bleed = edge-to-edge on mobile. */}
        <div
          className={
            bleed
              ? 'border-0 bg-[var(--surface-1)] p-0 lg:rounded-[6px] lg:border lg:border-[var(--hairline)] lg:p-[6px]'
              : 'rounded-[6px] border border-[var(--hairline)] bg-[var(--surface-1)] p-[6px]'
          }
        >
          <div className="flex">
            {/* Rank ruler — hidden for inside coordinates and below lg in bleed mode. */}
            {coordinates === 'outside' && (
              <div
                aria-hidden
                className={
                  bleed ? 'hidden w-5 shrink-0 flex-col lg:flex' : 'flex w-5 shrink-0 flex-col'
                }
              >
                {ranks.map((rank) => (
                  <div key={rank} className="flex flex-1 items-center justify-end gap-1">
                    <span className="font-mono text-[12px] leading-none text-[var(--muted)]">
                      {rank}
                    </span>
                    <span className="h-px w-[6px] bg-[var(--hairline-strong)]" />
                  </div>
                ))}
                <div className="h-5 shrink-0" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div
                ref={boardRef}
                onPointerMove={(e) => {
                  if (!drag) return;
                  const rel = toRelative(e.clientX, e.clientY);
                  if (rel) handleDragMove(rel.x, rel.y);
                }}
                onPointerUp={(e) => {
                  if (!drag) return;
                  const rel = toRelative(e.clientX, e.clientY);
                  const target = rel ? squareFromPoint(rel.x, rel.y) : null;
                  handleDragEnd(target);
                }}
                onPointerCancel={cancelDrag}
                className="relative grid aspect-square w-full touch-none grid-cols-8 grid-rows-8"
              >
                {displaySquares.map((square, idx) => {
                  const piece = pieces[square];
                  const isLast =
                    lastMove != null && (square === lastMove.from || square === lastMove.to);
                  const target = legalTargets.get(square);
                  const row = Math.floor(idx / 8);
                  const col = idx % 8;
                  const isBottomRow = row === 7;
                  const isLeftCol = col === 0;
                  let slideDx = 0;
                  let slideDy = 0;
                  if (animationsEnabled && lastMove && square === lastMove.to) {
                    const fromPos = squareToDisplayPos(lastMove.from, orientation);
                    const toPos = squareToDisplayPos(lastMove.to, orientation);
                    slideDx = fromPos.col - toPos.col;
                    slideDy = fromPos.row - toPos.row;
                  } else if (animationsEnabled && castle && square === castle.rookTo) {
                    const fromPos = squareToDisplayPos(castle.rookFrom, orientation);
                    const toPos = squareToDisplayPos(castle.rookTo, orientation);
                    slideDx = fromPos.col - toPos.col;
                    slideDy = fromPos.row - toPos.row;
                  }
                  const isMovingDest =
                    animationsEnabled &&
                    ((lastMove != null && square === lastMove.to) ||
                      (castle != null && square === castle.rookTo));
                  const animKey = isMovingDest
                    ? `${fen}:${square}`
                    : piece
                      ? `${piece.color}${piece.type}`
                      : 'empty';

                  return (
                    <SquareView
                      key={square}
                      square={square}
                      pieceType={piece?.type ?? null}
                      pieceColor={piece?.color ?? null}
                      isLight={isLightSquare(square)}
                      isSelected={selected === square}
                      isLastMove={isLast}
                      isCheck={checkSquare === square}
                      isLegalTarget={target !== undefined}
                      isCapture={target?.isCapture ?? false}
                      isKeyboardFocus={focusSquare === square}
                      tabIndex={focusSquare === square ? 0 : -1}
                      slideDx={slideDx}
                      slideDy={slideDy}
                      animKey={animKey}
                      dimPiece={drag != null && drag.moved && drag.from === square}
                      showInsideCoord={coordinates === 'inside'}
                      showFileLabel={isBottomRow}
                      showRankLabel={isLeftCol}
                      onSquareDown={onSquareDown}
                      onSquareClick={handleSquareClick}
                      onSquareFocus={handleSquareFocus}
                    />
                  );
                })}

                {hintArrow && (
                  <HintArrow from={hintArrow.from} to={hintArrow.to} orientation={orientation} />
                )}

                {drag != null && drag.moved && (
                  <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
                    {(() => {
                      const piece = pieces[drag.from];
                      if (!piece) return null;
                      return (
                        <span
                          className="absolute aspect-square w-[12.5%] scale-[1.08]"
                          style={{
                            left: drag.x,
                            top: drag.y,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <span className="absolute inset-[5%] block">
                            <Piece
                              color={piece.color}
                              type={piece.type}
                              className="h-full w-full"
                            />
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                )}

                {pendingPromotion && promotionAnchor && (
                  <PromotionChooser
                    color={pendingPromotion.color}
                    onSelect={confirmPromotion}
                    onCancel={cancelPromotion}
                    anchorStyle={promotionAnchor.style}
                    opensUpward={promotionAnchor.opensUpward}
                  />
                )}
              </div>
              {/* File ruler — hidden for inside coordinates and below lg in bleed mode. */}
              {coordinates === 'outside' && (
                <div
                  aria-hidden
                  className={bleed ? 'hidden h-5 grid-cols-8 lg:grid' : 'grid h-5 grid-cols-8'}
                >
                  {files.map((file) => (
                    <div key={file} className="flex flex-col items-center">
                      <span className="h-[6px] w-px bg-[var(--hairline-strong)]" />
                      <span className="font-mono text-[12px] leading-none text-[var(--muted)]">
                        {file}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
