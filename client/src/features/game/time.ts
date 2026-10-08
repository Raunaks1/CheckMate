import type { TimeControl } from './types';

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'unlimited', label: 'Unlimited', baseMs: null, incrementSec: 0 },
  { id: '1+0', label: 'Bullet 1+0', baseMs: 60_000, incrementSec: 0 },
  { id: '3+2', label: 'Blitz 3+2', baseMs: 180_000, incrementSec: 2 },
  { id: '5+0', label: 'Blitz 5+0', baseMs: 300_000, incrementSec: 0 },
  { id: '10+0', label: 'Rapid 10+0', baseMs: 600_000, incrementSec: 0 },
  { id: '15+10', label: 'Rapid 15+10', baseMs: 900_000, incrementSec: 10 },
  { id: '30+0', label: 'Classical 30+0', baseMs: 1_800_000, incrementSec: 0 },
];

export function getTimeControl(id: string): TimeControl {
  const found = TIME_CONTROLS.find((t) => t.id === id);
  if (found) return found;
  return { id: '10+0', label: 'Rapid 10+0', baseMs: 600_000, incrementSec: 0 };
}

export function formatClock(ms: number | null): string {
  if (ms === null) return '∞';
  const clamped = Math.max(0, ms);
  if (clamped < 20_000) {
    const sec = Math.floor(clamped / 1000);
    const tenths = Math.floor((clamped % 1000) / 100);
    return `${sec}.${tenths}`;
  }
  const totalSec = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return `${hours}:${String(remMin).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
