import { Button, Modal } from '@/components/ui';

export { ResignConfirmModal } from '@/features/game/components/ResignConfirmModal';

export function DrawSendModal({
  open,
  onConfirm,
  onClose,
}: {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Offer a draw?">
      <p className="text-sm text-[var(--muted)]">
        Your opponent can accept or decline. The offer expires after their next move.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>Send offer</Button>
      </div>
    </Modal>
  );
}

export function DrawIncomingModal({
  open,
  offererName,
  onAccept,
  onDecline,
}: {
  open: boolean;
  offererName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Modal open={open} onClose={onDecline} title="Draw offer">
      <p className="text-sm text-[var(--text)]">
        <span className="font-semibold">{offererName}</span> offers a draw. Accept to end the game
        tied, or decline to keep playing.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onDecline}>
          Decline
        </Button>
        <Button onClick={onAccept}>Accept draw</Button>
      </div>
    </Modal>
  );
}

export function RematchIncomingModal({
  open,
  onAccept,
  onDecline,
}: {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Modal open={open} onClose={onDecline} title="Rematch?">
      <p className="text-sm text-[var(--muted)]">
        Your opponent wants a rematch with colors swapped. Accept to start a new game.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onDecline}>
          Decline
        </Button>
        <Button onClick={onAccept}>Accept rematch</Button>
      </div>
    </Modal>
  );
}
