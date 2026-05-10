export type ApiUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  name: string;
  email: string;
  password: string;
};

export type ApiWorkspaceMember = {
  id: string;
  role: "leader" | "member";
  user: ApiUser;
};

export type ApiWorkspace = {
  id: string;
  name: string;
  description?: string | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  creator?: ApiUser;
  members?: ApiWorkspaceMember[];
};

export type ApiTaskStatus = "todo" | "in_progress" | "done";
export type ApiTaskPriority = "high" | "medium" | "low";

export type ApiTaskAssignee = {
  id: string;
  user: ApiUser;
};

export type ApiTask = {
  id: string;
  workspace_id: string;
  title: string;
  description?: string | null;
  priority: ApiTaskPriority;
  status: ApiTaskStatus;
  is_verified: boolean;
  is_overdue: boolean;
  start_date?: string | null;
  deadline?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: ApiUser;
  assignees?: ApiTaskAssignee[];
};
