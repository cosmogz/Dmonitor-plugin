import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from './redis.client';

type Override = { windowMs?: number; maxRequests?: number };

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

function matchOverride(path: string, overrides?: Record<string, Override>) {
  if (!overrides) return undefined;
  // exact match first
  if (overrides[path]) return overrides[path];
  // prefix match for keys ending with '*'
  for (const k of Object.keys(overrides)) {
    if (k.endsWith('*')) {
      const prefix = k.slice(0, -1);
      if (path.startsWith(prefix)) return overrides[k];
    }
  }
  return undefined;
}

export function createRateLimiter(overrides?: Record<string, Override>) {
  return async function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const key = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

    const override = matchOverride(req.path, overrides);
    const windowMs = override?.windowMs ?? Number(process.env.RATE_LIMIT_WINDOW_MS || String(60 * 1000));
    const maxRequests = override?.maxRequests ?? Number(process.env.RATE_LIMIT_PER_WINDOW || '60');

    // Try Redis first if configured
    try {
      const redis = await getRedisClient();
      if (redis) {
        const windowStart = Math.floor(now / windowMs) * windowMs;
        const redisKey = `rate:${key}:${windowStart}:${req.path}`;
        const count = Number(await redis.incr(redisKey));
        await redis.expire(redisKey, Math.ceil(windowMs / 1000));

        const remaining = Math.max(0, maxRequests - count);
        res.setHeader('X-RateLimit-Limit', String(maxRequests));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.floor((windowStart + windowMs) / 1000)));

        if (count > maxRequests) {
          res.status(429).json({ error: 'Too many requests' });
          return;
        }

        return next();
      }
    } catch (err) {
      // If Redis is misconfigured or errors, fall back to in-memory store
      // eslint-disable-next-line no-console
      console.error('Rate limiter redis error, falling back to memory', err);
    }

    // In-memory fallback (existing behavior)
    const entry = store.get(key);
    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(maxRequests - 1));
      res.setHeader('X-RateLimit-Reset', String(Math.floor((now + windowMs) / 1000)));
      return next();
    }

    entry.count += 1;
    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    return next();
  };
}

// Default exported middleware for backwards compatibility
export const rateLimiter = createRateLimiter();

// Helper for tests to reset the internal store
export function _resetRateLimiterStore() {
  store.clear();
}
