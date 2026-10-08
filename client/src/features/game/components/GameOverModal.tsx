import { Button, Modal } from '@/components/ui';
import type { GameResult, GameStatus } from '../types';

interface GameOverModalProps {
  open: boolean;
  result: GameResult;
  status: GameStatus;
  reason: string | null;
  onRematch: () => void;
  onNewGame: () => void;
  onHome: () => void;
  onCopyPGN: () => void;
}

function titleFor(result: GameResult, status: GameStatus): string {
  if (result === '1-0') return 'White wins';
  if (result === '0-1') return 'Black wins';
  if (result === '1/2-1/2') return 'Draw';
  return status === 'playing' || status === 'check' ? 'Game in progress' : 'Game over';
}

export function GameOverModal({
  open,
  result,
  status,
  reason,
  onRematch,
  onNewGame,
  onHome,
  onCopyPGN,
}: GameOverModalProps) {
  return (
    <Modal open={open} onClose={onHome} title={titleFor(result, status)}>
      <p className="tnum font-mono text-2xl font-medium text-[var(--accent)]">{result ?? '—'}</p>
      {reason && <p className="mt-3 text-sm text-[var(--muted)]">{reason}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCopyPGN}>
          Copy PGN
        </Button>
        <Button variant="secondary" onClick={onHome}>
          Home
        </Button>
        <Button variant="secondary" onClick={onNewGame}>
          New game
        </Button>
        <Button onClick={onRematch}>Rematch</Button>
      </div>
    </Modal>
  );
}
