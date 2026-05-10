import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getTask, updateTaskStatus, verifyTask } from "../lib/api/tasks";
import type { ApiTask, ApiTaskStatus } from "../lib/api/types";
import { formatDate, formatDueDate } from "../lib/date";
import { useAuth } from "../lib/use-auth";
import { getWorkspace } from "../lib/api/workspaces";

export default function TaskPage() {
  const navigate = useNavigate();
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const { isAuthenticated, user } = useAuth();
  const [task, setTask] = useState<ApiTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ApiTaskStatus | "">("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !projectId || !taskId) {
      setTask(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [taskData, workspaceData] = await Promise.all([
          getTask(projectId, taskId),
          getWorkspace(projectId),
        ]);
        if (isActive) {
          setTask(taskData);
          setStatus(taskData.status);
          const member = workspaceData.members?.find((m) => m.user.id === user?.id);
          setIsLeader(member?.role === "leader");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load task";
        if (isActive) setError(message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, projectId, taskId, user?.id]);

  const dueText = useMemo(() => {
    if (!task || task.status === "done") return "Completed";
    if (!task.deadline) return "No deadline";
    return formatDueDate(task.deadline).text;
  }, [task]);

  const statusClass = useMemo(() => {
    if (!task) return "statusDot statusNotStarted";
    return task.status === "in_progress"
      ? "statusDot statusInProgress"
      : task.status === "done"
        ? "statusDot statusCompleted"
        : "statusDot statusNotStarted";
  }, [task]);

  const isAssignee = useMemo(() => {
    if (!task || !user) return false;
    return task.assignees?.some((assignee) => assignee.user.id === user.id) ?? false;
  }, [task, user]);

  const handleStatusUpdate = async () => {
    if (!projectId || !taskId || !status || isUpdating) return;
    try {
      setIsUpdating(true);
      setStatusError(null);
      await updateTaskStatus(projectId, taskId, status);
      const refreshed = await getTask(projectId, taskId);
      setTask(refreshed);
      setStatus(refreshed.status);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setStatusError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyTask = async () => {
    if (!projectId || !taskId || !isLeader || !task || isVerifying) return;
    if (task.status !== "done") {
      setVerifyError("Task must be marked completed by an assignee first.");
      return;
    }
    try {
      setIsVerifying(true);
      setVerifyError(null);
      await verifyTask(projectId, taskId);
      const refreshed = await getTask(projectId, taskId);
      setTask(refreshed);
      setStatus(refreshed.status);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify task";
      setVerifyError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="pageStack">
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--c-muted-foreground)",
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card cardPad6"
        style={{ paddingTop: 13 }}
      >
        {isLoading ? (
          <p className="muted" style={{ margin: 0 }}>Loading task...</p>
        ) : error ? (
          <p className="muted" style={{ margin: 0 }}>{error}</p>
        ) : task ? (
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={statusClass} />
                <span style={{ fontSize: 16, color: "var(--c-muted-foreground)" }}>
                  {task.status === "done" ? "Completed" : task.status.replace("_", " ")}
                </span>
                {task.is_overdue && task.status !== "done" ? (
                  <span className="statusOverdue">Overdue</span>
                ) : null}
              </div>
              {isLeader ? (
                <button
                  className="primaryBtn"
                  type="button"
                  onClick={handleVerifyTask}
                  disabled={isVerifying || task.is_verified || task.status !== "done"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <CheckCircle size={16} />
                  {task.is_verified ? "Verified" : isVerifying ? "Verifying..." : "Mark complete"}
                </button>
              ) : null}
            </div>

            <div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>{task.title}</h1>
              {task.description ? (
                <p className="muted" style={{ margin: "8px 0 0" }}>{task.description}</p>
              ) : null}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, color: "var(--c-muted-foreground)" }}>Status</span>
                <select
                  className="formInput"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ApiTaskStatus)}
                  disabled={!isAssignee}
                >
                  <option value="todo">Not started</option>
                  <option value="in_progress">In progress</option>
                  {isAssignee || task.status === "done" ? <option value="done">Completed</option> : null}
                </select>
                <button
                  className="ghostBtn"
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={!isAssignee || isUpdating || status === task.status}
                >
                  {isUpdating ? "Saving..." : "Save"}
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, color: "var(--c-muted-foreground)" }}>Assigned to</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>
                  {task.assignees?.[0]?.user?.name ?? "Unassigned"}
                </span>
              </div>

              {task.status === "done" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Completed</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, color: "var(--c-muted-foreground)" }}>Due</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{dueText}</span>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, color: "var(--c-muted-foreground)" }}>Created</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{formatDate(task.created_at)}</span>
              </div>
            </div>

            {!isAssignee ? (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Only assignees can update status.
              </p>
            ) : null}
            {statusError ? (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                {statusError}
              </p>
            ) : null}
            {isLeader && task.status !== "done" ? (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Waiting for assignee to mark completed.
              </p>
            ) : null}
            {verifyError ? (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                {verifyError}
              </p>
            ) : null}

            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--c-muted-foreground)" }}>
                Assignees
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {(task.assignees ?? []).length === 0 ? (
                  <span className="muted">Unassigned</span>
                ) : (
                  task.assignees?.map((assignee) => (
                    <span key={assignee.id} className="memberChip">
                      {assignee.user.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Task not found.</p>
        )}
      </motion.div>
    </div>
  );
}