import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/types/api.types';
import logger from '@/utils/logger';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    params: req.params,
    query: req.query
  });

  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';

  const apiError: ApiError = {
    success: false,
    error: error.message || 'An unexpected error occurred',
    code: errorCode,
    timestamp: new Date()
  };

  res.status(statusCode).json(apiError);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const apiError: ApiError = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
    timestamp: new Date()
  };

  res.status(404).json(apiError);
};
