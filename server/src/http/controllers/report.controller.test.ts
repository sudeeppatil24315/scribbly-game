import { Request, Response } from 'express';
import { ReportController } from './report.controller';
import prisma from '../../config/db';
import { ErrorCode } from '@scribbly/shared';
import { AuthRequest } from '../middleware/authenticate';

// Mock dependencies
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    report: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

jest.mock('../../config/redis', () => ({
  redis: {},
}));

describe('ReportController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      user: {
        userId: '00000000-0000-0000-0000-000000000001',
        username: 'reporter',
      },
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  describe('createReport', () => {
    it('should create a report successfully', async () => {
      mockRequest.body = {
        reportedId: '00000000-0000-0000-0000-000000000002',
        reason: 'harassment',
        details: 'Test details',
        roomId: 'ABCD12',
      };

      const mockReportedUser = {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'reported',
      };

      const mockReport = {
        id: '00000000-0000-0000-0000-000000000003',
        reporterId: '00000000-0000-0000-0000-000000000001',
        reportedId: '00000000-0000-0000-0000-000000000002',
        reason: 'harassment',
        details: 'Test details',
        roomId: 'ABCD12',
        resolved: false,
        createdAt: new Date(),
        reporter: {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'reporter',
        },
        reported: {
          id: '00000000-0000-0000-0000-000000000002',
          username: 'reported',
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockReportedUser);
      (prisma.report.count as jest.Mock).mockResolvedValue(0);
      (prisma.report.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.report.create as jest.Mock).mockResolvedValue(mockReport);

      await ReportController.createReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        report: expect.objectContaining({
          id: '00000000-0000-0000-0000-000000000003',
          reason: 'harassment',
          resolved: false,
        }),
      });
    });

    it('should reject unauthenticated requests', async () => {
      mockRequest.user = undefined;

      await ReportController.createReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: ErrorCode.UNAUTHORIZED,
        }),
      });
    });

    it('should reject invalid request data', async () => {
      mockRequest.body = {
        reportedId: 'invalid-id', // Not a UUID
        reason: 'invalid-reason',
      };

      await ReportController.createReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: ErrorCode.INVALID_INPUT,
        }),
      });
    });

    it('should prevent self-reporting', async () => {
      mockRequest.body = {
        reportedId: '00000000-0000-0000-0000-000000000001', // Same as reporter
        reason: 'harassment',
      };

      await ReportController.createReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Cannot report yourself',
        }),
      });
    });

    it('should reject report if reported user does not exist', async () => {
      mockRequest.body = {
        reportedId: '00000000-0000-0000-0000-000000000099',
        reason: 'harassment',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await ReportController.createReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Reported user not found',
        }),
      });
    });

    it('should enforce daily rate limit (5 reports per day)', async () => {
      mockRequest.body = {
        reportedId: '00000000-0000-0000-0000-000000000002',
        reason: 'harassment',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '00000000-0000-0000-0000-000000000002' });
      (prisma.report.count as jest.Mock).mockResolvedValue(5); // Already 5 reports today

      await ReportController.createReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: ErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Daily report limit reached (5 reports per day)',
        }),
      });
    });

    it('should prevent duplicate reports for same player in same room', async () => {
      mockRequest.body = {
        reportedId: '00000000-0000-0000-0000-000000000002',
        reason: 'harassment',
        roomId: 'ABCD12',
      };

      const existingReport = {
        id: '00000000-0000-0000-0000-000000000010',
        reporterId: '00000000-0000-0000-0000-000000000001',
        reportedId: '00000000-0000-0000-0000-000000000002',
        roomId: 'ABCD12',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '00000000-0000-0000-0000-000000000002' });
      (prisma.report.count as jest.Mock).mockResolvedValue(0);
      (prisma.report.findFirst as jest.Mock).mockResolvedValue(existingReport);

      await ReportController.createReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'You have already reported this player in this room',
        }),
      });
    });

    it('should accept all valid report reasons', async () => {
      const validReasons = ['harassment', 'offensive_content', 'cheating', 'other'];

      for (const reason of validReasons) {
        jest.clearAllMocks();
        
        mockRequest.body = {
          reportedId: '00000000-0000-0000-0000-000000000002',
          reason,
        };

        const mockReport = {
          id: '00000000-0000-0000-0000-000000000003',
          reporterId: '00000000-0000-0000-0000-000000000001',
          reportedId: '00000000-0000-0000-0000-000000000002',
          reason,
          resolved: false,
          createdAt: new Date(),
          reporter: { id: '00000000-0000-0000-0000-000000000001', username: 'reporter' },
          reported: { id: '00000000-0000-0000-0000-000000000002', username: 'reported' },
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '00000000-0000-0000-0000-000000000002' });
        (prisma.report.count as jest.Mock).mockResolvedValue(0);
        (prisma.report.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.report.create as jest.Mock).mockResolvedValue(mockReport);

        await ReportController.createReport(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusMock).toHaveBeenCalledWith(201);
      }
    });
  });

  describe('getReports', () => {
    it('should return paginated reports', async () => {
      const mockReports = [
        {
          id: 'report-1',
          reporterId: 'reporter-1',
          reportedId: 'reported-1',
          reason: 'harassment',
          details: 'Details 1',
          roomId: 'ROOM1',
          resolved: false,
          createdAt: new Date(),
          reporter: { id: 'reporter-1', username: 'reporter1' },
          reported: { id: 'reported-1', username: 'reported1' },
        },
        {
          id: 'report-2',
          reporterId: 'reporter-2',
          reportedId: 'reported-2',
          reason: 'cheating',
          details: 'Details 2',
          roomId: 'ROOM2',
          resolved: false,
          createdAt: new Date(),
          reporter: { id: 'reporter-2', username: 'reporter2' },
          reported: { id: 'reported-2', username: 'reported2' },
        },
      ];

      (prisma.report.findMany as jest.Mock).mockResolvedValue(mockReports);
      (prisma.report.count as jest.Mock).mockResolvedValue(2);

      await ReportController.getReports(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        reports: expect.arrayContaining([
          expect.objectContaining({ id: 'report-1' }),
          expect.objectContaining({ id: 'report-2' }),
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      });
    });

    it('should filter by resolved status', async () => {
      mockRequest.query = { resolved: 'false' };

      (prisma.report.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.report.count as jest.Mock).mockResolvedValue(0);

      await ReportController.getReports(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { resolved: false },
        })
      );
    });

    it('should reject unauthenticated requests', async () => {
      mockRequest.user = undefined;

      await ReportController.getReports(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('resolveReport', () => {
    it('should resolve a report successfully', async () => {
      mockRequest.params = { id: 'report-id' };
      mockRequest.body = { resolved: true };

      const mockReport = {
        id: 'report-id',
        reporterId: 'reporter-id',
        reportedId: 'reported-id',
        reason: 'harassment',
        resolved: false,
        createdAt: new Date(),
      };

      const mockUpdatedReport = {
        ...mockReport,
        resolved: true,
        reporter: { id: 'reporter-id', username: 'reporter' },
        reported: { id: 'reported-id', username: 'reported' },
      };

      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);
      (prisma.report.update as jest.Mock).mockResolvedValue(mockUpdatedReport);

      await ReportController.resolveReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        report: expect.objectContaining({
          id: 'report-id',
          resolved: true,
        }),
      });
    });

    it('should return 404 if report not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockRequest.body = { resolved: true };

      (prisma.report.findUnique as jest.Mock).mockResolvedValue(null);

      await ReportController.resolveReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Report not found',
        }),
      });
    });

    it('should reject unauthenticated requests', async () => {
      mockRequest.user = undefined;

      await ReportController.resolveReport(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('getReportStats', () => {
    it('should return report statistics', async () => {
      (prisma.report.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // unresolved
        .mockResolvedValueOnce(7); // resolved

      (prisma.report.groupBy as jest.Mock).mockResolvedValue([
        { reason: 'harassment', _count: { reason: 5 } },
        { reason: 'cheating', _count: { reason: 3 } },
        { reason: 'offensive_content', _count: { reason: 2 } },
      ]);

      await ReportController.getReportStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        stats: {
          total: 10,
          unresolved: 3,
          resolved: 7,
          byReason: {
            harassment: 5,
            cheating: 3,
            offensive_content: 2,
          },
        },
      });
    });

    it('should reject unauthenticated requests', async () => {
      mockRequest.user = undefined;

      await ReportController.getReportStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });
});
