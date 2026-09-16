"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthUser, UserRole } from "./types";
import { generateDevToken, getAuthMe, loginUser } from "./api";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithCredentials: (identifier: string, password: string) => Promise<AuthUser>;
  loginAsDevRole: (role: UserRole, customData?: { userId?: string; name?: string; officerId?: string }) => Promise<void>;
  login: (roleOrIdentifier: UserRole | string, passwordOrCustomData?: string | { userId?: string; name?: string; officerId?: string }) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "bhu_setu_token";
const USER_KEY = "bhu_setu_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Verify with backend
        getAuthMe(storedToken)
          .then((verifiedUser) => {
            if (verifiedUser) {
              setUser(verifiedUser);
              localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser));
            }
          })
          .catch(() => {
            // Token might be expired or backend offline - keep local state for demo
          });
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithCredentials = useCallback(
    async (identifier: string, password: string): Promise<AuthUser> => {
      setIsLoading(true);
      try {
        const response = await loginUser(identifier, password);
        if (response && response.token && response.user) {
          setToken(response.token);
          setUser(response.user);
          try {
            localStorage.setItem(TOKEN_KEY, response.token);
            localStorage.setItem(USER_KEY, JSON.stringify(response.user));
          } catch {}
          return response.user;
        }
        throw new Error("Invalid login response from server");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loginAsDevRole = useCallback(
    async (
      role: UserRole,
      customData?: { userId?: string; name?: string; officerId?: string }
    ) => {
      setIsLoading(true);
      try {
        const response = await generateDevToken(role, customData);
        if (response && response.token && response.user) {
          setToken(response.token);
          setUser(response.user);
          try {
            localStorage.setItem(TOKEN_KEY, response.token);
            localStorage.setItem(USER_KEY, JSON.stringify(response.user));
          } catch {}
        }
      } catch (err) {
        console.error("Login failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Overloaded login method for flexible compatibility
  const login = useCallback(
    async (
      roleOrIdentifier: UserRole | string,
      passwordOrCustomData?: string | { userId?: string; name?: string; officerId?: string }
    ) => {
      if (typeof passwordOrCustomData === "string") {
        await loginWithCredentials(roleOrIdentifier, passwordOrCustomData);
      } else if (
        roleOrIdentifier === "citizen" ||
        roleOrIdentifier === "revenue_officer" ||
        roleOrIdentifier === "registrar" ||
        roleOrIdentifier === "admin"
      ) {
        await loginAsDevRole(roleOrIdentifier as UserRole, passwordOrCustomData as any);
      } else {
        await loginWithCredentials(roleOrIdentifier, "BhuSetu@2026");
      }
    },
    [loginWithCredentials, loginAsDevRole]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const role: UserRole = user?.role ?? "citizen";
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isLoading,
        loginWithCredentials,
        loginAsDevRole,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
