"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthUser, UserRole } from "./types";
import { generateDevToken, getAuthMe } from "./api";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role: UserRole, customData?: { userId?: string; name?: string; officerId?: string }) => Promise<void>;
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

        // Optionally verify with backend
        getAuthMe(storedToken).then((verifiedUser) => {
          if (verifiedUser) {
            setUser(verifiedUser);
            localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser));
          }
        }).catch(() => {
          // Token might be expired or backend offline - keep local state for demo
        });
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (
      role: UserRole,
      customData?: { userId?: string; name?: string; officerId?: string }
    ) => {
      setIsLoading(true);
      try {
        const response = await generateDevToken(role, customData);
        if (response) {
          setToken(response.token);
          setUser(response.user);
          localStorage.setItem(TOKEN_KEY, response.token);
          localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        }
      } catch (err) {
        console.error("Login failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
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
