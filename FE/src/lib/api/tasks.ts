import { apiRequest } from "./client";
import type { ApiTask, ApiTaskPriority, ApiTaskStatus } from "./types";

type ListTasksFilters = {
  status?: ApiTaskStatus;
  priority?: ApiTaskPriority;
  assigneeId?: string;
};

type CreateTaskPayload = {
  title: string;
  description?: string;
  priority: ApiTaskPriority;
  start_date?: string;
  deadline?: string;
  assigneeIds: string[];
};

type UpdateTaskPayload = {
  title?: string;
  description?: string;
  priority?: ApiTaskPriority;
  start_date?: string | null;
  deadline?: string | null;
  assigneeIds?: string[];
};

export function listTasks(workspaceId: string, filters: ListTasksFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);

  const query = params.toString();
  const path = query ? `/workspaces/${workspaceId}/tasks?${query}` : `/workspaces/${workspaceId}/tasks`;
  return apiRequest<ApiTask[]>(path, { method: "GET" }, { auth: true });
}

export function getTask(workspaceId: string, taskId: string) {
  return apiRequest<ApiTask>(`/workspaces/${workspaceId}/tasks/${taskId}`, { method: "GET" }, { auth: true });
}

export function createTask(workspaceId: string, payload: CreateTaskPayload) {
  return apiRequest<ApiTask>(
    `/workspaces/${workspaceId}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { auth: true }
  );
}

export function updateTask(workspaceId: string, taskId: string, payload: UpdateTaskPayload) {
  return apiRequest<ApiTask>(
    `/workspaces/${workspaceId}/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    { auth: true }
  );
}

export function updateTaskStatus(workspaceId: string, taskId: string, status: ApiTaskStatus) {
  return apiRequest<ApiTask>(
    `/workspaces/${workspaceId}/tasks/${taskId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    { auth: true }
  );
}

export function verifyTask(workspaceId: string, taskId: string) {
  return apiRequest<ApiTask>(
    `/workspaces/${workspaceId}/tasks/${taskId}/verify`,
    {
      method: "PATCH",
      body: JSON.stringify({}),
    },
    { auth: true }
  );
}

export function deleteTask(workspaceId: string, taskId: string) {
  return apiRequest<null>(
    `/workspaces/${workspaceId}/tasks/${taskId}`,
    {
      method: "DELETE",
    },
    { auth: true }
  );
}
