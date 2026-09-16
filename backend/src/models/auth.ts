export type UserRole = 'citizen' | 'revenue_officer' | 'registrar' | 'admin';

export interface AuthUser {
  userId: string;
  role: UserRole;
  name?: string;
  officerId?: string;
}

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  name?: string;
  officerId?: string;
  iat?: number;
  exp?: number;
}

export interface DevTokenRequest {
  role: UserRole;
  userId?: string;
  name?: string;
  officerId?: string;
}

export interface DevTokenResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}
