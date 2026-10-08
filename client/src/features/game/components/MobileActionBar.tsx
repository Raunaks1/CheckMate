import { clsx } from 'clsx';
import { ArrowLeftRight, Flag, Handshake, Lightbulb, Redo2 } from 'lucide-react';

interface MobileActionBarProps {
  onFlip: () => void;
  hintsLeft?: number | null;
  onRequestHint?: (() => void) | null;
  hintDisabled?: boolean;
  onUndo: () => void;
  canUndo: boolean;
  canAct: boolean;
  onOfferDraw: () => void;
  onResign: () => void;
}

function BarItem({
  label,
  sub,
  onClick,
  disabled = false,
  danger = false,
  icon,
}: {
  label: string;
  sub?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={sub ? `${label}, ${sub}` : label}
      className={clsx(
        'flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 py-1.5',
        danger
          ? 'text-[var(--danger)]'
          : 'text-[var(--text-2)] active:bg-[var(--surface-2)] active:text-[var(--text)]',
        'disabled:opacity-40 disabled:active:bg-transparent'
      )}
    >
      {icon}
      <span className="text-[11px] leading-none font-medium">{label}</span>
      {sub && (
        <span className="tnum font-mono text-[10px] leading-none text-[var(--muted)]">{sub}</span>
      )}
    </button>
  );
}

export function MobileActionBar({
  onFlip,
  hintsLeft = null,
  onRequestHint = null,
  hintDisabled = false,
  onUndo,
  canUndo,
  canAct,
  onOfferDraw,
  onResign,
}: MobileActionBarProps) {
  const hintSub =
    hintsLeft === null ? undefined : hintsLeft > 0 ? `${hintsLeft} left` : 'none left';
  return (
    <nav
      aria-label="Game actions"
      className="sticky bottom-0 z-10 flex min-h-[72px] shrink-0 items-stretch gap-1 border-t border-[var(--hairline)] bg-[var(--surface-1)] px-2 pt-1 lg:hidden"
      style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))' }}
    >
      <BarItem
        label="Flip"
        onClick={onFlip}
        icon={<ArrowLeftRight size={20} strokeWidth={1.5} aria-hidden />}
      />
      <BarItem
        label="Hint"
        sub={hintSub}
        onClick={() => onRequestHint?.()}
        disabled={onRequestHint === null || hintDisabled}
        icon={<Lightbulb size={20} strokeWidth={1.5} aria-hidden />}
      />
      <BarItem
        label="Undo"
        onClick={onUndo}
        disabled={!canUndo || !canAct}
        icon={<Redo2 size={20} strokeWidth={1.5} aria-hidden className="scale-x-[-1]" />}
      />
      <BarItem
        label="Draw"
        onClick={onOfferDraw}
        disabled={!canAct}
        icon={<Handshake size={20} strokeWidth={1.5} aria-hidden />}
      />
      <BarItem
        label="Resign"
        onClick={onResign}
        disabled={!canAct}
        danger
        icon={<Flag size={20} strokeWidth={1.5} aria-hidden />}
      />
    </nav>
  );
}
