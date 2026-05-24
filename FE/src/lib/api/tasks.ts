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

const DATE_REQUIRED_MESSAGE = "Start date and due date are required.";
const DATE_ORDER_MESSAGE = "Due date cannot be before the start date.";
const DATE_PAST_MESSAGE = "Start date and due date cannot be before today.";

function dateOnlyTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.NaN;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function todayTimestamp() {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function validateTaskDates(startDate?: string | null, deadline?: string | null, rejectPast = false) {
  if (!startDate || !deadline) {
    throw new Error(DATE_REQUIRED_MESSAGE);
  }

  const start = dateOnlyTimestamp(startDate);
  const due = dateOnlyTimestamp(deadline);
  if (!Number.isFinite(start) || !Number.isFinite(due)) {
    throw new Error(DATE_REQUIRED_MESSAGE);
  }

  if (due < start) {
    throw new Error(DATE_ORDER_MESSAGE);
  }

  if (rejectPast && (start < todayTimestamp() || due < todayTimestamp())) {
    throw new Error(DATE_PAST_MESSAGE);
  }
}

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
  validateTaskDates(payload.start_date, payload.deadline, true);

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
  if ("start_date" in payload || "deadline" in payload) {
    validateTaskDates(payload.start_date, payload.deadline);
  }

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
