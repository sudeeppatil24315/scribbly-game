import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { env } from '../config/env';
import prisma from '../config/db';

export interface TokenPayload {
  userId: string;
  username: string;
  type: 'access' | 'refresh';
}

export class AuthService {
  /**
   * Generate access token (15 minutes)
   */
  static generateAccessToken(userId: string, username: string): string {
    const payload: TokenPayload = {
      userId,
      username,
      type: 'access',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    } as SignOptions);
  }

  /**
   * Generate refresh token (7 days)
   */
  static generateRefreshToken(userId: string, username: string): string {
    const payload: TokenPayload = {
      userId,
      username,
      type: 'refresh',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    } as SignOptions);
  }

  /**
   * Verify and decode token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('INVALID_TOKEN');
    }
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Store refresh token in database (hashed)
   */
  static async storeRefreshToken(userId: string, token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Calculate expiry date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  /**
   * Verify refresh token exists in database
   */
  static async verifyRefreshToken(token: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return !!storedToken;
  }

  /**
   * Invalidate refresh token (logout)
   */
  static async invalidateRefreshToken(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.refreshToken.deleteMany({
      where: {
        tokenHash,
      },
    });
  }

  /**
   * Clean up expired refresh tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static async generateTokenPair(userId: string, username: string) {
    const accessToken = this.generateAccessToken(userId, username);
    const refreshToken = this.generateRefreshToken(userId, username);

    await this.storeRefreshToken(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }
}
