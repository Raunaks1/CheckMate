export interface Difficulty {
  id: string;
  label: string;
  skillLevel: number;
  movetimeMs: number;
  /** UCI_Elo cap for human-like play; undefined = full strength at skill level. */
  elo?: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: 'beginner', label: 'Beginner', skillLevel: 0, movetimeMs: 200, elo: 500 },
  { id: 'easy', label: 'Easy', skillLevel: 3, movetimeMs: 300, elo: 800 },
  { id: 'casual', label: 'Casual', skillLevel: 6, movetimeMs: 500, elo: 1100 },
  { id: 'intermediate', label: 'Intermediate', skillLevel: 10, movetimeMs: 800, elo: 1500 },
  { id: 'advanced', label: 'Advanced', skillLevel: 15, movetimeMs: 1200 },
  { id: 'expert', label: 'Expert', skillLevel: 18, movetimeMs: 1800 },
  { id: 'maximum', label: 'Maximum', skillLevel: 20, movetimeMs: 2500 },
];

const FALLBACK: Difficulty = {
  id: 'casual',
  label: 'Casual',
  skillLevel: 6,
  movetimeMs: 500,
  elo: 1100,
};

export function getDifficulty(id: string): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? FALLBACK;
}

/** Display-only ratings shown in the UI. Not engine parameters. */
const DISPLAY_ELO: Record<string, number> = {
  beginner: 500,
  easy: 800,
  casual: 1100,
  intermediate: 1600,
  advanced: 2200,
  expert: 2500,
  maximum: 2800,
};

export function difficultyElo(id: string): number {
  const d = getDifficulty(id);
  return DISPLAY_ELO[d.id] ?? d.elo ?? 1500;
}

export function difficultyEloLabel(id: string): string {
  return `~${difficultyElo(id)}`;
}
