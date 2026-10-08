import { memo } from 'react';

/**
 * Lime logo mark: the geometric knight, flat, for the rail.
 * Uses currentColor so callers set text-[var(--accent)].
 * (Not a game piece — game pieces come from the shared <Piece /> set.)
 */
export const LogoMark = memo(function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 45 45" aria-hidden className={className} focusable="false">
      <g fill="currentColor" stroke="none" strokeLinejoin="miter" strokeLinecap="square">
        <path
          d="M15 36 L15 28 L19 24 L19 17 L23 12 L29 12 L29 16 L26.5 18.5 L28 24 L31 29 L31 36 Z M22 24 L24.5 27 L22.5 29 L20 26 Z"
          fillRule="evenodd"
        />
        <rect x="13.5" y="33" width="18" height="3.2" />
      </g>
    </svg>
  );
});
