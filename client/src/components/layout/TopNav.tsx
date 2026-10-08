import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Settings, Sun } from 'lucide-react';
import { IconButton, Tooltip } from '@/components/ui';
import { useTheme } from '@/providers/ThemeProvider';
import { SettingsDrawer } from '@/features/game';

const NAV_LINKS = [
  { to: '/play/computer', label: 'Engine' },
  { to: '/play/local', label: 'Pass & Play' },
  { to: '/play/online', label: 'Online' },
] as const;

export function TopNav() {
  const { resolved, toggle } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="text-[18px] font-semibold tracking-[-0.035em] text-[var(--text)]"
            aria-label="Checkmate home"
          >
            Checkmate
          </Link>
          <nav aria-label="Modes" className="flex items-center gap-5">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="hidden text-[13px] font-medium text-[var(--text-2)] hover:text-[var(--text)] sm:inline"
              >
                {l.label}
              </Link>
            ))}
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
            <Tooltip content="Game settings">
              <span>
                <IconButton label="Open settings" onClick={() => setSettingsOpen(true)}>
                  <Settings size={20} strokeWidth={1.5} />
                </IconButton>
              </span>
            </Tooltip>
          </nav>
        </div>
      </header>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
