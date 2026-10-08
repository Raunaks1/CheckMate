import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Ellipsis } from 'lucide-react';

interface MobileTopBarProps {
  title: string;
  onBack: () => void;
  onNewGame: () => void;
  onCopyPGN: () => void;
  onDownloadPGN: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export function MobileTopBar({
  title,
  onBack,
  onNewGame,
  onCopyPGN,
  onDownloadPGN,
  onOpenSettings,
  onOpenShortcuts,
}: MobileTopBarProps) {
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

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-[var(--hairline)] bg-[var(--bg)] px-1 lg:hidden">
      <button
        type="button"
        aria-label="Back to home"
        onClick={onBack}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
      >
        <ChevronLeft size={22} strokeWidth={1.5} aria-hidden />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)]">
        {title}
      </h1>
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Game menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <Ellipsis size={20} strokeWidth={1.5} aria-hidden />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute top-full right-0 z-30 mt-1 w-48 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-2)] p-1"
          >
            {[
              { label: 'New game', fn: onNewGame },
              { label: 'Copy PGN', fn: onCopyPGN },
              { label: 'Download PGN', fn: onDownloadPGN },
              { label: 'Settings', fn: onOpenSettings },
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
                className="flex min-h-[44px] w-full items-center rounded-[8px] px-3 text-left text-[13px] text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
