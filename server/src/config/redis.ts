import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect when Redis is in readonly mode
      return true;
    }
    return false;
  },
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redis.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

// Redis utility functions

/**
 * Room state management
 */
export const RoomRedis = {
  // Room keys
  roomKey: (roomCode: string) => `room:${roomCode}`,
  roomPlayersKey: (roomCode: string) => `room:${roomCode}:players`,
  roomSpectatorsKey: (roomCode: string) => `room:${roomCode}:spectators`,
  roomCanvasKey: (roomCode: string) => `room:${roomCode}:canvas`,
  roomGameKey: (roomCode: string) => `room:${roomCode}:game`,
  socketRoomKey: (socketId: string) => `socket:${socketId}:room`,

  // Get room state
  async getRoom(roomCode: string) {
    const data = await redis.hgetall(this.roomKey(roomCode));
    if (!data || Object.keys(data).length === 0) return null;
    return {
      ...data,
      settings: JSON.parse(data.settings || '{}'),
      createdAt: new Date(data.createdAt),
      lastActivityAt: new Date(data.lastActivityAt),
    };
  },

  // Set room state
  async setRoom(roomCode: string, room: any) {
    await redis.hset(this.roomKey(roomCode), {
      hostSocketId: room.hostSocketId,
      state: room.state,
      settings: JSON.stringify(room.settings),
      createdAt: room.createdAt.toISOString(),
      lastActivityAt: room.lastActivityAt.toISOString(),
    });
    // Set TTL of 2 hours
    await redis.expire(this.roomKey(roomCode), 7200);
  },

  // Get room players
  async getPlayers(roomCode: string) {
    const data = await redis.hgetall(this.roomPlayersKey(roomCode));
    const players: any = {};
    for (const [socketId, playerJson] of Object.entries(data)) {
      players[socketId] = JSON.parse(playerJson);
    }
    return players;
  },

  // Add player to room
  async addPlayer(roomCode: string, socketId: string, player: any) {
    await redis.hset(this.roomPlayersKey(roomCode), socketId, JSON.stringify(player));
    await redis.expire(this.roomPlayersKey(roomCode), 7200);
  },

  // Remove player from room
  async removePlayer(roomCode: string, socketId: string) {
    await redis.hdel(this.roomPlayersKey(roomCode), socketId);
  },

  // Get spectators
  async getSpectators(roomCode: string) {
    return await redis.smembers(this.roomSpectatorsKey(roomCode));
  },

  // Add spectator
  async addSpectator(roomCode: string, socketId: string) {
    await redis.sadd(this.roomSpectatorsKey(roomCode), socketId);
    await redis.expire(this.roomSpectatorsKey(roomCode), 7200);
  },

  // Remove spectator
  async removeSpectator(roomCode: string, socketId: string) {
    await redis.srem(this.roomSpectatorsKey(roomCode), socketId);
  },

  // Delete room and all associated data
  async deleteRoom(roomCode: string) {
    await redis.del(
      this.roomKey(roomCode),
      this.roomPlayersKey(roomCode),
      this.roomSpectatorsKey(roomCode),
      this.roomCanvasKey(roomCode),
      this.roomGameKey(roomCode)
    );
  },

  // Map socket to room
  async setSocketRoom(socketId: string, roomCode: string) {
    await redis.set(this.socketRoomKey(socketId), roomCode, 'EX', 7200);
  },

  // Get room for socket
  async getSocketRoom(socketId: string) {
    return await redis.get(this.socketRoomKey(socketId));
  },

  // Remove socket mapping
  async deleteSocketRoom(socketId: string) {
    await redis.del(this.socketRoomKey(socketId));
  },
};

/**
 * Canvas state management
 */
