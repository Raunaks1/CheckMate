import { clsx } from 'clsx';

export function Skeleton({
  className,
  label = 'Loading…',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      aria-busy="true"
      className={clsx(
        'block rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-2)]',
        className
      )}
    />
  );
}

export function SkeletonLines({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading…"
      aria-busy="true"
      className={clsx('flex flex-col gap-2', className)}
    >
      {Array.from({ length: rows }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="block h-3.5 rounded-[8px] border border-[var(--hairline)] bg-[var(--surface-2)]"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </span>
  );
}
