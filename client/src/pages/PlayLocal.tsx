import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Toggle } from '@/components/ui';
import { TimeControlPicker } from '@/components/setup/TimeControlPicker';
import { SetupShell } from '@/components/setup/SetupShell';
import {
  GameScreen,
  clearLocalGame,
  loadLocalGame,
  loadLocalPrefs,
  saveLocalPrefs,
  useGameStore,
  type SavedLocalGame,
} from '@/features/game';

const STORAGE_KEY = 'checkmate-local-game';

export default function PlayLocal() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [saved] = useState<SavedLocalGame | null>(() => loadLocalGame());
  const [prefs, setPrefs] = useState(loadLocalPrefs);

  const wantsResume = params.get('resume') === '1' && saved !== null;
  const autostart = params.get('autostart') === '1' && !wantsResume;
  const [phase, setPhase] = useState<'setup' | 'game'>(wantsResume ? 'game' : 'setup');
  const [whiteName, setWhiteName] = useState(saved?.whiteName ?? '');
  const [blackName, setBlackName] = useState(saved?.blackName ?? '');
  const [timeControlId, setTimeControlId] = useState(
    params.get('tc') ?? saved?.timeControlId ?? '10+0'
  );
  const [rematchKey, setRematchKey] = useState(0);

  const setPref = (patch: Partial<{ rotateBoardEachTurn: boolean; tabletopMode: boolean }>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      saveLocalPrefs(next);
      return next;
    });
  };

  const start = () => {
    clearLocalGame();
    useGameStore.getState().reset();
    setPhase('game');
  };

  useEffect(() => {
    if (autostart && phase === 'setup') start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart]);

  if (phase === 'game') {
    return (
      <GameScreen
        key={rematchKey}
        whiteName={whiteName.trim() || 'White'}
        blackName={blackName.trim() || 'Black'}
        canUndo
        defaultTimeControlId={timeControlId}
        onHome={() => navigate('/')}
        rotateBoardEachTurn={prefs.rotateBoardEachTurn}
        tabletopMode={prefs.tabletopMode}
        drawOfferMode="confirm"
        storageKey={STORAGE_KEY}
        matchTitle="Pass & Play"
        restoreSnapshot={wantsResume && rematchKey === 0 ? saved : null}
        onRematch={() => {
          const w = whiteName;
          const b = blackName;
          setWhiteName(b);
          setBlackName(w);
          clearLocalGame();
          useGameStore.getState().reset();
          setRematchKey((k) => k + 1);
        }}
      />
    );
  }

  const inputClasses =
    'h-12 w-full rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface-1)] px-3.5 font-mono text-base text-[var(--text)] placeholder:text-[var(--muted)]';

  return (
    <SetupShell title="Pass & Play" subtitle="Two players. One board.">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="white-name" className="label text-[var(--muted)]">
          01 — White
        </label>
        <input
          id="white-name"
          value={whiteName}
          onChange={(e) => setWhiteName(e.target.value)}
          placeholder="White"
          maxLength={24}
          autoComplete="off"
          className={inputClasses}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="black-name" className="label text-[var(--muted)]">
          02 — Black
        </label>
        <input
          id="black-name"
          value={blackName}
          onChange={(e) => setBlackName(e.target.value)}
          placeholder="Black"
          maxLength={24}
          autoComplete="off"
          className={inputClasses}
        />
      </div>
      <TimeControlPicker value={timeControlId} onChange={setTimeControlId} />
      <div className="rule-t flex items-center justify-between gap-3 pt-4">
        <span className="text-sm text-[var(--text)]">Rotate board each turn</span>
        <Toggle
          checked={prefs.rotateBoardEachTurn}
          onChange={(v) => setPref({ rotateBoardEachTurn: v })}
          label="Toggle board rotation each turn"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--text)]">Tabletop mode</span>
        <Toggle
          checked={prefs.tabletopMode}
          onChange={(v) => setPref({ tabletopMode: v })}
          label="Toggle tabletop mode"
        />
      </div>
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
