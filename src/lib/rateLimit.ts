/**
 * Lightweight sliding-window rate limiter for Next.js Route Handlers
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_RATE_LIMIT_ENTRIES = 10000;

function pruneStaleEntries(now: number) {
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    pruneStaleEntries(Date.now());
  }, 5 * 60 * 1000);
}

export function rateLimit(
  identifier: string,
  limit = 20,
  windowMs = 60 * 1000
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(identifier);

  if (!existing || existing.resetAt <= now) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      pruneStaleEntries(now);
      if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
        const oldestKey = rateLimitMap.keys().next().value;
        if (oldestKey) rateLimitMap.delete(oldestKey);
      }
    }

    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  if (existing.count >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: limit - existing.count,
    reset: existing.resetAt,
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
