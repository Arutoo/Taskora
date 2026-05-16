import { useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import CalendarWidget from "../components/CalendarWidget";
import { archiveWorkspace, createInviteLink, getWorkspace, inviteToWorkspace, removeMember } from "../lib/api/workspaces";
import { createTask, deleteTask, listTasks } from "../lib/api/tasks";
import type { ApiTask, ApiWorkspace } from "../lib/api/types";
import { useAuth } from "../lib/use-auth";
import TaskRow from "../components/TaskRow";
import type { TaskRowItem } from "../components/TaskRow";
import { formatDueDate } from "../lib/date";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Sparkles } from "lucide-react";
import { ApiError } from "../lib/api/client";

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [workspace, setWorkspace] = useState<ApiWorkspace | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);
  const [isGeneratingInviteToken, setIsGeneratingInviteToken] = useState(false);
  const [inviteTokenError, setInviteTokenError] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !id) {
      setWorkspace(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    let isActive = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [workspaceData, taskData] = await Promise.all([getWorkspace(id), listTasks(id)]);
        if (isActive) {
          setWorkspace(workspaceData);
          setTasks(taskData);
          const state = location.state as { inviteToken?: string; inviteWarning?: string } | null;
          setInviteToken(state?.inviteToken ?? null);
          setInviteWarning(state?.inviteWarning ?? null);
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
  }, [id, isAuthenticated, location.state]);

  const deadlines = useMemo(() => {
    return tasks
      .filter((task) => Boolean(task.deadline) && task.status !== "done")
      .map((task) => ({
        date: new Date(task.deadline as string).getDate(),
        color: "#66aaff",
        overdue: task.is_overdue,
      }));
  }, [tasks]);

  const memberStats = useMemo(() => {
    const stats = new Map<string, { inProgress: number; completed: number; notStarted: number }>();
    (workspace?.members ?? []).forEach((member) => {
      stats.set(member.user.id, { inProgress: 0, completed: 0, notStarted: 0 });
    });

    tasks.forEach((task) => {
      const statusKey =
        task.status === "in_progress" ? "inProgress" : task.status === "done" ? "completed" : "notStarted";
      (task.assignees ?? []).forEach((assignee) => {
        const record = stats.get(assignee.user.id);
        if (record) record[statusKey] += 1;
      });
    });

    return stats;
  }, [tasks, workspace?.members]);

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

  const currentMember = workspace?.members?.find((member) => member.user.id === user?.id);
  const isLeader = currentMember?.role === "leader";

  const handleDeleteProject = async () => {
    if (!id || !isLeader || isDeleting) return;
    const confirmed = window.confirm("Archive this project? Members will no longer see it.");
    if (!confirmed) return;
    try {
      setIsDeleting(true);
      await archiveWorkspace(id);
      window.location.assign("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to archive project";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddMember = async () => {
    if (!id || !isLeader || isUpdatingMembers) return;
    const email = memberEmail.trim().toLowerCase();
    if (!email) return;
    try {
      setIsUpdatingMembers(true);
      setMemberError(null);
      await inviteToWorkspace(id, email);
      const workspaceData = await getWorkspace(id);
      setWorkspace(workspaceData);
      setMemberEmail("");
    } catch (err) {
      const message = err instanceof ApiError && err.status === 404
        ? "Account doesn't exist"
        : err instanceof Error ? err.message : "Failed to add member";
      setMemberError(message);
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!id || !isLeader || isUpdatingMembers) return;
    if (memberId === user?.id) return;
    const confirmed = window.confirm("Remove this member from the project?");
    if (!confirmed) return;
    try {
      setIsUpdatingMembers(true);
      setMemberError(null);
      await removeMember(id, memberId);
      const workspaceData = await getWorkspace(id);
      setWorkspace(workspaceData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove member";
      setMemberError(message);
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  const handleAssigneeChange = (memberId: string) => {
    setAssigneeIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  };

  const handleCreateTask = async () => {
    if (!id || !isLeader || isCreatingTask) return;
    const title = taskTitle.trim();
    if (!title) {
      setTaskError("Task title is required.");
      return;
    }
    if (assigneeIds.length === 0) {
      setTaskError("Select at least one assignee.");
      return;
    }

    try {
      setIsCreatingTask(true);
      setTaskError(null);

      await createTask(id, {
        title,
        description: taskDescription.trim() ? taskDescription.trim() : undefined,
        priority: taskPriority,
        deadline: taskDeadline ? new Date(taskDeadline).toISOString() : undefined,
        assigneeIds,
      });

      const taskData = await listTasks(id);
      setTasks(taskData);
      setTaskTitle("");
      setTaskDescription("");
      setTaskDeadline("");
      setAssigneeIds([]);
      setIsTaskModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setTaskError(message);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const openTaskModal = () => {
    setTaskError(null);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    if (isCreatingTask) return;
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!id || !isLeader || deletingTaskId) return;
    const confirmed = window.confirm("Delete this task? This cannot be undone.");
    if (!confirmed) return;
    try {
      setDeletingTaskId(taskId);
      await deleteTask(id, taskId);
      const taskData = await listTasks(id);
      setTasks(taskData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      setTaskError(message);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleGenerateInviteToken = async () => {
    if (!id || !isLeader || isGeneratingInviteToken) return;
    try {
      setIsGeneratingInviteToken(true);
      setInviteTokenError(null);
      const result = await createInviteLink(id);
      setInviteToken(result.inviteToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate invite token";
      setInviteTokenError(message);
    } finally {
      setIsGeneratingInviteToken(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteToken) return;
    try {
      await navigator.clipboard.writeText(inviteToken);
      setInviteTokenError(null);
    } catch {
      setInviteTokenError("Failed to copy token. Please copy it manually.");
    }
  };

  if (isLoading) {
    return (
      <div className="pageStack">
        <div className="skeletonStack">
          <div className="skeletonBlock" />
          <div className="skeletonLine" />
          <div className="skeletonLine" />
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="pageStack">
        <div className="emptyState">
          <p className="emptyStateTitle">Workspace unavailable</p>
          <p className="emptyStateText errorText">{error ?? "Workspace not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pageStack">
      {inviteWarning ? (
        <div className="card" style={{ padding: 16 }}>
          <p className="emptyStateText errorText" style={{ margin: 0 }}>{inviteWarning}</p>
        </div>
      ) : null}
      {isLeader ? (
        <div className="card" style={{ padding: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--c-muted-foreground)", marginBottom: 6 }}>Invite token</div>
            {inviteToken ? (
              <input className="formInput font-mono" value={inviteToken} readOnly />
            ) : (
              <p className="muted" style={{ margin: 0 }}>Generate a token and share it manually with an invitee.</p>
            )}
            {inviteTokenError ? <p className="emptyStateText errorText" style={{ margin: "8px 0 0" }}>{inviteTokenError}</p> : null}
          </div>
          <button className="ghostBtn" type="button" onClick={handleGenerateInviteToken} disabled={isGeneratingInviteToken}>
            {isGeneratingInviteToken ? "Generating..." : inviteToken ? "New token" : "Generate token"}
          </button>
          {inviteToken ? (
            <button className="ghostBtn" type="button" onClick={handleCopyInvite}>
              Copy
            </button>
          ) : null}
        </div>
      ) : null}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}
      >
        <div>
          <h1 className="pageTitle">{workspace.name}</h1>
          <p className="pageSubtitle">{tasks.length ? `${tasks.length} tasks tracked` : "No tasks tracked yet"}</p>
        </div>
        {isLeader ? (
          <button className="ghostBtn" type="button" onClick={handleDeleteProject} disabled={isDeleting}>
            {isDeleting ? "Archiving..." : "Archive project"}
          </button>
        ) : null}
      </motion.div>

      <div className="grid3">
        <div className="col gap6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card cardPad4">
            <h2 className="sectionTitle">Contribution</h2>
            {isLeader ? (
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="formInput"
                    placeholder="Add member by email"
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddMember();
                      }
                    }}
                  />
                  <button className="ghostBtn" type="button" onClick={handleAddMember} disabled={isUpdatingMembers}>
                    {isUpdatingMembers ? "Adding..." : "Add"}
                  </button>
                </div>
                {memberError ? <p className="muted" style={{ margin: 0 }}>{memberError}</p> : null}
              </div>
            ) : null}

            <div className="dataTableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th className="tableNumber">In Progress</th>
                    <th className="tableNumber">Completed</th>
                    <th className="tableNumber">Not Started</th>
                  </tr>
                </thead>
                <tbody>
                  {(workspace.members ?? []).map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatarSquare">
                            {member.user?.name?.[0] ?? "?"}
                          </div>

                          <span>{member.user?.name ?? "Unknown"}</span>

                          {member.role === "leader" ? (
                            <span className="roleBadge">
                              Leader
                            </span>
                          ) : null}
                          {isLeader && member.role !== "leader" ? (
                            <button
                              className="ghostBtn"
                              type="button"
                              onClick={() => handleRemoveMember(member.user.id)}
                              disabled={isUpdatingMembers}
                              style={{ marginLeft: "auto" }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </td>

                      <td className="tableNumber" style={{ color: "var(--c-warning)" }}>
                        {memberStats.get(member.user.id)?.inProgress ?? 0}
                      </td>
                      <td className="tableNumber" style={{ color: "var(--c-success)", fontWeight: 800 }}>
                        {memberStats.get(member.user.id)?.completed ?? 0}
                      </td>
                      <td className="tableNumber" style={{ color: "var(--c-muted-foreground)" }}>
                        {memberStats.get(member.user.id)?.notStarted ?? 0}
                      </td>
                    </tr>
                  ))}
                  {workspace.members?.length ? null : (
                    <tr>
                      <td colSpan={4}>
                        <div className="emptyState" style={{ margin: 10 }}>
                          <p className="emptyStateTitle">No members yet</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card cardPad4"
          >
            <div className="sectionHeaderRow">
              <h2 className="sectionTitle">Tasks</h2>
              {isLeader ? (
                <button className="sectionActionBtn" type="button" onClick={openTaskModal}>
                  <Plus size={14} />
                </button>
              ) : null}
            </div>
            <div className="taskList">
              {taskRows.length === 0 ? (
                <div className="emptyState">
                  <Sparkles size={18} />
                  <p className="emptyStateTitle">No tasks yet</p>
                  <p className="emptyStateText">Create the first task to give the project a clear next step.</p>
                </div>
              ) : (
                taskRows.map((task) => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <TaskRow
                        task={task}
                        onClick={() => navigate(`/project/${id}/tasks/${task.id}`)}
                      />
                    </div>
                    {isLeader ? (
                      <button
                        className="ghostBtn"
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={Boolean(deletingTaskId)}
                      >
                        {deletingTaskId === task.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <div className="col gap6">
          <CalendarWidget deadlines={deadlines} />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card cardPad4"
          >
            <h3 className="sectionTitle">Description</h3>
            {workspace.description ? (
              <p style={{ margin: 0 }}>{workspace.description}</p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>No description yet.</p>
            )}
          </motion.div>
        </div>
      </div>
      {isLeader && isTaskModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="modalOverlay"
          onClick={closeTaskModal}
        >
          <div
            className="card cardPad4 modalDialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 className="sectionTitle" style={{ margin: 0 }}>New task</h3>
              <button className="ghostBtn" type="button" onClick={closeTaskModal}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <input
                className="formInput"
                placeholder="Task title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
              />
              <textarea
                className="formInput formTextarea"
                rows={3}
                placeholder="Task description"
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <label className="formField" style={{ margin: 0 }}>
                  <span className="formLabel">Priority</span>
                  <select
                    className="formInput"
                    value={taskPriority}
                    onChange={(event) => setTaskPriority(event.target.value as "high" | "medium" | "low")}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label className="formField" style={{ margin: 0 }}>
                  <span className="formLabel">Deadline</span>
                  <span className="dateInputShell">
                    <input
                      className="formInput"
                      type="date"
                      value={taskDeadline}
                      onChange={(event) => setTaskDeadline(event.target.value)}
                    />
                    <CalendarDays className="dateInputIcon" size={18} />
                  </span>
                </label>
              </div>
              <div>
                <div className="formLabel" style={{ marginBottom: 6 }}>Assign to</div>
                <div className="assigneeGrid">
                  {(workspace.members ?? []).map((member) => (
                    <label key={member.id} className="assigneeOption">
                      <input
                        type="checkbox"
                        name="taskAssignee"
                        checked={assigneeIds.includes(member.user.id)}
                        onChange={() => handleAssigneeChange(member.user.id)}
                      />
                      {member.user.name}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="ghostBtn" type="button" onClick={closeTaskModal} disabled={isCreatingTask}>
                  Cancel
                </button>
                <button className="primaryBtn" type="button" onClick={handleCreateTask} disabled={isCreatingTask}>
                  {isCreatingTask ? "Creating task..." : "Create task"}
                </button>
              </div>
              {taskError ? <p className="muted" style={{ margin: 0 }}>{taskError}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
