import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Chess } from 'chess.js';
import { Keyboard } from 'lucide-react';
import type { SeatColor } from 'checkmate-shared';
import {
  Button,
  IconButton,
  Modal,
  Skeleton,
  SkeletonLines,
  Tooltip,
  useToast,
} from '@/components/ui';
import { Board, type LegalMove, type Orientation, type Square } from '@/features/board';
import { Clock } from '@/features/game/components/Clock';
import { MoveList } from '@/features/game/components/MoveList';
import { useOnlineGame } from '@/features/online/useOnlineGame';
import { ShortcutsDialog, useGameShortcuts, useSettingsStore } from '@/features/game';
import { deleteRoom } from '@/features/online/api';
import { loadJoin, loadPlayerId } from '@/features/online/storage';
import { ConnectionDot } from '@/features/online/components/ConnectionDot';
import { CountdownBanner } from '@/features/online/components/CountdownBanner';
import { JoinCard } from '@/features/online/components/JoinCard';
import { LobbyBackdrop } from '@/features/online/components/LobbyBackdrop';
import { WaitingLobby } from '@/features/online/components/WaitingLobby';
import {
  DrawIncomingModal,
  DrawSendModal,
  RematchIncomingModal,
  ResignConfirmModal,
} from '@/features/online/components/GameModals';

interface OnlineGameState {
  name?: string;
  color?: string;
  timeControlId?: string;
}

function seatToTurn(color: SeatColor): 'w' | 'b' {
  return color === 'white' ? 'w' : 'b';
}

function deriveBoardInfo(fen: string): {
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
} {
  try {
    const game = new Chess(fen);
    const history = game.history({ verbose: true });
    const last = history[history.length - 1];
    const lastMove =
      last !== undefined ? { from: last.from as Square, to: last.to as Square } : null;
    if (!game.isCheck()) return { lastMove, checkSquare: null };
    const turn = game.turn();
    const board = game.board();
    for (let row = 0; row < 8; row += 1) {
      const rankRow = board[row];
      if (!rankRow) continue;
      for (let col = 0; col < 8; col += 1) {
        const cell = rankRow[col];
        if (cell && cell.type === 'k' && cell.color === turn) {
          const file = String.fromCharCode(97 + col);
          const rank = String(8 - row);
          return { lastMove, checkSquare: `${file}${rank}` as Square };
        }
      }
    }
    return { lastMove, checkSquare: null };
  } catch {
    return { lastMove: null, checkSquare: null };
  }
}

function resultTitle(result: string | null): string {
  if (result === '1-0') return 'White wins';
  if (result === '0-1') return 'Black wins';
  if (result === '1/2-1/2') return 'Draw';
  return 'Game over';
}

