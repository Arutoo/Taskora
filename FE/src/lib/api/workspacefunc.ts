import { apiRequest } from "./client";
import type {
  ApiActivityLog,
  ApiCalendarTask,
  ApiContributionSummary,
  ApiPaginated,
} from "./types";

export function getWorkspaceCalendar(workspaceId: string) {
  return apiRequest<ApiCalendarTask[]>(
    `/workspaces/${workspaceId}/calendar`,
    { method: "GET" },
    { auth: true }
  );
}

export function getWorkspaceContributions(workspaceId: string) {
  return apiRequest<ApiContributionSummary>(
    `/workspaces/${workspaceId}/contributions`,
    { method: "GET" },
    { auth: true }
  );
}

export function listWorkspaceActivity(workspaceId: string, page = 1, limit = 12) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiRequest<ApiPaginated<ApiActivityLog>>(
    `/workspaces/${workspaceId}/activity?${params.toString()}`,
    { method: "GET" },
    { auth: true }
  );
}
