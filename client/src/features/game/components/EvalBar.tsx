import type { EngineEval } from '@/features/engine/EngineService';

interface EvalBarProps {
  evalScore: EngineEval | null;
  slim?: boolean;
}

function whiteShare(evalScore: EngineEval | null): number {
  if (!evalScore) return 0.5;
  if (evalScore.mate !== null) return evalScore.mate > 0 ? 1 : 0;
  if (evalScore.cp === null) return 0.5;
  const share = 1 / (1 + Math.pow(10, -evalScore.cp / 400));
  return Math.min(0.98, Math.max(0.02, share));
}

function scoreText(evalScore: EngineEval | null): string {
  if (!evalScore) return '';
  if (evalScore.mate !== null) {
    return evalScore.mate > 0 ? `#${evalScore.mate}` : `-#${Math.abs(evalScore.mate)}`;
  }
  if (evalScore.cp === null) return '';
  const pawns = evalScore.cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

export function EvalBar({ evalScore, slim = false }: EvalBarProps) {
  const share = whiteShare(evalScore);
  if (slim) {
    return (
      <div className="flex h-full flex-col items-center gap-1.5">
        <div
          role="meter"
          aria-label={`Evaluation: ${scoreText(evalScore) || 'even'}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          className="relative min-h-40 w-2 flex-1 overflow-hidden rounded-[2px] border border-[var(--hairline)] bg-[var(--eval-black)]"
        >
          <div
            className="absolute right-0 bottom-0 left-0 bg-[var(--eval-white)]"
            style={{ height: `${share * 100}%` }}
          />
        </div>
        <span className="tnum font-mono text-[11px] leading-none text-[var(--text-2)]">
          {scoreText(evalScore) || '+0.0'}
        </span>
      </div>
    );
  }
  return (
    <div
      role="meter"
      aria-label={`Evaluation: ${scoreText(evalScore) || 'even'}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
      className="relative h-full min-h-40 w-7 shrink-0 overflow-hidden rounded-[8px] border border-[var(--hairline)] bg-[var(--eval-black)]"
    >
      <div
        className="absolute right-0 bottom-0 left-0 bg-[var(--eval-white)]"
        style={{ height: `${share * 100}%` }}
      />
      <span className="tnum absolute inset-x-0 bottom-1 text-center font-mono text-[10px] leading-none text-[var(--eval-white)]">
        {scoreText(evalScore)}
      </span>
    </div>
  );
}
