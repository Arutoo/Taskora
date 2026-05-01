import { getStoredAccessToken } from "../auth-storage";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  message: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

type ApiRequestOptions = {
  auth?: boolean;
};

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options?: ApiRequestOptions
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options?.auth) {
    const accessToken = getStoredAccessToken();
    if (!accessToken) {
      throw new ApiError(401, "Missing access token");
    }
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = (await parseJson(response)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    const message = payload?.message ?? "Request failed";
    throw new ApiError(response.status, message);
  }

  if (!payload) {
    return null as T;
  }

  if (!payload.success) {
    throw new ApiError(response.status, payload.message ?? "Request failed");
  }

  return payload.data as T;
}
