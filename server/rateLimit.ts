/**
 * Minimal in-memory rate limiter (MVP)
 * Uses a Map to store request timestamps per key and sliding window approach
 *
 * TODO: Replace with Redis for production (supports distributed rate limiting)
 */

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number; // e.g., 60_000 for 1 minute
};

// Keyed by (limiterName, key) for separation of concerns
const rateLimiterStore = new Map<string, Map<string, number[]>>();

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(
  () => {
    for (const [limiterName, keyMap] of Array.from(
      rateLimiterStore.entries(),
    )) {
      for (const [key, timestamps] of Array.from(keyMap.entries())) {
        // (No cleanup per limiter config, but in production with Redis this is automatic)
        if (timestamps.length === 0) {
          keyMap.delete(key);
        }
      }
      if (keyMap.size === 0) {
        rateLimiterStore.delete(limiterName);
      }
    }
  },
  5 * 60 * 1000,
);

/**
 * Check if a request is within rate limit
 * @param limiterName - Unique name for this limiter (e.g., "avatar", "click", "track")
 * @param key - Key to track (userId, IP, sessionId, etc.)
 * @param config - { maxRequests, windowMs }
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(
  limiterName: string,
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or create the key map for this limiter
  if (!rateLimiterStore.has(limiterName)) {
    rateLimiterStore.set(limiterName, new Map());
  }
  const keyMap = rateLimiterStore.get(limiterName)!;

  // Get or create the timestamps array for this key
  if (!keyMap.has(key)) {
    keyMap.set(key, []);
  }
  let timestamps = keyMap.get(key)!;

  // Remove old timestamps outside the window
  timestamps = timestamps.filter((time) => time > windowStart);
  keyMap.set(key, timestamps);

  const currentCount = timestamps.length;
  const allowed = currentCount < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - currentCount - 1);

  // Add current request timestamp if allowed
  if (allowed) {
    timestamps.push(now);
    keyMap.set(key, timestamps);
  }

  // Calculate reset time (earliest timestamp + window)
  const resetIn =
    timestamps.length > 0 ? timestamps[0] + config.windowMs - now : 0;

  return {
    allowed,
    remaining: allowed ? remaining : 0,
    resetIn: Math.max(0, resetIn),
  };
}

/**
 * Reset rate limit for a key (e.g., after successful operation)
 */
export function resetRateLimit(limiterName: string, key: string): void {
  const keyMap = rateLimiterStore.get(limiterName);
  if (keyMap) {
    keyMap.delete(key);
  }
}

/**
 * Get current rate limit status (for testing/debugging)
 */
export function getRateLimitStatus(
  limiterName: string,
  key: string,
): number | null {
  const keyMap = rateLimiterStore.get(limiterName);
  if (!keyMap) return null;
  const timestamps = keyMap.get(key);
  return timestamps ? timestamps.length : null;
}
