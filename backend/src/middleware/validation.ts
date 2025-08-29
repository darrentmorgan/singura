/**
 * Request Validation Middleware
 * Provides Zod-based validation for request body, query, and params
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

interface ValidationSchemas {
  body?: z.ZodSchema<any>;
  query?: z.ZodSchema<any>;
  params?: z.ZodSchema<any>;
}

/**
 * Middleware factory for request validation using Zod schemas
 */
export const validateRequest = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Request body validation failed',
            details: bodyResult.error.format()
          });
        }
        req.body = bodyResult.data;
      }

      // Validate query parameters
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Query parameters validation failed',
            details: queryResult.error.format()
          });
        }
        req.query = queryResult.data;
      }

      // Validate path parameters
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Path parameters validation failed',
            details: paramsResult.error.format()
          });
        }
        req.params = paramsResult.data;
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'An error occurred during request validation'
      });
    }
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // UUID validation
  uuidParam: z.object({
    id: z.string().uuid('Invalid UUID format')
  }),

  // Pagination parameters
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort_by: z.string().optional(),
    sort_order: z.enum(['ASC', 'DESC']).default('ASC')
  }),

  // Search parameters
  search: z.object({
    q: z.string().min(1).optional(),
    search: z.string().min(1).optional()
  })
};