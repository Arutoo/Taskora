import { createContext } from "react";
import type { ApiUser, AuthResponse } from "./api/types";

export type AuthContextValue = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: ApiUser | null;
  login: (payload: AuthResponse) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
