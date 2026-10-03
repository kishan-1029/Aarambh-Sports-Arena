/**
 * Rate Limiting Middleware
 * Implements OWASP best practices for rate limiting to prevent:
 * - Brute force attacks
 * - DDoS attacks
 * - API abuse
 * 
 * Features:
 * - IP-based rate limiting for public endpoints
 * - User-based rate limiting for authenticated endpoints
 * - Separate limits for auth endpoints (stricter)
 * - Graceful 429 responses with retry-after headers
 */

import rateLimit from 'express-rate-limit';

/** Hackathon/demo: effectively disable throttling so UI never 429-logs users out */
const isDevRelaxed =
  process.env.NODE_ENV !== 'production' ||
  process.env.RATE_LIMIT_RELAXED === '1' ||
  process.env.RATE_LIMIT_RELAXED === 'true';

const GENERAL_MAX = isDevRelaxed
  ? Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 1_000_000
  : Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;
const AUTH_MAX = isDevRelaxed
  ? Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 100_000
  : Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5;
const USER_MAX = isDevRelaxed ? 1_000_000 : 200;
const SEARCH_MAX = isDevRelaxed ? 100_000 : 30;
const UPLOAD_MAX = isDevRelaxed ? 10_000 : 10;
const PASSWORD_RESET_MAX = isDevRelaxed ? 10_000 : 3;

/**
 * Get client IP address from request
 * Handles various proxy configurations
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.ip ||
        req.connection?.remoteAddress ||
        'unknown';
};

/**
 * Custom key generator for rate limiting
 * Uses both IP and user ID when available for more precise limiting
 * @param {Object} req - Express request object
 * @returns {string} Rate limit key
 */
const keyGenerator = (req) => {
    const ip = getClientIP(req);
    const userId = req.user?.id || 'anonymous';
    return `${ip}:${userId}`;
};

/**
 * Custom handler for rate limit exceeded
 * Returns OWASP-compliant 429 response with helpful headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const rateLimitHandler = (req, res) => {
    const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000);

    res.set({
        'Retry-After': retryAfter,
        'X-RateLimit-Limit': req.rateLimit.limit,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(req.rateLimit.resetTime).toISOString(),
    });

    return res.status(429).json({
        isOk: false,
        status: 429,
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: retryAfter,
        retryAfterDate: new Date(req.rateLimit.resetTime).toISOString(),
    });
};

/**
 * Skip rate limiting for certain conditions
 * @param {Object} req - Express request object
 * @returns {boolean} Whether to skip rate limiting
 */
const skipIfHealthCheck = (req) => {
    // Skip rate limiting for health check endpoints
    return req.path === '/api'
        || req.path === '/health'
        || req.path === '/api/health'
        || req.path === '/api/health/ready';
};

// ============ RATE LIMITERS ============

/**
 * General API Rate Limiter
 * Default: 100 requests per 15 minutes per IP
 * Applied to all API endpoints
 */
export const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: GENERAL_MAX,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers (use standardHeaders instead)
    keyGenerator: (req) => getClientIP(req),
    handler: rateLimitHandler,
    skip: skipIfHealthCheck,
});

/**
 * Strict Auth Rate Limiter
 * Stricter limits for authentication endpoints to prevent brute force
 * Default: 5 login attempts per 15 minutes per IP (relaxed in non-production)
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: AUTH_MAX,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req),
    handler: (req, res) => {
        const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000);

        res.set({
            'Retry-After': retryAfter,
            'X-RateLimit-Limit': req.rateLimit.limit,
            'X-RateLimit-Remaining': 0,
            'X-RateLimit-Reset': new Date(req.rateLimit.resetTime).toISOString(),
        });

        return res.status(429).json({
            isOk: false,
            status: 429,
            error: 'Too Many Login Attempts',
            message: 'Too many login attempts. Please wait before trying again.',
            retryAfter: retryAfter,
            retryAfterDate: new Date(req.rateLimit.resetTime).toISOString(),
        });
    },
    skipSuccessfulRequests: false, // Count all requests, including failed ones
});

/**
 * Password Reset Rate Limiter
 * Very strict limits for password reset/OTP endpoints
 * Default: 3 requests per hour per IP
 */
export const passwordResetRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: PASSWORD_RESET_MAX,
    message: 'Too many password reset requests from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req),
    handler: (req, res) => {
        const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000);

        return res.status(429).json({
            isOk: false,
            status: 429,
            error: 'Too Many Requests',
            message: 'Too many password reset attempts. Please try again later.',
            retryAfter: retryAfter,
        });
    },
});

/**
 * User-based Rate Limiter (for authenticated routes)
 * Limits requests per user, not just IP
 * Default: 200 requests per 15 minutes per user
 */
export const userRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: USER_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator, // Uses IP:userId combination
    handler: rateLimitHandler,
});

/**
 * Search/Heavy Operations Rate Limiter
 * For endpoints that perform heavy database operations
 * Default: 30 requests per minute per IP
 */
export const searchRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: SEARCH_MAX,
    message: 'Too many search requests, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req),
    handler: rateLimitHandler,
});

/**
 * File Upload Rate Limiter
 * Limits file uploads to prevent abuse
 * Default: 10 uploads per hour per IP
 */
export const uploadRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: UPLOAD_MAX,
    message: 'Too many file uploads, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req),
    handler: rateLimitHandler,
});

export default {
    generalRateLimiter,
    authRateLimiter,
    passwordResetRateLimiter,
    userRateLimiter,
    searchRateLimiter,
    uploadRateLimiter,
};
