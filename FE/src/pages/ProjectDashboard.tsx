import { useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import CalendarWidget from "../components/CalendarWidget";
import { archiveWorkspace, getWorkspace, inviteToWorkspace, removeMember } from "../lib/api/workspaces";
import { createTask, deleteTask, listTasks } from "../lib/api/tasks";
import type { ApiTask, ApiWorkspace } from "../lib/api/types";
import { useAuth } from "../lib/use-auth";
import TaskRow from "../components/TaskRow";
import type { TaskRowItem } from "../components/TaskRow";
import { formatDueDate } from "../lib/date";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

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
  const [assigneeId, setAssigneeId] = useState("");
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
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
          const link = (location.state as { inviteLink?: string } | null)?.inviteLink ?? null;
          setInviteLink(link);
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
        color: task.priority === "high" ? "#F45D5D" : task.priority === "medium" ? "#F7B441" : "#5AA7FF",
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
      const message = err instanceof Error ? err.message : "Failed to add member";
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
    setAssigneeId(memberId);
  };

  const handleCreateTask = async () => {
    if (!id || !isLeader || isCreatingTask) return;
    const title = taskTitle.trim();
    if (!title) {
      setTaskError("Task title is required.");
      return;
    }
    if (!assigneeId) {
      setTaskError("Select an assignee.");
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
        assigneeIds: [assigneeId],
      });

      const taskData = await listTasks(id);
      setTasks(taskData);
      setTaskTitle("");
      setTaskDescription("");
      setTaskDeadline("");
      setAssigneeId("");
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

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      // Ignore clipboard errors.
    }
  };

  if (isLoading) {
    return (
      <div className="pageStack">
        <p className="muted">Loading workspace...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="pageStack">
        <p className="muted">{error ?? "Workspace not found"}</p>
      </div>
    );
  }

  return (
    <div className="pageStack">
      {inviteLink ? (
        <div className="card" style={{ padding: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--c-muted-foreground)", marginBottom: 6 }}>Invite link</div>
            <input className="formInput" value={inviteLink} readOnly />
          </div>
          <button className="ghostBtn" type="button" onClick={handleCopyInvite}>
            Copy
          </button>
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

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ color: "var(--c-muted-foreground)", fontSize: 12 }}>
                    <th style={{ textAlign: "left", padding: "8px 0" }}>Member</th>
                    <th style={{ textAlign: "center", padding: "8px 0" }}>In Progress</th>
                    <th style={{ textAlign: "center", padding: "8px 0" }}>Completed</th>
                    <th style={{ textAlign: "center", padding: "8px 0" }}>Not Started</th>
                  </tr>
                </thead>
                <tbody>
                  {(workspace.members ?? []).map((member) => (
                    <tr key={member.id} style={{ borderTop: "1px solid color-mix(in srgb, var(--c-border) 45%, transparent)" }}>
                      <td style={{ padding: "10px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              background: "var(--c-secondary)",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {member.user?.name?.[0] ?? "?"}
                          </div>

                          <span>{member.user?.name ?? "Unknown"}</span>

                          {member.role === "leader" ? (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "3px 8px",
                                borderRadius: 999,
                                background: "color-mix(in srgb, var(--c-primary) 18%, transparent)",
                                border: "1px solid color-mix(in srgb, var(--c-primary) 30%, transparent)",
                              }}
                            >
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

                      <td className="font-mono" style={{ textAlign: "center", color: "var(--c-warning)" }}>
                        {memberStats.get(member.user.id)?.inProgress ?? 0}
                      </td>
                      <td className="font-mono" style={{ textAlign: "center", color: "var(--c-success)", fontWeight: 800 }}>
                        {memberStats.get(member.user.id)?.completed ?? 0}
                      </td>
                      <td className="font-mono" style={{ textAlign: "center", color: "var(--c-muted-foreground)" }}>
                        {memberStats.get(member.user.id)?.notStarted ?? 0}
                      </td>
                    </tr>
                  ))}
                  {workspace.members?.length ? null : (
                    <tr>
                      <td colSpan={4} className="muted" style={{ padding: "12px 0", textAlign: "center" }}>
                        No members yet
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
                <p className="muted" style={{ margin: 0, padding: "12px 0", textAlign: "center" }}>
                  No tasks yet.
                </p>
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
          className="card"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(8, 10, 15, 0.6)",
            zIndex: 40,
          }}
          onClick={closeTaskModal}
        >
          <div
            className="card cardPad4"
            style={{ width: "min(560px, 92vw)" }}
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
                  <input
                    className="formInput"
                    type="date"
                    value={taskDeadline}
                    onChange={(event) => setTaskDeadline(event.target.value)}
                  />
                </label>
              </div>
              <div>
                <div className="formLabel" style={{ marginBottom: 6 }}>Assign to</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(workspace.members ?? []).map((member) => (
                    <label key={member.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                      <input
                        type="radio"
                        name="taskAssignee"
                        checked={assigneeId === member.user.id}
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