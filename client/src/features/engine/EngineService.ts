export type EngineStatus = 'loading' | 'ready' | 'error';

/** Centipawns from White's point of view; mate in N (positive = White mates). */
export interface EngineEval {
  depth: number;
  cp: number | null;
  mate: number | null;
}

export interface SkillConfig {
  skillLevel: number;
  elo?: number;
}

export const MIN_THINK_MS = 400;
const HANDSHAKE_TIMEOUT_MS = 20_000;

function engineUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}engine/stockfish-lite-single.js`;
}

interface PendingSearch {
  token: number;
  resolve: (uci: string) => void;
}

export class EngineService {
  private worker: Worker | null = null;
  private handshake: { term: string; resolve: () => void; reject: (e: Error) => void } | null =
    null;
  private searchToken = 0;
  private pending: PendingSearch | null = null;
  private lastEval: EngineEval | null = null;
  private whiteToMove = true;

  constructor(private createWorker: () => Worker = () => new Worker(engineUrl())) {}

  init(): Promise<void> {
    if (this.worker) return Promise.resolve();
    this.worker = this.createWorker();
    this.worker.onmessage = (e: MessageEvent) => {
      this.onData(typeof e.data === 'string' ? e.data : String(e.data));
    };
    this.worker.onerror = () => {
      this.handshake?.reject(new Error('engine worker error'));
      this.handshake = null;
      this.pending = null;
    };
    return this.handshakeAndConfigure();
  }

  private waitFor(term: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const handle = { term, resolve, reject };
      this.handshake = handle;
      globalThis.setTimeout(() => {
        // Identity check: a remount may have replaced the handshake since.
        if (this.handshake === handle) {
          this.handshake = null;
          reject(new Error(`engine handshake timeout waiting for ${term}`));
        }
      }, HANDSHAKE_TIMEOUT_MS);
    });
  }

  private async handshakeAndConfigure(): Promise<void> {
    this.post('uci');
    await this.waitFor('uciok');
    this.post('isready');
    await this.waitFor('readyok');
  }

  setSkill(config: SkillConfig): void {
    this.post(`setoption name Skill Level value ${config.skillLevel}`);
    if (config.elo !== undefined) {
      this.post('setoption name UCI_LimitStrength value true');
      this.post(`setoption name UCI_Elo value ${config.elo}`);
    } else {
      this.post('setoption name UCI_LimitStrength value false');
    }
  }

  newGame(): void {
    this.post('ucinewgame');
  }

  setPosition(fen: string): void {
    this.whiteToMove = fen.split(' ')[1] !== 'b';
    this.post(`position fen ${fen}`);
  }

  getBestMove(opts: { movetimeMs: number }): Promise<string> {
    const startedAt = Date.now();
    this.searchToken += 1;
    const token = this.searchToken;
    this.post('stop');
    this.post(`go movetime ${Math.max(1, Math.round(opts.movetimeMs))}`);
    return new Promise((resolve) => {
      this.pending = {
        token,
        resolve: (uci) => {
          const elapsed = Date.now() - startedAt;
          const wait = Math.max(0, MIN_THINK_MS - elapsed);
          globalThis.setTimeout(() => resolve(uci), wait);
        },
      };
    });
  }

  getEvaluation(): EngineEval | null {
    return this.lastEval;
  }

  stop(): void {
    this.searchToken += 1;
    this.pending = null;
    this.post('stop');
  }

  terminate(): void {
    try {
      this.post('quit');
    } catch {
      // worker already gone
    }
    this.worker?.terminate();
    this.worker = null;
    this.pending = null;
    this.handshake = null;
  }

  private post(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  private onData(chunk: string): void {
    // The engine build posts one line per message event, usually WITHOUT a
    // trailing newline. Buffering until '\n' would stall the handshake
    // forever, so each message event is processed as atomic line(s).
    // Partial-line splits are safe: handshake terms need an exact match and
    // bestmove/info patterns need a complete payload to act on.
    for (const raw of chunk.split('\n')) {
      const line = raw.trim();
      if (line) this.onLine(line);
    }
  }

  private onLine(line: string): void {
    if (!line) return;
    if (this.handshake && (line === this.handshake.term || line.startsWith(this.handshake.term))) {
      const h = this.handshake;
      this.handshake = null;
      h.resolve();
      return;
    }
    if (line.startsWith('bestmove')) {
      const match = /^bestmove\s+(\S+)/.exec(line);
      const pending = this.pending;
      this.pending = null;
      if (match?.[1] && pending) pending.resolve(match[1]);
      return;
    }
    if (line.startsWith('info')) {
      this.parseInfo(line);
    }
  }

  private parseInfo(line: string): void {
    if (/upperbound|lowerbound/.test(line)) return;
    const depth = /info\s+depth\s+(\d+)/.exec(line)?.[1];
    const score = /\bscore\s+(cp|mate)\s+(-?\d+)/.exec(line);
    if (!score?.[1] || !score[2]) return;
    const raw = Number(score[2]);
    if (Number.isNaN(raw)) return;
    const sign = this.whiteToMove ? 1 : -1;
    this.lastEval =
      score[1] === 'cp'
        ? { depth: depth ? Number(depth) : 0, cp: raw * sign, mate: null }
        : { depth: depth ? Number(depth) : 0, cp: null, mate: raw * sign };
  }
}
