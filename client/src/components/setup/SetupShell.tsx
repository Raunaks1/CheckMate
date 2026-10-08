import type { ReactNode } from 'react';

interface SetupShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function SetupShell({ title, subtitle, children }: SetupShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-8 sm:px-6">
      <h1 className="text-[28px] leading-[1] font-semibold tracking-[-0.035em] text-[var(--text)]">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-[15px] leading-[1.5] text-[var(--text-2)]">{subtitle}</p>
      <div className="rule-t rule-b mt-6 py-6">
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
