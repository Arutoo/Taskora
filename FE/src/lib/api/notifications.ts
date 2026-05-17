import { apiRequest } from "./client";
import type { ApiNotification, ApiPaginated } from "./types";

export function listNotifications(page = 1, limit = 8) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiRequest<ApiPaginated<ApiNotification>>(
    `/notifications?${params.toString()}`,
    { method: "GET" },
    { auth: true }
  );
}

export function markNotificationRead(notificationId: string) {
  return apiRequest<null>(
    `/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      body: JSON.stringify({}),
    },
    { auth: true }
  );
}

export function markAllNotificationsRead() {
  return apiRequest<null>(
    "/notifications/read-all",
    {
      method: "PATCH",
      body: JSON.stringify({}),
    },
    { auth: true }
  );
}
