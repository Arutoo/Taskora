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
