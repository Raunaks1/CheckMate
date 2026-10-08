import { clsx } from 'clsx';
import type { PieceColor, PieceType } from '@/features/board';
import { Piece } from '@/features/board';
import { Clock } from './Clock';

interface PlayerStripProps {
  name: string;
  color: PieceColor;
  captured: PieceType[];
  materialLead: number;
  clockMs: number | null;
  clockActive: boolean;
  compact?: boolean;
}

function CapturedRow({
  captured,
  viewerColor,
}: {
  captured: PieceType[];
  viewerColor: PieceColor;
}) {
  if (captured.length === 0) return <span className="text-xs text-[var(--muted)]">—</span>;
  return (
    <span className="flex items-center" aria-label={`${captured.length} captured pieces`}>
      {captured.slice(0, 8).map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="h-5 w-5"
          style={{ marginLeft: i === 0 ? 0 : -6 }}
          aria-hidden
        >
          <Piece color={viewerColor} type={t} className="h-full w-full" />
        </span>
      ))}
      {captured.length > 8 && (
        <span className="ml-1 font-mono text-[11px] font-medium text-[var(--muted)]">
          +{captured.length - 8}
        </span>
      )}
    </span>
  );
}

export function PlayerStrip({
  name,
  color,
  captured,
  materialLead,
  clockMs,
  clockActive,
  compact = false,
}: PlayerStripProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const side = color === 'w' ? 'White' : 'Black';
  const headline =
    name.trim() && name.trim().toLowerCase() !== side.toLowerCase() ? `${name} · ${side}` : side;
  return (
    <div
      className={clsx(
        'flex items-center gap-3 bg-[var(--surface-1)]',
        compact
          ? 'min-h-[56px] border-b border-[var(--hairline)] px-4 py-1.5'
          : 'rounded-[14px] border border-[var(--hairline)] px-3 py-2'
      )}
    >
      <span
        aria-hidden
        className={clsx(
          'flex shrink-0 items-center justify-center rounded-[8px] border border-[var(--hairline)] bg-[var(--surface-2)] font-mono text-[var(--text-2)]',
          compact ? 'h-8 w-8 text-[12px]' : 'h-9 w-9 text-sm'
        )}
      >
        {initial}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="label truncate text-[15px] font-medium text-[var(--text)]">
          {headline}
        </span>
        <span className="flex items-center gap-1.5">
          <CapturedRow captured={captured} viewerColor={color === 'w' ? 'b' : 'w'} />
          {materialLead > 0 && (
            <span className="font-mono text-[11px] text-[var(--muted)]">+{materialLead}</span>
          )}
        </span>
      </div>
      <Clock
        ms={clockMs}
        active={clockActive}
        ariaLabel={`${name} clock`}
        size={compact ? 'sm' : 'md'}
        underline={compact}
      />
    </div>
  );
}
