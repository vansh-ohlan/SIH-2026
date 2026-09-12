import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.id;

  if (err instanceof AppError) {
    logger.warn(`Handled AppError: ${err.errorCode} - ${err.message}`, {
      requestId,
      statusCode: err.statusCode,
      errorCode: err.errorCode
    });
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join('; ');
    logger.warn(`Validation error: ${message}`, { requestId, zodErrors: err.errors });
    res.status(400).json({
      error: 'validation_error',
      message
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    logger.warn(`Multer upload error: ${err.message}`, { requestId, code: err.code });
    res.status(400).json({
      error: 'upload_error',
      message: err.message
    });
    return;
  }

  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    logger.warn('Malformed JSON body', { requestId });
    res.status(400).json({
      error: 'invalid_json',
      message: 'Malformed JSON payload provided'
    });
    return;
  }

  logger.error(`Unhandled server error: ${err.message}`, {
    requestId,
    stack: err.stack
  });

  res.status(500).json({
    error: 'internal_server_error',
    message: 'An unexpected internal server error occurred'
  });
};
