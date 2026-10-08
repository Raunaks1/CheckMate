const MAX_KEYS = 10_000;

/**
 * Sliding-window rate limiter, one instance shared across connections.
 * Default: 20 events per 10s per socket id.
 * The key map is bounded so a flood of distinct ids cannot exhaust memory.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly maxEvents = 20,
    private readonly windowMs = 10_000
  ) {}

  /** Returns true when the event is allowed (and records it). */
  check(key: string, now = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const existing = this.hits.get(key);
    const recent = existing ? existing.filter((t) => t > cutoff) : [];
    if (recent.length >= this.maxEvents) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    // Evict the oldest key when over capacity (insertion-ordered Map).
    if (!existing && this.hits.size >= MAX_KEYS) {
      const oldest = this.hits.keys().next();
      if (!oldest.done) this.hits.delete(oldest.value);
    }
    this.hits.set(key, recent);
    return true;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  clear(): void {
    this.hits.clear();
  }
}
