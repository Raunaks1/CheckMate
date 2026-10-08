import { clsx } from 'clsx';
import type { ConnStatus } from '../useOnlineGame';

const META: Record<ConnStatus, { mark: string; label: string }> = {
  connected: { mark: 'bg-[var(--text)]', label: 'Connected' },
  reconnecting: { mark: 'bg-[var(--accent)]', label: 'Reconnecting' },
  offline: { mark: 'border border-[var(--hairline-strong)]', label: 'Offline' },
};

export function ConnectionDot({ status }: { status: ConnStatus }) {
  const meta = META[status];
  return (
    <span
      role="status"
      aria-label={meta.label}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--muted)]"
    >
      <span aria-hidden className={clsx('h-2 w-2', meta.mark)} />
      {meta.label}
    </span>
  );
}
