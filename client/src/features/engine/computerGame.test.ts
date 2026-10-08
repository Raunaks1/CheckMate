import { beforeEach, describe, expect, it } from 'vitest';
import type { Square } from '@/features/board';
import { useGameStore } from '@/features/game/useGameStore';
import { EngineService } from './EngineService';
import { HINTS_PER_GAME, parseUciMove, shouldEngineMove } from './useComputerGame';

class FakeWorker {
  onmessage: ((e: { data: string }) => void) | null = null;
  sent: string[] = [];
  terminated = false;

  postMessage(msg: string): void {
    this.sent.push(msg);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(text: string): void {
    this.onmessage?.({ data: text });
  }
}

async function completeHandshake(fake: FakeWorker): Promise<void> {
  fake.reply('uciok\n');
  await Promise.resolve();
  await Promise.resolve();
  fake.reply('readyok\n');
}

async function readyService() {
  const fake = new FakeWorker();
  const service = new EngineService(() => fake as unknown as Worker);
  const init = service.init();
  await completeHandshake(fake);
  await init;
  return { fake, service };
}

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('computer game loop (mocked worker)', () => {
  it('asks for a move after the human moves and applies the response', async () => {
    const { fake, service } = await readyService();
    const store = useGameStore.getState();

    // Human (White) moves
    expect(store.makeMove('e2' as Square, 'e4' as Square)).toBe(true);
    expect(useGameStore.getState().turn).toBe('b');

    // App asks the engine from the new position and applies its reply
    const afterHuman = useGameStore.getState().fen;
    service.setPosition(afterHuman);
    service.setSkill({ skillLevel: 6, elo: 1100 });
    const asked = service.getBestMove({ movetimeMs: 300 });
    fake.reply('info depth 6 score cp 20 pv e7e5\nbestmove e7e5\n');
    const uci = await asked;
    const parsed = parseUciMove(uci);
    expect(parsed).toMatchObject({ from: 'e7', to: 'e5' });
    if (!parsed) throw new Error('expected engine move to parse');
    expect(useGameStore.getState().makeMove(parsed.from, parsed.to, parsed.promotion)).toBe(true);

    const state = useGameStore.getState();
    expect(state.sans).toEqual(['e4', 'e5']);
    expect(state.turn).toBe('w');
    expect(fake.sent).toContain(`position fen ${afterHuman}`);
    expect(fake.sent).toContain('go movetime 300');
    service.terminate();
  });

  it('applies engine promotions from the bestmove suffix', async () => {
    const { fake, service } = await readyService();
    const store = useGameStore.getState();
    expect(store.loadFen('8/4P3/8/8/8/1k6/8/4K3 w - - 0 1')).toBe(true);
    service.setPosition(useGameStore.getState().fen);
    const asked = service.getBestMove({ movetimeMs: 200 });
    fake.reply('bestmove e7e8q\n');
    const parsed = parseUciMove(await asked);
    expect(parsed).toMatchObject({ from: 'e7', to: 'e8', promotion: 'q' });
    if (!parsed) throw new Error('expected promotion to parse');
    expect(useGameStore.getState().makeMove(parsed.from, parsed.to, parsed.promotion)).toBe(true);
    expect(useGameStore.getState().sans).toEqual(['e8=Q']);
    service.terminate();
  });
});

describe('parseUciMove', () => {
  it('parses quiet moves, promotions, and rejects garbage', () => {
    expect(parseUciMove('e2e4')).toMatchObject({ from: 'e2', to: 'e4' });
    expect(parseUciMove('e7e8n')).toMatchObject({ from: 'e7', to: 'e8', promotion: 'n' });
    expect(parseUciMove('(none)')).toBeNull();
    expect(parseUciMove('o-o')).toBeNull();
    expect(parseUciMove('')).toBeNull();
  });
});

describe('shouldEngineMove', () => {
  const base = {
    turn: 'b' as const,
    engineColor: 'b' as const,
    status: 'playing' as const,
    reviewPly: null,
    thinking: false,
    engineReady: true,
  };
  it('only moves on the engine turn while live and idle', () => {
    expect(shouldEngineMove(base)).toBe(true);
    expect(shouldEngineMove({ ...base, turn: 'w' })).toBe(false);
    expect(shouldEngineMove({ ...base, thinking: true })).toBe(false);
    expect(shouldEngineMove({ ...base, reviewPly: 3 })).toBe(false);
    expect(shouldEngineMove({ ...base, engineReady: false })).toBe(false);
    expect(shouldEngineMove({ ...base, status: 'checkmate' })).toBe(false);
    expect(shouldEngineMove({ ...base, status: 'check' })).toBe(true);
  });
});

describe('hints', () => {
  it('allows three hints per game', () => {
    expect(HINTS_PER_GAME).toBe(3);
  });
});
