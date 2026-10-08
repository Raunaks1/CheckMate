import { Board } from '@/features/board';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Dimmed starting-position board used behind the lobby and join panels. */
export function LobbyBackdrop({ width = 680 }: { width?: number }) {
  return (
    <div className="pointer-events-none opacity-45" aria-hidden>
      <Board
        fen={START_FEN}
        orientation="white"
        interactive={false}
        coordinates="inside"
        fixedWidth={width}
      />
    </div>
  );
}
