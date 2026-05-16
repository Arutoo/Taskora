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

      <div className="filterBar">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={active ? "filterChip active" : "filterChip"}
            >
              {f}
            </button>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card cardPad4">
        <div className="taskList">
          {isLoading ? (
            <div className="skeletonStack" aria-label="Loading assigned tasks">
              <div className="skeletonLine" />
              <div className="skeletonLine" />
              <div className="skeletonLine" />
            </div>
          ) : error ? (
            <div className="emptyState">
              <p className="emptyStateTitle">Could not load tasks</p>
              <p className="emptyStateText errorText">
              {error}
              </p>
            </div>
          ) : taskRows.length === 0 ? (
            <div className="emptyState">
              <p className="emptyStateTitle">No tasks match this view</p>
              <p className="emptyStateText">Assigned tasks will appear here as the workspace fills in.</p>
            </div>
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
