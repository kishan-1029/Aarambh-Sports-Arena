/**
 * Re-export existing rate limiters — do not create a second stack.
 * Prefer importing from middlewares/rateLimiter.js in new routes.
 */
export {
  generalRateLimiter,
  authRateLimiter,
  passwordResetRateLimiter,
  userRateLimiter,
  searchRateLimiter,
  uploadRateLimiter,
} from '../../middlewares/rateLimiter.js';
