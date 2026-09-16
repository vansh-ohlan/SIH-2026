export type UserRole = 'citizen' | 'revenue_officer' | 'registrar' | 'admin';

export interface AuthUser {
  userId: string;
  role: UserRole;
  username?: string;
  name?: string;
  email?: string;
  officerId?: string;
}

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  username?: string;
  name?: string;
  email?: string;
  officerId?: string;
  iat?: number;
  exp?: number;
}

export interface DevTokenRequest {
  role: UserRole;
  userId?: string;
  username?: string;
  name?: string;
  officerId?: string;
}

export interface DevTokenResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  username: string;
  password: string;
  role?: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    userId: string;
    username: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface LoginRequest {
  username?: string;
  email?: string;
  identifier?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

export interface DemoUserRecord {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  officerId?: string;
}
