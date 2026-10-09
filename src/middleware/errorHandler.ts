import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from './errors.js';
import { env } from '../config/env.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: { code: 'INVALID_ID', message: `Invalid value for ${err.path}` },
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Database validation failed',
        details: Object.values(err.errors).map((e) => e.message),
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected error';
  if (env.nodeEnv !== 'test') {
    console.error('[error]', message);
  }
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message },
  });
}
