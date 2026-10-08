import type { PieceColor, PieceType } from '@/features/board';
import { Piece } from '@/features/board';
import { Clock } from './Clock';

interface GamePlayerRowProps {
  name: string;
  initials: string;
  subtitle?: string;
  captured: PieceType[];
  capturedColor: PieceColor;
  materialLead: number;
  clockMs: number | null;
  clockActive: boolean;
  showYourMove?: boolean;
}

function CapturedSilhouettes({ captured, color }: { captured: PieceType[]; color: PieceColor }) {
  if (captured.length === 0) return null;
  return (
    <span className="flex items-center" aria-label={`${captured.length} captured pieces`}>
      {captured.slice(0, 8).map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="h-4 w-4"
          style={{ marginLeft: i === 0 ? 0 : -5 }}
          aria-hidden
        >
          <Piece color={color} type={t} className="h-full w-full" />
        </span>
      ))}
      {captured.length > 8 && (
        <span className="ml-1 font-mono text-[11px] text-[var(--muted)]">
          +{captured.length - 8}
        </span>
      )}
    </span>
  );
}

export function GamePlayerRow({
  name,
  initials,
  subtitle,
  captured,
  capturedColor,
  materialLead,
  clockMs,
  clockActive,
  showYourMove = false,
}: GamePlayerRowProps) {
  return (
    <div className="flex w-full items-center gap-3">
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--hairline)] bg-[var(--surface-2)] font-mono text-[12px] text-[var(--text-2)]"
      >
        {initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] leading-tight font-semibold text-[var(--text)]">
          {name}
        </span>
        <span className="tnum truncate font-mono text-[12px] leading-tight text-[var(--text-2)]">
          {[subtitle, materialLead > 0 ? `+${materialLead}` : null].filter(Boolean).join(' · ') ||
            ' '}
        </span>
        <span className="flex items-center">
          <CapturedSilhouettes captured={captured} color={capturedColor} />
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Clock ms={clockMs} active={clockActive} ariaLabel={`${name} clock`} size="xl" underline />
        {showYourMove && clockActive && (
          <span className="font-mono text-[12px] leading-none text-[var(--muted)]">Your move</span>
        )}
      </div>
    </div>
  );
}
