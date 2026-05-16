import { clearStoredAuth, getStoredAccessToken, getStoredRefreshToken, readStoredAuth, writeStoredAuth } from "../auth-storage";

const RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
const API_BASE_URL = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, "")}/api/v1` : "/api/v1";

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

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  const stored = readStoredAuth();
  const refreshToken = getStoredRefreshToken();
  if (!stored || !refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        const payload = (await parseJson(response)) as ApiEnvelope<{ accessToken: string; refreshToken: string }> | null;
        if (!response.ok || !payload?.success || !payload.data) {
          clearStoredAuth();
          return null;
        }

        writeStoredAuth({
          ...stored,
          accessToken: payload.data.accessToken,
          refreshToken: payload.data.refreshToken,
        });
        return payload.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function sendRequest<T>(path: string, init: RequestInit | undefined, options: ApiRequestOptions | undefined, accessToken?: string | null) {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options?.auth) {
    const token = accessToken ?? getStoredAccessToken();
    if (!token) {
      throw new ApiError(401, "Missing access token");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = (await parseJson(response)) as ApiEnvelope<T> | null;
  return { response, payload };
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options?: ApiRequestOptions
): Promise<T> {
  let { response, payload } = await sendRequest<T>(path, init, options);

  if (response.status === 401 && options?.auth) {
    const refreshedAccessToken = await refreshAccessToken();
    if (refreshedAccessToken) {
      ({ response, payload } = await sendRequest<T>(path, init, options, refreshedAccessToken));
    }
  }

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
