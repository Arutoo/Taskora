export type ProjectMemberRole = "leader" | "member";

export type TaskStatus = "in_progress" | "completed" | "not_started";

export type ResourceType = "docs" | "gdrive" | "canva" | "other";

export type ProjectMember = {
  id: string;
  name: string;
  role: ProjectMemberRole;
  tasksInProgress: number;
  tasksCompleted: number;
  tasksNotStarted: number;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  completedTasks: number;
  taskCount: number;
  members: ProjectMember[];
};

export type TaskComment = {
  id: string;
  author: string;
  text: string;
  timestamp: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  project: string;
  projectColor: string;
  status: TaskStatus;
  assignee: string;
  dueDate: string;
  verified: boolean;
  comments: TaskComment[];
};

export type Resource = {
  id: string;
  type: ResourceType;
  name: string;
  url: string;
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "Software Engineering",
    color: "#2dd4bf",
    completedTasks: 3,
    taskCount: 6,
    members: [
      {
        id: "m1",
        name: "Sarah",
        role: "leader",
        tasksInProgress: 1,
        tasksCompleted: 2,
        tasksNotStarted: 0,
      },
      {
        id: "m2",
        name: "John",
        role: "member",
        tasksInProgress: 0,
        tasksCompleted: 1,
        tasksNotStarted: 1,
      },
    ],
  },
  {
    id: "2",
    name: "Cloud Infrastructure",
    color: "#8b5cf6",
    completedTasks: 0,
    taskCount: 3,
    members: [
      {
        id: "m3",
        name: "Emma",
        role: "leader",
        tasksInProgress: 1,
        tasksCompleted: 0,
        tasksNotStarted: 1,
      },
    ],
  },
];

export const MOCK_TASKS: Task[] = [
  {
    id: "t1",
    title: "Design API endpoints",
    description: "Draft initial REST endpoints and share with the team.",
    project: "Software Engineering",
    projectColor: "#2dd4bf",
    status: "in_progress",
    assignee: "Sarah",
    dueDate: "2026-04-03",
    verified: false,
    comments: [
      { id: "c1", author: "John", text: "Looks good—consider pagination.", timestamp: "1d ago" },
    ],
  },
  {
    id: "t2",
    title: "Set up CI/CD",
    description: "Configure pipeline for lint/test/build.",
    project: "Software Engineering",
    projectColor: "#2dd4bf",
    status: "completed",
    assignee: "John",
    dueDate: "2026-04-01",
    verified: false,
    comments: [],
  },
  {
    id: "t3",
    title: "Kubernetes autoscaling research",
    description: "Collect best practices for HPA configuration.",
    project: "Cloud Infrastructure",
    projectColor: "#8b5cf6",
    status: "not_started",
    assignee: "Emma",
    dueDate: "2026-04-08",
    verified: false,
    comments: [],
  },
];

export const MOCK_RESOURCES: Resource[] = [
  { id: "r1", type: "docs", name: "Project Specs", url: "https://example.com" },
  { id: "r2", type: "gdrive", name: "Shared Drive", url: "https://example.com" },
  { id: "r3", type: "other", name: "Reference Links", url: "https://example.com" },
];
