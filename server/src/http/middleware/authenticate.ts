import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth.service';
import { ErrorCode } from '@scribbly/shared';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

/**
 * Middleware to verify JWT access token
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'No token provided',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = AuthService.verifyToken(token);

      if (payload.type !== 'access') {
        return res.status(401).json({
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Invalid token type',
            timestamp: new Date().toISOString(),
          },
        });
      }

      req.user = {
        userId: payload.userId,
        username: payload.username,
      };

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid token';
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
  } catch (error) {
    return res.status(500).json({
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Authentication error',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = AuthService.verifyToken(token);

      if (payload.type === 'access') {
        req.user = {
          userId: payload.userId,
          username: payload.username,
        };
      }
    } catch (error) {
      // Silently fail for optional auth
    }

    next();
  } catch (error) {
    next();
  }
}
