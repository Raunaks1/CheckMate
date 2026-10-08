import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Board } from '@/features/board';
import { COMPUTER_GAME_KEY, formatClock, getTimeControl, loadSavedGame } from '@/features/game';
import { DIFFICULTIES } from '@/features/engine';
import { LeftRail } from '@/components/layout/LeftRail';
import { NewGamePanel, type ColorChoice, type NewGameMode } from './NewGamePanel';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function clockLabel(timeControlId: string): string {
  const tc = getTimeControl(timeControlId);
  return formatClock(tc.baseMs);
}

function MainPlayerRow({
  name,
  rating,
  clock,
  align,
}: {
  name: string;
  rating: string;
  clock: string;
  align: 'top' | 'bottom';
}) {
  return (
    <div
      className={`flex w-full items-center justify-between ${align === 'top' ? 'pb-2' : 'pt-2'}`}
    >
      <p className="text-[15px] font-medium text-[var(--text)]">
        {name}{' '}
        <span className="tnum font-mono text-[13px] font-normal text-[var(--text-2)]">
          {rating}
        </span>
      </p>
      <p
        role="timer"
        aria-label={`${name} clock`}
        className="tnum font-mono text-[44px] leading-none font-medium text-[var(--muted)]"
      >
        {clock}
      </p>
    </div>
  );
}

function ResumeLine() {
  const saved = loadSavedGame(COMPUTER_GAME_KEY);
  if (!saved) return null;
  const moves = saved.moves.length;
  return (
    <div className="mt-4 flex w-full items-center gap-3">
      <p className="min-w-0 flex-1 text-[13px] text-[var(--text-2)]">
        Game in progress, move {moves}
      </p>
      <Link
        to="/play/computer?resume=1"
        className="shrink-0 text-[13px] font-medium text-[var(--text)] underline underline-offset-4 hover:text-[var(--accent)]"
      >
        Resume
      </Link>
    </div>
  );
}

export function MainScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<NewGameMode>('computer');
  const [color, setColor] = useState<ColorChoice>('white');
  const [difficultyIdx, setDifficultyIdx] = useState(() =>
    Math.max(
      0,
      DIFFICULTIES.findIndex((d) => d.id === 'intermediate')
    )
  );
  const [timeControlId, setTimeControlId] = useState('10+0');

  const start = () => {
    const difficultyId = DIFFICULTIES[difficultyIdx]?.id ?? 'intermediate';
    try {
      window.localStorage.setItem(
        'checkmate-newgame',
        JSON.stringify({ mode, color, difficultyId, timeControlId })
      );
    } catch {
      // storage unavailable — navigate with query params instead
    }
    const params = new URLSearchParams({
      color,
      difficulty: difficultyId,
      tc: timeControlId,
      autostart: '1',
    });
    if (mode === 'computer') navigate(`/play/computer?${params.toString()}`);
    else if (mode === 'local') navigate(`/play/local?${params.toString()}`);
    else navigate(`/play/online?${params.toString()}`);
  };

  const clock = clockLabel(timeControlId);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <LeftRail />
      <main className="flex min-w-0 flex-1 justify-center px-6 py-6">
        <div className="flex w-full max-w-[1160px] flex-col items-center gap-6 xl:flex-row xl:items-start xl:justify-center">
          <div className="flex w-[680px] max-w-full shrink-0 flex-col">
            <MainPlayerRow name="Stockfish" rating="~1600" clock={clock} align="top" />
            <Board
              fen={START_FEN}
              orientation={color === 'black' ? 'black' : 'white'}
              interactive={false}
              coordinates="inside"
              fixedWidth={680}
            />
            <MainPlayerRow name="You" rating="1200" clock={clock} align="bottom" />
          </div>
          <div className="w-[400px] max-w-full shrink-0 xl:sticky xl:top-6">
            <NewGamePanel
              mode={mode}
              onModeChange={setMode}
              color={color}
              onColorChange={setColor}
              difficultyIdx={difficultyIdx}
              onDifficultyChange={setDifficultyIdx}
              timeControlId={timeControlId}
              onTimeControlChange={setTimeControlId}
              onStart={start}
            />
            <ResumeLine />
          </div>
        </div>
      </main>
    </div>
  );
}
