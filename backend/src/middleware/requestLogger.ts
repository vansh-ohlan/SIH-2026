import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;
  const requestId = req.id;

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const { statusCode } = res;

    const logMeta = {
      requestId,
      method,
      url: originalUrl,
      statusCode,
      durationMs,
      ip
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${method} ${originalUrl} ${statusCode} - ${durationMs}ms`, logMeta);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${method} ${originalUrl} ${statusCode} - ${durationMs}ms`, logMeta);
    } else {
      logger.info(`HTTP ${method} ${originalUrl} ${statusCode} - ${durationMs}ms`, logMeta);
    }
  });

  next();
};
