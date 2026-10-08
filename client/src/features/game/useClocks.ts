import { useEffect, useRef, useState } from 'react';
import type { TimeControl } from './types';

interface ClocksResult {
  whiteMs: number | null;
  blackMs: number | null;
}

export interface ClockReset {
  key: number;
  whiteMs: number | null;
  blackMs: number | null;
}

export function useClocks(
  timeControl: TimeControl,
  turn: 'w' | 'b',
  running: boolean,
  moveCount: number,
  reset: ClockReset | null,
  onFlag: (loser: 'w' | 'b') => void
): ClocksResult {
  const [whiteMs, setWhiteMs] = useState<number | null>(timeControl.baseMs);
  const [blackMs, setBlackMs] = useState<number | null>(timeControl.baseMs);

  const onFlagRef = useRef(onFlag);
  onFlagRef.current = onFlag;
  const turnRef = useRef<'w' | 'b'>(turn);
  turnRef.current = turn;
  const flaggedRef = useRef(false);
  const prevTurnRef = useRef<'w' | 'b'>(turn);
  const prevMovesRef = useRef(moveCount);

  // Reset on control change or explicit reset (optionally seeding saved clock values)
  useEffect(() => {
    setWhiteMs(reset?.whiteMs ?? timeControl.baseMs);
    setBlackMs(reset?.blackMs ?? timeControl.baseMs);
    flaggedRef.current = false;
    prevTurnRef.current = turn;
    prevMovesRef.current = moveCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeControl.id, reset?.key]);

  // Increment for the player who just moved
  useEffect(() => {
    if (timeControl.baseMs === null || timeControl.incrementSec === 0) {
      prevTurnRef.current = turn;
      prevMovesRef.current = moveCount;
      return;
    }
    if (moveCount > prevMovesRef.current) {
      const justMoved: 'w' | 'b' = prevTurnRef.current;
      const bonus = timeControl.incrementSec * 1000;
      if (justMoved === 'w') setWhiteMs((v) => (v === null ? v : v + bonus));
      else setBlackMs((v) => (v === null ? v : v + bonus));
    }
    prevTurnRef.current = turn;
    prevMovesRef.current = moveCount;
  }, [moveCount, turn, timeControl]);

  // Countdown loop — wall-clock driven so tab sleep / throttled rAF
  // still deducts the true elapsed time on resume instead of freezing.
  useEffect(() => {
    if (!running || timeControl.baseMs === null) return;
    flaggedRef.current = false;
    let raf = 0;
    let last = Date.now();
    const resync = () => {
      last = Date.now();
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);
    window.addEventListener('online', resync);
    const tick = () => {
      const now = Date.now();
      // Clamp a single frame's deduction so a long sleep applies once,
      // correctly, without overshooting into negatives on the wrong side.
      const delta = Math.min(Math.max(0, now - last), 15 * 60 * 1000);
      last = now;
      // Tick the side that is actually to move right now (not a stale ref).
      const side = turnRef.current;
      if (side === 'w') {
        setWhiteMs((v) => {
          if (v === null) return v;
          const next = Math.max(0, v - delta);
          if (next <= 0 && !flaggedRef.current) {
            flaggedRef.current = true;
            queueMicrotask(() => onFlagRef.current('w'));
          }
          return next;
        });
      } else {
        setBlackMs((v) => {
          if (v === null) return v;
          const next = Math.max(0, v - delta);
          if (next <= 0 && !flaggedRef.current) {
            flaggedRef.current = true;
            queueMicrotask(() => onFlagRef.current('b'));
          }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
      window.removeEventListener('online', resync);
    };
  }, [running, timeControl.baseMs]);

  return { whiteMs, blackMs };
}
