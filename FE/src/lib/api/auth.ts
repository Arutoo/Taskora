import { apiRequest } from "./client";
import type { ApiUser, AuthResponse, LoginRequest, SignupRequest } from "./types";

export function loginRequest(payload: LoginRequest) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function signupRequest(payload: SignupRequest) {
  return apiRequest<ApiUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmailRequest(token: string) {
  return apiRequest<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

export function refreshRequest(refreshToken: string) {
  return apiRequest<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function logoutRequest(refreshToken: string) {
  return apiRequest<null>(
    "/auth/logout",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
    { auth: true }
  );
}
