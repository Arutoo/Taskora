import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, CheckCircle, MessageSquare, Pencil, Reply, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getTask, unverifyTask, updateTask, updateTaskStatus, verifyTask } from "../lib/api/tasks";
import type { ApiComment, ApiTask, ApiTaskPriority, ApiTaskStatus, ApiWorkspace } from "../lib/api/types";
import { formatDate, formatDueDate } from "../lib/date";
import { useAuth } from "../lib/use-auth";
import { getWorkspace } from "../lib/api/workspaces";
import { deleteComment, editComment, listComments, postComment } from "../lib/api/comments";

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
  const [editStartDate, setEditStartDate] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState("");
  const [commentActionId, setCommentActionId] = useState<string | null>(null);

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
        const commentData = await listComments(taskId);
        if (isActive) {
          setTask(taskData);
          setWorkspace(workspaceData);
          setComments(commentData);
          setCommentsError(null);
          setStatus(taskData.status);
          const member = workspaceData.members?.find((m) => m.user.id === user?.id);
          setIsLeader(member?.role === "leader");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load task";
        if (isActive) setError(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
          setCommentsLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, projectId, taskId, user?.id]);

  const refreshComments = async () => {
    if (!taskId) return;
    try {
      setCommentsLoading(true);
      setCommentsError(null);
      const nextComments = await listComments(taskId);
      setComments(nextComments);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load comments";
      setCommentsError(message);
    } finally {
      setCommentsLoading(false);
    }
  };

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

  const handleUnverifyTask = async () => {
    if (!projectId || !taskId || !isLeader || !task?.is_verified || isVerifying) return;
    const confirmed = window.confirm("Unverify this task and allow status updates again?");
    if (!confirmed) return;
    try {
      setIsVerifying(true);
      setVerifyError(null);
      await unverifyTask(projectId, taskId);
      const refreshed = await getTask(projectId, taskId);
      setTask(refreshed);
      setStatus(refreshed.status);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unverify task";
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
    setEditStartDate(task.start_date ? task.start_date.slice(0, 10) : "");
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

  const handleEditStartDateChange = (value: string) => {
    setEditStartDate(value);
    if (value && editDeadline && editDeadline < value) {
      setEditDeadline(value);
    }
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
    if (!editStartDate || !editDeadline) {
      setEditError("Start date and due date are required.");
      return;
    }
    if (editDeadline < editStartDate) {
      setEditError("Due date cannot be before the start date.");
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);
      const updated = await updateTask(projectId, taskId, {
        title,
        description: editDescription.trim(),
        priority: editPriority,
        start_date: new Date(editStartDate).toISOString(),
        deadline: new Date(editDeadline).toISOString(),
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

  const handlePostComment = async (parentId?: string) => {
    if (!taskId || commentActionId) return;
    const draft = parentId ? replyDrafts[parentId] ?? "" : commentDraft;
    const content = draft.trim();
    if (!content) {
      setCommentsError("Comment cannot be empty.");
      return;
    }

    try {
      setCommentActionId(parentId ?? "new");
      setCommentsError(null);
      await postComment(taskId, parentId ? { content, parent_id: parentId } : { content });
      if (parentId) {
        setReplyDrafts((current) => ({ ...current, [parentId]: "" }));
        setReplyingTo(null);
      } else {
        setCommentDraft("");
      }
      await refreshComments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to post comment";
      setCommentsError(message);
    } finally {
      setCommentActionId(null);
    }
  };

  const startEditingComment = (comment: ApiComment) => {
    setEditingCommentId(comment.id);
    setEditCommentDraft(comment.content);
    setCommentsError(null);
  };

  const handleEditComment = async (commentId: string) => {
    if (!taskId || commentActionId) return;
    const content = editCommentDraft.trim();
    if (!content) {
      setCommentsError("Comment cannot be empty.");
      return;
    }

    try {
      setCommentActionId(commentId);
      setCommentsError(null);
      await editComment(taskId, commentId, content);
      setEditingCommentId(null);
      setEditCommentDraft("");
      await refreshComments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to edit comment";
      setCommentsError(message);
    } finally {
      setCommentActionId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!taskId || commentActionId) return;
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    try {
      setCommentActionId(commentId);
      setCommentsError(null);
      await deleteComment(taskId, commentId);
      await refreshComments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete comment";
      setCommentsError(message);
    } finally {
      setCommentActionId(null);
    }
  };

  const renderComment = (comment: ApiComment, isReply = false) => {
    const canEdit = comment.user_id === user?.id;
    const canDelete = canEdit || isLeader;
    const isEditing = editingCommentId === comment.id;

    return (
      <div key={comment.id} className={isReply ? "commentItem reply" : "commentItem"}>
        <div className="avatarSquare">{comment.user?.name?.[0] ?? "?"}</div>
        <div className="commentBody">
          <div className="commentHeader">
            <div>
              <p className="commentAuthor">{comment.user?.name ?? "Unknown member"}</p>
              <p className="commentTime">{formatDate(comment.created_at)}</p>
            </div>
            <div className="commentActions">
              {!isReply ? (
                <button
                  className="ghostBtn iconOnlyBtn"
                  type="button"
                  title="Reply"
                  aria-label="Reply"
                  onClick={() => {
                    setReplyingTo(replyingTo === comment.id ? null : comment.id);
                    setCommentsError(null);
                  }}
                >
                  <Reply size={14} />
                </button>
              ) : null}
              {canEdit ? (
                <button
                  className="ghostBtn iconOnlyBtn"
                  type="button"
                  title="Edit"
                  aria-label="Edit comment"
                  onClick={() => startEditingComment(comment)}
                >
                  <Pencil size={14} />
                </button>
              ) : null}
              {canDelete ? (
                <button
                  className="ghostBtn iconOnlyBtn"
                  type="button"
                  title="Delete"
                  aria-label="Delete comment"
                  onClick={() => handleDeleteComment(comment.id)}
                  disabled={commentActionId === comment.id}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          </div>

          {isEditing ? (
            <div className="commentEditor">
              <textarea
                className="formInput formTextarea"
                rows={3}
                value={editCommentDraft}
                onChange={(event) => setEditCommentDraft(event.target.value)}
              />
              <div className="formActions">
                <button
                  className="ghostBtn"
                  type="button"
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditCommentDraft("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="primaryBtn"
                  type="button"
                  onClick={() => handleEditComment(comment.id)}
                  disabled={commentActionId === comment.id}
                >
                  {commentActionId === comment.id ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="commentText">{comment.content}</p>
          )}

          {!isReply && replyingTo === comment.id ? (
            <div className="replyComposer">
              <textarea
                className="formInput formTextarea"
                rows={3}
                placeholder="Write a reply"
                value={replyDrafts[comment.id] ?? ""}
                onChange={(event) =>
                  setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))
                }
              />
              <div className="formActions">
                <button
                  className="ghostBtn"
                  type="button"
                  onClick={() => setReplyingTo(null)}
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  className="primaryBtn"
                  type="button"
                  onClick={() => handlePostComment(comment.id)}
                  disabled={commentActionId === comment.id}
                >
                  {commentActionId === comment.id ? "Posting..." : "Reply"}
                </button>
              </div>
            </div>
          ) : null}

          {!isReply && comment.replies?.length ? (
            <div className="commentReplies">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          ) : null}
        </div>
      </div>
    );
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
                  {task.is_verified ? (
                    <button
                      className="ghostBtn"
                      type="button"
                      onClick={handleUnverifyTask}
                      disabled={isVerifying}
                    >
                      <RotateCcw size={16} />
                      {isVerifying ? "Unverifying..." : "Unverify"}
                    </button>
                  ) : null}
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
                <span className="detailMetaLabel">Start</span>
                <span className="detailMetaValue">{task.start_date ? formatDate(task.start_date) : "No start date"}</span>
              </div>

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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card cardPad4"
      >
        <div className="sectionHeaderRow">
          <div>
            <h2 className="sectionTitle">Comments</h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Thread updates, decisions, and one-level replies for this task.
            </p>
          </div>
          <MessageSquare size={18} className="muted" />
        </div>

        <div className="commentComposer">
          <textarea
            className="formInput formTextarea"
            rows={3}
            placeholder="Add a comment"
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
          />
          <div className="formActions">
            <button
              className="primaryBtn"
              type="button"
              onClick={() => handlePostComment()}
              disabled={commentActionId === "new"}
            >
              {commentActionId === "new" ? "Posting..." : "Post comment"}
            </button>
          </div>
        </div>

        {commentsError ? (
          <p className="emptyStateText errorText" style={{ margin: "12px 0 0" }}>{commentsError}</p>
        ) : null}

        <div className="commentList">
          {commentsLoading ? (
            <div className="skeletonStack" aria-label="Loading comments">
              <div className="skeletonLine" />
              <div className="skeletonLine" />
            </div>
          ) : comments.length === 0 ? (
            <div className="emptyState">
              <MessageSquare size={18} />
              <p className="emptyStateTitle">No comments yet</p>
              <p className="emptyStateText">Start the thread with the context the next teammate needs.</p>
            </div>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </div>
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
                  <span className="formLabel requiredLabel">Start date</span>
                  <span className="dateInputShell">
                    <input
                      className="formInput"
                      type="date"
                      required
                      value={editStartDate}
                      onChange={(event) => handleEditStartDateChange(event.target.value)}
                    />
                    <CalendarDays className="dateInputIcon" size={18} />
                  </span>
                </label>
                <label className="formField">
                  <span className="formLabel requiredLabel">Deadline</span>
                  <span className="dateInputShell">
                    <input
                      className="formInput"
                      type="date"
                      required
                      min={editStartDate || undefined}
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
