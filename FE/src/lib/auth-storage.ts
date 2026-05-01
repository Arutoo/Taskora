import type { AuthResponse } from "./api/types";

const STORAGE_KEY = "taskora_auth";

export type StoredAuth = {
  accessToken: string;
  refreshToken: string;
  user: AuthResponse["user"];
};

export function readStoredAuth(): StoredAuth | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as StoredAuth;
  } catch {
    return null;
  }
}

export function writeStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getStoredAccessToken(): string | null {
  return readStoredAuth()?.accessToken ?? null;
}

export function getStoredRefreshToken(): string | null {
  return readStoredAuth()?.refreshToken ?? null;
}
