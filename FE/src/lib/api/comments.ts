import { apiRequest } from "./client";
import type { ApiComment } from "./types";

type CommentPayload = {
  content: string;
  parent_id?: string;
};

export function listComments(taskId: string) {
  return apiRequest<ApiComment[]>(`/tasks/${taskId}/comments`, { method: "GET" }, { auth: true });
}

export function postComment(taskId: string, payload: CommentPayload) {
  return apiRequest<ApiComment>(
    `/tasks/${taskId}/comments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { auth: true }
  );
}

export function editComment(taskId: string, commentId: string, content: string) {
  return apiRequest<ApiComment>(
    `/tasks/${taskId}/comments/${commentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    },
    { auth: true }
  );
}

export function deleteComment(taskId: string, commentId: string) {
  return apiRequest<null>(
    `/tasks/${taskId}/comments/${commentId}`,
    {
      method: "DELETE",
    },
    { auth: true }
  );
}
