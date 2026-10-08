import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, useToast } from '@/components/ui';
import { SegmentedControl } from '@/components/setup/SegmentedControl';
import { TimeControlPicker } from '@/components/setup/TimeControlPicker';
import { SetupShell } from '@/components/setup/SetupShell';
import { postRoom, apiBase } from '@/features/online/api';
import { saveJoin } from '@/features/online/storage';

type ColorChoice = 'white' | 'black' | 'random';

export default function PlayOnline() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { push } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState<ColorChoice>(() => {
    const c = params.get('color');
    return c === 'black' || c === 'random' || c === 'white' ? c : 'white';
  });
  const [timeControlId, setTimeControlId] = useState(params.get('tc') ?? '10+0');
  const [creating, setCreating] = useState(false);

  const trimmed = name.trim();

  const create = async () => {
    if (!trimmed || creating) return;
    if (!apiBase() && import.meta.env.PROD) {
      push({
        kind: 'danger',
        title: 'Online play is not configured',
        description: 'This deployment has no game server URL. Set VITE_SERVER_URL and redeploy.',
      });
      return;
    }
    setCreating(true);
    try {
      const body = await postRoom({ name: trimmed, color, timeControl: timeControlId });
      saveJoin(body.roomId, body.playerId, trimmed);
      try {
        await navigator.clipboard.writeText(body.inviteUrl);
      } catch {
        // clipboard unavailable — invite link is shown on the next screen
      }
      navigate(`/game/${body.roomId}`, {
        state: { name: trimmed, color: body.color, timeControlId },
      });
    } catch (err) {
      push({ kind: 'danger', title: err instanceof Error ? err.message : 'Could not create game' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <SetupShell title="Play a Friend" subtitle="Create a game. Send the link.">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="online-name" className="label text-[var(--muted)]">
          01 — Your name
        </label>
        <input
          id="online-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Raunak"
          maxLength={20}
          autoComplete="off"
          className="h-12 w-full rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface-1)] px-3.5 font-mono text-base text-[var(--text)] placeholder:text-[var(--muted)]"
        />
      </div>
      <SegmentedControl<ColorChoice>
        label="Play as"
        value={color}
        onChange={setColor}
        options={[
          { value: 'white', label: 'White' },
          { value: 'black', label: 'Black' },
          { value: 'random', label: 'Random' },
        ]}
      />
      <TimeControlPicker value={timeControlId} onChange={setTimeControlId} />
      <Button
        size="lg"
        onClick={() => void create()}
        disabled={!trimmed || creating}
        className="w-full"
      >
        {creating ? 'Creating…' : 'Create game & copy link'}
      </Button>
    </SetupShell>
  );
}
