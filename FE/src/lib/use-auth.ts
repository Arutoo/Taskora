import { useContext } from "react";
import { AuthContext } from "./auth-context-base";
import type { AuthContextValue } from "./auth-context-base";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
