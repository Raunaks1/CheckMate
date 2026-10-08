import { History, Moon, Puzzle, Settings, Swords, Sun } from 'lucide-react';
import { clsx } from 'clsx';
import { LogoMark } from '@/features/board';
import { useTheme } from '@/providers/ThemeProvider';
import { IconButton, Tooltip } from '@/components/ui';

const NAV = [
  { id: 'play', label: 'Play', icon: Swords, active: true },
  { id: 'puzzles', label: 'Puzzles', icon: Puzzle, active: false },
  { id: 'history', label: 'History', icon: History, active: false },
  { id: 'settings', label: 'Settings', icon: Settings, active: false },
] as const;

export function LeftRail({ collapsed = false }: { collapsed?: boolean }) {
  const { resolved, toggle } = useTheme();
  const tile = collapsed ? 'h-10 w-10' : 'h-11 w-11';

  return (
    <nav
      aria-label="Primary"
      className={
        collapsed
          ? 'sticky top-0 flex h-screen w-[56px] shrink-0 flex-col items-center border-r border-[var(--hairline)] bg-[var(--surface-1)] py-3'
          : 'sticky top-0 flex h-screen w-[72px] shrink-0 flex-col items-center border-r border-[var(--hairline)] bg-[var(--surface-1)] py-4'
      }
    >
      <span aria-label="Checkmate home" role="img" className="text-[var(--accent)]">
        <LogoMark className="h-7 w-7" />
      </span>

      <div className="mt-8 flex flex-col items-center gap-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.id} content={item.active ? item.label : `${item.label} — soon`}>
              <span>
                <span
                  aria-current={item.active ? 'page' : undefined}
                  aria-label={item.label}
                  aria-disabled={item.active ? undefined : 'true'}
                  className={clsx(
                    'flex items-center justify-center rounded-[10px]',
                    tile,
                    item.active
                      ? 'bg-[var(--surface-3)] text-[var(--text)]'
                      : 'cursor-not-allowed text-[var(--muted)] hover:bg-[var(--surface-2)]'
                  )}
                >
                  <Icon size={20} strokeWidth={1.5} aria-hidden />
                </span>
              </span>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2">
        <Tooltip content={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}>
          <span>
            <IconButton label="Toggle color theme" onClick={toggle}>
              {resolved === 'dark' ? (
                <Sun size={20} strokeWidth={1.5} />
              ) : (
                <Moon size={20} strokeWidth={1.5} />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <span
          aria-label="Your profile"
          className={
            collapsed
              ? 'flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--hairline)] bg-[var(--surface-2)] font-mono text-[12px] text-[var(--text-2)]'
              : 'flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--hairline)] bg-[var(--surface-2)] font-mono text-[13px] text-[var(--text-2)]'
          }
        >
          R
        </span>
      </div>
    </nav>
  );
}
