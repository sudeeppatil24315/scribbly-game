import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { AuthService } from '../../services/auth.service';
import { ErrorCode } from '@scribbly/shared';
import { AuthRequest } from '../middleware/authenticate';

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(2).max(20).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register a new user with email and password
   */
  static async register(req: Request, res: Response) {
    try {
      const { username, email, password } = registerSchema.parse(req.body);

      // Check if username already exists
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUsername) {
        return res.status(400).json({
          error: {
            code: ErrorCode.USERNAME_TAKEN,
            message: 'Username already taken',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Email already registered',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
        },
      });

      // Create player stats
      await prisma.playerStats.create({
        data: {
          userId: user.id,
        },
      });

      // Generate tokens
      const { accessToken, refreshToken } = await AuthService.generateTokenPair(
        user.id,
        user.username
      );

      return res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          xp: user.xp,
          level: user.level,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
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

      console.error('Register error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Registration failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * POST /api/v1/auth/login
   * Login with email and password
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        return res.status(401).json({
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check if user is banned
      if (user.isBanned) {
        return res.status(403).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Account has been banned',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Verify password
      const isValidPassword = await AuthService.comparePassword(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Invalid email or password',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = await AuthService.generateTokenPair(
        user.id,
        user.username
      );

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          xp: user.xp,
          level: user.level,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
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

      console.error('Login error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Login failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);

      // Verify refresh token
      const payload = AuthService.verifyToken(refreshToken);

      if (payload.type !== 'refresh') {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Invalid token type',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Check if refresh token exists in database
      const isValid = await AuthService.verifyRefreshToken(refreshToken);

      if (!isValid) {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Invalid or expired refresh token',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Generate new access token
      const accessToken = AuthService.generateAccessToken(payload.userId, payload.username);

      return res.json({
        accessToken,
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

      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      const errorCode = errorMessage === 'TOKEN_EXPIRED' 
        ? ErrorCode.TOKEN_EXPIRED 
        : ErrorCode.UNAUTHORIZED;

      return res.status(401).json({
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Invalidate refresh token
   */
  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);

      await AuthService.invalidateRefreshToken(refreshToken);

      return res.json({
        message: 'Logged out successfully',
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

      console.error('Logout error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Logout failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * POST /api/v1/auth/oauth/google
   * Google OAuth login/register
   */
  static async googleOAuth(req: Request, res: Response) {
    try {
      const { idToken } = z.object({ idToken: z.string() }).parse(req.body);

      // TODO: Verify Google ID token with Google's API
      // For now, this is a placeholder that accepts the token
      // In production, use google-auth-library to verify the token
      
      // Mock implementation - replace with actual Google token verification
      const googleUser = {
        id: 'google_' + Date.now(),
        email: 'user@example.com',
        name: 'User',
      };

      // Check if user exists
      let user = await prisma.user.findFirst({
        where: {
          oauthProvider: 'google',
          oauthId: googleUser.id,
        },
      });

      if (!user) {
        // Check if email already exists
        const existingEmail = await prisma.user.findUnique({
          where: { email: googleUser.email },
        });

        if (existingEmail) {
          return res.status(400).json({
            error: {
              code: ErrorCode.INVALID_CREDENTIALS,
              message: 'Email already registered with different method',
              timestamp: new Date().toISOString(),
            },
          });
        }

        // Generate unique username from email
        let username = googleUser.email.split('@')[0];
        let usernameExists = await prisma.user.findUnique({ where: { username } });
        let counter = 1;
        
        while (usernameExists) {
          username = `${googleUser.email.split('@')[0]}${counter}`;
          usernameExists = await prisma.user.findUnique({ where: { username } });
          counter++;
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            username,
            email: googleUser.email,
            oauthProvider: 'google',
            oauthId: googleUser.id,
          },
        });

        // Create player stats
        await prisma.playerStats.create({
          data: {
            userId: user.id,
          },
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = await AuthService.generateTokenPair(
        user.id,
        user.username
      );

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          xp: user.xp,
          level: user.level,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
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

      console.error('Google OAuth error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'OAuth authentication failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current user profile
   */
  static async me(req: AuthRequest, res: Response) {
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

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          stats: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          xp: user.xp,
          level: user.level,
          avatarUrl: user.avatarUrl,
          stats: user.stats,
        },
      });
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get user',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
