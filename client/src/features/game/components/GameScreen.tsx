import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Board, type LegalMove, type Orientation, type Square } from '@/features/board';
import { useToast } from '@/components/ui';
import { useGameStore } from '../useGameStore';
import { useSettingsStore } from '../useSettingsStore';
import { useClocks, type ClockReset } from '../useClocks';
import { getMaterialInfo } from '../material';
import { TIME_CONTROLS, getTimeControl } from '../time';
import { isTerminalStatus } from '../types';
import { playSound } from '../sound';
import { clearGame, saveGame, type SavedLocalGame } from '../localPersistence';
import { PlayerStrip } from './PlayerStrip';
import { GamePlayerRow } from './GamePlayerRow';
import { MoveList } from './MoveList';
import { MovesPanel } from './MovesPanel';
import { MobileTopBar } from './MobileTopBar';
import { MobileActionBar } from './MobileActionBar';
import { GameOverModal } from './GameOverModal';
import { DrawOfferModal } from './DrawOfferModal';
import { ResignConfirmModal } from './ResignConfirmModal';
import { SettingsDrawer } from './SettingsDrawer';
import { ShortcutsDialog } from './ShortcutsDialog';
import { useGameShortcuts } from '../useGameShortcuts';

interface GameScreenProps {
  whiteName: string;
  blackName: string;
  canUndo: boolean;
  defaultTimeControlId?: string;
  onHome: () => void;
  rotateBoardEachTurn?: boolean;
  tabletopMode?: boolean;
  drawOfferMode?: 'auto' | 'confirm';
  storageKey?: string;
  restoreSnapshot?: SavedLocalGame | null;
  onRematch?: () => void;
  onUndo?: () => void;
  defaultOrientation?: Orientation;
  boardLocked?: boolean;
  persistDifficultyId?: string;
  boardBanner?: ReactNode;
  boardLeftAside?: ReactNode;
  hintArrow?: { from: Square; to: Square } | null;
  /** Title shown in the mobile top bar (e.g. "vs Stockfish - Advanced"). */
  matchTitle?: string;
  /** Per-side display metadata (titles, subtitles, initials). Falls back to names. */
  sideMeta?: Partial<Record<'w' | 'b', { title?: string; subtitle?: string; initials?: string }>>;
  hintsLeft?: number | null;
  onRequestHint?: (() => void) | null;
  hintDisabled?: boolean;
}

function initialsFor(explicit: string | undefined, name: string): string {
  if (explicit) return explicit;
  const letters = name
    .trim()
    .split(/\s+/)
    .map((w) => w.match(/[A-Za-z]/)?.[0])
    .filter((c): c is string => c !== undefined)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return letters || '?';
}

