import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import {
  AuthUser,
  AuthTokenPayload,
  DevTokenRequest,
  DevTokenResponse,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  DemoUserRecord,
  UserRole
} from '../models/auth';
import { hashPassword, verifyPassword } from '../utils/crypto';
import {
  UnauthorizedError,
  InvalidCredentialsError,
  DuplicateUserError
} from '../utils/errors';

export class AuthService {
  private users: DemoUserRecord[] = [];

  constructor() {
    this.seedDemoUsers();
  }

  /**
   * Initializes default demo users with PBKDF2 hashed passwords.
   * Default password for prototype personas is 'BhuSetu@2026'.
   */
  private seedDemoUsers(): void {
    const defaultPasswordHash = hashPassword('BhuSetu@2026');

    this.users = [
      {
        userId: 'CIT-101',
        username: 'citizen',
        email: 'citizen@bhusetu.demo',
        passwordHash: defaultPasswordHash,
        role: 'citizen',
        name: 'Citizen User'
      },
      {
        userId: 'OFF-102',
        username: 'officer',
        email: 'officer@bhusetu.demo',
        passwordHash: defaultPasswordHash,
        role: 'revenue_officer',
        name: 'Revenue Officer Sharma',
        officerId: 'OFF-102'
      },
      {
        userId: 'REG-201',
        username: 'registrar',
        email: 'registrar@bhusetu.demo',
        passwordHash: defaultPasswordHash,
        role: 'registrar',
        name: 'Sub-Registrar Verma',
        officerId: 'REG-201'
      },
      {
        userId: 'ADM-999',
        username: 'admin',
        email: 'admin@bhusetu.demo',
        passwordHash: defaultPasswordHash,
        role: 'admin',
        name: 'System Administrator'
      }
    ];
  }

  /**
   * Registers a new citizen user.
   * STRICT SECURITY RULE: Public self-registration ONLY creates citizen role accounts.
   * Role parameter is strictly overridden and privileged roles cannot be self-provisioned.
   */
  public register(request: RegisterRequest): RegisterResponse {
    const normalizedEmail = request.email.trim().toLowerCase();
    const normalizedUsername = request.username.trim().toLowerCase();

    // Check for existing user by username or email
    const existing = this.users.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        u.username.toLowerCase() === normalizedUsername
    );

    if (existing) {
      if (existing.email.toLowerCase() === normalizedEmail) {
        throw new DuplicateUserError('An account with this email already exists');
      }
      throw new DuplicateUserError('An account with this username already exists');
    }

    const passwordHash = hashPassword(request.password);
    const userId = `CIT-${Date.now().toString().slice(-6)}`;

    const newUser: DemoUserRecord = {
      userId,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      role: 'citizen', // Strictly forced to citizen
      name: request.name.trim()
    };

    this.users.push(newUser);

    return {
      message: 'Citizen account registered successfully',
      user: {
        userId: newUser.userId,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    };
  }

  /**
   * Authenticates a user with username/email and password.
   * Returns a signed JWT token and safe user context.
   */
  public login(request: LoginRequest): LoginResponse {
    const identifier = (request.username || request.email || request.identifier || '').trim().toLowerCase();

    if (!identifier || !request.password) {
      throw new InvalidCredentialsError('Username/email and password are required');
    }

    const user = this.users.find(
      (u) =>
        u.email.toLowerCase() === identifier ||
        u.username.toLowerCase() === identifier
    );

    if (!user) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

    const isMatch = verifyPassword(request.password, user.passwordHash);
    if (!isMatch) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

    const authUser: AuthUser = {
      userId: user.userId,
      role: user.role,
      username: user.username,
      name: user.name,
      email: user.email,
      officerId: user.officerId
    };

    const token = this.generateToken(authUser);

    return {
      token,
      expiresIn: config.JWT_EXPIRES_IN,
      user: authUser
    };
  }

  /**
   * Generates a signed JWT token for the authenticated user.
   */
  public generateToken(user: AuthUser, expiresIn?: string): string {
    const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
      userId: user.userId,
      role: user.role,
      username: user.username,
      name: user.name,
      email: user.email,
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
        username: decoded.username,
        name: decoded.name,
        email: decoded.email,
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
   * Creates a development token for SIH hackathon evaluation shortcuts.
   */
  public generateDevToken(request: DevTokenRequest): DevTokenResponse {
    const defaultUsers: Record<UserRole, { userId: string; username: string; name: string; email: string; officerId?: string }> = {
      citizen: { userId: 'CIT-101', username: 'citizen', name: 'Citizen User', email: 'citizen@bhusetu.demo' },
      revenue_officer: { userId: 'OFF-102', username: 'officer', officerId: 'OFF-102', name: 'Revenue Officer Sharma', email: 'officer@bhusetu.demo' },
      registrar: { userId: 'REG-201', username: 'registrar', officerId: 'REG-201', name: 'Sub-Registrar Verma', email: 'registrar@bhusetu.demo' },
      admin: { userId: 'ADM-999', username: 'admin', name: 'System Administrator', email: 'admin@bhusetu.demo' }
    };

    const defaultUser = defaultUsers[request.role] || defaultUsers.citizen;

    const user: AuthUser = {
      role: request.role,
      userId: request.userId || defaultUser.userId,
      username: request.username || defaultUser.username,
      name: request.name || defaultUser.name,
      email: defaultUser.email,
      officerId: request.officerId || defaultUser.officerId
    };

    const token = this.generateToken(user);

    return {
      token,
      expiresIn: config.JWT_EXPIRES_IN,
      user
    };
  }

  /**
   * Helper for tests to inspect in-memory users securely without exposing hashes.
   */
  public findUserById(userId: string): DemoUserRecord | undefined {
    return this.users.find((u) => u.userId === userId);
  }
}

export const authService = new AuthService();
