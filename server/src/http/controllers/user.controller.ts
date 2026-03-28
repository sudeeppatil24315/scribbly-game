import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { ErrorCode } from '@scribbly/shared';
import { AuthRequest } from '../middleware/authenticate';
import { ProfanityFilterService } from '../../services/profanity-filter.service';

const updateProfileSchema = z.object({
  username: z.string().min(2).max(20).optional(),
  avatarUrl: z.string().url().optional(),
});

export class UserController {
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const { username } = req.params;
      const user = await prisma.user.findUnique({
        where: { username },
        include: { stats: true },
      });

      if (!user) {
        return res.status(404).json({
          error: { code: ErrorCode.INVALID_INPUT, message: 'User not found', timestamp: new Date().toISOString() },
        });
      }

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          xp: user.xp,
          level: user.level,
          avatarUrl: user.avatarUrl,
          stats: user.stats,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to get profile', timestamp: new Date().toISOString() },
      });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: ErrorCode.UNAUTHORIZED, message: 'Not authenticated', timestamp: new Date().toISOString() },
        });
      }

      const updates = updateProfileSchema.parse(req.body);

      if (updates.username) {
        const validation = ProfanityFilterService.validateUsername(updates.username);
        if (!validation.valid) {
          return res.status(400).json({
            error: { code: ErrorCode.INVALID_USERNAME, message: validation.reason, timestamp: new Date().toISOString() },
          });
        }

        const existing = await prisma.user.findUnique({ where: { username: validation.sanitized } });
        if (existing && existing.id !== req.user.userId) {
          return res.status(400).json({
            error: { code: ErrorCode.USERNAME_TAKEN, message: 'Username already taken', timestamp: new Date().toISOString() },
          });
        }

        updates.username = validation.sanitized;
      }

      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: updates,
      });

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          xp: user.xp,
          level: user.level,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: ErrorCode.INVALID_INPUT, message: 'Validation error', details: error.errors, timestamp: new Date().toISOString() },
        });
      }

      console.error('Update profile error:', error);
      return res.status(500).json({
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to update profile', timestamp: new Date().toISOString() },
      });
    }
  }

  static async getStats(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: ErrorCode.UNAUTHORIZED, message: 'Not authenticated', timestamp: new Date().toISOString() },
        });
      }

      const stats = await prisma.playerStats.findUnique({ where: { userId: req.user.userId } });
      if (!stats) {
        return res.status(404).json({
          error: { code: ErrorCode.INVALID_INPUT, message: 'Stats not found', timestamp: new Date().toISOString() },
        });
      }

      return res.json({ stats });
    } catch (error) {
      console.error('Get stats error:', error);
      return res.status(500).json({
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to get stats', timestamp: new Date().toISOString() },
      });
    }
  }

  static async getCosmetics(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: ErrorCode.UNAUTHORIZED, message: 'Not authenticated', timestamp: new Date().toISOString() },
        });
      }

      const cosmetics = await prisma.userCosmetic.findMany({
        where: { userId: req.user.userId },
        include: { cosmetic: true },
      });

      return res.json({
        cosmetics: cosmetics.map(uc => ({
          ...uc.cosmetic,
          equipped: uc.equipped,
          unlockedAt: uc.unlockedAt,
        })),
      });
    } catch (error) {
      console.error('Get cosmetics error:', error);
      return res.status(500).json({
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to get cosmetics', timestamp: new Date().toISOString() },
      });
    }
  }

  static async equipCosmetic(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: ErrorCode.UNAUTHORIZED, message: 'Not authenticated', timestamp: new Date().toISOString() },
        });
      }

      const { id } = req.params;
      const userCosmetic = await prisma.userCosmetic.findUnique({
        where: { userId_cosmeticId: { userId: req.user.userId, cosmeticId: id } },
        include: { cosmetic: true },
      });

      if (!userCosmetic) {
        return res.status(404).json({
          error: { code: ErrorCode.INVALID_INPUT, message: 'Cosmetic not found or not owned', timestamp: new Date().toISOString() },
        });
      }

      await prisma.userCosmetic.updateMany({
        where: { userId: req.user.userId, cosmetic: { type: userCosmetic.cosmetic.type } },
        data: { equipped: false },
      });

      await prisma.userCosmetic.update({
        where: { userId_cosmeticId: { userId: req.user.userId, cosmeticId: id } },
        data: { equipped: true },
      });

      return res.json({ message: 'Cosmetic equipped successfully' });
    } catch (error) {
      console.error('Equip cosmetic error:', error);
      return res.status(500).json({
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to equip cosmetic', timestamp: new Date().toISOString() },
      });
    }
  }

  static async requestAccountDeletion(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: ErrorCode.UNAUTHORIZED, message: 'Not authenticated', timestamp: new Date().toISOString() },
        });
      }

      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      await prisma.user.update({
        where: { id: req.user.userId },
        data: { isBanned: true },
      });

      return res.json({
        message: 'Account deletion requested. Your account will be deleted in 30 days.',
        deletionDate,
      });
    } catch (error) {
      console.error('Request account deletion error:', error);
      return res.status(500).json({
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to request account deletion', timestamp: new Date().toISOString() },
      });
    }
  }

  static async deleteAccount(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: ErrorCode.UNAUTHORIZED, message: 'Not authenticated', timestamp: new Date().toISOString() },
        });
      }

      const userId = req.user.userId;

      await prisma.gamePlayer.updateMany({
        where: { userId },
        data: { userId: null as any },
      });

      await prisma.user.delete({ where: { id: userId } });

      return res.json({ message: 'Account permanently deleted' });
    } catch (error) {
      console.error('Delete account error:', error);
      return res.status(500).json({
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to delete account', timestamp: new Date().toISOString() },
      });
    }
  }

  static async exportData(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: ErrorCode.UNAUTHORIZED, message: 'Not authenticated', timestamp: new Date().toISOString() },
        });
      }

      const userId = req.user.userId;

      const [user, stats, cosmetics, wordPacks, gamePlayers, reportsCreated, reportsReceived] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, email: true, xp: true, level: true, avatarUrl: true, createdAt: true, updatedAt: true },
        }),
        prisma.playerStats.findUnique({ where: { userId } }),
        prisma.userCosmetic.findMany({ where: { userId }, include: { cosmetic: true } }),
        prisma.wordPack.findMany({ where: { creatorId: userId }, include: { words: true } }),
        prisma.gamePlayer.findMany({ where: { userId }, include: { session: true } }),
        prisma.report.findMany({ where: { reporterId: userId } }),
        prisma.report.findMany({ where: { reportedId: userId } }),
      ]);

      const exportData = {
        profile: user,
        statistics: stats,
        cosmetics: cosmetics.map(uc => ({
          name: uc.cosmetic.name,
          type: uc.cosmetic.type,
          equipped: uc.equipped,
          unlockedAt: uc.unlockedAt,
        })),
        wordPacks: wordPacks.map(wp => ({
          id: wp.id,
          name: wp.name,
          description: wp.description,
          category: wp.category,
          language: wp.language,
          difficulty: wp.difficulty,
          playCount: wp.playCount,
          words: wp.words.map(w => w.word),
          createdAt: wp.createdAt,
        })),
        gameHistory: gamePlayers.map(gp => ({
          sessionId: gp.sessionId,
          mode: gp.session.mode,
          rounds: gp.session.rounds,
          finalScore: gp.finalScore,
          finalRank: gp.finalRank,
          xpEarned: gp.xpEarned,
          playedAt: gp.session.endedAt,
        })),
        reportsCreated: reportsCreated.map(r => ({
          id: r.id,
          reportedId: r.reportedId,
          reason: r.reason,
          details: r.details,
          roomId: r.roomId,
          resolved: r.resolved,
          createdAt: r.createdAt,
        })),
        reportsReceived: reportsReceived.map(r => ({
          id: r.id,
          reporterId: r.reporterId,
          reason: r.reason,
          resolved: r.resolved,
          createdAt: r.createdAt,
        })),
        exportedAt: new Date().toISOString(),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="scribbly-data-${userId}.json"`);

      return res.json(exportData);
    } catch (error) {
      console.error('Export data error:', error);
      return res.status(500).json({
        error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to export data', timestamp: new Date().toISOString() },
      });
    }
  }
}
