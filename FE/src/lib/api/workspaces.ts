import { ApiError, apiRequest } from "./client";
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

export async function inviteToWorkspace(workspaceId: string, email: string) {
  const rawEmail = email.trim();
  const normalizedEmail = rawEmail.toLowerCase();
  const sendInvite = (targetEmail: string) =>
    apiRequest<{ message: string; userId: string }>(
      `/workspaces/${workspaceId}/invite`,
      {
        method: "POST",
        body: JSON.stringify({ email: targetEmail }),
      },
      { auth: true }
    );

  try {
    return await sendInvite(normalizedEmail);
  } catch (err) {
    if (rawEmail !== normalizedEmail && err instanceof ApiError && err.status === 404) {
      return sendInvite(rawEmail);
    }
    throw err;
  }
}

export function createInviteLink(workspaceId: string) {
  return apiRequest<{ inviteToken: string }>(
    `/workspaces/${workspaceId}/invite`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    { auth: true }
  );
}

export function joinWorkspace(workspaceId: string, token: string) {
  return apiRequest<ApiWorkspace>(
    `/workspaces/${workspaceId}/join`,
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
    { auth: true }
  );
}

export function joinWorkspaceWithToken(token: string) {
  return joinWorkspace("invite", token);
}

export function archiveWorkspace(workspaceId: string) {
  return apiRequest<ApiWorkspace>(
    `/workspaces/${workspaceId}`,
    {
      method: "DELETE",
    },
    { auth: true }
  );
}

export function removeMember(workspaceId: string, userId: string) {
  return apiRequest<null>(
    `/workspaces/${workspaceId}/members/${userId}`,
    {
      method: "DELETE",
    },
    { auth: true }
  );
}
