import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { UserRole } from '../models/auth';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

/**
 * Middleware that validates the JWT Bearer token from the Authorization header
 * and attaches the authenticated user context to `req.user`.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token is missing or invalid');
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    throw new UnauthorizedError('Authentication token is missing');
  }

  try {
    const user = authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware that asserts the authenticated user holds at least one of the allowed roles.
 * Must be preceded by `authenticate` middleware.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Insufficient permissions. Required role(s): ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
}
