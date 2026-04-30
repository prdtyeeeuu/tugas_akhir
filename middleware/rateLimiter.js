/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiter
 */


/**
 * Create a rate limiter
 * @param {object} options - Limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {function} options.keyGenerator - Function to generate rate limit key
 * @returns {function} - Rate limiting middleware
 */
function rateLimit(options = {}) {
  const stores = new Map();
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // max requests per window
  const keyGenerator = options.keyGenerator || ((req) => req.ip);

  // Cleanup old entries periodically
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, store] of stores.entries()) {
      if (now - store.startTime > windowMs) {
        stores.delete(key);
      }
    }
  }, windowMs);

  // Prevent cleanup interval from keeping process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!stores.has(key) || now - stores.get(key).startTime > windowMs) {
      stores.set(key, { startTime: now, count: 1 });
      return next();
    }

    const store = stores.get(key);
    store.count++;

    if (store.count > max) {
      const retryAfter = Math.ceil((store.startTime + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).render('pages/error', {
        title: '429 - Too Many Requests',
        error: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat dan coba lagi.'
      });
    }

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(max - store.count));
    next();
  };
}

/**
 * Pre-configured limiters
 */
const limiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000
  }),

  // Limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 attempts per 15 minutes
    keyGenerator: (req) => `${req.ip}-auth`
  }),

  // Limit for login
  login: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 login attempts per 15 minutes
    keyGenerator: (req) => `${req.ip}-login`
  }),

  // Chat message rate limit
  chat: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30 // 30 messages per minute
  })
};

module.exports = { rateLimit, limiters };
