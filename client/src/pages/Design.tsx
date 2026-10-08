import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Monitor, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import {
  Button,
  Card,
  IconButton,
  Modal,
  Select,
  Toggle,
  Tooltip,
  useToast,
} from '@/components/ui';
import { Piece } from '@/features/board';
import type { PieceType } from '@/features/board';
import { useTheme, type ThemeMode } from '@/providers/ThemeProvider';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rule-t pt-2">
      <h2 className="label text-[var(--muted)]">{title}</h2>
      {hint && <p className="mt-1 font-mono text-xs text-[var(--muted)]">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="h-9 w-9 rounded-[8px] border border-[var(--hairline)]"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}

function BoardPreview() {
  const squares: ReactNode[] = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const isLight = (rank + file) % 2 === 0;
      const isLastMove = (rank === 3 && file === 3) || (rank === 3 && file === 4);
      const isSelected = rank === 4 && file === 4;
      const isDot = (rank === 2 && file === 4) || (rank === 5 && file === 4);
      const isCheck = rank === 0 && file === 4;
      squares.push(
        <div
          key={`${rank}-${file}`}
          className="relative aspect-square"
          style={{
            backgroundColor: isLight ? 'var(--sq-light)' : 'var(--sq-dark)',
          }}
        >
          {isLastMove && (
            <div className="absolute inset-0" style={{ backgroundColor: 'var(--last-move)' }} />
          )}
          {isSelected && (
            <div
              className="absolute inset-0"
              style={{ boxShadow: 'inset 0 0 0 2px var(--selected)' }}
            />
          )}
          {isDot && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="h-[26%] w-[26%] rounded-full"
                style={{ backgroundColor: 'var(--legal-dot)' }}
              />
            </div>
          )}
          {isCheck && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="h-[88%] w-[88%] rounded-full"
                style={{ backgroundColor: 'var(--check)' }}
              />
            </div>
          )}
        </div>
      );
    }
  }
  return (
    <div className="rounded-[6px] border border-[var(--hairline)] bg-[var(--surface-1)] p-[6px]">
      <div className="grid grid-cols-8">{squares}</div>
    </div>
  );
}

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const PIECES: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];

