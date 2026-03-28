import { Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/db.js';
import { ErrorCode } from '@scribbly/shared';
import { AuthRequest } from '../middleware/authenticate.js';
import { ProfanityFilterService } from '../../services/profanity-filter.service.js';

const createWordPackSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(500),
  category: z.string().min(2).max(30),
  language: z.string().length(2), // ISO 639-1 code
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']),
  words: z.array(z.string().min(1).max(50)).min(20).max(500),
  isPublic: z.boolean().default(true),
});

const updateWordPackSchema = createWordPackSchema.partial();

const rateWordPackSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export class WordPackController {
  /**
   * GET /api/v1/wordpacks
   * Get all word packs with filtering and search
   */
  static async getWordPacks(req: AuthRequest, res: Response) {
    try {
      const {
        search,
        category,
        language,
        difficulty,
        curated,
        sort = 'trending',
        page = '1',
        limit = '20',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {
        isPublic: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (language) {
        where.language = language;
      }

      if (difficulty && difficulty !== 'mixed') {
        where.difficulty = difficulty;
      }

      if (curated === 'true') {
        where.isCurated = true;
      }

      let orderBy: any = {};
      if (sort === 'trending') {
        orderBy = { playCount: 'desc' };
      } else if (sort === 'rating') {
        orderBy = { averageRating: 'desc' };
      } else if (sort === 'newest') {
        orderBy = { createdAt: 'desc' };
      }

      const [wordPacks, total] = await Promise.all([
        prisma.wordPack.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
          include: {
            _count: {
              select: { words: true },
            },
          },
        }),
        prisma.wordPack.count({ where }),
      ]);

      return res.json({
        wordPacks: wordPacks.map((pack: any) => ({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          category: pack.category,
          language: pack.language,
          difficulty: pack.difficulty,
          wordCount: pack._count.words,
          averageRating: pack.ratingCount > 0 ? pack.ratingSum / pack.ratingCount : 0,
          playCount: pack.playCount,
          isCurated: pack.isCurated,
          createdAt: pack.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Get word packs error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get word packs',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * GET /api/v1/wordpacks/curated
   * Get curated word packs
   */
  static async getCuratedWordPacks(req: AuthRequest, res: Response) {
    try {
      const wordPacks = await prisma.wordPack.findMany({
        where: {
          isCurated: true,
          isPublic: true,
        },
        orderBy: {
          playCount: 'desc',
        },
        include: {
          _count: {
            select: { words: true },
          },
        },
      });

      return res.json({
        wordPacks: wordPacks.map((pack: any) => ({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          category: pack.category,
          language: pack.language,
          difficulty: pack.difficulty,
          wordCount: pack._count.words,
          averageRating: pack.ratingCount > 0 ? pack.ratingSum / pack.ratingCount : 0,
          playCount: pack.playCount,
        })),
      });
    } catch (error) {
      console.error('Get curated word packs error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get curated word packs',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * GET /api/v1/wordpacks/trending
   * Get trending word packs
   */
  static async getTrendingWordPacks(req: AuthRequest, res: Response) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const wordPacks = await prisma.wordPack.findMany({
        where: {
          isPublic: true,
        },
        orderBy: {
          playCount: 'desc',
        },
        take: limit,
        include: {
          _count: {
            select: { words: true },
          },
        },
      });

      return res.json({
        wordPacks: wordPacks.map((pack: any) => ({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          category: pack.category,
          wordCount: pack._count.words,
          averageRating: pack.ratingCount > 0 ? pack.ratingSum / pack.ratingCount : 0,
          playCount: pack.playCount,
        })),
      });
    } catch (error) {
      console.error('Get trending word packs error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get trending word packs',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * GET /api/v1/wordpacks/:id
   * Get word pack by ID
   */
  static async getWordPackById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const wordPack = await prisma.wordPack.findUnique({
        where: { id },
        include: {
          words: true,
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: { ratings: true },
          },
        },
      });

      if (!wordPack) {
        return res.status(404).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Word pack not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check if user has rated this pack
      let userRating = null;
      if (req.user) {
        const rating = await prisma.wordPackRating.findUnique({
          where: {
            userId_packId: {
              userId: req.user.userId,
              packId: id,
            },
          },
        });
        userRating = rating?.rating || null;
      }

      const averageRating = wordPack.ratingCount > 0 
        ? wordPack.ratingSum / wordPack.ratingCount 
        : 0;

      return res.json({
        wordPack: {
          id: wordPack.id,
          name: wordPack.name,
          description: wordPack.description,
          category: wordPack.category,
          language: wordPack.language,
          difficulty: wordPack.difficulty,
          words: wordPack.words.map((w: any) => ({
            id: w.id,
            word: w.word,
            difficulty: w.difficulty,
          })),
          averageRating,
          ratingCount: wordPack._count.ratings,
          playCount: wordPack.playCount,
          isCurated: wordPack.isCurated,
          isPublic: wordPack.isPublic,
          creator: wordPack.creator,
          userRating,
          createdAt: wordPack.createdAt,
        },
      });
    } catch (error) {
      console.error('Get word pack error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get word pack',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * POST /api/v1/wordpacks
   * Create a new word pack
   */
  static async createWordPack(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Not authenticated',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const data = createWordPackSchema.parse(req.body);

      // Validate name for profanity
      if (ProfanityFilterService.containsProfanity(data.name)) {
        return res.status(400).json({
          error: {
            code: ErrorCode.PROFANITY_DETECTED,
            message: 'Word pack name contains inappropriate content',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Validate words for profanity
      const filteredWords = data.words.map((word: string) => {
        if (ProfanityFilterService.containsProfanity(word)) {
          throw new Error(`Word "${word}" contains inappropriate content`);
        }
        return word.trim().toLowerCase();
      });

      // Remove duplicates
      const uniqueWords = [...new Set(filteredWords)];

      if (uniqueWords.length < 20) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Word pack must contain at least 20 unique words',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Create word pack
      const wordPack = await prisma.wordPack.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          language: data.language,
          difficulty: data.difficulty,
          isPublic: data.isPublic,
          creatorId: req.user.userId,
          words: {
            create: uniqueWords.map(word => ({
              word,
              difficulty: data.difficulty === 'mixed' ? 'medium' : data.difficulty,
            })),
          },
        },
        include: {
          words: true,
        },
      });

      return res.status(201).json({
        wordPack: {
          id: wordPack.id,
          name: wordPack.name,
          description: wordPack.description,
          category: wordPack.category,
          wordCount: wordPack.words.length,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Validation error',
            details: error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (error instanceof Error && error.message.includes('inappropriate content')) {
        return res.status(400).json({
          error: {
            code: ErrorCode.PROFANITY_DETECTED,
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      console.error('Create word pack error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to create word pack',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * PATCH /api/v1/wordpacks/:id
   * Update a word pack
   */
  static async updateWordPack(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Not authenticated',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { id } = req.params;
      const updates = updateWordPackSchema.parse(req.body);

      // Check ownership
      const wordPack = await prisma.wordPack.findUnique({
        where: { id },
      });

      if (!wordPack) {
        return res.status(404).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Word pack not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (wordPack.creatorId !== req.user.userId) {
        return res.status(403).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Not authorized to update this word pack',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Cannot update curated packs
      if (wordPack.isCurated) {
        return res.status(403).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Cannot update curated word packs',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const updateData: any = {};

      if (updates.name) {
        if (ProfanityFilterService.containsProfanity(updates.name)) {
          return res.status(400).json({
            error: {
              code: ErrorCode.PROFANITY_DETECTED,
              message: 'Word pack name contains inappropriate content',
              timestamp: new Date().toISOString(),
            },
          });
        }
        updateData.name = updates.name;
      }

      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;

      const updated = await prisma.wordPack.update({
        where: { id },
        data: updateData,
      });

      return res.json({
        wordPack: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          category: updated.category,
          isPublic: updated.isPublic,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Validation error',
            details: error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      console.error('Update word pack error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to update word pack',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * DELETE /api/v1/wordpacks/:id
   * Delete a word pack
   */
  static async deleteWordPack(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Not authenticated',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { id } = req.params;

      const wordPack = await prisma.wordPack.findUnique({
        where: { id },
      });

      if (!wordPack) {
        return res.status(404).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Word pack not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (wordPack.creatorId !== req.user.userId) {
        return res.status(403).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Not authorized to delete this word pack',
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (wordPack.isCurated) {
        return res.status(403).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Cannot delete curated word packs',
            timestamp: new Date().toISOString(),
          },
        });
      }

      await prisma.wordPack.delete({
        where: { id },
      });

      return res.json({
        message: 'Word pack deleted successfully',
      });
    } catch (error) {
      console.error('Delete word pack error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to delete word pack',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * POST /api/v1/wordpacks/:id/rate
   * Rate a word pack
   */
  static async rateWordPack(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Not authenticated',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { id } = req.params;
      const { rating } = rateWordPackSchema.parse(req.body);

      const wordPack = await prisma.wordPack.findUnique({
        where: { id },
      });

      if (!wordPack) {
        return res.status(404).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Word pack not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Upsert rating
      await prisma.wordPackRating.upsert({
        where: {
          userId_packId: {
            userId: req.user.userId,
            packId: id,
          },
        },
        create: {
          userId: req.user.userId,
          packId: id,
          rating,
        },
        update: {
          rating,
        },
      });

      // Recalculate rating sum and count
      const ratings = await prisma.wordPackRating.findMany({
        where: { packId: id },
      });

      const ratingSum = ratings.reduce((sum: number, r: any) => sum + r.rating, 0);
      const ratingCount = ratings.length;

      await prisma.wordPack.update({
        where: { id },
        data: { ratingSum, ratingCount },
      });

      const averageRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

      return res.json({
        message: 'Rating submitted successfully',
        averageRating,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Validation error',
            details: error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      console.error('Rate word pack error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to rate word pack',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