export function GameScreen({
  whiteName,
  blackName,
  canUndo,
  defaultTimeControlId = '10+0',
  onHome,
  rotateBoardEachTurn = false,
  tabletopMode = false,
  drawOfferMode = 'auto',
  storageKey,
  restoreSnapshot = null,
  onRematch,
  onUndo,
  defaultOrientation = 'white',
  boardLocked = false,
  persistDifficultyId,
  boardBanner = null,
  boardLeftAside = null,
  hintArrow = null,
  matchTitle = 'Checkmate',
  sideMeta,
  hintsLeft = null,
  onRequestHint = null,
  hintDisabled = false,
}: GameScreenProps) {
  const fen = useGameStore((s) => s.fen);
  const sans = useGameStore((s) => s.sans);
  const verbose = useGameStore((s) => s.verbose);
  const fens = useGameStore((s) => s.fens);
  const turn = useGameStore((s) => s.turn);
  const status = useGameStore((s) => s.status);
  const result = useGameStore((s) => s.result);
  const resultReason = useGameStore((s) => s.resultReason);
  const lastMove = useGameStore((s) => s.lastMove);
  const checkSquare = useGameStore((s) => s.checkSquare);
  const reviewPly = useGameStore((s) => s.reviewPly);

  const [orientation, setOrientation] = useState<Orientation>(defaultOrientation);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [timeControlId] = useState(() => {
    const id = restoreSnapshot?.timeControlId ?? defaultTimeControlId;
    return TIME_CONTROLS.some((t) => t.id === id) ? id : '10+0';
  });
  const [clockReset, setClockReset] = useState<ClockReset | null>(null);
  const [drawOffer, setDrawOffer] = useState<'w' | 'b' | null>(null);
  const { push } = useToast();

  const boardTheme = useSettingsStore((s) => s.boardTheme);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const showLegalMoves = useSettingsStore((s) => s.showLegalMoves);

  const timeControl = getTimeControl(timeControlId);
  const terminal = isTerminalStatus(status);
  const running = (status === 'playing' || status === 'check') && reviewPly === null;

  const handleFlag = useCallback((loser: 'w' | 'b') => {
    useGameStore.getState().flag(loser);
  }, []);

  const { whiteMs, blackMs } = useClocks(
    timeControl,
    turn,
    running,
    sans.length,
    clockReset,
    handleFlag
  );

  // One-time restore of a persisted local game
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !restoreSnapshot || !storageKey) return;
    restoredRef.current = true;
    const store = useGameStore.getState();
    store.reset();
    let applied = 0;
    for (const m of restoreSnapshot.moves) {
      if (store.makeMove(m.from, m.to, m.promotion)) applied += 1;
      else break;
    }
    if (applied === 0) {
      if (storageKey) clearGame(storageKey);
      return;
    }
    setOrientation(restoreSnapshot.orientation);
    setClockReset({
      key: Date.now(),
      whiteMs: restoreSnapshot.whiteMs,
      blackMs: restoreSnapshot.blackMs,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist in-progress local games (cleared on terminal / new game).
  // Throttled to one write per move or clock-second via the saved-marker ref.
  const lastSavedRef = useRef({ moves: -1, wSec: -1, bSec: -1 });
  useEffect(() => {
    if (!storageKey || terminal || sans.length === 0) return;
    const wSec = whiteMs === null ? -2 : Math.ceil(whiteMs / 1000);
    const bSec = blackMs === null ? -2 : Math.ceil(blackMs / 1000);
    const prev = lastSavedRef.current;
    if (prev.moves === sans.length && prev.wSec === wSec && prev.bSec === bSec) return;
    lastSavedRef.current = { moves: sans.length, wSec, bSec };
    const v = useGameStore.getState().verbose;
    saveGame(storageKey, {
      version: 1,
      moves: v.map((m) => ({ from: m.from, to: m.to, promotion: m.promotion })),
      whiteName,
      blackName,
      timeControlId,
      whiteMs,
      blackMs,
      orientation,
      ...(persistDifficultyId ? { difficultyId: persistDifficultyId } : {}),
    });
  }, [
    storageKey,
    terminal,
    sans.length,
    whiteMs,
    blackMs,
    whiteName,
    blackName,
    timeControlId,
    orientation,
    persistDifficultyId,
  ]);

  useEffect(() => {
    if (storageKey && terminal) clearGame(storageKey);
  }, [storageKey, terminal]);

  // Auto-rotate: a hard cut. The side to move sits at the bottom, no ceremony.
  const rotateMovesRef = useRef(sans.length);
  useEffect(() => {
    if (sans.length <= rotateMovesRef.current) {
      rotateMovesRef.current = sans.length;
      return;
    }
    rotateMovesRef.current = sans.length;
    if (!rotateBoardEachTurn || reviewPly !== null || terminal) return;
    setOrientation((o) => (o === 'white' ? 'black' : 'white'));
  }, [sans.length, rotateBoardEachTurn, reviewPly, terminal]);

  // Sounds on move + game end
  const prevMovesRef = useRef(0);
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (verbose.length > prevMovesRef.current) {
      const last = verbose[verbose.length - 1];
      if (last?.isCastle) playSound('castle', soundEnabled);
      else if (status === 'check' || status === 'checkmate') playSound('check', soundEnabled);
      else if (last?.captured) playSound('capture', soundEnabled);
      else playSound('move', soundEnabled);
    }
    if (!isTerminalStatus(prevStatusRef.current) && isTerminalStatus(status)) {
      playSound('end', soundEnabled);
    }
    prevMovesRef.current = verbose.length;
    prevStatusRef.current = status;
  }, [verbose, status, soundEnabled]);

  const legalMovesProvider = useCallback(
    (square: Square): LegalMove[] => {
      if (!showLegalMoves || reviewPly !== null || terminal) return [];
      return useGameStore.getState().getLegalMoves(square);
    },
    [showLegalMoves, reviewPly, terminal]
  );

  const handleBoardMove = useCallback(
    (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => {
      useGameStore.getState().makeMove(from, to, promotion);
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (onUndo) {
      onUndo();
      return;
    }
    useGameStore.getState().undo();
  }, [onUndo]);

  const resetClocks = useCallback((tcId: string) => {
    const base = getTimeControl(tcId).baseMs;
    setClockReset({ key: Date.now(), whiteMs: base, blackMs: base });
  }, []);

  const handleNewGame = useCallback(() => {
    useGameStore.getState().reset();
    resetClocks(timeControlId);
    if (storageKey) clearGame(storageKey);
  }, [resetClocks, timeControlId, storageKey]);

  const handleResign = useCallback(() => {
    const side = useGameStore.getState().turn;
    useGameStore.getState().resign(side);
  }, []);

  const handleOfferDraw = useCallback(() => {
    if (drawOfferMode === 'confirm') {
      setDrawOffer(useGameStore.getState().turn);
      return;
    }
    useGameStore.getState().agreeDraw();
    push({ kind: 'info', title: 'Draw agreed' });
  }, [drawOfferMode, push]);

  const handleAcceptDraw = useCallback(() => {
    setDrawOffer(null);
    useGameStore.getState().agreeDraw();
  }, []);

  const handleDeclineDraw = useCallback(() => {
    setDrawOffer(null);
    push({ kind: 'info', title: 'Draw declined — game continues' });
  }, [push]);

  const handleCopyPGN = useCallback(async () => {
    const pgn = useGameStore.getState().getPGN();
    try {
      await navigator.clipboard.writeText(pgn || '(empty game)');
    } catch {
      // clipboard unavailable — toast still confirms intent
    }
  }, []);

  const handleDownloadPGN = useCallback(() => {
    const pgn = useGameStore.getState().getPGN();
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'checkmate-game.pgn';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const material = useMemo(() => getMaterialInfo(fen), [fen]);

  const displayFen = reviewPly !== null ? (fens[reviewPly] ?? fen) : fen;
  const reviewing = reviewPly !== null;

  const topIsWhite = orientation === 'black';
  const topName = topIsWhite ? whiteName : blackName;
  const bottomName = topIsWhite ? blackName : whiteName;
  const topColor = topIsWhite ? ('w' as const) : ('b' as const);
  const bottomColor = topIsWhite ? ('b' as const) : ('w' as const);
  const topCaptured = topIsWhite ? material.whiteCaptured : material.blackCaptured;
  const bottomCaptured = topIsWhite ? material.blackCaptured : material.whiteCaptured;
  const topLead = topIsWhite
    ? material.leader === 'w'
      ? material.advantage
      : 0
    : material.leader === 'b'
      ? material.advantage
      : 0;
  const bottomLead = topIsWhite
    ? material.leader === 'b'
      ? material.advantage
      : 0
    : material.leader === 'w'
      ? material.advantage
      : 0;
  const topClockMs = topIsWhite ? whiteMs : blackMs;
  const bottomClockMs = topIsWhite ? blackMs : whiteMs;
  const topClockActive = running && turn === topColor;
  const bottomClockActive = running && turn === bottomColor;

  const reviewTo = useCallback((ply: number | null) => {
    useGameStore.getState().reviewTo(ply);
  }, []);

  const flipOrientation = useCallback(() => {
    setOrientation((o) => (o === 'white' ? 'black' : 'white'));
  }, []);

  const toggleMute = useCallback(() => {
    const store = useSettingsStore.getState();
    const next = !store.soundEnabled;
    store.setSoundEnabled(next);
    push({ kind: 'info', title: next ? 'Sounds on' : 'Sounds off' });
  }, [push]);

  const reviewPrev = useCallback(() => {
    const total = useGameStore.getState().sans.length;
    if (total === 0) return;
    const current = useGameStore.getState().reviewPly ?? total + 1;
    const target = current - 1;
    if (target >= 1) useGameStore.getState().reviewTo(target);
  }, []);

  const reviewNext = useCallback(() => {
    const total = useGameStore.getState().sans.length;
    if (total === 0) return;
    const current = useGameStore.getState().reviewPly ?? total;
    const target = current + 1;
    useGameStore.getState().reviewTo(target > total ? null : target);
  }, []);

  const reviewFirst = useCallback(() => {
    const total = useGameStore.getState().sans.length;
    if (total === 0) return;
    useGameStore.getState().reviewTo(1);
  }, []);

  const reviewLast = useCallback(() => {
    reviewTo(null);
  }, [reviewTo]);

  const [resignOpen, setResignOpen] = useState(false);

  useGameShortcuts({
    onFlip: flipOrientation,
    onPrevMove: reviewPrev,
    onNextMove: reviewNext,
    onToggleMute: toggleMute,
    onNewGame: () => {
      handleNewGame();
      push({ kind: 'info', title: 'New game started' });
    },
    onOpenHelp: () => setHelpOpen(true),
    enabled: !settingsOpen && !helpOpen && drawOffer === null,
  });

  const offererName = drawOffer === 'w' ? whiteName : blackName;
  const offereeName = drawOffer === 'w' ? blackName : whiteName;

  const topMeta = sideMeta?.[topColor];
  const bottomMeta = sideMeta?.[bottomColor];
  const topTitle = topMeta?.title ?? topName;
  const bottomTitle = bottomMeta?.title ?? bottomName;
  const canAct = !terminal && !reviewing;

  const resignConfirm = (
    <ResignConfirmModal
      open={resignOpen}
      busy={false}
      onConfirm={() => {
        setResignOpen(false);
        handleResign();
      }}
      onClose={() => setResignOpen(false)}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-0 px-0 py-0 lg:gap-4 lg:px-6 lg:py-6">
      <MobileTopBar
        title={matchTitle}
        onBack={onHome}
        onNewGame={() => {
          handleNewGame();
          push({ kind: 'info', title: 'New game started' });
        }}
        onCopyPGN={() => {
          void handleCopyPGN();
        }}
        onDownloadPGN={handleDownloadPGN}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setHelpOpen(true)}
      />
      {/* Mobile opponent row */}
      <div className="lg:hidden">
        <div className={tabletopMode ? 'rotate-180' : undefined}>
          <PlayerStrip
            name={topName}
            color={topColor}
            captured={topCaptured}
            materialLead={topLead}
            clockMs={topClockMs}
            clockActive={topClockActive}
            compact
          />
        </div>
      </div>

      <div className="grid items-start gap-0 lg:grid-cols-[minmax(0,720px)_360px] lg:justify-center lg:gap-6">
        <div className="flex min-w-0 flex-col gap-0 lg:gap-2">
          <div className="hidden lg:block">
            <div className={tabletopMode ? 'rotate-180' : undefined}>
              <GamePlayerRow
                name={topTitle}
                initials={initialsFor(topMeta?.initials, topTitle)}
                subtitle={topMeta?.subtitle}
                captured={topCaptured}
                capturedColor={topColor === 'w' ? 'b' : 'w'}
                materialLead={topLead}
                clockMs={topClockMs}
                clockActive={topClockActive}
              />
            </div>
          </div>

          <div>
            {boardBanner}
            <div className="flex items-stretch gap-0 lg:gap-2">
              {boardLeftAside && <div className="hidden lg:block">{boardLeftAside}</div>}
              <div className="min-w-0 flex-1">
                <Board
                  fen={displayFen}
                  orientation={orientation}
                  onMove={handleBoardMove}
                  interactive={!reviewing && !terminal && !boardLocked}
                  lastMove={reviewing ? null : lastMove}
                  legalMovesProvider={legalMovesProvider}
                  checkSquare={reviewing ? null : checkSquare}
                  theme={boardTheme}
                  animationsEnabled={animationsEnabled}
                  hintArrow={reviewing ? null : hintArrow}
                  fixedWidth={720}
                  bleed
                />
              </div>
            </div>
          </div>

          <div className="lg:hidden">
            <PlayerStrip
              name={bottomName}
              color={bottomColor}
              captured={bottomCaptured}
              materialLead={bottomLead}
              clockMs={bottomClockMs}
              clockActive={bottomClockActive}
              compact
            />
          </div>

          {/* Mobile move strip */}
          <div className="border-b border-[var(--hairline)] lg:hidden">
            <MoveList sans={sans} reviewPly={reviewPly} onSelect={reviewTo} layout="strip" />
          </div>

          {/* Mobile bottom action bar */}
          <MobileActionBar
            onFlip={flipOrientation}
            hintsLeft={hintsLeft}
            onRequestHint={onRequestHint}
            hintDisabled={hintDisabled || !canAct}
            onUndo={handleUndo}
            canUndo={canUndo}
            canAct={canAct}
            onOfferDraw={handleOfferDraw}
            onResign={() => setResignOpen(true)}
          />

          <div className="hidden lg:block">
            <GamePlayerRow
              name={bottomTitle}
              initials={initialsFor(bottomMeta?.initials, bottomTitle)}
              subtitle={bottomMeta?.subtitle}
              captured={bottomCaptured}
              capturedColor={bottomColor === 'w' ? 'b' : 'w'}
              materialLead={bottomLead}
              clockMs={bottomClockMs}
              clockActive={bottomClockActive}
              showYourMove
            />
          </div>
        </div>

        {/* Desktop moves panel: 360px surface-1 column. */}
        <div className="hidden min-w-0 lg:block">
          <MovesPanel
            sans={sans}
            reviewPly={reviewPly}
            totalPlies={sans.length}
            onSelectReview={reviewTo}
            onReviewFirst={reviewFirst}
            onReviewPrev={reviewPrev}
            onReviewNext={reviewNext}
            onReviewLast={reviewLast}
            onCopyPGN={() => {
              void handleCopyPGN();
            }}
            onDownloadPGN={handleDownloadPGN}
            onNewGame={() => {
              handleNewGame();
              push({ kind: 'info', title: 'New game started' });
            }}
            onOpenShortcuts={() => setHelpOpen(true)}
            onFlip={flipOrientation}
            onUndo={handleUndo}
            canUndo={canUndo}
            canAct={canAct}
            hintsLeft={hintsLeft}
            onRequestHint={onRequestHint}
            hintDisabled={hintDisabled || !canAct}
            onOfferDraw={handleOfferDraw}
            onResign={() => setResignOpen(true)}
            resignConfirm={resignConfirm}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </div>

      <GameOverModal
        open={terminal}
        result={result}
        status={status}
        reason={resultReason}
        onRematch={onRematch ?? handleNewGame}
        onNewGame={handleNewGame}
        onHome={onHome}
        onCopyPGN={() => {
          void handleCopyPGN();
        }}
      />
      <DrawOfferModal
        open={drawOffer !== null && !terminal}
        offererName={offererName}
        offereeName={offereeName}
        onAccept={handleAcceptDraw}
        onDecline={handleDeclineDraw}
      />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
