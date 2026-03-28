import { Socket } from 'socket.io';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Socket.io rate limiter
 * Tracks requests per socket connection
 */
export class SocketRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if a socket has exceeded the rate limit
   */
  check(socketId: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(socketId);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      this.limits.set(socketId, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    if (entry.count >= this.config.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Reset rate limit for a socket
   */
  reset(socketId: string): void {
    this.limits.delete(socketId);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [socketId, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(socketId);
      }
    }
  }

  /**
   * Get remaining requests for a socket
   */
  getRemaining(socketId: string): number {
    const entry = this.limits.get(socketId);
    if (!entry || Date.now() > entry.resetTime) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - entry.count);
  }
}

/**
 * Create rate limiter middleware for Socket.io events
 */
export function createSocketRateLimiter(config: RateLimitConfig) {
  const limiter = new SocketRateLimiter(config);

  return (socket: Socket, next: (err?: Error) => void) => {
    const originalEmit = socket.emit.bind(socket);
    const originalOn = socket.on.bind(socket);

    // Wrap socket.on to check rate limits
    socket.on = function (event: string, listener: (...args: any[]) => void) {
      const wrappedListener = (...args: any[]) => {
        if (!limiter.check(socket.id)) {
          socket.emit('error', {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please slow down',
          });
          return;
        }
        listener(...args);
      };

      return originalOn(event, wrappedListener);
    } as any;

    next();
  };
}

/**
 * Global rate limiter: 50 events per second per connection
 */
export const globalSocketRateLimiter = new SocketRateLimiter({
  maxRequests: 50,
  windowMs: 1000,
});

/**
 * Guess rate limiter: 5 guesses per second per connection
 */
export const guessRateLimiter = new SocketRateLimiter({
  maxRequests: 5,
  windowMs: 1000,
});

/**
 * Drawing rate limiter: 100 drawing events per second per connection
 */
export const drawingRateLimiter = new SocketRateLimiter({
  maxRequests: 100,
  windowMs: 1000,
});
