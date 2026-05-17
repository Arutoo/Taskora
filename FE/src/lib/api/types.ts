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

export type ApiPaginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type ApiNotification = {
  id: string;
  user_id: string;
  type:
    | "invited"
    | "task_assigned"
    | "commented"
    | "replied"
    | "deadline_reminder"
    | "task_verified"
    | "status_changed";
  reference_id?: string | null;
  reference_type?: "task" | "workspace" | "comment" | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type ApiComment = {
  id: string;
  task_id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  user?: ApiUser;
  replies?: ApiComment[];
};

export type ApiCalendarTask = Pick<
  ApiTask,
  "id" | "title" | "start_date" | "deadline" | "status" | "priority" | "is_overdue"
>;

export type ApiContributionMember = {
  user_id: string;
  name: string;
  email: string;
  verified_tasks: number;
  percentage: number;
};

export type ApiContributionSummary = {
  members: ApiContributionMember[];
  total_verified: number;
};

export type ApiActivityLog = {
  id: string;
  workspace_id: string;
  user_id: string;
  action_type:
    | "task_created"
    | "status_changed"
    | "task_verified"
    | "member_joined"
    | "shortcut_added"
    | "comment_added";
  reference_id?: string | null;
  reference_type?: "task" | "workspace" | "comment" | null;
  created_at: string;
  user?: ApiUser;
};

export type ApiShortcut = {
  id: string;
  workspace_id: string;
  added_by: string;
  label: string;
  url: string;
  created_at: string;
  user?: ApiUser;
};
