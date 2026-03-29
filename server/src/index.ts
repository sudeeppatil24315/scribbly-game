import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './http/routes/auth.routes.js';
import userRoutes from './http/routes/user.routes.js';
import wordpackRoutes from './http/routes/wordpack.routes.js';
import reportRoutes from './http/routes/report.routes.js';
import leaderboardRoutes from './http/routes/leaderboard.routes.js';
import { authRateLimiter, generalRateLimiter } from './http/middleware/rate-limit.js';
import { initializeSocketServer } from './socket/index.js';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const socketServer = initializeSocketServer(httpServer);

// Middleware
app.use(cors());
app.use(express.json());

// Health check (no rate limiting)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes with rate limiting
app.use('/api/v1/auth', authRateLimiter, authRoutes);
app.use('/api/v1/users', generalRateLimiter, userRoutes);
app.use('/api/v1/wordpacks', generalRateLimiter, wordpackRoutes);
app.use('/api/v1/reports', generalRateLimiter, reportRoutes);
app.use('/api/v1/leaderboard', generalRateLimiter, leaderboardRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
  });
});

const PORT = env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io server initialized`);
});

