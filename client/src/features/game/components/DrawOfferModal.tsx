import { Button, Modal } from '@/components/ui';

interface DrawOfferModalProps {
  open: boolean;
  offererName: string;
  offereeName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function DrawOfferModal({
  open,
  offererName,
  offereeName,
  onAccept,
  onDecline,
}: DrawOfferModalProps) {
  return (
    <Modal open={open} onClose={onDecline} title="Draw offer">
      <p className="text-sm text-[var(--text)]">
        <span className="font-semibold">{offereeName}</span>, {offererName} offers a draw.
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">Pass the device to {offereeName}.</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDecline}>
          Decline
        </Button>
        <Button onClick={onAccept}>Accept draw</Button>
      </div>
    </Modal>
  );
}
