import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getWorkspace } from "../lib/api/workspaces";
import { listTasks } from "../lib/api/tasks";
import type { ApiTask, ApiTaskStatus, ApiWorkspace } from "../lib/api/types";
import { useAuth } from "../lib/use-auth";
import TaskRow from "../components/TaskRow";
import type { TaskRowItem } from "../components/TaskRow";
import { formatDueDate } from "../lib/date";

const FILTERS = ["All", "Not Started", "In Progress", "Completed"] as const;
type TaskFilter = (typeof FILTERS)[number];

export default function AssignedTasks() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TaskFilter>("All");
  const { isAuthenticated, user } = useAuth();
  const [workspace, setWorkspace] = useState<ApiWorkspace | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = useMemo<ApiTaskStatus | undefined>(() => {
    if (filter === "Not Started") return "todo";
    if (filter === "In Progress") return "in_progress";
    if (filter === "Completed") return "done";
    return undefined;
  }, [filter]);

  useEffect(() => {
    if (!isAuthenticated || !projectId) {
      setWorkspace(null);
      setTasks([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    let isActive = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [workspaceData, taskData] = await Promise.all([
          getWorkspace(projectId),
          listTasks(projectId, { status: statusFilter, assigneeId: user?.id }),
        ]);
        if (isActive) {
          setWorkspace(workspaceData);
          setTasks(taskData);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load workspace";
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
  }, [isAuthenticated, projectId, statusFilter, user?.id]);

  const taskRows = useMemo<TaskRowItem[]>(() => {
    const projectName = workspace?.name ?? "Workspace";
    return tasks.map((task) => {
      const assignee = task.assignees?.[0]?.user?.name ?? "Unassigned";
      const due = task.deadline ? formatDueDate(task.deadline) : null;
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: due ? due.text : "No deadline",
        dueUrgent: due ? due.urgent : false,
        project: projectName,
        assignee,
      };
    });
  }, [tasks, workspace?.name]);

  const workspaceName = workspace?.name ?? "this workspace";

  return (
    <div className="pageStack">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="pageTitle">Assigned Tasks</h1>
        <p className="pageSubtitle">Tasks for {workspaceName}</p>
      </motion.div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                borderRadius: 999,
                cursor: "pointer",
                border: active ? "1px solid color-mix(in srgb, var(--c-primary) 35%, transparent)" : "1px solid transparent",
                background: active
                  ? "color-mix(in srgb, var(--c-primary) 18%, transparent)"
                  : "var(--c-secondary)",
                color: active ? "var(--c-foreground)" : "var(--c-muted-foreground)",
                transition: "background 150ms ease, color 150ms ease, border-color 150ms ease",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card cardPad4">
        <div className="taskList">
          {isLoading ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center", margin: 0, fontSize: 14 }}>
              Loading workspace...
            </p>
          ) : error ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center", margin: 0, fontSize: 14 }}>
              {error}
            </p>
          ) : taskRows.length === 0 ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center", margin: 0, fontSize: 14 }}>
              No assigned tasks yet.
            </p>
          ) : (
            taskRows.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => navigate(`/project/${projectId}/tasks/${task.id}`)}
              />
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}