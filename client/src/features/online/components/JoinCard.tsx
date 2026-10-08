import { useState } from 'react';
import { Button } from '@/components/ui';

export function JoinCard({
  hostName,
  openSeat,
  timeShort,
  onJoin,
}: {
  hostName: string;
  openSeat: string;
  timeShort: string;
  onJoin: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <section
      aria-label="Join game"
      className="w-full rounded-[14px] border border-[var(--hairline)] bg-[var(--surface-1)] p-6"
    >
      <h1 className="text-[28px] leading-none font-semibold tracking-[-0.035em] text-[var(--text)]">
        {hostName} invited you
      </h1>
      <p className="mt-1.5 text-[13px] text-[var(--text-2)]">
        Name yourself to take the open seat.
      </p>
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hairline)] py-2">
          <span className="text-[13px] text-[var(--text-2)]">Colour</span>
          <span className="tnum font-mono text-[13px] text-[var(--text)]">{openSeat}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2">
          <span className="text-[13px] text-[var(--text-2)]">Time</span>
          <span className="tnum font-mono text-[13px] text-[var(--text)]">{timeShort}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="join-name" className="label text-[var(--muted)]">
          Your name
        </label>
        <input
          id="join-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onJoin(name.trim());
          }}
          placeholder="e.g. Raunak"
          maxLength={20}
          autoComplete="off"
          autoFocus
          className="h-12 w-full rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface-1)] px-3.5 font-mono text-base text-[var(--text)] placeholder:text-[var(--muted)]"
        />
      </div>
      <Button
        size="lg"
        onClick={() => name.trim() && onJoin(name.trim())}
        disabled={!name.trim()}
        className="mt-4 w-full"
      >
        Join game
      </Button>
    </section>
  );
}