export const CanvasRedis = {
  // Add stroke to canvas history
  async addStroke(roomCode: string, stroke: any) {
    await redis.rpush(RoomRedis.roomCanvasKey(roomCode), JSON.stringify(stroke));
    await redis.expire(RoomRedis.roomCanvasKey(roomCode), 3600); // 1 hour TTL
  },

  // Get canvas history
  async getCanvasHistory(roomCode: string) {
    const strokes = await redis.lrange(RoomRedis.roomCanvasKey(roomCode), 0, -1);
    return strokes.map((s) => JSON.parse(s));
  },

  // Clear canvas history
  async clearCanvas(roomCode: string) {
    await redis.del(RoomRedis.roomCanvasKey(roomCode));
  },

  // Remove last stroke (undo)
  async removeLastStroke(roomCode: string) {
    await redis.rpop(RoomRedis.roomCanvasKey(roomCode));
  },
};

/**
 * Game state management
 */
export const GameRedis = {
  // Get game state
  async getGameState(roomCode: string) {
    const data = await redis.hgetall(RoomRedis.roomGameKey(roomCode));
    if (!data || Object.keys(data).length === 0) return null;
    return {
      ...data,
      currentRound: parseInt(data.currentRound),
      roundStartTime: data.roundStartTime ? new Date(data.roundStartTime) : null,
      correctGuessers: new Set(JSON.parse(data.correctGuessers || '[]')),
      usedWords: new Set(JSON.parse(data.usedWords || '[]')),
      scores: new Map(JSON.parse(data.scores || '[]')),
      guessOrder: JSON.parse(data.guessOrder || '[]'),
    };
  },

  // Set game state
  async setGameState(roomCode: string, gameState: any) {
    await redis.hset(RoomRedis.roomGameKey(roomCode), {
      mode: gameState.mode,
      currentRound: gameState.currentRound,
      totalRounds: gameState.totalRounds,
      drawerSocketId: gameState.drawerSocketId || '',
      currentWord: gameState.currentWord || '',
      hint: gameState.hint || '',
      roundStartTime: gameState.roundStartTime ? gameState.roundStartTime.toISOString() : '',
      correctGuessers: JSON.stringify(Array.from(gameState.correctGuessers || [])),
      usedWords: JSON.stringify(Array.from(gameState.usedWords || [])),
      scores: JSON.stringify(Array.from(gameState.scores || [])),
      guessOrder: JSON.stringify(gameState.guessOrder || []),
    });
    await redis.expire(RoomRedis.roomGameKey(roomCode), 7200);
  },

  // Delete game state
  async deleteGameState(roomCode: string) {
    await redis.del(RoomRedis.roomGameKey(roomCode));
  },
};

/**
 * Rate limiting
 */
export const RateLimitRedis = {
  rateLimitKey: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,

  // Check and increment rate limit
  async checkRateLimit(ip: string, endpoint: string, maxRequests: number, windowMs: number) {
    const key = this.rateLimitKey(ip, endpoint);
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.pexpire(key, windowMs);
    }
    
    return {
      current,
      remaining: Math.max(0, maxRequests - current),
      exceeded: current > maxRequests,
    };
  },
};

/**
 * Leaderboard
 */
export const LeaderboardRedis = {
  leaderboardKey: () => 'leaderboard:global',

  // Update user XP in leaderboard
  async updateUserXP(userId: string, xp: number) {
    await redis.zadd(this.leaderboardKey(), xp, userId);
  },

  // Get top N users
  async getTopUsers(count: number) {
    return await redis.zrevrange(this.leaderboardKey(), 0, count - 1, 'WITHSCORES');
  },

  // Get user rank
  async getUserRank(userId: string) {
    return await redis.zrevrank(this.leaderboardKey(), userId);
  },

  // Set leaderboard cache TTL
  async setLeaderboardTTL() {
    await redis.expire(this.leaderboardKey(), 300); // 5 minutes
  },
};

/**
 * Recent words tracking
 */
export const RecentWordsRedis = {
  recentWordsKey: () => 'words:recent',

  // Add word to recent list
  async addRecentWord(word: string) {
    await redis.lpush(this.recentWordsKey(), word);
    await redis.ltrim(this.recentWordsKey(), 0, 19); // Keep last 20 words
    await redis.expire(this.recentWordsKey(), 3600); // 1 hour TTL
  },

  // Get recent words
  async getRecentWords() {
    return await redis.lrange(this.recentWordsKey(), 0, -1);
  },
};

export default redis;
