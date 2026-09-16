import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { devTokenSchema, registerSchema, loginSchema } from '../schemas/authSchema';

export class AuthController {
  /**
   * Registers a new citizen user account.
   * POST /api/auth/register
   * Strict RBAC: only creates 'citizen' role accounts.
   */
  public register(req: Request, res: Response, next: NextFunction): void {
    try {
      const input = registerSchema.parse(req.body);
      const response = authService.register(input);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Authenticates user with username or email and password.
   * POST /api/auth/login
   */
  public login(req: Request, res: Response, next: NextFunction): void {
    try {
      const input = loginSchema.parse(req.body);
      const isEmail = (input.identifier && input.identifier.includes('@')) || !!input.email;
      const username = input.username || (!isEmail ? input.identifier : undefined);
      const email = input.email || (isEmail ? input.identifier : undefined);

      const response = authService.login({
        username,
        email,
        password: input.password
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

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
