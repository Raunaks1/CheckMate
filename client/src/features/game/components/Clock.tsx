import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { formatClock } from '../time';
import { playSound } from '../sound';
import { useSettingsStore } from '../useSettingsStore';

interface ClockProps {
  ms: number | null;
  active: boolean;
  ariaLabel: string;
  size?: 'sm' | 'md' | 'xl';
  underline?: boolean;
}

export function Clock({ ms, active, ariaLabel, size = 'md', underline = false }: ClockProps) {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const prevSecRef = useRef<number | null>(null);

  const sec = ms === null ? null : Math.ceil(ms / 1000);
  useEffect(() => {
    if (!active || sec === null) {
      prevSecRef.current = sec;
      return;
    }
    const prev = prevSecRef.current;
    if (prev !== null && sec < prev && sec <= 10 && sec > 0) {
      playSound('lowTime', soundEnabled);
    }
    prevSecRef.current = sec;
  }, [sec, active, soundEnabled]);

  return (
    <span
      role="timer"
      aria-label={ariaLabel}
      className={clsx(
        'tnum inline-flex items-baseline gap-2 font-mono leading-none font-medium tracking-tight',
        size === 'xl' ? 'text-[56px]' : size === 'sm' ? 'text-[32px]' : 'text-[28px]',
        active ? 'text-[var(--accent)]' : 'text-[var(--text-2)]',
        underline && active && 'border-b-2 border-[var(--accent)] pb-1'
      )}
    >
      {formatClock(ms)}
    </span>
  );
}
