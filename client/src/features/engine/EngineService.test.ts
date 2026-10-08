import { describe, expect, it } from 'vitest';
import { EngineService } from './EngineService';

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

function setup() {
  const fake = new FakeWorker();
  const service = new EngineService(() => fake as unknown as Worker);
  return { fake, service };
}

async function completeHandshake(fake: FakeWorker): Promise<void> {
  fake.reply('uciok\n');
  await Promise.resolve();
  await Promise.resolve();
  fake.reply('readyok\n');
}

describe('EngineService', () => {
  it('completes the uci/isready handshake', async () => {
    const { fake, service } = setup();
    const init = service.init();
    expect(fake.sent).toEqual(['uci']);
    fake.reply('id name Stockfish\nid author Test\nuciok\n');
    await Promise.resolve();
    expect(fake.sent).toEqual(['uci', 'isready']);
    fake.reply('readyok\n');
    await init;
  });

  it('sends skill and Elo limit options', async () => {
    const { fake, service } = setup();
    const init = service.init();
    await completeHandshake(fake);
    await init;
    service.setSkill({ skillLevel: 6, elo: 1100 });
    expect(fake.sent).toContain('setoption name Skill Level value 6');
    expect(fake.sent).toContain('setoption name UCI_LimitStrength value true');
    expect(fake.sent).toContain('setoption name UCI_Elo value 1100');
    service.setSkill({ skillLevel: 20 });
    expect(fake.sent).toContain('setoption name UCI_LimitStrength value false');
  });

  it('asks with position+go and resolves the bestmove', async () => {
    const { fake, service } = setup();
    const init = service.init();
    await completeHandshake(fake);
    await init;
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    service.setPosition(fen);
    const asked = service.getBestMove({ movetimeMs: 200 });
    expect(fake.sent).toContain(`position fen ${fen}`);
    expect(fake.sent).toContain('go movetime 200');
    fake.reply('info depth 8 score cp 25 pv e7e5\nbestmove e7e5\n');
    await expect(asked).resolves.toBe('e7e5');
  });

  it('parses evaluations with side-to-move correction and skips bounds', async () => {
    const { fake, service } = setup();
    const ready = service.init();
    await completeHandshake(fake);
    await ready;
    // Black to move: +cp for black reads as negative for White
    service.setPosition('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    fake.reply('info depth 10 score cp 40 pv e2e4\n');
    expect(service.getEvaluation()).toMatchObject({ cp: 40, mate: null });
    fake.reply('info depth 10 score cp 40 upperbound pv e2e4\n');
    expect(service.getEvaluation()).toMatchObject({ cp: 40 });
    service.setPosition('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    fake.reply('info depth 12 score cp 30 pv e5d4\n');
    expect(service.getEvaluation()).toMatchObject({ cp: -30 });
    fake.reply('info depth 14 score mate 3 pv f7f6\n');
    expect(service.getEvaluation()).toMatchObject({ mate: -3 });
  });

  it('ignores stale searches after stop', async () => {
    const { fake, service } = setup();
    const init = service.init();
    await completeHandshake(fake);
    await init;
    service.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    let firstResolved = false;
    const first = service.getBestMove({ movetimeMs: 200 }).then((m) => {
      firstResolved = true;
      return m;
    });
    service.stop();
    const second = service.getBestMove({ movetimeMs: 200 });
    fake.reply('bestmove e2e4\n');
    await expect(second).resolves.toBe('e2e4');
    await Promise.resolve();
    expect(firstResolved).toBe(false);
    void first;
    service.terminate();
    expect(fake.terminated).toBe(true);
  });
});
