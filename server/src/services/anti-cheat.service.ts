import redis from '../config/redis.js';

interface SuspiciousActivity {
  socketId: string;
  userId: string | null;
  username: string;
  roomCode: string;
  activityType: 'fast_guess' | 'multiple_connections' | 'coordinate_anomaly' | 'pre_round_guess' | 'rapid_guessing';
  details: Record<string, any>;
  timestamp: Date;
}

export class AntiCheatService {
  private static readonly SUSPICIOUS_ACTIVITY_TTL = 86400; // 24 hours
  private static readonly FAST_GUESS_THRESHOLD_MS = 1000; // 1 second
  private static readonly GUESS_RATE_LIMIT = 5; // per second
  private static readonly GUESS_RATE_WINDOW_MS = 1000;

  /**
   * Log suspicious activity for admin review
   */
  static async logSuspiciousActivity(activity: SuspiciousActivity): Promise<void> {
    const key = `suspicious:${activity.roomCode}:${activity.socketId}:${Date.now()}`;
    await redis.setex(key, this.SUSPICIOUS_ACTIVITY_TTL, JSON.stringify(activity));

    // Also add to a sorted set for easy retrieval
    const listKey = `suspicious:list`;
    await redis.zadd(listKey, Date.now(), key);

    // Log to console for immediate visibility
    console.warn('[ANTI-CHEAT]', activity.activityType, {
      socketId: activity.socketId,
      username: activity.username,
      roomCode: activity.roomCode,
      details: activity.details,
    });
  }

  /**
   * Check if guess is suspiciously fast (within 1 second of round start)
   */
  static isFastGuess(roundStartTime: Date | null): boolean {
    if (!roundStartTime) return false;

    const elapsed = Date.now() - roundStartTime.getTime();
    return elapsed < this.FAST_GUESS_THRESHOLD_MS;
  }

  /**
   * Check guess rate limit for a player
   */
  static async checkGuessRateLimit(
    roomCode: string,
    socketId: string
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `guess_rate:${roomCode}:${socketId}`;
    const now = Date.now();

    // Get current count
    const count = await redis.get(key);
    const currentCount = count ? parseInt(count, 10) : 0;

    if (currentCount >= this.GUESS_RATE_LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    // Increment count
    const newCount = currentCount + 1;
    await redis.setex(key, Math.ceil(this.GUESS_RATE_WINDOW_MS / 1000), newCount.toString());

    return { allowed: true, remaining: this.GUESS_RATE_LIMIT - newCount };
  }

  /**
   * Track player connection to detect multiple connections
   */
  static async trackConnection(
    roomCode: string,
    socketId: string,
    userId: string | null,
    username: string
  ): Promise<{ isMultipleConnection: boolean; existingSocketId?: string }> {
    const key = `connections:${roomCode}`;

    // Get all connections for this room
    const connections = await redis.hgetall(key);

    // Check if this user/username already has a connection
    for (const [existingSocketId, data] of Object.entries(connections)) {
      if (existingSocketId === socketId) continue;

      const connectionData = JSON.parse(data);

      // Check by userId (for authenticated users)
      if (userId && connectionData.userId === userId) {
        return { isMultipleConnection: true, existingSocketId };
      }

      // Check by username (for guests)
      if (!userId && connectionData.username === username) {
        return { isMultipleConnection: true, existingSocketId };
      }
    }

    // Store this connection
    await redis.hset(
      key,
      socketId,
      JSON.stringify({
        userId,
        username,
        timestamp: Date.now(),
      })
    );

    // Set TTL on the hash
    await redis.expire(key, 3600); // 1 hour

    return { isMultipleConnection: false };
  }

  /**
   * Remove connection tracking when player leaves
   */
  static async removeConnection(roomCode: string, socketId: string): Promise<void> {
    const key = `connections:${roomCode}`;
    await redis.hdel(key, socketId);
  }

  /**
   * Validate drawing coordinates and detect anomalies
   */
  static validateDrawingCoordinates(
    x: number,
    y: number,
    maxWidth: number = 800,
    maxHeight: number = 600
  ): { valid: boolean; isAnomalous: boolean } {
    const valid = x >= 0 && x <= maxWidth && y >= 0 && y <= maxHeight;
    const isAnomalous = x < -100 || x > maxWidth + 100 || y < -100 || y > maxHeight + 100;

    return { valid, isAnomalous };
  }

  /**
   * Check if round has officially started (word selected)
   */
  static hasRoundStarted(roundStartTime: Date | null): boolean {
    return roundStartTime !== null;
  }

  /**
   * Get suspicious activity logs for a room
   */
  static async getSuspiciousActivityForRoom(roomCode: string): Promise<SuspiciousActivity[]> {
    const pattern = `suspicious:${roomCode}:*`;
    const keys = await redis.keys(pattern);

    const activities: SuspiciousActivity[] = [];
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        activities.push(JSON.parse(data));
      }
    }

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get all suspicious activity logs (for admin review)
   */
  static async getAllSuspiciousActivity(limit: number = 100): Promise<SuspiciousActivity[]> {
    const listKey = `suspicious:list`;
    const keys = await redis.zrevrange(listKey, 0, limit - 1);

    const activities: SuspiciousActivity[] = [];
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        activities.push(JSON.parse(data));
      }
    }

    return activities;
  }

  /**
   * Clear old suspicious activity logs
   */
  static async clearOldLogs(): Promise<void> {
    const listKey = `suspicious:list`;
    const cutoff = Date.now() - this.SUSPICIOUS_ACTIVITY_TTL * 1000;

    // Remove old entries from sorted set
    await redis.zremrangebyscore(listKey, 0, cutoff);
  }
}
