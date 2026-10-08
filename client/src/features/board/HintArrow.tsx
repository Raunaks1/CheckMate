import type { Orientation, Square } from './types';
import { squareToDisplayPos } from './coordinates';

interface HintArrowProps {
  from: Square;
  to: Square;
  orientation: Orientation;
}

export function HintArrow({ from, to, orientation }: HintArrowProps) {
  const a = squareToDisplayPos(from, orientation);
  const b = squareToDisplayPos(to, orientation);
  const x1 = a.col + 0.5;
  const y1 = a.row + 0.5;
  const x2 = b.col + 0.5;
  const y2 = b.row + 0.5;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Stop the shaft short so the head lands on the target center
  const headLen = 0.55;
  const sx = x2 - (dx / len) * headLen;
  const sy = y2 - (dy / len) * headLen;

  return (
    <svg
      viewBox="0 0 8 8"
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    >
      <defs>
        <marker
          id="hint-arrow-head"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="1.6"
          markerHeight="1.6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" className="fill-[var(--capture-ring)]" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={sx}
        y2={sy}
        className="stroke-[var(--capture-ring)]"
        strokeWidth="0.28"
        strokeLinecap="square"
        opacity="0.9"
        markerEnd="url(#hint-arrow-head)"
      />
    </svg>
  );
}
