import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// User routes (authenticated)
router.post('/', authenticate, ReportController.createReport);

// Admin routes (authenticated + admin role)
router.get('/admin', authenticate, ReportController.getReports);
router.get('/admin/stats', authenticate, ReportController.getReportStats);
router.patch('/admin/:id', authenticate, ReportController.resolveReport);

export default router;
