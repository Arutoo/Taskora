import { motion } from "framer-motion";
import { Bell, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import CalendarWidget from "../components/CalendarWidget";
import ProjectCard from "../components/ProjectCard";
import { listWorkspaces } from "../lib/api/workspaces";
import { listTasks } from "../lib/api/tasks";
import type { ApiTask, ApiWorkspace } from "../lib/api/types";
import { useAuth } from "../lib/use-auth";
import TaskRow from "../components/TaskRow";
import type { TaskRowItem } from "../components/TaskRow";
import { formatDueDate } from "../lib/date";
import {
  clearUnreadCount,
  readStoredNotifications,
  readUnreadCount,
} from "../lib/notifications-storage";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(readUnreadCount());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(
    readStoredNotifications()
  );
  const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await listWorkspaces();
        if (!isActive) return;
        const activeWorkspaces = data.filter((workspace) => !workspace.is_archived);
        setWorkspaces(activeWorkspaces);

        if (activeWorkspaces.length === 0) {
          setTasks([]);
          setTaskError(null);
          return;
        }

        const results = await Promise.allSettled(
          activeWorkspaces.map((workspace) =>
            user?.id ? listTasks(workspace.id, { assigneeId: user.id }) : listTasks(workspace.id)
          )
        );
        if (!isActive) return;
        const collected = results
          .filter((result): result is PromiseFulfilledResult<ApiTask[]> => result.status === "fulfilled")
          .flatMap((result) => result.value);
        setTasks(collected);

        const failed = results.some((result) => result.status === "rejected");
        setTaskError(failed ? "Some tasks could not be loaded." : null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load workspaces";
        if (isActive) {
          setError(message);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const custom = event as CustomEvent<{ list?: typeof notifications; unread?: number }>;
      if (custom.detail?.list) {
        setNotifications(custom.detail.list);
      } else {
        setNotifications(readStoredNotifications());
      }
      if (typeof custom.detail?.unread === "number") {
        setNotificationCount(custom.detail.unread);
      } else {
        setNotificationCount(readUnreadCount());
      }
      setNotificationError(null);
    };

    window.addEventListener("taskora:notification", handleNotification);
    return () => {
      window.removeEventListener("taskora:notification", handleNotification);
    };
  }, []);

  useEffect(() => {
    if (!showNotifications) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifications]);

  const workspaceNameById = useMemo(() => {
    const map = new Map<string, string>();
    workspaces.forEach((workspace) => map.set(workspace.id, workspace.name));
    return map;
  }, [workspaces]);

  const taskRows = useMemo<TaskRowItem[]>(() => {
    const assigned = user
      ? tasks.filter((task) => task.assignees?.some((a) => a.user.id === user.id))
      : [];
    const sorted = [...assigned].sort((a, b) => {
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

    return sorted
      .filter((task) => task.status !== "done")
      .map((task) => {
      const projectName = workspaceNameById.get(task.workspace_id) ?? "Workspace";
      const assigneeNames = task.assignees?.map((entry) => entry.user.name).filter(Boolean) ?? [];
      const assignee = assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned";
      const due = task.deadline ? formatDueDate(task.deadline) : null;
      return {
        id: task.id,
        title: task.title,
        status: task.status,
          dueDate: due ? due.text : "No deadline",
          dueUrgent: task.is_overdue,
          hasDeadline: Boolean(task.deadline),
        project: projectName,
        assignee,
        workspaceId: task.workspace_id,
      };
    });
  }, [tasks, user, workspaceNameById]);

  const calendarDeadlines = useMemo(() => {
    return tasks
      .filter((task) => Boolean(task.deadline) && task.status !== "done")
      .map((task) => ({
        date: new Date(task.deadline as string).getDate(),
        color: "#66aaff",
        overdue: task.is_overdue,
      }));
  }, [tasks]);

  const stats = useMemo(() => {
    if (!user) return { completed: 0, inProgress: 0, notStarted: 0 };
    const assigned = tasks.filter((task) => task.assignees?.some((a) => a.user.id === user.id));
    return {
      completed: assigned.filter((task) => task.status === "done").length,
      inProgress: assigned.filter((task) => task.status === "in_progress").length,
      notStarted: assigned.filter((task) => task.status === "todo").length,
    };
  }, [tasks, user]);

  return (
    <div className="pageStack">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rowBetween">
        <div>
          <h1 className="pageTitle">My Dashboard</h1>
          <p className="pageSubtitle">Welcome back! Here's what needs your attention.</p>
        </div>

        <button
          className="iconBtn"
          type="button"
          aria-label="Notifications"
          onClick={() => {
            setShowNotifications((prev) => !prev);
            setNotificationCount(0);
            clearUnreadCount();
          }}
        >
          <Bell size={20} />
          {notificationCount > 0 ? (
            <span className="badgeDot" aria-label={`${notificationCount} new notifications`} />
          ) : null}
        </button>
      </motion.div>
      {showNotifications ? (
        <div
          className="notificationOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          onClick={() => setShowNotifications(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="notificationModal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notificationHeader">
              <div>
                <p className="notificationKicker">Notifications</p>
                <p className="notificationTitle">Activity feed</p>
              </div>
              <button
                className="ghostBtn"
                type="button"
                onClick={() => setShowNotifications(false)}
              >
                Close
              </button>
            </div>

            {notificationError ? (
              <div className="notificationEmpty">
                <p className="muted" style={{ margin: 0 }}>{notificationError}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notificationEmpty">
                <p className="muted" style={{ margin: 0 }}>No notifications yet.</p>
              </div>
            ) : (
              <div className="notificationList">
                {notifications.map((note, index) => (
                  <div key={note.id ?? `${note.message}-${index}`} className="notificationItem">
                    <div className="notificationIcon">
                      {(note.message?.trim().charAt(0).toUpperCase() || "N")}
                    </div>
                    <div>
                      <p className="notificationMessage">{note.message}</p>
                      {note.created_at ? (
                        <p className="notificationTime">{new Date(note.created_at).toLocaleString()}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      ) : null}

      <div className="grid3">
        <div className="col gap6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card cardPad4"
          >
            <h2 className="sectionTitle">Upcoming Tasks</h2>
            <div className="taskList">
              {isLoading ? (
                <div className="skeletonStack" aria-label="Loading tasks">
                  <div className="skeletonLine" />
                  <div className="skeletonLine" />
                  <div className="skeletonLine" />
                </div>
              ) : taskRows.length === 0 ? (
                <div className="emptyState">
                  <Sparkles size={18} />
                  <p className="emptyStateTitle">{taskError ? "Task loading issue" : "No urgent tasks"}</p>
                  <p className={taskError ? "emptyStateText errorText" : "emptyStateText"}>
                    {taskError ?? "You are clear for now. New assigned work will appear here."}
                  </p>
                </div>
              ) : (
                taskRows.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onClick={() =>
                      navigate(`/project/${task.workspaceId ?? ""}/tasks/${task.id}`)
                    }
                  />
                ))
              )}
            </div>
          </motion.div>

          <div>
            <div className="sectionHeaderRow">
              <h2 className="sectionTitle">Projects</h2>
              <button
                className="sectionActionBtn"
                type="button"
                onClick={() => navigate("/project/new")}
                aria-label="Create project"
              >
                <Plus size={14} />
                Create
              </button>
            </div>
            <div className="gridProjects">
              {isLoading ? (
                <>
                  <div className="skeletonBlock" />
                  <div className="skeletonBlock" />
                </>
              ) : workspaces.map((workspace, i) => (
                <ProjectCard key={workspace.id} project={workspace} index={i} />
              ))}
            </div>
            {!isLoading && workspaces.length === 0 && !error ? (
              <div className="emptyState" style={{ marginTop: 12 }}>
                <p className="emptyStateTitle">Start with a project</p>
                <p className="emptyStateText">Create a workspace, invite teammates, and turn loose work into tracked tasks.</p>
              </div>
            ) : null}
            {error ? (
              <p className="muted" style={{ marginTop: 12 }}>
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="col gap6">
          <CalendarWidget deadlines={calendarDeadlines} />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card cardPad4"
          >
            <h3 className="sectionTitle">Your Stats</h3>

            <div className="statsGrid">
              <div className="statCard">
                <p className="font-mono statValue" style={{ color: "var(--c-primary)" }}>
                  {stats.completed}
                </p>
                <p className="statLabel">
                  Completed
                </p>
              </div>

              <div className="statCard">
                <p className="font-mono statValue" style={{ color: "var(--c-warning)" }}>
                  {stats.inProgress}
                </p>
                <p className="statLabel">
                  In Progress
                </p>
              </div>

              <div className="statCard">
                <p
                  className="font-mono statValue"
                  style={{ color: "var(--c-destructive)" }}
                >
                  {stats.notStarted}
                </p>
                <p className="statLabel">
                  Not Started
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
