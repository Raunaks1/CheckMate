import { create } from 'zustand';
import { Chess } from 'chess.js';
import { flagIsDraw, flagMaterialFromFen } from 'checkmate-shared';
import type { LastMove, LegalMove, PieceType, PromotionPiece, Square } from '@/features/board';
import type { GameResult, GameStatus, VerboseHistoryItem } from './types';
import { isTerminalStatus } from './types';

interface GameStoreState {
  fen: string;
  sans: string[];
  verbose: VerboseHistoryItem[];
  fens: string[];
  turn: 'w' | 'b';
  status: GameStatus;
  result: GameResult;
  resultReason: string | null;
  lastMove: LastMove | null;
  checkSquare: Square | null;
  reviewPly: number | null;
  makeMove: (from: Square, to: Square, promotion?: PromotionPiece) => boolean;
  undo: () => void;
  reset: () => void;
  loadFen: (fen: string) => boolean;
  resign: (color: 'w' | 'b') => void;
  agreeDraw: () => void;
  flag: (color: 'w' | 'b') => void;
  reviewTo: (ply: number | null) => void;
  getLegalMoves: (square: Square) => LegalMove[];
  getPGN: () => string;
}

const game = new Chess();

function findKingSquare(): Square | null {
  const turn = game.turn();
  const board = game.board();
  for (let row = 0; row < 8; row++) {
    const rankRow = board[row];
    if (!rankRow) continue;
    for (let col = 0; col < 8; col++) {
      const cell = rankRow[col];
      if (cell && cell.type === 'k' && cell.color === turn) {
        return `${String.fromCharCode(97 + col)}${8 - row}` as Square;
      }
    }
  }
  return null;
}

interface Snapshot {
  fen: string;
  sans: string[];
  verbose: VerboseHistoryItem[];
  fens: string[];
  turn: 'w' | 'b';
  lastMove: LastMove | null;
  checkSquare: Square | null;
}

function snapshot(prevFens: string[]): Snapshot {
  const fen = game.fen();
  const history = game.history({ verbose: true });
  const sans = history.map((m) => m.san);
  const verbose: VerboseHistoryItem[] = history.map((m) => ({
    from: m.from as Square,
    to: m.to as Square,
    san: m.san,
    promotion: m.promotion as PromotionPiece | undefined,
    captured: m.captured as PieceType | undefined,
    isCastle: m.isKingsideCastle() || m.isQueensideCastle(),
  }));
  const last = history[history.length - 1];
  const lastMove: LastMove | null = last
    ? { from: last.from as Square, to: last.to as Square }
    : null;
  const inCheck = game.isCheck();
  return {
    fen,
    sans,
    verbose,
    fens: [...prevFens, fen],
    turn: game.turn(),
    lastMove,
    checkSquare: inCheck ? findKingSquare() : null,
  };
}

function deriveStatus(): { status: GameStatus; result: GameResult; reason: string | null } {
  if (game.isCheckmate()) {
    const whiteWon = game.turn() === 'b';
    return {
      status: 'checkmate',
      result: whiteWon ? '1-0' : '0-1',
      reason: `Checkmate — ${whiteWon ? 'White' : 'Black'} wins`,
    };
  }
  if (game.isStalemate()) {
    return { status: 'stalemate', result: '1/2-1/2', reason: 'Stalemate — draw' };
  }
  if (game.isInsufficientMaterial()) {
    return {
      status: 'draw-insufficient',
      result: '1/2-1/2',
      reason: 'Draw — insufficient material',
    };
  }
  if (game.isThreefoldRepetition()) {
    return {
      status: 'draw-repetition',
      result: '1/2-1/2',
      reason: 'Draw — threefold repetition',
    };
  }
  if (game.isDrawByFiftyMoves()) {
    return {
      status: 'draw-50-move',
      result: '1/2-1/2',
      reason: 'Draw — fifty-move rule',
    };
  }
  if (game.isCheck()) {
    return { status: 'check', result: null, reason: null };
  }
  return { status: 'playing', result: null, reason: null };
}

