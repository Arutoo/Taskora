import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./auth-context-base";
import type { AuthResponse } from "./api/types";
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from "./auth-storage";
import { logoutRequest } from "./api/auth";

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

  const login = (payload: AuthResponse) => {
    const nextAuth = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    };
    writeStoredAuth(nextAuth);
    setAuth(nextAuth);
  };


  const logout = async () => {
    const refreshToken = auth?.refreshToken ?? null;
    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch {
    } finally {
      clearStoredAuth();
      setAuth(null);
    }
  };

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(auth?.accessToken),
      accessToken: auth?.accessToken ?? null,
      refreshToken: auth?.refreshToken ?? null,
      user: auth?.user ?? null,
      login,
      logout,
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
