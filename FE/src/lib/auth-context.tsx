import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./auth-context-base";
import type { AuthResponse } from "./api/types";
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from "./auth-storage";
import { logoutRequest, refreshRequest } from "./api/auth";

type AuthProviderProps = {
  children: ReactNode;
};
type StoredAuth = {
  accessToken: string;
  refreshToken: string;
  user: AuthResponse["user"];
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth());

  const login = useCallback((payload: AuthResponse) => {
    const nextAuth = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    };
    writeStoredAuth(nextAuth);
    setAuth(nextAuth);
  }, []);


  const logout = useCallback(async () => {
    const refreshToken = auth?.refreshToken ?? null;
    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch (err) {
      console.warn("Logout request failed; clearing local session.", err);
    } finally {
      clearStoredAuth();
      setAuth(null);
    }
  }, [auth?.refreshToken]);

  useEffect(() => {
    if (!auth?.refreshToken) return;

    const refreshSession = async () => {
      try {
        const refreshed = await refreshRequest(auth.refreshToken);
        setAuth((current) => {
          if (!current) return current;
          const nextAuth = {
            ...current,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
          };
          writeStoredAuth(nextAuth);
          return nextAuth;
        });
      } catch (err) {
        console.warn("Session refresh failed; clearing local session.", err);
        clearStoredAuth();
        setAuth(null);
      }
    };

    const interval = window.setInterval(refreshSession, 14 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [auth?.refreshToken]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(auth?.accessToken),
      accessToken: auth?.accessToken ?? null,
      refreshToken: auth?.refreshToken ?? null,
      user: auth?.user ?? null,
      login,
      logout,
    }),
    [auth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
