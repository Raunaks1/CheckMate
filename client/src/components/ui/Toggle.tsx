import { clsx } from 'clsx';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-[var(--hairline-strong)]',
        checked ? 'bg-[var(--surface-3)]' : 'bg-[var(--surface-2)]',
        'disabled:cursor-not-allowed disabled:opacity-55'
      )}
    >
      <span
        aria-hidden
        className={clsx(
          'inline-block h-4 w-4 transform rounded-full',
          checked ? 'translate-x-6 bg-[var(--text)]' : 'translate-x-1 bg-[var(--text-2)]'
        )}
      />
    </button>
  );
}
