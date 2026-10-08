import { clsx } from 'clsx';
import { Piece } from '@/features/board';
import { DIFFICULTIES, difficultyEloLabel } from '@/features/engine';

export type NewGameMode = 'computer' | 'local' | 'online';
export type ColorChoice = 'white' | 'random' | 'black';

const MODES: { value: NewGameMode; label: string }[] = [
  { value: 'computer', label: 'Computer' },
  { value: 'local', label: 'Pass and play' },
  { value: 'online', label: 'Online' },
];

const TIME_CHIPS = [
  { id: '1+0', label: '1+0' },
  { id: '3+2', label: '3+2' },
  { id: '5+0', label: '5+0' },
  { id: '10+0', label: '10+0' },
  { id: '15+10', label: '15+10' },
  { id: 'unlimited', label: 'Unlimited' },
];

export interface NewGamePanelProps {
  mode: NewGameMode;
  onModeChange: (mode: NewGameMode) => void;
  color: ColorChoice;
  onColorChange: (color: ColorChoice) => void;
  difficultyIdx: number;
  onDifficultyChange: (idx: number) => void;
  timeControlId: string;
  onTimeControlChange: (id: string) => void;
  onStart: () => void;
}

export function NewGamePanel({
  mode,
  onModeChange,
  color,
  onColorChange,
  difficultyIdx,
  onDifficultyChange,
  timeControlId,
  onTimeControlChange,
  onStart,
}: NewGamePanelProps) {
  const difficulty = DIFFICULTIES[difficultyIdx] ??
    DIFFICULTIES[3] ?? {
      id: 'intermediate',
      label: 'Intermediate',
      skillLevel: 10,
      movetimeMs: 800,
      elo: 1500,
    };
  const fillPct = (difficultyIdx / (DIFFICULTIES.length - 1)) * 100;

  return (
    <section
      aria-label="New game setup"
      className="w-full rounded-[14px] border border-[var(--hairline)] bg-[var(--surface-1)] p-6"
    >
      <h1 className="text-[28px] leading-none font-semibold tracking-[-0.035em] text-[var(--text)]">
        New game
      </h1>

      <div
        role="radiogroup"
        aria-label="Game mode"
        className="mt-6 grid grid-cols-3 gap-1 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-2)] p-1"
      >
        {MODES.map((m) => {
          const active = m.value === mode;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onModeChange(m.value)}
              className={clsx(
                'min-h-11 rounded-[8px] px-2 py-2 text-[13px] font-medium',
                active
                  ? 'border border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--text)]'
                  : 'border border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              )}
              style={active ? { borderColor: 'var(--hairline-strong)' } : undefined}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <p id="play-as-label" className="label text-[var(--muted)]">
          Play as
        </p>
        <div
          role="radiogroup"
          aria-labelledby="play-as-label"
          className="mt-2 grid grid-cols-3 gap-2"
        >
          {(
            [
              { value: 'white', label: 'White' },
              { value: 'random', label: 'Random' },
              { value: 'black', label: 'Black' },
            ] as { value: ColorChoice; label: string }[]
          ).map((opt) => {
            const active = opt.value === color;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Play as ${opt.label}`}
                onClick={() => onColorChange(opt.value)}
                className={clsx('flex h-[72px] items-center justify-center rounded-[10px] border')}
                style={{
                  borderColor: active ? 'var(--hairline-strong)' : 'var(--hairline)',
                  backgroundColor: active ? 'var(--surface-3)' : 'var(--surface-2)',
                }}
              >
                {opt.value === 'white' && <Piece color="w" type="k" className="h-10 w-10" />}
                {opt.value === 'black' && <Piece color="b" type="k" className="h-10 w-10" />}
                {opt.value === 'random' && (
                  <span aria-hidden className="flex h-10 w-10 overflow-hidden rounded-[6px]">
                    <span className="flex h-full w-1/2 items-center justify-center bg-[var(--piece-white)]">
                      <Piece color="w" type="k" className="h-8 w-8" />
                    </span>
                    <span className="flex h-full w-1/2 items-center justify-center bg-[var(--piece-black)]">
                      <Piece color="b" type="k" className="h-8 w-8" />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'computer' && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <label htmlFor="difficulty" className="label text-[var(--muted)]">
              Difficulty
            </label>
          </div>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-[18px] font-medium text-[var(--text)]">{difficulty.label}</span>
            <span className="tnum font-mono text-[13px] text-[var(--text-2)]">
              {difficultyEloLabel(difficulty.id)}
            </span>
          </p>
          <div className="relative mt-3 flex h-4 items-center">
            <span
              aria-hidden
              className="absolute right-0 left-0 h-1 rounded-[2px] bg-[var(--surface-3)]"
            />
            <span
              aria-hidden
              className="absolute left-0 h-1 rounded-[2px] bg-[var(--text-2)]"
              style={{ width: `${fillPct}%` }}
            />
            <input
              id="difficulty"
              type="range"
              min={0}
              max={DIFFICULTIES.length - 1}
              step={1}
              value={difficultyIdx}
              onChange={(e) => onDifficultyChange(Number(e.target.value))}
              aria-valuetext={`${difficulty.label} ${difficultyEloLabel(difficulty.id)}`}
              className="difficulty-slider relative w-full"
            />
          </div>
          <div aria-hidden className="mt-1 flex justify-between">
            {DIFFICULTIES.map((d, i) => (
              <span
                key={d.id}
                className={clsx(
                  'h-1 w-1 rounded-full',
                  i <= difficultyIdx ? 'bg-[var(--text-2)]' : 'bg-[var(--hairline-strong)]'
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p id="time-label" className="label text-[var(--muted)]">
          Time
        </p>
        <div
          role="radiogroup"
          aria-labelledby="time-label"
          className="mt-2 grid grid-cols-3 gap-1.5"
        >
          {TIME_CHIPS.map((t) => {
            const active = t.id === timeControlId;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onTimeControlChange(t.id)}
                className={clsx(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border px-2 py-2 font-mono text-[13px]'
                )}
                style={{
                  borderColor: active ? 'var(--hairline-strong)' : 'var(--hairline)',
                  backgroundColor: active ? 'var(--surface-3)' : 'var(--surface-2)',
                  color: active ? 'var(--text)' : 'var(--muted)',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[10px] border border-[var(--accent)] bg-[var(--accent)] text-[15px] font-semibold text-[var(--on-accent)] hover:brightness-[1.04] active:brightness-[0.96]"
      >
        Start game
      </button>
    </section>
  );
}
