/**
 * QueueFlow Rate Limiter — Pure JavaScript Sliding Window Implementation
 *
 * Algorithm: Sliding Window Log
 *   - Stores an array of request timestamps per client key (IP address)
 *   - On each request, evicts timestamps older than `windowMs`
 *   - If remaining timestamps >= `max`, the request is rejected with 429
 *   - More accurate than Fixed Window (avoids burst at window boundary)
 *
 * Memory safety:
 *   - A background sweeper runs every `SWEEP_INTERVAL_MS` to evict
 *     fully-expired client entries from the Map, preventing unbounded growth.
 *
 * Headers set on every response (standard rate-limit headers):
 *   X-RateLimit-Limit     — max requests allowed in the window
 *   X-RateLimit-Remaining — requests remaining in the current window
 *   X-RateLimit-Reset     — Unix epoch (seconds) when the oldest hit expires
 *   Retry-After           — seconds to wait before retrying (only on 429)
 */

// ─── Configuration ────────────────────────────────────────────────────────────

const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // Run memory cleanup every 5 minutes

// ─── Core Factory ─────────────────────────────────────────────────────────────

/**
 * Creates a rate-limiter middleware.
 *
 * @param {object} options
 * @param {number}   options.windowMs     - Duration of the sliding window in milliseconds
 * @param {number}   options.max          - Max requests allowed within the window
 * @param {string}  [options.message]     - Error message body on 429
 * @param {boolean} [options.skipSuccessfulRequests] - If true, only failed responses count
 * @param {(req: import('express').Request) => string} [options.keyGenerator]
 *        Custom function to derive the client key (default: IP address)
 */
function createRateLimiter({
  windowMs,
  max,
  message = 'Too many requests, please try again later.',
  keyGenerator
}) {
  if (!windowMs || !max) {
    throw new Error('[RateLimiter] windowMs and max are required options.');
  }

  // Map<clientKey, number[]> — timestamps of accepted requests within the window
  const store = new Map();

  // ── Background sweeper: remove fully-expired entries to prevent memory leaks ──
  const sweeper = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of store.entries()) {
      // Prune expired timestamps
      let i = 0;
      while (i < timestamps.length && timestamps[i] <= cutoff) i++;
      if (i > 0) timestamps.splice(0, i);
      // If the entry is now empty, evict it entirely
      if (timestamps.length === 0) store.delete(key);
    }
  }, SWEEP_INTERVAL_MS);

  // Don't hold the process open if the server shuts down
  if (sweeper.unref) sweeper.unref();

  // ── Resolve the client key from a request ────────────────────────────────────
  const resolveKey = keyGenerator ?? ((req) => {
    // Trust proxy headers when running behind Render / Vercel / Nginx
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // x-forwarded-for can be "client, proxy1, proxy2" — take the first (original client)
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress ?? 'unknown';
  });

  // ── The Express middleware ────────────────────────────────────────────────────
  return function rateLimiterMiddleware(req, res, next) {
    const now      = Date.now();
    const windowStart = now - windowMs;
    const key      = resolveKey(req);

    // Retrieve or initialise the timestamp log for this client
    if (!store.has(key)) store.set(key, []);
    const timestamps = store.get(key);

    // Evict timestamps that have slid out of the window (binary-search style walk)
    let evictUntil = 0;
    while (evictUntil < timestamps.length && timestamps[evictUntil] <= windowStart) {
      evictUntil++;
    }
    if (evictUntil > 0) timestamps.splice(0, evictUntil);

    const current   = timestamps.length;
    const remaining = Math.max(0, max - current - 1); // -1 for the current request
    const resetAt   = timestamps.length > 0
      ? Math.ceil((timestamps[0] + windowMs) / 1000)
      : Math.ceil((now + windowMs) / 1000);

    // ── Standard rate-limit response headers ────────────────────────────────────
    res.setHeader('X-RateLimit-Limit',     max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset',     resetAt);

    // ── Reject if limit exceeded ─────────────────────────────────────────────────
    if (current >= max) {
      const retryAfterSec = resetAt - Math.floor(now / 1000);
      res.setHeader('Retry-After', retryAfterSec);

      return res.status(429).json({
        success:    false,
        message,
        retryAfter: retryAfterSec
      });
    }

    // ── Accept the request ───────────────────────────────────────────────────────
    timestamps.push(now);
    next();
  };
}

// ─── Preset Limiters ─────────────────────────────────────────────────────────
//
// These are the three distinct traffic profiles for QueueFlow:
//
//  1. authLimiter  — Login & register endpoints are the highest-value brute-force
//                   targets. 10 attempts per 15 minutes is generous enough for
//                   legitimate users but costly for automated attacks.
//
//  2. apiLimiter   — General authenticated API (projects, tasks, analytics).
//                   150 req/min is ~2.5 req/second per IP — plenty for normal
//                   interactive use, blocks scrapers and runaway loops.
//
//  3. strictLimiter — Invite-code generation: prevents PM from generating a
//                   flood of codes. 5 per 10 minutes is more than enough.

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      10,
  message:  'Too many login attempts. Please wait 15 minutes before trying again.'
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max:      150,
  message:  'Request rate limit exceeded. Please slow down.'
});

export const strictLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max:      5,
  message:  'Too many invite codes generated. Please wait before generating more.'
});

export { createRateLimiter };
