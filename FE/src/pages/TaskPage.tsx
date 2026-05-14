import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, CheckCircle, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getTask, updateTask, updateTaskStatus, verifyTask } from "../lib/api/tasks";
import type { ApiTask, ApiTaskPriority, ApiTaskStatus, ApiWorkspace } from "../lib/api/types";
import { formatDate, formatDueDate } from "../lib/date";
import { useAuth } from "../lib/use-auth";
import { getWorkspace } from "../lib/api/workspaces";

export default function TaskPage() {
  const navigate = useNavigate();
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const { isAuthenticated, user } = useAuth();
  const [task, setTask] = useState<ApiTask | null>(null);
  const [workspace, setWorkspace] = useState<ApiWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ApiTaskStatus | "">("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<ApiTaskPriority>("medium");
  const [editDeadline, setEditDeadline] = useState("");
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
          setWorkspace(workspaceData);
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
    if (!projectId || !taskId || !status || isUpdating || task?.is_verified) return;
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

  const openEditModal = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setEditDeadline(task.deadline ? task.deadline.slice(0, 10) : "");
    setEditAssigneeIds((task.assignees ?? []).map((assignee) => assignee.user.id));
    setEditError(null);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setIsEditOpen(false);
  };

  const toggleEditAssignee = (memberId: string) => {
    setEditAssigneeIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  };

  const handleSaveEdit = async () => {
    if (!projectId || !taskId || !task || isSavingEdit) return;
    const title = editTitle.trim();
    if (!title) {
      setEditError("Task title is required.");
      return;
    }
    if (editAssigneeIds.length === 0) {
      setEditError("Select at least one assignee.");
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);
      const updated = await updateTask(projectId, taskId, {
        title,
        description: editDescription.trim(),
        priority: editPriority,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
        assigneeIds: editAssigneeIds,
      });
      setTask(updated);
      setStatus(updated.status);
      setIsEditOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update task";
      setEditError(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="pageStack">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="linkButton"
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
          <div className="skeletonStack">
            <div className="skeletonLine" />
            <div className="skeletonBlock" />
          </div>
        ) : error ? (
          <div className="emptyState">
            <p className="emptyStateTitle">Could not load task</p>
            <p className="emptyStateText errorText">{error}</p>
          </div>
        ) : task ? (
          <div className="taskDetailGrid">
            <div className="taskHeroRow">
              <div className="taskStatusLine">
                <span className={statusClass} />
                <span style={{ fontSize: 16, color: "var(--c-muted-foreground)" }}>
                  {task.status === "done" ? "Completed" : task.status.replace("_", " ")}
                </span>
                {task.is_overdue && task.status !== "done" ? (
                  <span className="statusOverdue">Overdue</span>
                ) : null}
              </div>
              {isLeader ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    className="ghostBtn"
                    type="button"
                    onClick={openEditModal}
                  >
                    <Pencil size={16} />
                    Edit task
                  </button>
                  <button
                    className="primaryBtn"
                    type="button"
                    onClick={handleVerifyTask}
                    disabled={isVerifying || task.is_verified || task.status !== "done"}
                  >
                    <CheckCircle size={16} />
                    {task.is_verified ? "Verified" : isVerifying ? "Verifying..." : "Mark complete"}
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <h1 className="taskDetailTitle">{task.title}</h1>
              {task.description ? (
                <p className="muted" style={{ margin: "8px 0 0" }}>{task.description}</p>
              ) : null}
            </div>

            <div className="inlineFormRow">
              <label className="formField" style={{ margin: 0 }}>
                <span className="formLabel">Status</span>
                <select
                  className="formInput"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ApiTaskStatus)}
                  disabled={!isAssignee || task.is_verified}
                >
                  <option value="todo">Not started</option>
                  <option value="in_progress">In progress</option>
                  {isAssignee || task.status === "done" ? <option value="done">Completed</option> : null}
                </select>
              </label>
                <button
                  className="ghostBtn"
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={!isAssignee || isUpdating || status === task.status || task.is_verified}
                >
                  {isUpdating ? "Saving..." : "Save"}
                </button>
            </div>

            <div className="detailMetaGrid">
              <div className="detailMetaItem">
                <span className="detailMetaLabel">Assigned to</span>
                <span className="detailMetaValue">
                  {task.assignees?.[0]?.user?.name ?? "Unassigned"}
                </span>
              </div>

              {task.status === "done" ? (
                <div className="detailMetaItem">
                  <span className="detailMetaLabel">Progress</span>
                  <span className="detailMetaValue">Completed</span>
                </div>
              ) : (
                <div className="detailMetaItem">
                  <span className="detailMetaLabel">Due</span>
                  <span className="detailMetaValue">{dueText}</span>
                </div>
              )}

              <div className="detailMetaItem">
                <span className="detailMetaLabel">Created</span>
                <span className="detailMetaValue">{formatDate(task.created_at)}</span>
              </div>
            </div>

            {!isAssignee ? (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Only assignees can update status.
              </p>
            ) : null}
            {task.is_verified ? (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                This task has been verified and its status is locked.
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
      {isLeader && task && isEditOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="modalOverlay"
          onClick={closeEditModal}
        >
          <div className="card cardPad4 modalDialog" onClick={(event) => event.stopPropagation()}>
            <div className="sectionHeaderRow">
              <h3 className="sectionTitle">Edit task</h3>
              <button className="ghostBtn" type="button" onClick={closeEditModal} disabled={isSavingEdit}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label className="formField">
                <span className="formLabel">Title</span>
                <input
                  className="formInput"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                />
              </label>
              <label className="formField">
                <span className="formLabel">Description</span>
                <textarea
                  className="formInput formTextarea"
                  rows={3}
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <label className="formField">
                  <span className="formLabel">Priority</span>
                  <select
                    className="formInput"
                    value={editPriority}
                    onChange={(event) => setEditPriority(event.target.value as ApiTaskPriority)}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label className="formField">
                  <span className="formLabel">Deadline</span>
                  <span className="dateInputShell">
                    <input
                      className="formInput"
                      type="date"
                      value={editDeadline}
                      onChange={(event) => setEditDeadline(event.target.value)}
                    />
                    <CalendarDays className="dateInputIcon" size={18} />
                  </span>
                </label>
              </div>
              <div>
                <div className="formLabel" style={{ marginBottom: 6 }}>Assign to</div>
                <div className="assigneeGrid">
                  {(workspace?.members ?? []).map((member) => (
                    <label key={member.id} className="assigneeOption">
                      <input
                        type="checkbox"
                        checked={editAssigneeIds.includes(member.user.id)}
                        onChange={() => toggleEditAssignee(member.user.id)}
                      />
                      {member.user.name}
                    </label>
                  ))}
                </div>
              </div>
              {editError ? <p className="emptyStateText errorText" style={{ margin: 0 }}>{editError}</p> : null}
              <div className="formActions">
                <button className="ghostBtn" type="button" onClick={closeEditModal} disabled={isSavingEdit}>
                  Cancel
                </button>
                <button className="primaryBtn" type="button" onClick={handleSaveEdit} disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
