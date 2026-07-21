import { ZodError } from 'zod';
import type { ErrorHandler } from 'hono';
import { AppError } from '../lib/errors';

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return c.json({
      error: { message: `Validation error: ${err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` },
    }, 400);
  }

  if (err instanceof AppError) {
    return c.json({
      error: { code: err.code, message: err.message, details: err.details },
    }, err.statusCode as any);
  }

  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
};
