import rateLimit from 'express-rate-limit';
import { ErrorCode } from '@scribbly/shared';

/**
 * Rate limiter for authentication endpoints
 * 100 requests per minute
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Rate limiter for general API endpoints
 * 200 requests per minute
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil(60); // seconds until window resets
    res.setHeader('Retry-After', retryAfter.toString());
    
    res.status(429).json({
      error: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter for sensitive operations
 * 20 requests per minute
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil(60);
    res.setHeader('Retry-After', retryAfter.toString());
    
    res.status(429).json({
      error: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
      },
    });
  },
});
