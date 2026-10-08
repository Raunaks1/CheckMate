import { useState } from 'react';
import { Check, Copy, Mail, MessageCircle, Share2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import type { SeatColor } from 'checkmate-shared';
import { Button } from '@/components/ui';

function colorLabel(color: SeatColor | null): string {
  if (color === 'white') return 'White';
  if (color === 'black') return 'Black';
  return 'Spectator';
}

function KeyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hairline)] py-2 last:border-b-0">
      <span className="text-[13px] text-[var(--text-2)]">{label}</span>
      <span className="tnum font-mono text-[13px] text-[var(--text)]">{value}</span>
    </div>
  );
}

export function WaitingLobby({
  inviteLink,
  shortLink,
  yourColor,
  timeShort,
  friendHere,
  isHost,
  cancelling,
  onCopy,
  copied,
  onCancel,
}: {
  inviteLink: string;
  /** Short display form of the link; copy still writes the full URL. */
  shortLink: string;
  yourColor: SeatColor | null;
  timeShort: string;
  friendHere: boolean;
  isHost: boolean;
  cancelling: boolean;
  onCopy: () => void;
  copied: boolean;
  onCancel: () => void;
}) {
  const [shared, setShared] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const shareText = `Join my chess game: ${inviteLink}`;

  const share = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({
          title: 'Join my chess game',
          text: 'Play me online',
          url: inviteLink,
        });
        setShared(true);
      } catch {
        // user dismissed — not an error
      }
      return;
    }
    onCopy();
  };

  return (
    <section
      aria-label="Invite a friend"
      className="w-full rounded-[14px] border border-[var(--hairline)] bg-[var(--surface-1)] p-6"
    >
      <p className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
        <span aria-hidden className="pulse-dot h-2 w-2 rounded-full bg-[var(--accent)]" />
        {friendHere ? 'Friend connected — starting.' : 'Waiting for opponent'}
      </p>
      <h1 className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.035em] text-[var(--text)]">
        Invite a friend
      </h1>
      <p className="mt-1.5 text-[13px] text-[var(--text-2)]">
        The game starts when they open the link.
      </p>

      <div className="mt-6 flex h-12 items-center gap-2 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-2)] p-1.5 pl-3">
        <input
          readOnly
          value={shortLink}
          data-invite-url={inviteLink}
          aria-label="Invite link"
          onFocus={(e) => e.target.select()}
          className="tnum min-w-0 flex-1 truncate bg-transparent font-mono text-[14px] text-[var(--text)] outline-none"
        />
        <Button
          size="sm"
          onClick={onCopy}
          leftIcon={
            copied ? <Check size={15} strokeWidth={1.5} /> : <Copy size={15} strokeWidth={1.5} />
          }
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[44px]"
        >
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<MessageCircle size={15} strokeWidth={1.5} />}
            className="w-full"
          >
            WhatsApp
          </Button>
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent('Join my chess game')}&body=${encodeURIComponent(shareText)}`}
          className="inline-flex min-h-[44px]"
        >
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Mail size={15} strokeWidth={1.5} />}
            className="w-full"
          >
            Email
          </Button>
        </a>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void share()}
          leftIcon={<Share2 size={15} strokeWidth={1.5} />}
          className="min-h-[44px]"
        >
          {shared ? 'Shared' : 'Share'}
        </Button>
      </div>

      <div className="rule-t mt-6 flex items-center gap-4 pt-5">
        <span className="shrink-0 rounded-[6px] bg-white p-2">
          <QRCode value={inviteLink} size={112} aria-label="Invite link QR code" />
        </span>
        <p className="text-[13px] text-[var(--text-2)]">Scan on a phone</p>
      </div>

      <div className="mt-4">
        <KeyRow label="You play" value={colorLabel(yourColor)} />
        <KeyRow label="Time" value={timeShort} />
      </div>

      {isHost && (
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={cancelling}
            className="px-0 text-[var(--danger)] hover:text-[var(--danger)]"
          >
            {cancelling ? 'Cancelling…' : 'Cancel game'}
          </Button>
        </div>
      )}
    </section>
  );
}
