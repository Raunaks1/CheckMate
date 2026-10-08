import type { NextFunction, Request, Response } from 'express';

/**
 * Tiny per-IP sliding-window limiter for REST endpoints.
 * Socket traffic uses the connection-scoped RateLimiter instead.
 */
const MAX_IP_KEYS = 10_000;

export function restLimit(maxEvents: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const cutoff = now - windowMs;
    const hadKey = hits.has(key);
    const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length >= maxEvents) {
      hits.set(key, recent);
      res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many requests' });
      return;
    }
    recent.push(now);
    if (!hadKey && hits.size >= MAX_IP_KEYS) {
      const oldest = hits.keys().next();
      if (!oldest.done) hits.delete(oldest.value);
    }
    hits.set(key, recent);
    next();
  };
}