export default function OnlineGame() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { push } = useToast();
  const [copied, setCopied] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>('white');
  const [now, setNow] = useState(() => Date.now());
  const [cancelling, setCancelling] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [drawSendOpen, setDrawSendOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const autoTried = useRef(false);

  const safeRoomId = roomId ?? '';
  const game = useOnlineGame(safeRoomId);
  const { snapshot, displayFen, yourColor, isSpectator, actionError, gameOver } = game;

  const routeState = (location.state ?? {}) as OnlineGameState;
  const inviteLink =
    typeof window !== 'undefined' ? `${window.location.origin}/game/${safeRoomId}` : '';
  // Short display form only; Copy always writes the full working URL.
  const shortLink =
    typeof window !== 'undefined' ? `${window.location.host}/g/${safeRoomId.slice(0, 8)}` : '';
  const shortTc = (id: string): string => (id === 'unlimited' ? 'Unlimited' : id);

  // Live clock tick for display only (server is authoritative).
  // Background tabs throttle intervals, so also resync on visibility/focus
  // to snap the display to the true elapsed time immediately on return.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    const resync = () => setNow(Date.now());
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
    };
  }, []);

  // Auto-join: creator (route state) or refresh (stored seat).
  useEffect(() => {
    if (autoTried.current || !safeRoomId) return;
    const stored = loadJoin(safeRoomId);
    const name = routeState.name || stored?.name;
    if (!name) return;
    autoTried.current = true;
    setAttempted(true);
    game.join(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRoomId, game.roomStatus]);

  // Surface server errors as toasts.
  useEffect(() => {
    if (!actionError) return;
    push({ kind: 'danger', title: actionError.message });
    game.clearActionError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionError]);

  // Confirm modals are moot once the game is over.
  useEffect(() => {
    if (gameOver) {
      setResignOpen(false);
      setDrawSendOpen(false);
    }
  }, [gameOver]);

  // Follow my seat for board orientation.
  useEffect(() => {
    if (yourColor === 'black') setOrientation('black');
    else if (yourColor === 'white') setOrientation('white');
  }, [yourColor]);

  // Rematch accepted → move to the new room, carrying seat + name.
  useEffect(() => {
    if (!game.rematchNewRoomId || !safeRoomId) return;
    try {
      const old = loadJoin(safeRoomId);
      if (old) {
        window.localStorage.setItem(
          `checkmate:room:${game.rematchNewRoomId}:playerId`,
          old.playerId
        );
        if (old.name) {
          window.localStorage.setItem(`checkmate:room:${game.rematchNewRoomId}:name`, old.name);
        }
      }
    } catch {
      // ignore storage failures
    }
    navigate(`/game/${game.rematchNewRoomId}`, {
      state: { name: routeState.name ?? loadJoin(safeRoomId)?.name },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.rematchNewRoomId]);

  const doJoin = useCallback(
    (name: string) => {
      setAttempted(true);
      game.join(name);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      // clipboard unavailable
    }
    setCopied(true);
    push({ kind: 'success', title: 'Invite link copied' });
    window.setTimeout(() => setCopied(false), 2000);
  }, [inviteLink, push]);

  const copyPGN = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snapshot?.pgn || '(empty game)');
    } catch {
      // clipboard unavailable
    }
  }, [snapshot]);

  const cancelRoom = useCallback(async () => {
    if (!safeRoomId || cancelling) return;
    setCancelling(true);
    const result = await deleteRoom(safeRoomId, loadPlayerId(safeRoomId));
    setCancelling(false);
    if (result.ok) {
      push({ kind: 'info', title: 'Game cancelled' });
      navigate('/');
    } else if (result.status === 403) {
      push({ kind: 'danger', title: 'Only the host can cancel this game' });
    } else if (result.status === 409) {
      push({ kind: 'info', title: 'Game already started — cannot cancel' });
    } else {
      push({ kind: 'danger', title: result.message });
    }
  }, [safeRoomId, cancelling, push, navigate]);

  const toggleMute = useCallback(() => {
    const store = useSettingsStore.getState();
    const next = !store.soundEnabled;
    store.setSoundEnabled(next);
    push({ kind: 'info', title: next ? 'Sounds on' : 'Sounds off' });
  }, [push]);

  const flipBoard = useCallback(() => {
    setOrientation((o) => (o === 'white' ? 'black' : 'white'));
  }, []);

  const requestRematchShortcut = useCallback(() => {
    if (snapshot?.status === 'finished' && !isSpectator) {
      game.requestRematch();
      push({ kind: 'info', title: 'Rematch offered' });
    }
  }, [snapshot?.status, isSpectator, game, push]);

  useGameShortcuts({
    onFlip: flipBoard,
    onToggleMute: toggleMute,
    onNewGame: requestRematchShortcut,
    onOpenHelp: () => setHelpOpen(true),
    enabled:
      !resignOpen &&
      !drawSendOpen &&
      !helpOpen &&
      !(snapshot?.drawOffer && yourColor && seatToTurn(yourColor) !== snapshot.drawOffer.by) &&
      !(
        snapshot?.status === 'finished' &&
        snapshot.rematchOffer &&
        yourColor &&
        seatToTurn(yourColor) !== snapshot.rematchOffer.by
      ),
  });

  const boardInfo = useMemo(() => deriveBoardInfo(displayFen), [displayFen]);
  const fenForHints = displayFen;

  const interactive = useMemo(() => {
    if (!snapshot || isSpectator || !yourColor || game.takenOver) return false;
    if (snapshot.status !== 'active') return false;
    return seatToTurn(yourColor) === snapshot.turn;
  }, [snapshot, isSpectator, yourColor, game.takenOver]);

  const legalMovesProvider = useCallback(
    (square: Square): LegalMove[] => {
      if (!interactive) return [];
      try {
        const peer = new Chess(fenForHints);
        return peer.moves({ square, verbose: true }).map((m) => ({
          to: m.to as Square,
          isCapture: m.isCapture(),
          isPromotion: m.isPromotion(),
        }));
      } catch {
        return [];
      }
    },
    [interactive, fenForHints]
  );

  const handleBoardMove = useCallback(
    (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => {
      game.sendMove(from, to, promotion);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const clocks = useMemo(() => {
    const base = game.clockBase;
    if (base.whiteMs === null || base.blackMs === null) {
      return { whiteMs: base.whiteMs, blackMs: base.blackMs };
    }
    if (snapshot?.status !== 'active') {
      return { whiteMs: base.whiteMs, blackMs: base.blackMs };
    }
    const elapsed = Math.max(0, now - base.at);
    if (base.turn === 'w')
      return { whiteMs: Math.max(0, base.whiteMs - elapsed), blackMs: base.blackMs };
    return { whiteMs: base.whiteMs, blackMs: Math.max(0, base.blackMs - elapsed) };
  }, [game.clockBase, snapshot?.status, now]);

  if (!safeRoomId) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-10">
        <p className="text-sm text-[var(--muted)]">Missing room id.</p>
        <Link to="/play/online">
          <Button variant="secondary">Create a new game</Button>
        </Link>
      </div>
    );
  }

  // --- room closed (host cancelled) ---
  if (game.roomClosed) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-16 sm:px-6">
        <h1 className="text-[28px] leading-[1] font-semibold tracking-[-0.035em] text-[var(--text)]">
          Room closed.
        </h1>
        <p className="text-sm text-[var(--muted)]">The host cancelled this game.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/play/online">
            <Button>Create a new game</Button>
          </Link>
          <Link to="/">
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // --- prefetch states: 404 / unreachable / loading ---
  if (game.roomStatus?.kind === 'not-found') {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-16 sm:px-6">
        <p className="font-mono text-sm text-[var(--muted)]">404</p>
        <h1 className="text-[28px] leading-[1] font-semibold tracking-[-0.035em] text-[var(--text)]">
          Room not found.
        </h1>
        <p className="text-sm text-[var(--muted)]">
          This invite link is invalid or the room expired. Ask your friend for a fresh link.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/play/online">
            <Button>Create a new game</Button>
          </Link>
          <Link to="/">
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (game.roomStatus?.kind === 'unreachable') {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold text-[var(--text)]">Can&apos;t reach the game</h1>
        <p className="text-sm text-[var(--muted)]">Check your connection, then try again.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => game.retry()}>Retry</Button>
          <Link to="/">
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // --- join gate: guest opened an invite link, identity unknown ---
  if (!snapshot && !attempted) {
    if (game.roomStatus === null) {
      return (
        <div
          className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 py-10 sm:px-6"
          aria-busy="true"
          aria-label="Loading room"
        >
          <Skeleton className="h-8 w-48" />
          <Skeleton className="aspect-square w-full" />
          <SkeletonLines rows={2} />
        </div>
      );
    }
    const info = game.roomStatus.kind === 'ready' ? game.roomStatus.info : null;
    const hostName = info?.whiteName ?? info?.blackName ?? 'A friend';
    const openSeat = info
      ? !info.whiteTaken
        ? 'White'
        : !info.blackTaken
          ? 'Black'
          : 'Spectate'
      : 'White';
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-start">
        <div className="hidden md:block">
          <LobbyBackdrop width={560} />
        </div>
        <div className="w-[420px] max-w-full shrink-0">
          <JoinCard
            hostName={hostName}
            openSeat={openSeat}
            timeShort={info ? shortTc(info.timeControl.id) : '10+0'}
            onJoin={doJoin}
          />
        </div>
      </div>
    );
  }

  // --- connecting: join attempted, waiting for first snapshot ---
  if (!snapshot) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 px-4 py-16 sm:px-6">
        <ConnectionDot status={game.conn} />
        <p className="text-sm text-[var(--muted)]">
          {game.conn === 'offline' ? (
            <>
              Connection lost.{' '}
              <button
                type="button"
                onClick={() => game.retry()}
                className="font-semibold text-[var(--text)] underline underline-offset-4"
              >
                Retry
              </button>
            </>
          ) : (
            'Joining room…'
          )}
        </p>
      </div>
    );
  }

  const myTurn = interactive;
  const turnLabel = snapshot.turn === 'w' ? 'White' : 'Black';
  const statusLabel =
    snapshot.status === 'waiting'
      ? 'Waiting for opponent…'
      : snapshot.status === 'finished'
        ? resultTitle(snapshot.result) +
          (snapshot.resultReason ? ` · ${snapshot.resultReason}` : '')
        : `${turnLabel} to move${myTurn ? ' — your move' : ''}`;
  const drawOffer = snapshot.drawOffer;
  const showDrawIncoming =
    drawOffer !== null &&
    yourColor !== null &&
    seatToTurn(yourColor) !== drawOffer.by &&
    !isSpectator;
  const myDrawPending =
    drawOffer !== null && yourColor !== null && seatToTurn(yourColor) === drawOffer.by;
  const rematchOffer = snapshot.rematchOffer;
  const showRematchIncoming =
    snapshot.status === 'finished' &&
    rematchOffer !== null &&
    yourColor !== null &&
    seatToTurn(yourColor) !== rematchOffer.by &&
    !isSpectator;
  const myRematchPending =
    snapshot.status === 'finished' &&
    rematchOffer !== null &&
    yourColor !== null &&
    seatToTurn(yourColor) === rematchOffer.by;
  const showTakeover = game.takenOver;
  const offererName = drawOffer?.by === 'w' ? snapshot.whiteName : snapshot.blackName;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="rule-b flex flex-wrap items-end gap-2 pb-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] tracking-[0.08em] text-[var(--muted)]">
            ONLINE — ROOM {safeRoomId}
          </p>
          <h1 className="mt-1 text-[18px] leading-[1.2] font-semibold tracking-[-0.02em] text-balance text-[var(--text-2)]">
            {statusLabel}
          </h1>
        </div>
        <ConnectionDot status={game.conn} />
        {game.conn === 'offline' && (
          <Button size="sm" variant="secondary" onClick={() => game.retry()}>
            Retry
          </Button>
        )}
        <Tooltip content="Keyboard shortcuts (?)">
          <span>
            <IconButton label="Keyboard shortcuts" onClick={() => setHelpOpen(true)}>
              <Keyboard size={18} strokeWidth={1.5} />
            </IconButton>
          </span>
        </Tooltip>
        {isSpectator && (
          <span className="rounded-[8px] border border-[var(--hairline)] bg-[var(--surface-1)] px-2 py-1 font-mono text-[11px] text-[var(--muted)]">
            Spectating
          </span>
        )}
      </div>

      {showTakeover && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[var(--hairline)] bg-[var(--surface-1)] p-3">
          <p className="flex-1 font-mono text-xs text-[var(--text)]">
            This seat is now playing in another tab.
          </p>
          <Button size="sm" onClick={() => game.takeBack()}>
            Take back
          </Button>
        </div>
      )}

      {game.opponentGone && snapshot.status === 'active' && (
        <CountdownBanner
          graceUntil={game.opponentGone.graceUntil}
          onClaim={() => game.claimWin()}
        />
      )}

      <AnimatePresence mode="wait">
        {snapshot.status === 'waiting' ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
              <div className="hidden md:block">
                <LobbyBackdrop width={680} />
              </div>
              <div className="w-[400px] max-w-full shrink-0">
                <WaitingLobby
                  inviteLink={inviteLink}
                  shortLink={shortLink}
                  yourColor={yourColor}
                  timeShort={shortTc(snapshot.timeControl.id)}
                  friendHere={Boolean(snapshot.players.white && snapshot.players.black)}
                  isHost={!isSpectator}
                  cancelling={cancelling}
                  onCopy={() => void copy()}
                  copied={copied}
                  onCancel={() => void cancelRoom()}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="grid items-start gap-5 lg:grid-cols-12"
          >
            <div className="flex min-w-0 flex-col gap-3 lg:col-span-7">
              <Board
                fen={displayFen}
                orientation={orientation}
                onMove={handleBoardMove}
                interactive={interactive}
                lastMove={boardInfo.lastMove}
                legalMovesProvider={legalMovesProvider}
                checkSquare={boardInfo.checkSquare}
              />
              {game.pendingMove && (
                <p className="font-mono text-xs text-[var(--muted)]">Sending move…</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
                >
                  Flip board
                </Button>
                {!isSpectator && snapshot.status === 'active' && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setResignOpen(true)}>
                      Resign
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setDrawSendOpen(true)}>
                      Offer draw
                    </Button>
                  </>
                )}
                {snapshot.status === 'finished' && !isSpectator && !myRematchPending && (
                  <Button size="sm" onClick={() => game.requestRematch()}>
                    Rematch
                  </Button>
                )}
                {myRematchPending && (
                  <span className="inline-flex items-center rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-1 font-mono text-xs text-[var(--muted)]">
                    Rematch offered — waiting…
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={() => void copyPGN()}>
                  Copy PGN
                </Button>
                <Link to="/">
                  <Button variant="ghost" size="sm">
                    Home
                  </Button>
                </Link>
              </div>
              {myDrawPending && (
                <p className="text-xs text-[var(--muted)]">Draw offer sent — waiting for reply…</p>
              )}
            </div>

            <aside className="flex min-w-0 flex-col lg:col-span-4 lg:col-start-9">
              <div className="rule-t pt-2">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="label text-[var(--muted)]">02 / Moves</span>
                  <span className="font-mono text-xs text-[var(--muted)]">
                    {snapshot.timeControl.label}
                  </span>
                </div>
                <MoveList sans={snapshot.sans} reviewPly={null} onSelect={() => {}} />
              </div>
              <div className="rule-t mt-6 flex flex-col pt-2">
                <p className="label mb-3 text-[var(--muted)]">03 / Clocks</p>
                <div className="rule-b flex items-baseline justify-between gap-2 py-1">
                  <span className="label min-w-0 truncate text-[var(--text)]">
                    {snapshot.whiteName}
                  </span>
                  <Clock
                    ms={clocks.whiteMs}
                    active={snapshot.status === 'active' && snapshot.turn === 'w'}
                    ariaLabel="White clock"
                  />
                </div>
                <div className="flex items-baseline justify-between gap-2 py-1">
                  <span className="label min-w-0 truncate text-[var(--text)]">
                    {snapshot.blackName}
                  </span>
                  <Clock
                    ms={clocks.blackMs}
                    active={snapshot.status === 'active' && snapshot.turn === 'b'}
                    ariaLabel="Black clock"
                  />
                </div>
              </div>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>

      <ResignConfirmModal
        open={resignOpen}
        busy={false}
        onConfirm={() => {
          game.resign();
          setResignOpen(false);
        }}
        onClose={() => setResignOpen(false)}
      />
      <DrawSendModal
        open={drawSendOpen}
        onConfirm={() => {
          game.offerDraw();
          setDrawSendOpen(false);
          push({ kind: 'info', title: 'Draw offer sent' });
        }}
        onClose={() => setDrawSendOpen(false)}
      />
      <DrawIncomingModal
        open={showDrawIncoming}
        offererName={offererName}
        onAccept={() => game.respondDraw(true)}
        onDecline={() => game.respondDraw(false)}
      />
      <RematchIncomingModal
        open={showRematchIncoming}
        onAccept={() => game.respondRematch(true)}
        onDecline={() => game.respondRematch(false)}
      />
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      <Modal
        open={gameOver !== null}
        onClose={() => navigate('/')}
        title={resultTitle(gameOver?.result ?? snapshot.result)}
      >
        <p className="tnum font-mono text-2xl font-medium text-[var(--accent)]">
          {gameOver?.result ?? '—'}
        </p>
        {snapshot.resultReason && (
          <p className="mt-3 text-sm text-[var(--muted)]">{snapshot.resultReason}</p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => void copyPGN()}>
            Copy PGN
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Home
          </Button>
          {!isSpectator && (
            <Button
              onClick={() => {
                game.requestRematch();
                push({ kind: 'info', title: 'Rematch offered' });
              }}
            >
              Rematch
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}
