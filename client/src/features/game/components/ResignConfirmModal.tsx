import { Button, Modal } from '@/components/ui';

export function ResignConfirmModal({
  open,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Resign?">
      <p className="text-sm text-[var(--muted)]">
        This ends the game immediately and your opponent wins. This can&apos;t be undone.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Keep playing
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Resigning…' : 'Resign game'}
        </Button>
      </div>
    </Modal>
  );
}
