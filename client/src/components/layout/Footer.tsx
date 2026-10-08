export function Footer() {
  return (
    <footer className="border-t border-[var(--hairline)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 font-mono text-[12px] text-[var(--muted)] sm:flex-row sm:items-baseline sm:justify-between sm:px-6">
        <span>Checkmate</span>
        <span>
          Engine:{' '}
          <a
            href="https://stockfishchess.org"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-[var(--text)]"
          >
            Stockfish
          </a>{' '}
          · Pieces:{' '}
          <a
            href="https://github.com/lichess-org/lila/tree/master/public/piece/merida"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-[var(--text)]"
          >
            Merida (GPLv2+)
          </a>
        </span>
      </div>
    </footer>
  );
}
