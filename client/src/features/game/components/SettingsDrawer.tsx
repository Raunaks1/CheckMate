import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton, Select, Toggle } from '@/components/ui';
import { PieceSetPicker } from './PieceSetPicker';
import { useSettingsStore } from '../useSettingsStore';
import { useTheme, type ThemeMode } from '@/providers/ThemeProvider';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { animationsEnabled, soundEnabled, showLegalMoves, showEvalBar } = useSettingsStore();
  const setAnimationsEnabled = useSettingsStore((s) => s.setAnimationsEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setShowLegalMoves = useSettingsStore((s) => s.setShowLegalMoves);
  const setShowEvalBar = useSettingsStore((s) => s.setShowEvalBar);
  const { mode, setMode } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label="Game settings">
          <motion.button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
          />
          <motion.aside
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute top-0 right-0 flex h-full w-[min(320px,90vw)] flex-col gap-5 overflow-y-auto border-l border-[var(--hairline)] bg-[var(--surface-1)] p-5"
          >
            <div className="rule-b flex items-center justify-between pb-3">
              <h2 className="text-[18px] leading-none font-semibold tracking-[-0.035em] text-[var(--text)]">
                Settings
              </h2>
              <IconButton label="Close settings" onClick={onClose}>
                <X size={18} strokeWidth={1.5} />
              </IconButton>
            </div>

            <Select
              label="Appearance"
              value={mode}
              onChange={(e) => setMode(e.target.value as ThemeMode)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />

            <PieceSetPicker />

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--text)]">Piece animation</span>
              <Toggle
                checked={animationsEnabled}
                onChange={setAnimationsEnabled}
                label="Toggle piece animation"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--text)]">Sound effects</span>
              <Toggle
                checked={soundEnabled}
                onChange={setSoundEnabled}
                label="Toggle sound effects"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--text)]">Show legal moves</span>
              <Toggle
                checked={showLegalMoves}
                onChange={setShowLegalMoves}
                label="Toggle legal move hints"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--text)]">Evaluation bar</span>
              <Toggle
                checked={showEvalBar}
                onChange={setShowEvalBar}
                label="Toggle evaluation bar"
              />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