export default function Design() {
  const { mode, resolved, setMode, toggle } = useTheme();
  const { push } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [difficulty, setDifficulty] = useState('1200');

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
        <header className="rule-b flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <p className="font-mono text-[12px] tracking-[0.08em] text-[var(--muted)]">
              MIDNIGHT STUDIO — DEV ONLY
            </p>
            <h1 className="mt-1 text-[44px] leading-[1] font-semibold tracking-[-0.035em] text-[var(--text)]">
              Design system.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="label px-3 py-2 text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
            >
              ← Home
            </Link>
            <Tooltip content={`Switch to ${resolved === 'dark' ? 'light' : 'dark'}`}>
              <span>
                <IconButton label="Toggle color theme" onClick={toggle}>
                  {resolved === 'dark' ? (
                    <Sun size={18} strokeWidth={1.5} />
                  ) : (
                    <Moon size={18} strokeWidth={1.5} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </div>
        </header>

        <Section
          title="01 / Theme"
          hint="Persisted in localStorage. Midnight dark default; light variant shares the lime."
        >
          <div className="flex flex-wrap items-center gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value as ThemeMode)}
                aria-pressed={mode === opt.value}
                className={clsx(
                  'flex items-center gap-1.5 rounded-[10px] border px-3 py-2 font-mono text-sm',
                  mode === opt.value
                    ? 'border-[var(--hairline-strong)] bg-[var(--surface-3)] text-[var(--text)]'
                    : 'border-[var(--hairline)] text-[var(--muted)] hover:text-[var(--text)]'
                )}
              >
                {opt.value === 'light' && <Sun size={15} strokeWidth={1.5} aria-hidden />}
                {opt.value === 'dark' && <Moon size={15} strokeWidth={1.5} aria-hidden />}
                {opt.value === 'system' && <Monitor size={15} strokeWidth={1.5} aria-hidden />}
                {opt.label}
              </button>
            ))}
            <span className="ml-2 font-mono text-xs text-[var(--muted)]">
              resolved: {resolved} · mode: {mode}
            </span>
          </div>
        </Section>

        <Section
          title="02 / Colors"
          hint="Midnight surfaces, tonal borders, one electric lime. No gradients, no glow."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch color="#0A0A0B" label="bg" />
            <Swatch color="#111113" label="surface-1" />
            <Swatch color="#17171A" label="surface-2" />
            <Swatch color="#1F1F23" label="surface-3" />
            <Swatch color="#26262B" label="border" />
            <Swatch color="#C6FF3D" label="lime accent" />
            <Swatch color="#D8DAD3" label="square light" />
            <Swatch color="#6D7469" label="square dark" />
          </div>
        </Section>

        <Section title="03 / Typography" hint="Onest 400/500/600 · JetBrains Mono tabular.">
          <div className="flex flex-col gap-2">
            <p className="text-[44px] leading-[1] font-semibold tracking-[-0.035em] text-[var(--text)]">
              Sharp, precise, current
            </p>
            <p className="label text-[var(--muted)]">Onest 600 — headings, tight tracking</p>
            <p className="text-[15px] leading-[1.5] text-[var(--text)]">
              Body copy. Fifteen pixels, tight spacing, dry and plain.
            </p>
            <p className="tnum font-mono text-[44px] font-medium text-[var(--text)]">
              10:00 · 05:32 · 0:03
            </p>
            <p className="label text-[var(--muted)]">JetBrains Mono — clocks and notation</p>
          </div>
        </Section>

        <Section title="04 / Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button loading>Loading</Button>
          </div>
        </Section>

        <div className="grid gap-8 md:grid-cols-2">
          <Section title="05 / Card + Modal">
            <Card padding="sm" className="mb-3">
              <p className="label text-[var(--text)]">Card primitive</p>
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                14px radius · surface-1 · 1px border.
              </p>
            </Card>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Offer a draw?">
              <p className="text-sm text-[var(--muted)]">
                Esc closes, focus stays trapped, click the overlay to dismiss.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>Offer draw</Button>
              </div>
            </Modal>
          </Section>

          <Section title="06 / Controls" hint="Toggle · Select · Tooltip · Toast · IconButton.">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Toggle checked={soundOn} onChange={setSoundOn} label="Toggle sound effects" />
                <span className="text-sm text-[var(--text)]">Sound {soundOn ? 'on' : 'off'}</span>
              </div>
              <Select
                label="Computer difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                options={[
                  { value: '800', label: 'Beginner · 800' },
                  { value: '1200', label: 'Casual · 1200' },
                  { value: '1800', label: 'Strong · 1800' },
                ]}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Tooltip content="Open settings">
                  <span>
                    <IconButton label="Open settings">
                      <Settings size={18} strokeWidth={1.5} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    push({ kind: 'success', title: 'Toast works', description: 'Auto-dismisses' })
                  }
                >
                  Show toast
                </Button>
              </div>
            </div>
          </Section>
        </div>

        <Section title="07 / Pieces" hint="Merida set. See CREDITS.md for attribution.">
          <div className="grid grid-cols-6 gap-2">
            {PIECES.map((p) => (
              <div
                key={p}
                className="flex flex-col items-center gap-1 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-1)] p-2"
              >
                <Piece color="w" type={p} className="h-10 w-10" />
                <Piece color="b" type={p} className="h-10 w-10" />
                <span className="font-mono text-[11px] text-[var(--muted)]">{p}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="08 / Board"
          hint="Brightest object. Lime 28% last move · 2px inner selected · dots + rings."
        >
          <div className="max-w-sm">
            <BoardPreview />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5" style={{ backgroundColor: 'var(--last-move)' }} />
              last move
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5"
                style={{ boxShadow: 'inset 0 0 0 2px var(--selected)' }}
              />
              selected
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: 'var(--legal-dot)' }}
              />
              legal move
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: 'var(--check)' }}
              />
              check
            </span>
          </div>
        </Section>
      </div>
    </main>
  );
}
