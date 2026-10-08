import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  children,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-transparent',
        'text-[var(--muted)] hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
        'disabled:cursor-not-allowed disabled:opacity-55',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
