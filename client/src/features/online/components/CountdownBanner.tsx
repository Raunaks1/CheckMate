import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';

function remainingMs(graceUntil: number, now: number): number {
  return Math.max(0, graceUntil - now);
}

function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function CountdownBanner({
  graceUntil,
  onClaim,
}: {
  graceUntil: number;
  onClaim: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[48px] flex-wrap items-center gap-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-1)] px-4 py-2"
    >
      <p className="tnum min-w-0 flex-1 font-mono text-[13px] text-[var(--text-2)]">
        Opponent disconnected - {formatCountdown(remainingMs(graceUntil, now))} to reconnect
      </p>
      <Button variant="ghost" size="sm" onClick={onClaim}>
        Claim win
      </Button>
    </div>
  );
}
