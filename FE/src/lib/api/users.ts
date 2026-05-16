import { apiRequest } from "./client";
import type { ApiUser } from "./types";

export function listUsers(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const query = params.toString();
  return apiRequest<ApiUser[]>(query ? `/users?${query}` : "/users", { method: "GET" }, { auth: true });
}
