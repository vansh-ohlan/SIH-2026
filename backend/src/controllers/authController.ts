import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { devTokenSchema } from '../schemas/authSchema';

export class AuthController {
  /**
   * Generates a development JWT token for the requested prototype role.
   * POST /api/auth/dev-token
   */
  public generateDevToken(req: Request, res: Response, next: NextFunction): void {
    try {
      const input = devTokenSchema.parse(req.body);
      const response = authService.generateDevToken(input);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns the current authenticated user context.
   * GET /api/auth/me
   */
  public getMe(req: Request, res: Response, next: NextFunction): void {
    try {
      res.status(200).json({
        user: req.user
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
