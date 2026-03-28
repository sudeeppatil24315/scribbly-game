import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/db.js';
import { ErrorCode } from '@scribbly/shared';
import { AuthRequest } from '../middleware/authenticate.js';
import { redis } from '../../config/redis.js';

// Validation schemas
const createReportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.enum(['harassment', 'offensive_content', 'cheating', 'other']),
  details: z.string().max(1000).optional(),
  roomId: z.string().max(16).optional(),
});

const resolveReportSchema = z.object({
  resolved: z.boolean(),
});

export class ReportController {
  /**
   * POST /api/v1/reports
   * Create a new report
   */
  static async createReport(req: AuthRequest, res: Response) {
    try {
      // Validate authentication
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Validate request body
      const validation = createReportSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Invalid request data',
            details: validation.error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { reportedId, reason, details, roomId } = validation.data;
      const reporterId = req.user.userId;

      // Check if user is trying to report themselves
      if (reporterId === reportedId) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Cannot report yourself',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check if reported user exists
      const reportedUser = await prisma.user.findUnique({
        where: { id: reportedId },
      });

      if (!reportedUser) {
        return res.status(404).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Reported user not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check daily rate limit (5 reports per day per user)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const reportsToday = await prisma.report.count({
        where: {
          reporterId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (reportsToday >= 5) {
        return res.status(429).json({
          error: {
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Daily report limit reached (5 reports per day)',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check for duplicate report (same player in same room)
      if (roomId) {
        const existingReport = await prisma.report.findFirst({
          where: {
            reporterId,
            reportedId,
            roomId,
          },
        });

        if (existingReport) {
          return res.status(400).json({
            error: {
              code: ErrorCode.INVALID_INPUT,
              message: 'You have already reported this player in this room',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // Create the report
      const report = await prisma.report.create({
        data: {
          reporterId,
          reportedId,
          reason,
          details,
          roomId,
          resolved: false,
        },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
            },
          },
          reported: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      return res.status(201).json({
        report: {
          id: report.id,
          reporter: report.reporter,
          reported: report.reported,
          reason: report.reason,
          details: report.details,
          roomId: report.roomId,
          resolved: report.resolved,
          createdAt: report.createdAt,
        },
      });
    } catch (error) {
      console.error('Error creating report:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to create report',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * GET /api/v1/reports/admin
   * Get all reports (admin only)
   */
  static async getReports(req: AuthRequest, res: Response) {
    try {
      // Validate authentication
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // TODO: Add admin role check when role system is implemented
      // For now, any authenticated user can access (should be restricted in production)

      // Parse query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (resolved !== undefined) {
        where.resolved = resolved;
      }

      // Get reports with pagination
      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            reporter: {
              select: {
                id: true,
                username: true,
              },
            },
            reported: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        }),
        prisma.report.count({ where }),
      ]);

      return res.json({
        reports: reports.map((report) => ({
          id: report.id,
          reporter: report.reporter,
          reported: report.reported,
          reason: report.reason,
          details: report.details,
          roomId: report.roomId,
          resolved: report.resolved,
          createdAt: report.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to fetch reports',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * PATCH /api/v1/reports/admin/:id
   * Resolve a report (admin only)
   */
  static async resolveReport(req: AuthRequest, res: Response) {
    try {
      // Validate authentication
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // TODO: Add admin role check when role system is implemented

      const reportId = req.params.id;

      // Validate request body
      const validation = resolveReportSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Invalid request data',
            details: validation.error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { resolved } = validation.data;

      // Check if report exists
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        return res.status(404).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Report not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Update report
      const updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: { resolved },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
            },
          },
          reported: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      return res.json({
        report: {
          id: updatedReport.id,
          reporter: updatedReport.reporter,
          reported: updatedReport.reported,
          reason: updatedReport.reason,
          details: updatedReport.details,
          roomId: updatedReport.roomId,
          resolved: updatedReport.resolved,
          createdAt: updatedReport.createdAt,
        },
      });
    } catch (error) {
      console.error('Error resolving report:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to resolve report',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * GET /api/v1/reports/admin/stats
   * Get report statistics (admin only)
   */
  static async getReportStats(req: AuthRequest, res: Response) {
    try {
      // Validate authentication
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // TODO: Add admin role check when role system is implemented

      // Get statistics
      const [total, unresolved, resolved, byReason] = await Promise.all([
        prisma.report.count(),
        prisma.report.count({ where: { resolved: false } }),
        prisma.report.count({ where: { resolved: true } }),
        prisma.report.groupBy({
          by: ['reason'],
          _count: {
            reason: true,
          },
        }),
      ]);

      const reasonStats = byReason.reduce((acc, item) => {
        acc[item.reason || 'unknown'] = item._count.reason;
        return acc;
      }, {} as Record<string, number>);

      return res.json({
        stats: {
          total,
          unresolved,
          resolved,
          byReason: reasonStats,
        },
      });
    } catch (error) {
      console.error('Error fetching report stats:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to fetch report statistics',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
