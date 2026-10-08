import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Electric lime — the ONLY saturated action. Ink text.
  primary:
    'btn-primary bg-[var(--accent)] text-[var(--on-accent)] border border-[var(--accent)] hover:brightness-[1.04] active:brightness-[0.96]',
  secondary:
    'bg-transparent text-[var(--text)] border border-[var(--hairline-strong)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]',
  ghost: 'text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline',
  danger:
    'bg-transparent text-[var(--danger)] border border-[var(--hairline-strong)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 gap-1.5',
  md: 'h-11 px-4 gap-2',
  lg: 'h-11 px-6 gap-2',
};

const labelClasses = 'text-[13px] font-medium tracking-[-0.01em]';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled ?? loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={clsx(
        'inline-flex cursor-pointer items-center justify-center rounded-[10px]',
        labelClasses,
        'disabled:cursor-not-allowed disabled:opacity-55',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : leftIcon}
      <span className="truncate">{children}</span>
      {!loading && rightIcon}
    </button>
  );
}
