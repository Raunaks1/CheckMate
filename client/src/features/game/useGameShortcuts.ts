import { useEffect } from 'react';

export interface GameShortcutActions {
  onFlip: () => void;
  onPrevMove?: () => void;
  onNextMove?: () => void;
  onToggleMute: () => void;
  onNewGame: () => void;
  onOpenHelp: () => void;
  /** When false (e.g. a modal is open), shortcuts are ignored. */
  enabled?: boolean;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useGameShortcuts(actions: GameShortcutActions): void {
  const { onFlip, onPrevMove, onNextMove, onToggleMute, onNewGame, onOpenHelp } = actions;
  const enabled = actions.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      // Let the board's own arrow-key navigation win when focused.
      const inBoard =
        e.target instanceof HTMLElement && e.target.closest('[data-board-theme]') !== null;

      switch (e.key) {
        case 'f':
        case 'F':
          e.preventDefault();
          onFlip();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          onToggleMute();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          onNewGame();
          break;
        case '?':
          e.preventDefault();
          onOpenHelp();
          break;
        case 'ArrowLeft':
          if (inBoard || !onPrevMove) return;
          e.preventDefault();
          onPrevMove();
          break;
        case 'ArrowRight':
          if (inBoard || !onNextMove) return;
          e.preventDefault();
          onNextMove();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onFlip, onPrevMove, onNextMove, onToggleMute, onNewGame, onOpenHelp]);
}
