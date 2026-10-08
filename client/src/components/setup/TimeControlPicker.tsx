import { clsx } from 'clsx';
import { TIME_CONTROLS } from '@/features/game';

interface TimeControlPickerProps {
  value: string;
  onChange: (id: string) => void;
}

export function TimeControlPicker({ value, onChange }: TimeControlPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id="seg-time-control" className="label text-[var(--muted)]">
        Time control
      </span>
      <div
        role="radiogroup"
        aria-labelledby="seg-time-control"
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
      >
        {TIME_CONTROLS.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(t.id)}
              className={clsx(
                'min-h-11 rounded-[10px] border px-3 py-2 font-mono text-sm',
                active
                  ? 'border-[var(--hairline-strong)] bg-[var(--surface-3)] text-[var(--text)]'
                  : 'border-[var(--hairline)] text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
