import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { requestIdMiddleware } from '../middleware/requestId';
import { requestLogger } from '../middleware/requestLogger';
import { corsMiddleware } from '../middleware/cors';
import { errorHandler } from '../middleware/errorHandler';
import { apiRouter } from '../routes';

export function createApp(): Express {
  const app = express();

  // Basic security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: false
    })
  );

  // CORS middleware
  app.use(corsMiddleware);

  // Correlation Request ID
  app.use(requestIdMiddleware);

  // Request logging
  app.use(requestLogger);

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API router prefix
  app.use('/api', apiRouter);

  // Catch-all for undefined API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'route_not_found',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
  });

  // Root redirect/fallback
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'Bhu-Setu API Gateway',
      version: '0.1.0',
      status: 'active',
      docs: '/api/health'
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
