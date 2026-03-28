import { Router } from 'express';
import { LeaderboardController } from '../controllers/leaderboard.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Public routes
router.get('/', LeaderboardController.getLeaderboard);

// Authenticated routes
router.get('/me', authenticate, LeaderboardController.getMyRank);

export default router;
