import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.headers['x-request-id'];
  const requestId = (typeof existingId === 'string' && existingId.length > 0 ? existingId : uuidv4());
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
