import { authService } from '../../src/services/authService';
import { AuthUser, UserRole } from '../../src/models/auth';
import { UnauthorizedError } from '../../src/utils/errors';

describe('AuthService', () => {
  const mockOfficer: AuthUser = {
    userId: 'OFF-102',
    role: 'revenue_officer',
    name: 'Revenue Officer Sharma',
    officerId: 'OFF-102'
  };

  it('should generate a valid JWT token and verify it correctly', () => {
    const token = authService.generateToken(mockOfficer);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = authService.verifyToken(token);
    expect(verified.userId).toBe(mockOfficer.userId);
    expect(verified.role).toBe(mockOfficer.role);
    expect(verified.name).toBe(mockOfficer.name);
    expect(verified.officerId).toBe(mockOfficer.officerId);
  });

  it('should throw UnauthorizedError when verifying an invalid token string', () => {
    expect(() => authService.verifyToken('invalid.token.string')).toThrow(UnauthorizedError);
  });

  it('should generate development tokens for all supported roles', () => {
    const roles: UserRole[] = ['citizen', 'revenue_officer', 'registrar', 'admin'];

    for (const role of roles) {
      const res = authService.generateDevToken({ role });
      expect(res.token).toBeDefined();
      expect(res.user.role).toBe(role);
      expect(res.user.userId).toBeDefined();
      expect(res.expiresIn).toBe('1h');

      const verified = authService.verifyToken(res.token);
      expect(verified.role).toBe(role);
    }
  });

  it('should allow custom userId and name when generating dev tokens', () => {
    const customUser = {
      role: 'revenue_officer' as const,
      userId: 'OFF-999',
      name: 'Custom Officer',
      officerId: 'OFF-999'
    };

    const res = authService.generateDevToken(customUser);
    expect(res.user.userId).toBe('OFF-999');
    expect(res.user.name).toBe('Custom Officer');
    expect(res.user.officerId).toBe('OFF-999');

    const verified = authService.verifyToken(res.token);
    expect(verified.userId).toBe('OFF-999');
    expect(verified.name).toBe('Custom Officer');
  });
});
