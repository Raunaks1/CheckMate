import { useCallback, useEffect, useRef, useState } from 'react';
import type { LastMove, PieceColor, Square } from '@/features/board';
import { useGameStore } from '@/features/game/useGameStore';
import { isTerminalStatus, type GameStatus } from '@/features/game/types';
import { EngineService, type EngineEval, type EngineStatus } from './EngineService';
import { getDifficulty } from './difficulties';

export const HINTS_PER_GAME = 3;

export interface ParsedUciMove {
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

function isSquareText(value: string): value is Square {
  return /^[a-h][1-8]$/.test(value);
}

export function parseUciMove(uci: string): ParsedUciMove | null {
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci);
  if (!match?.[1] || !match[2]) return null;
  const from = match[1];
  const to = match[2];
  if (!isSquareText(from) || !isSquareText(to)) return null;
  const promo = match[3];
  if (promo === 'q' || promo === 'r' || promo === 'b' || promo === 'n') {
    return { from, to, promotion: promo };
  }
  if (promo !== undefined) return null;
  return { from, to };
}

export function shouldEngineMove(args: {
  turn: PieceColor;
  engineColor: PieceColor;
  status: GameStatus;
  reviewPly: number | null;
  thinking: boolean;
  engineReady: boolean;
}): boolean {
  return (
    args.engineReady &&
    !args.thinking &&
    args.reviewPly === null &&
    !isTerminalStatus(args.status) &&
    args.turn === args.engineColor
  );
}

interface UseComputerGameArgs {
  humanColor: PieceColor;
  difficultyId: string;
  createService?: () => EngineService;
}

export function useComputerGame({ humanColor, difficultyId, createService }: UseComputerGameArgs) {
  const engineColor: PieceColor = humanColor === 'w' ? 'b' : 'w';
  const difficulty = getDifficulty(difficultyId);

  const [service] = useState(() => (createService ? createService() : new EngineService()));
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('loading');
  const [thinking, setThinking] = useState(false);
  const [evalScore, setEvalScore] = useState<EngineEval | null>(null);
  const [hintArrow, setHintArrow] = useState<LastMove | null>(null);
  const [hintsLeft, setHintsLeft] = useState(HINTS_PER_GAME);

  const fen = useGameStore((s) => s.fen);
  const turn = useGameStore((s) => s.turn);
  const status = useGameStore((s) => s.status);
  const reviewPly = useGameStore((s) => s.reviewPly);
  const moveCount = useGameStore((s) => s.sans.length);

  const requestRef = useRef(0);

  // Init + skill
  useEffect(() => {
    let cancelled = false;
    setEngineStatus('loading');
    service
      .init()
      .then(() => {
        if (cancelled) return;
        service.setSkill({ skillLevel: difficulty.skillLevel, elo: difficulty.elo });
        service.newGame();
        setEngineStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setEngineStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  useEffect(() => {
    if (engineStatus === 'ready') {
      service.setSkill({ skillLevel: difficulty.skillLevel, elo: difficulty.elo });
    }
  }, [service, engineStatus, difficulty.skillLevel, difficulty.elo]);

  // Engine replies
  useEffect(() => {
    if (
      !shouldEngineMove({
        turn,
        engineColor,
        status,
        reviewPly,
        thinking,
        engineReady: engineStatus === 'ready',
      })
    ) {
      return;
    }
    requestRef.current += 1;
    const request = requestRef.current;
    setThinking(true);
    service.setPosition(fen);
    void service.getBestMove({ movetimeMs: difficulty.movetimeMs }).then((uci) => {
      if (request !== requestRef.current) return;
      setThinking(false);
      if (uci === '(none)') return;
      const parsed = parseUciMove(uci);
      if (!parsed) return;
      useGameStore.getState().makeMove(parsed.from, parsed.to, parsed.promotion);
      setEvalScore(service.getEvaluation());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, turn, status, reviewPly, engineStatus]);

  // Live eval while thinking
  useEffect(() => {
    if (!thinking) return;
    const id = window.setInterval(() => {
      setEvalScore(service.getEvaluation());
    }, 200);
    return () => window.clearInterval(id);
  }, [thinking, service]);

  // Hint expires on next move
  useEffect(() => {
    setHintArrow(null);
  }, [moveCount]);

  const requestHint = useCallback(() => {
    if (thinking || engineStatus !== 'ready' || reviewPly !== null || hintsLeft <= 0) return;
    const state = useGameStore.getState();
    if (state.turn !== humanColor || isTerminalStatus(state.status)) return;
    setHintsLeft((left) => Math.max(0, left - 1));
    service.setPosition(state.fen);
    void service.getBestMove({ movetimeMs: 400 }).then((uci) => {
      const parsed = parseUciMove(uci);
      if (parsed) setHintArrow({ from: parsed.from, to: parsed.to });
    });
  }, [thinking, engineStatus, reviewPly, hintsLeft, humanColor, service]);

  const undoTwoPly = useCallback(() => {
    requestRef.current += 1;
    setThinking(false);
    service.stop();
    const store = useGameStore.getState();
    store.undo();
    // After one undo it may still be the engine's turn (odd ply) — pop again
    // so the human keeps their color.
    if (useGameStore.getState().turn !== humanColor) {
      useGameStore.getState().undo();
    }
    setHintArrow(null);
  }, [humanColor, service]);

  useEffect(() => {
    return () => {
      service.stop();
      service.terminate();
    };
  }, [service]);

  return {
    engineColor,
    engineStatus,
    thinking,
    evalScore,
    hintArrow,
    hintsLeft,
    requestHint,
    undoTwoPly,
  };
}
