import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cpu } from 'lucide-react';
import { Button, Select, useToast } from '@/components/ui';
import { SegmentedControl } from '@/components/setup/SegmentedControl';
import { TimeControlPicker } from '@/components/setup/TimeControlPicker';
import { SetupShell } from '@/components/setup/SetupShell';
import {
  COMPUTER_GAME_KEY,
  EvalBar,
  GameScreen,
  clearGame,
  loadSavedGame,
  useGameStore,
  useSettingsStore,
  type SavedLocalGame,
} from '@/features/game';
import { DIFFICULTIES, difficultyElo, useComputerGame } from '@/features/engine';

type ColorChoice = 'white' | 'black' | 'random';

const STORAGE_KEY = COMPUTER_GAME_KEY;

function ThinkingBanner({ text }: { text: string }) {
  return (
    <div className="mb-2 flex justify-center">
      <span className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-1.5 font-mono text-xs text-[var(--muted)]">
        <Cpu size={13} strokeWidth={1.5} aria-hidden />
        {text}
      </span>
    </div>
  );
}

function ComputerGame({
  humanIsWhite,
  difficultyId,
  timeControlId,
  saved,
  onHome,
}: {
  humanIsWhite: boolean;
  difficultyId: string;
  timeControlId: string;
  saved: SavedLocalGame | null;
  onHome: () => void;
}) {
  const humanColor = humanIsWhite ? ('w' as const) : ('b' as const);
  const { engineStatus, thinking, evalScore, hintArrow, hintsLeft, requestHint, undoTwoPly } =
    useComputerGame({ humanColor, difficultyId });
  const showEvalBar = useSettingsStore((s) => s.showEvalBar);
  const { push } = useToast();

  const difficultyLabel = DIFFICULTIES.find((d) => d.id === difficultyId)?.label ?? 'Casual';
  const engineColor = humanIsWhite ? ('b' as const) : ('w' as const);

  useEffect(() => {
    if (engineStatus === 'error') {
      push({
        kind: 'warning',
        title: 'Engine unavailable',
        description: 'Playing both sides instead',
      });
    }
  }, [engineStatus, push]);

  const boardLocked = thinking || engineStatus === 'loading';
  const banner =
    engineStatus === 'loading' ? (
      <ThinkingBanner text="Engine warming up" />
    ) : engineStatus === 'error' ? (
      <div className="mb-2 flex justify-center">
        <span className="rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-1.5 font-mono text-xs text-[var(--muted)]">
          Engine failed to load — play both sides
        </span>
      </div>
    ) : thinking ? (
      <ThinkingBanner text="Computer is thinking" />
    ) : null;

  return (
    <GameScreen
      whiteName={humanIsWhite ? 'You' : 'Stockfish 16'}
      blackName={humanIsWhite ? 'Stockfish 16' : 'You'}
      canUndo
      defaultTimeControlId={timeControlId}
      defaultOrientation={humanIsWhite ? 'white' : 'black'}
      onHome={onHome}
      onUndo={undoTwoPly}
      boardLocked={boardLocked}
      boardBanner={banner}
      boardLeftAside={showEvalBar ? <EvalBar evalScore={evalScore} slim /> : null}
      hintArrow={hintArrow}
      sideMeta={{
        [engineColor]: {
          title: 'Stockfish 16',
          subtitle: `${difficultyLabel} - ${difficultyElo(difficultyId)}`,
          initials: 'SF',
        },
      }}
      hintsLeft={hintsLeft}
      onRequestHint={requestHint}
      hintDisabled={hintsLeft <= 0 || thinking || engineStatus !== 'ready'}
      matchTitle={`vs Stockfish - ${difficultyLabel}`}
      storageKey={STORAGE_KEY}
      restoreSnapshot={saved}
      persistDifficultyId={difficultyId}
    />
  );
}

export default function PlayComputer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [saved] = useState<SavedLocalGame | null>(() => loadSavedGame(STORAGE_KEY));

  const wantsResume = params.get('resume') === '1' && saved !== null;
  const autostart = params.get('autostart') === '1' && !wantsResume;
  const paramColor = params.get('color');
  const paramDifficulty = params.get('difficulty');
  const paramTc = params.get('tc');
  const [phase, setPhase] = useState<'setup' | 'game'>(wantsResume ? 'game' : 'setup');
  const [color, setColor] = useState<ColorChoice>(
    paramColor === 'black' || paramColor === 'random' || paramColor === 'white'
      ? paramColor
      : 'white'
  );
  const [difficultyId, setDifficultyId] = useState(
    paramDifficulty ?? saved?.difficultyId ?? 'casual'
  );
  const [timeControlId, setTimeControlId] = useState(paramTc ?? '10+0');
  const [humanIsWhite, setHumanIsWhite] = useState(true);

  const start = () => {
    const white = color === 'random' ? Math.random() < 0.5 : color === 'white';
    setHumanIsWhite(white);
    clearGame(STORAGE_KEY);
    useGameStore.getState().reset();
    setPhase('game');
  };

  useEffect(() => {
    if (autostart && phase === 'setup') start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart]);

  if (phase === 'game') {
    const resumeWhite = wantsResume ? saved?.whiteName === 'You' : humanIsWhite;
    return (
      <ComputerGame
        humanIsWhite={resumeWhite}
        difficultyId={difficultyId}
        timeControlId={timeControlId}
        saved={wantsResume ? saved : null}
        onHome={() => navigate('/')}
      />
    );
  }

  return (
    <SetupShell title="Play vs Computer" subtitle="Stockfish. Pick a side.">
      <SegmentedControl<ColorChoice>
        label="Play as"
        value={color}
        onChange={setColor}
        options={[
          { value: 'white', label: 'White' },
          { value: 'black', label: 'Black' },
          { value: 'random', label: 'Random' },
        ]}
      />
      <Select
        label="Difficulty"
        value={difficultyId}
        onChange={(e) => setDifficultyId(e.target.value)}
        options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label }))}
      />
      <TimeControlPicker value={timeControlId} onChange={setTimeControlId} />
      <Button size="lg" onClick={start} className="w-full">
        {saved ? 'Start new game' : 'Start game'}
      </Button>
      {saved && (
        <p className="font-mono text-xs text-[var(--muted)]">
          Saved: {saved.moves.length} moves —{' '}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-[var(--text)]"
            onClick={() => setPhase('game')}
          >
            resume it
          </button>{' '}
          or start fresh above.
        </p>
      )}
    </SetupShell>
  );
}
