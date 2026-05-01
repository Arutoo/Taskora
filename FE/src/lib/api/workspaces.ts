import { apiRequest } from "./client";
import type { ApiWorkspace } from "./types";

type CreateWorkspacePayload = {
  name: string;
  description?: string;
};

export function listWorkspaces() {
  return apiRequest<ApiWorkspace[]>("/workspaces", { method: "GET" }, { auth: true });
}

export function getWorkspace(id: string) {
  return apiRequest<ApiWorkspace>(`/workspaces/${id}`, { method: "GET" }, { auth: true });
}

export function createWorkspace(payload: CreateWorkspacePayload) {
  return apiRequest<ApiWorkspace>(
    "/workspaces",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { auth: true }
  );
}

export function inviteToWorkspace(workspaceId: string, email: string) {
  return apiRequest<{ message: string; userId: string }>(
    `/workspaces/${workspaceId}/invite`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    { auth: true }
  );
}
