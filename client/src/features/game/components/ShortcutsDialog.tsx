import { Fragment } from 'react';
import { Modal } from '@/components/ui';

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['F'], label: 'Flip the board' },
  { keys: ['←', '→'], label: 'Review previous / next move' },
  { keys: ['M'], label: 'Mute or unmute sounds' },
  { keys: ['N'], label: 'New game (rematch online when finished)' },
  { keys: ['?'], label: 'Open this help' },
  { keys: ['Esc'], label: 'Close dialogs' },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <ul className="flex flex-col gap-2.5">
        {SHORTCUTS.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-[var(--muted)]">{s.label}</span>
            <span className="flex gap-1">
              {s.keys.map((k) => (
                <Fragment key={k}>
                  <kbd className="tnum inline-flex h-6 min-w-6 items-center justify-center rounded-[8px] border border-[var(--hairline-strong)] bg-[var(--surface-2)] px-1.5 font-mono text-xs text-[var(--text)]">
                    {k}
                  </kbd>
                </Fragment>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
