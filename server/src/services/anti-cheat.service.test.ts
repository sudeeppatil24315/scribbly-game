import { AntiCheatService } from './anti-cheat.service.js';
import redis from '../config/redis.js';

// Mock Redis
jest.mock('../config/redis.js', () => ({
  default: {
    setex: jest.fn(),
    get: jest.fn(),
    zadd: jest.fn(),
    hgetall: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    zrevrange: jest.fn(),
    zremrangebyscore: jest.fn(),
  },
}));

describe('AntiCheatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isFastGuess', () => {
    it('should return true for guesses within 1 second of round start', () => {
      const roundStartTime = new Date(Date.now() - 500); // 500ms ago
      expect(AntiCheatService.isFastGuess(roundStartTime)).toBe(true);
    });

    it('should return false for guesses after 1 second of round start', () => {
      const roundStartTime = new Date(Date.now() - 1500); // 1.5 seconds ago
      expect(AntiCheatService.isFastGuess(roundStartTime)).toBe(false);
    });

    it('should return false when roundStartTime is null', () => {
      expect(AntiCheatService.isFastGuess(null)).toBe(false);
    });
  });

  describe('checkGuessRateLimit', () => {
    it('should allow first guess', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      
      const result = await AntiCheatService.checkGuessRateLimit('ROOM123', 'socket1');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should allow up to 5 guesses per second', async () => {
      (redis.get as jest.Mock).mockResolvedValue('4');
      
      const result = await AntiCheatService.checkGuessRateLimit('ROOM123', 'socket1');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0); // 5 - 5
    });

    it('should block 6th guess within same second', async () => {
      (redis.get as jest.Mock).mockResolvedValue('5');
      
      const result = await AntiCheatService.checkGuessRateLimit('ROOM123', 'socket1');
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('trackConnection', () => {
    it('should allow first connection', async () => {
      (redis.hgetall as jest.Mock).mockResolvedValue({});
      
      const result = await AntiCheatService.trackConnection(
        'ROOM123',
        'socket1',
        'user1',
        'Player1'
      );
      
      expect(result.isMultipleConnection).toBe(false);
      expect(redis.hset).toHaveBeenCalled();
    });

    it('should detect multiple connections by userId', async () => {
      (redis.hgetall as jest.Mock).mockResolvedValue({
        socket1: JSON.stringify({
          userId: 'user1',
          username: 'Player1',
          timestamp: Date.now(),
        }),
      });
      
      const result = await AntiCheatService.trackConnection(
        'ROOM123',
        'socket2',
        'user1',
        'Player1'
      );
      
      expect(result.isMultipleConnection).toBe(true);
      expect(result.existingSocketId).toBe('socket1');
    });

    it('should detect multiple connections by username for guests', async () => {
      (redis.hgetall as jest.Mock).mockResolvedValue({
        socket1: JSON.stringify({
          userId: null,
          username: 'GuestPlayer',
          timestamp: Date.now(),
        }),
      });
      
      const result = await AntiCheatService.trackConnection(
        'ROOM123',
        'socket2',
        null,
        'GuestPlayer'
      );
      
      expect(result.isMultipleConnection).toBe(true);
      expect(result.existingSocketId).toBe('socket1');
    });
  });

  describe('validateDrawingCoordinates', () => {
    it('should validate coordinates within bounds', () => {
      const result = AntiCheatService.validateDrawingCoordinates(400, 300);
      
      expect(result.valid).toBe(true);
      expect(result.isAnomalous).toBe(false);
    });

    it('should mark coordinates at bounds as valid', () => {
      const result = AntiCheatService.validateDrawingCoordinates(800, 600);
      
      expect(result.valid).toBe(true);
      expect(result.isAnomalous).toBe(false);
    });

    it('should mark slightly out of bounds as invalid but not anomalous', () => {
      const result = AntiCheatService.validateDrawingCoordinates(850, 650);
      
      expect(result.valid).toBe(false);
      expect(result.isAnomalous).toBe(false);
    });

    it('should mark significantly out of bounds as anomalous', () => {
      const result = AntiCheatService.validateDrawingCoordinates(1000, 1000);
      
      expect(result.valid).toBe(false);
      expect(result.isAnomalous).toBe(true);
    });

    it('should mark negative coordinates far from bounds as anomalous', () => {
      const result = AntiCheatService.validateDrawingCoordinates(-200, -200);
      
      expect(result.valid).toBe(false);
      expect(result.isAnomalous).toBe(true);
    });
  });

  describe('hasRoundStarted', () => {
    it('should return true when roundStartTime is set', () => {
      const roundStartTime = new Date();
      expect(AntiCheatService.hasRoundStarted(roundStartTime)).toBe(true);
    });

    it('should return false when roundStartTime is null', () => {
      expect(AntiCheatService.hasRoundStarted(null)).toBe(false);
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log activity to Redis', async () => {
      const activity = {
        socketId: 'socket1',
        userId: 'user1',
        username: 'Player1',
        roomCode: 'ROOM123',
        activityType: 'fast_guess',
        details: { elapsedMs: 500 },
        timestamp: new Date(),
      } as const;

      await AntiCheatService.logSuspiciousActivity(activity as any);

      expect(redis.setex).toHaveBeenCalled();
      expect(redis.zadd).toHaveBeenCalled();
    });
  });
});
