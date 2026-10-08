import { clsx } from 'clsx';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`seg-${label}`} className="label text-[var(--muted)]">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`seg-${label}`}
        className="grid auto-cols-fr grid-flow-col gap-1 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-1)] p-1"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={clsx(
                'min-h-11 rounded-[8px] px-3 py-2 font-mono text-sm',
                active
                  ? 'bg-[var(--surface-3)] text-[var(--text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
