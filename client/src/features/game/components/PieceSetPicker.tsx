import { clsx } from 'clsx';
import { PIECE_SETS, pieceSrc, type PieceSetId, type PieceType } from '@/features/board';
import { useSettingsStore } from '../useSettingsStore';

const PREVIEW_TYPES: PieceType[] = ['k', 'n', 'p'];

export function PieceSetPicker() {
  const setId = useSettingsStore((s) => s.pieceSetId);
  const setPieceSetId = useSettingsStore((s) => s.setPieceSetId);

  return (
    <div className="flex flex-col gap-1.5">
      <span id="piece-set-label" className="label text-[var(--muted)]">
        Pieces
      </span>
      <div role="radiogroup" aria-labelledby="piece-set-label" className="grid gap-1.5">
        {(Object.keys(PIECE_SETS) as PieceSetId[]).map((id) => {
          const active = id === setId;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPieceSetId(id)}
              className={clsx(
                'flex min-h-11 items-center justify-between gap-3 rounded-[10px] border px-3 py-2',
                active
                  ? 'border-[var(--hairline-strong)] bg-[var(--surface-3)] text-[var(--text)]'
                  : 'border-[var(--hairline)] text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              <span className="text-[13px] font-medium">{PIECE_SETS[id].label}</span>
              <span className="flex items-center" aria-hidden>
                {PREVIEW_TYPES.map((t) => (
                  <img
                    key={t}
                    src={pieceSrc(id, 'w', t)}
                    alt=""
                    draggable={false}
                    decoding="async"
                    width={32}
                    height={32}
                    className="h-8 w-8"
                    style={{ marginLeft: t === 'k' ? 0 : -8 }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
