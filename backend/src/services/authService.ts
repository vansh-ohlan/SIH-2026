import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser, AuthTokenPayload, DevTokenRequest, DevTokenResponse, UserRole } from '../models/auth';
import { UnauthorizedError } from '../utils/errors';

export class AuthService {
  /**
   * Generates a signed JWT token for the authenticated user.
   */
  public generateToken(user: AuthUser, expiresIn?: string): string {
    const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
      userId: user.userId,
      role: user.role,
      name: user.name,
      officerId: user.officerId
    };

    const options: SignOptions = {
      expiresIn: (expiresIn || config.JWT_EXPIRES_IN) as SignOptions['expiresIn']
    };

    return jwt.sign(payload, config.JWT_SECRET, options);
  }

  /**
   * Verifies and decodes a JWT Bearer token into an AuthUser context.
   * Throws UnauthorizedError if token is invalid or expired.
   */
  public verifyToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as AuthTokenPayload;

      if (!decoded || !decoded.userId || !decoded.role) {
        throw new UnauthorizedError('Invalid token payload');
      }

      return {
        userId: decoded.userId,
        role: decoded.role,
        name: decoded.name,
        officerId: decoded.officerId
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Authentication token is missing or invalid');
    }
  }

  /**
   * Creates a mock/development token with realistic defaults for hackathon demonstrations.
   */
  public generateDevToken(request: DevTokenRequest): DevTokenResponse {
    const defaultUsers: Record<UserRole, { userId: string; name: string; officerId?: string }> = {
      citizen: { userId: 'CIT-101', name: 'Citizen User' },
      revenue_officer: { userId: 'OFF-102', officerId: 'OFF-102', name: 'Revenue Officer Sharma' },
      registrar: { userId: 'REG-201', officerId: 'REG-201', name: 'Sub-Registrar Verma' },
      admin: { userId: 'ADM-999', name: 'System Administrator' }
    };

    const defaultUser = defaultUsers[request.role] || defaultUsers.citizen;

    const user: AuthUser = {
      role: request.role,
      userId: request.userId || defaultUser.userId,
      name: request.name || defaultUser.name,
      officerId: request.officerId || defaultUser.officerId
    };

    const token = this.generateToken(user);

    return {
      token,
      expiresIn: config.JWT_EXPIRES_IN,
      user
    };
  }
}

export const authService = new AuthService();
