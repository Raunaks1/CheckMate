import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface MoveListProps {
  sans: string[];
  reviewPly: number | null;
  onSelect: (ply: number | null) => void;
  layout?: 'vertical' | 'strip';
}

export function MoveList({ sans, reviewPly, onSelect, layout = 'vertical' }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || reviewPly !== null) return;
    el.scrollTop = el.scrollHeight;
    el.scrollLeft = el.scrollWidth;
  }, [sans.length, reviewPly]);

  const rows: { num: number; white: number | null; black: number | null }[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({
      num: i / 2 + 1,
      white: i + 1,
      black: i + 2 <= sans.length ? i + 2 : null,
    });
  }

  const isLive = reviewPly === null;
  const plySan = (ply: number): string => sans[ply - 1] ?? '';
  const isCurrent = (ply: number | null): boolean =>
    ply !== null && ((isLive && ply === sans.length) || reviewPly === ply);

  if (layout === 'strip') {
    const chipClass = (ply: number) =>
      clsx(
        'tnum flex h-9 items-center rounded-[8px] px-2 font-mono text-[13px] whitespace-nowrap',
        isCurrent(ply)
          ? 'bg-[var(--surface-3)] font-medium text-[var(--text)]'
          : 'text-[var(--text-2)]'
      );
    const chipFor = (ply: number | null, showNum: boolean) => {
      if (ply === null) return null;
      return (
        <button
          type="button"
          key={ply}
          onClick={() => onSelect(ply === sans.length && isLive ? null : ply)}
          aria-current={isCurrent(ply) ? 'true' : undefined}
          aria-label={`Move ${Math.ceil(ply / 2)}${ply % 2 === 1 ? ', white' : ', black'}: ${plySan(ply)}`}
          className="flex min-h-[44px] shrink-0 items-center"
        >
          <span className={chipClass(ply)}>
            {showNum && <span className="mr-1 text-[var(--muted)]">{Math.ceil(ply / 2)}.</span>}
            {plySan(ply)}
          </span>
        </button>
      );
    };
    return (
      <div className="flex flex-col">
        {reviewPly !== null && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="label mx-4 mt-2 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-1.5 text-[var(--text)]"
          >
            ← Back to live
          </button>
        )}
        <div
          ref={scrollRef}
          role="log"
          aria-label="Move list"
          className="flex items-center gap-0.5 overflow-x-auto px-4"
        >
          {sans.length === 0 ? (
            <span className="flex min-h-[44px] items-center font-mono text-[13px] text-[var(--muted)]">
              No moves yet — White to play.
            </span>
          ) : (
            rows.map((row) => (
              <span key={row.num} className="flex shrink-0 items-center">
                {chipFor(row.white, true)}
                {chipFor(row.black, false)}
              </span>
            ))
          )}
        </div>
      </div>
    );
  }

  if (sans.length === 0) {
    return (
      <p className="px-3 py-4 text-center font-mono text-xs text-[var(--muted)]">
        No moves yet — White to play.
      </p>
    );
  }

  const cellClass = (ply: number | null) =>
    clsx(
      'tnum flex h-9 flex-1 items-center rounded-[8px] px-2 font-mono text-[14px] whitespace-nowrap',
      isCurrent(ply)
        ? 'bg-[var(--surface-3)] font-medium text-[var(--text)]'
        : 'text-[var(--text)] hover:underline hover:underline-offset-4'
    );

  return (
    <div className="flex flex-col gap-2">
      {reviewPly !== null && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="label rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-1.5 text-[var(--text)] hover:bg-[var(--surface-3)]"
        >
          ← Back to live
        </button>
      )}
      <div
        ref={scrollRef}
        role="log"
        aria-label="Move list"
        className="flex max-h-40 flex-col gap-0.5 overflow-x-hidden overflow-y-auto p-1 lg:max-h-[320px]"
      >
        {rows.map((row) => (
          <div key={row.num} className="flex w-full shrink-0 items-center gap-1">
            <span className="tnum flex h-9 w-8 shrink-0 items-center font-mono text-[13px] text-[var(--muted)]">
              {row.num}.
            </span>
            {row.white !== null && (
              <button
                type="button"
                key={`w-${row.white}`}
                onClick={() => onSelect(row.white === sans.length && isLive ? null : row.white)}
                aria-current={isCurrent(row.white) ? 'true' : undefined}
                className={cellClass(row.white)}
              >
                {plySan(row.white)}
              </button>
            )}
            {row.black !== null ? (
              <button
                type="button"
                key={`b-${row.black}`}
                onClick={() => onSelect(row.black === sans.length && isLive ? null : row.black)}
                aria-current={isCurrent(row.black) ? 'true' : undefined}
                className={cellClass(row.black)}
              >
                {plySan(row.black)}
              </button>
            ) : (
              <span className="flex-1" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
