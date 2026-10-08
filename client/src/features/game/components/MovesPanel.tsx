import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ellipsis,
  Flag,
  Handshake,
  Lightbulb,
  Redo2,
  Settings,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui';
import { MoveList } from './MoveList';

interface MovesPanelProps {
  sans: string[];
  reviewPly: number | null;
  totalPlies: number;
  onSelectReview: (ply: number | null) => void;
  onReviewFirst: () => void;
  onReviewPrev: () => void;
  onReviewNext: () => void;
  onReviewLast: () => void;
  onCopyPGN: () => void;
  onDownloadPGN: () => void;
  onNewGame: () => void;
  onOpenShortcuts: () => void;
  onFlip: () => void;
  onUndo: () => void;
  canUndo: boolean;
  canAct: boolean;
  hintsLeft?: number | null;
  onRequestHint?: (() => void) | null;
  hintDisabled?: boolean;
  onOfferDraw: () => void;
  onResign: () => void;
  resignConfirm: React.ReactNode;
  onOpenSettings: () => void;
}

function ActionButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  icon,
}: {
  label: string;
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
      className={clsx(
        'flex min-h-11 items-center gap-2 rounded-[10px] border border-transparent px-3 py-2 text-[13px] font-medium',
        danger
          ? 'text-[var(--danger)] hover:bg-[var(--surface-2)]'
          : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-[var(--text-2)]'
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 flex-1 items-center justify-center rounded-[10px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {icon}
    </button>
  );
}

export function MovesPanel({
  sans,
  reviewPly,
  totalPlies,
  onSelectReview,
  onReviewFirst,
  onReviewPrev,
  onReviewNext,
  onReviewLast,
  onCopyPGN,
  onDownloadPGN,
  onNewGame,
  onOpenShortcuts,
  onFlip,
  onUndo,
  canUndo,
  canAct,
  hintsLeft = null,
  onRequestHint = null,
  hintDisabled = false,
  onOfferDraw,
  onResign,
  resignConfirm,
  onOpenSettings,
}: MovesPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  const reviewing = reviewPly !== null;
  const canPrev = totalPlies > 0 && (reviewing ? reviewPly > 1 : true);
  const canNext = reviewing;
  const hintLabel =
    hintsLeft === null ? 'Hint' : hintsLeft > 0 ? `Hint · ${hintsLeft} left` : 'Hint';

  return (
    <aside
      aria-label="Moves and actions"
      className="flex w-full flex-col rounded-[14px] border border-[var(--hairline)] bg-[var(--surface-1)]"
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-[15px] leading-none font-semibold text-[var(--text)]">Moves</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onDownloadPGN}>
            PGN
          </Button>
          <Button variant="ghost" size="sm" onClick={onCopyPGN}>
            Copy
          </Button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="More game options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <Ellipsis size={17} strokeWidth={1.5} aria-hidden />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute top-full right-0 z-30 mt-1 w-44 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-2)] p-1"
              >
                {[
                  { label: 'New game', fn: onNewGame },
                  { label: 'Download PGN', fn: onDownloadPGN },
                  { label: 'Shortcuts (?)', fn: onOpenShortcuts },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      item.fn();
                    }}
                    className="flex w-full items-center rounded-[8px] px-3 py-2 text-left text-[13px] text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-2">
        <MoveList sans={sans} reviewPly={reviewPly} onSelect={onSelectReview} />
      </div>

      <div className="mx-4 border-t border-[var(--hairline)]" aria-hidden />

      <div className="grid grid-cols-2 gap-1 px-3 py-3">
        <ActionButton
          label="Flip"
          onClick={onFlip}
          icon={<ArrowLeftRight size={17} strokeWidth={1.5} aria-hidden />}
        />
        {onRequestHint ? (
          <ActionButton
            label={hintLabel}
            onClick={onRequestHint}
            disabled={hintDisabled}
            icon={<Lightbulb size={17} strokeWidth={1.5} aria-hidden />}
          />
        ) : (
          <ActionButton
            label="Take back"
            onClick={onUndo}
            disabled={!canUndo || !canAct}
            icon={<Redo2 size={17} strokeWidth={1.5} aria-hidden className="scale-x-[-1]" />}
          />
        )}
        {onRequestHint && (
          <ActionButton
            label="Take back"
            onClick={onUndo}
            disabled={!canUndo || !canAct}
            icon={<Redo2 size={17} strokeWidth={1.5} aria-hidden className="scale-x-[-1]" />}
          />
        )}
        <ActionButton
          label="Offer draw"
          onClick={onOfferDraw}
          disabled={!canAct}
          icon={<Handshake size={17} strokeWidth={1.5} aria-hidden />}
        />
        <ActionButton
          label="Resign"
          onClick={onResign}
          disabled={!canAct}
          danger
          icon={<Flag size={17} strokeWidth={1.5} aria-hidden />}
        />
        <ActionButton
          label="Settings"
          onClick={onOpenSettings}
          icon={<Settings size={17} strokeWidth={1.5} aria-hidden />}
        />
      </div>
      {resignConfirm}

      <div className="mx-4 border-t border-[var(--hairline)]" aria-hidden />

      <div className="flex items-center gap-1 px-3 py-3" role="group" aria-label="Move navigation">
        <NavButton
          label="First move"
          onClick={onReviewFirst}
          disabled={!canPrev}
          icon={<ChevronsLeft size={18} strokeWidth={1.5} aria-hidden />}
        />
        <NavButton
          label="Previous move"
          onClick={onReviewPrev}
          disabled={!canPrev}
          icon={<ChevronLeft size={18} strokeWidth={1.5} aria-hidden />}
        />
        <NavButton
          label="Next move"
          onClick={onReviewNext}
          disabled={!canNext}
          icon={<ChevronRight size={18} strokeWidth={1.5} aria-hidden />}
        />
        <NavButton
          label="Latest move"
          onClick={onReviewLast}
          disabled={!canNext}
          icon={<ChevronsRight size={18} strokeWidth={1.5} aria-hidden />}
        />
      </div>
    </aside>
  );
}
