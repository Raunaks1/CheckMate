import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <p className="tnum font-mono text-[44px] leading-none font-medium text-[var(--text)]">404</p>
      <h1 className="text-[28px] leading-[1] font-semibold tracking-[-0.035em] text-[var(--text)]">
        That square is empty.
      </h1>
      <p className="text-sm text-[var(--muted)]">No such page. The index is that way.</p>
      <Link to="/">
        <Button>Back home</Button>
      </Link>
    </div>
  );
}
