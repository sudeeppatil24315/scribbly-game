import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ErrorCode } from '@scribbly/shared';

/**
 * Middleware factory for validating request body with Zod schemas
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Validation error',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
            timestamp: new Date().toISOString(),
          },
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware factory for validating request query parameters with Zod schemas
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Validation error',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
            timestamp: new Date().toISOString(),
          },
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware factory for validating request params with Zod schemas
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: 'Validation error',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
            timestamp: new Date().toISOString(),
          },
        });
      }
      next(error);
    }
  };
};
