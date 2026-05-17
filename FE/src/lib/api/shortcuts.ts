import { apiRequest } from "./client";
import type { ApiShortcut } from "./types";

type CreateShortcutPayload = {
  label: string;
  url: string;
};

export function listShortcuts(workspaceId: string) {
  return apiRequest<ApiShortcut[]>(
    `/workspaces/${workspaceId}/shortcuts`,
    { method: "GET" },
    { auth: true }
  );
}

export function createShortcut(workspaceId: string, payload: CreateShortcutPayload) {
  return apiRequest<ApiShortcut>(
    `/workspaces/${workspaceId}/shortcuts`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { auth: true }
  );
}

export function deleteShortcut(workspaceId: string, shortcutId: string) {
  return apiRequest<null>(
    `/workspaces/${workspaceId}/shortcuts/${shortcutId}`,
    { method: "DELETE" },
    { auth: true }
  );
}
