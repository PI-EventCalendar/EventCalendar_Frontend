"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User, LoginPayload, RegisterPayload } from "../types";
import { loginUser, registerUser, getCurrentUser } from "../services/authService";

// ─── Tipos del contexto ───────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Al montar, intenta rehidratar la sesión desde localStorage */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await loginUser(payload);
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    const me = await getCurrentUser();
    setUser(me);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await registerUser(payload);
    localStorage.setItem("access_token", response.tokens.access);
    localStorage.setItem("refresh_token", response.tokens.refresh);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