function initialSnapshot(): Snapshot {
  const fen = game.fen();
  return {
    fen,
    sans: [],
    verbose: [],
    fens: [fen],
    turn: game.turn(),
    lastMove: null,
    checkSquare: null,
  };
}

export const useGameStore = create<GameStoreState>()((set, get) => ({
  ...initialSnapshot(),
  status: 'playing' as GameStatus,
  result: null,
  resultReason: null,
  reviewPly: null,

  makeMove: (from, to, promotion) => {
    const { status } = get();
    if (isTerminalStatus(status)) return false;
    try {
      if (promotion) game.move({ from, to, promotion });
      else game.move({ from, to });
    } catch {
      return false;
    }
    const snap = snapshot(get().fens);
    const derived = deriveStatus();
    set({ ...snap, ...derived, reviewPly: null });
    return true;
  },

  undo: () => {
    const undone = game.undo();
    if (!undone) return;
    const fens = get().fens.slice(0, -1);
    const history = game.history({ verbose: true });
    const last = history[history.length - 1];
    const inCheck = game.isCheck();
    // Undo always returns to a live position
    set({
      fen: game.fen(),
      sans: history.map((m) => m.san),
      verbose: history.map((m) => ({
        from: m.from as Square,
        to: m.to as Square,
        san: m.san,
        promotion: m.promotion as PromotionPiece | undefined,
        captured: m.captured as PieceType | undefined,
        isCastle: m.isKingsideCastle() || m.isQueensideCastle(),
      })),
      fens: fens.length > 0 ? fens : [game.fen()],
      turn: game.turn(),
      lastMove: last ? { from: last.from as Square, to: last.to as Square } : null,
      checkSquare: inCheck ? findKingSquare() : null,
      status: inCheck ? ('check' as GameStatus) : ('playing' as GameStatus),
      result: null,
      resultReason: null,
      reviewPly: null,
    });
  },

  reset: () => {
    game.reset();
    set({
      ...initialSnapshot(),
      status: 'playing',
      result: null,
      resultReason: null,
      reviewPly: null,
    });
  },

  loadFen: (fen) => {
    try {
      game.load(fen);
    } catch {
      return false;
    }
    const snap = { ...initialSnapshot(), fen: game.fen(), fens: [game.fen()], turn: game.turn() };
    const derived = deriveStatus();
    set({ ...snap, ...derived, reviewPly: null });
    return true;
  },

  resign: (color) => {
    if (isTerminalStatus(get().status)) return;
    set({
      status: 'resigned',
      result: color === 'w' ? '0-1' : '1-0',
      resultReason: `${color === 'w' ? 'White' : 'Black'} resigned`,
    });
  },

  agreeDraw: () => {
    if (isTerminalStatus(get().status)) return;
    set({
      status: 'draw-agreed',
      result: '1/2-1/2',
      resultReason: 'Draw by agreement',
    });
  },

  flag: (color) => {
    const { status } = get();
    if (status !== 'playing' && status !== 'check') return;
    // FIDE: flag fall is a draw when the winner cannot possibly mate
    // (bare king, or a single minor against a bare king).
    const { white, black } = flagMaterialFromFen(game.fen());
    const winnerIsWhite = color === 'b';
    const draw = flagIsDraw(winnerIsWhite ? white : black, winnerIsWhite ? black : white);
    if (draw) {
      set({
        status: 'draw-insufficient',
        result: '1/2-1/2',
        resultReason: 'Draw — insufficient mating material on flag fall',
      });
      return;
    }
    set({
      status: 'timeout',
      result: color === 'w' ? '0-1' : '1-0',
      resultReason: `${color === 'w' ? 'White' : 'Black'} flagged — time out`,
    });
  },

  reviewTo: (ply) => {
    if (ply === null) {
      set({ reviewPly: null });
      return;
    }
    const { sans } = get();
    if (ply < 1 || ply > sans.length) return;
    set({ reviewPly: ply });
  },

  getLegalMoves: (square) => {
    try {
      return game.moves({ square, verbose: true }).map((m) => ({
        to: m.to as Square,
        isCapture: m.isCapture(),
        isPromotion: m.isPromotion(),
      }));
    } catch {
      return [];
    }
  },

  getPGN: () => game.pgn(),
}));
