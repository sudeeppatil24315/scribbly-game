import { Request, Response } from 'express';
import prisma from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { ErrorCode } from '@scribbly/shared';
import { AuthRequest } from '../middleware/authenticate.js';

const LEADERBOARD_CACHE_KEY = 'leaderboard:global';
const LEADERBOARD_CACHE_TTL = 300; // 5 minutes

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  level: number;
  totalXp: number;
  avatar?: string;
}

export class LeaderboardController {
  /**
   * GET /api/v1/leaderboard
   * Get global leaderboard
   */
  static async getLeaderboard(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
      const skip = (page - 1) * limit;

      // Get current user ID if authenticated
      const currentUserId = (req as AuthRequest).user?.userId;

      // Try to get from cache
      const cacheKey = `${LEADERBOARD_CACHE_KEY}:${page}:${limit}`;
      const cached = await redis.get(cacheKey);

      let leaderboard: LeaderboardEntry[];
      let total: number;

      if (cached) {
        const data = JSON.parse(cached);
        leaderboard = data.leaderboard;
        total = data.total;
      } else {
        // Get top players by XP from User model
        const users = await prisma.user.findMany({
          skip,
          take: limit,
          orderBy: {
            xp: 'desc',
          },
          select: {
            id: true,
            username: true,
            xp: true,
            level: true,
            avatarUrl: true,
          },
        });

        // Get total count of users
        total = await prisma.user.count();

        // Build leaderboard
        leaderboard = users.map((user, index) => ({
          rank: skip + index + 1,
          userId: user.id,
          username: user.username,
          level: user.level,
          totalXp: user.xp,
          avatar: user.avatarUrl || undefined,
        }));

        // Cache the result
        await redis.setex(
          cacheKey,
          LEADERBOARD_CACHE_TTL,
          JSON.stringify({ leaderboard, total })
        );
      }

      // Find current user's rank if authenticated
      let currentUserRank: number | null = null;
      if (currentUserId) {
        currentUserRank = await this.getUserRank(currentUserId);
      }

      return res.json({
        leaderboard,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        currentUserRank,
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to fetch leaderboard',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * GET /api/v1/leaderboard/me
   * Get current user's rank and nearby players
   */
  static async getMyRank(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const userId = req.user.userId;

      // Get user's stats
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          xp: true,
          level: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Get user's rank
      const rank = await this.getUserRank(userId);

      // Get nearby players (5 above and 5 below)
      const nearbyPlayers = await this.getNearbyPlayers(rank, 5);

      return res.json({
        rank,
        level: user.level,
        totalXp: user.xp,
        username: user.username,
        avatar: user.avatarUrl,
        nearbyPlayers,
      });
    } catch (error) {
      console.error('Error fetching user rank:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to fetch user rank',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Calculate user's rank based on XP
   */
  private static async getUserRank(userId: string): Promise<number> {
    const cacheKey = `leaderboard:rank:${userId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return parseInt(cached, 10);
    }

    // Get user's XP
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });

    if (!user) {
      return -1;
    }

    // Count how many users have more XP
    const rank = await prisma.user.count({
      where: {
        xp: {
          gt: user.xp,
        },
      },
    });

    const finalRank = rank + 1;

    // Cache for 5 minutes
    await redis.setex(cacheKey, LEADERBOARD_CACHE_TTL, finalRank.toString());

    return finalRank;
  }

  /**
   * Get nearby players on leaderboard
   */
  private static async getNearbyPlayers(
    rank: number,
    range: number
  ): Promise<LeaderboardEntry[]> {
    const startRank = Math.max(1, rank - range);
    const skip = startRank - 1;
    const take = range * 2 + 1;

    const users = await prisma.user.findMany({
      skip,
      take,
      orderBy: {
        xp: 'desc',
      },
      select: {
        id: true,
        username: true,
        xp: true,
        level: true,
        avatarUrl: true,
      },
    });

    return users.map((user, index) => ({
      rank: startRank + index,
      userId: user.id,
      username: user.username,
      level: user.level,
      totalXp: user.xp,
      avatar: user.avatarUrl || undefined,
    }));
  }

  /**
   * Calculate level from XP
   * Formula: 500 * (level ^ 1.5)
   */
  private static calculateLevel(xp: number): number {
    // Solve for level: xp = 500 * (level ^ 1.5)
    // level = (xp / 500) ^ (1 / 1.5)
    return Math.floor(Math.pow(xp / 500, 1 / 1.5));
  }

  /**
   * Invalidate leaderboard cache
   * Called after game completion
   */
  static async invalidateCache(): Promise<void> {
    try {
      // Delete all leaderboard cache keys
      const pattern = `${LEADERBOARD_CACHE_KEY}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
      }

      // Also delete rank cache keys
      const rankPattern = 'leaderboard:rank:*';
      const rankKeys = await redis.keys(rankPattern);

      if (rankKeys.length > 0) {
        await redis.del(...rankKeys);
      }
    } catch (error) {
      console.error('Error invalidating leaderboard cache:', error);
    }
  }
}
