import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GameScreen } from '@/features/game';
import { useGameStore } from '@/features/game';

export default function Sandbox() {
  const navigate = useNavigate();

  useEffect(() => {
    useGameStore.getState().reset();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] leading-[1] font-semibold tracking-[-0.035em] text-[var(--text)]">
              Board sandbox
            </h1>
            <p className="mt-1 font-mono text-xs text-[var(--muted)]">
              Dev only · shared GameScreen wired to the central store.
            </p>
          </div>
          <Link to="/" className="label px-3 py-2 text-[var(--muted)] hover:text-[var(--text)]">
            ← Home
          </Link>
        </header>
      </div>
      <GameScreen
        whiteName="White"
        blackName="Black"
        canUndo
        defaultTimeControlId="10+0"
        onHome={() => navigate('/')}
      />
    </main>
  );
}
