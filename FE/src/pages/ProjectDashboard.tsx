import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, ExternalLink, Link2, LogOut, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CalendarWidget from "../components/CalendarWidget";
import TaskRow from "../components/TaskRow";
import type { TaskRowItem } from "../components/TaskRow";
import {
  archiveWorkspace,
  createInviteLink,
  getWorkspace,
  inviteToWorkspace,
  leaveWorkspace,
  removeMember,
  transferWorkspaceOwnership,
} from "../lib/api/workspaces";
import { createTask, deleteTask, listTasks } from "../lib/api/tasks";
import { createShortcut, deleteShortcut, listShortcuts } from "../lib/api/shortcuts";
import { getWorkspaceCalendar, getWorkspaceContributions } from "../lib/api/workspacefunc";
import type { ApiCalendarTask, ApiContributionSummary, ApiShortcut, ApiTask, ApiWorkspace } from "../lib/api/types";
import { ApiError } from "../lib/api/client";
import { formatDueDate } from "../lib/date";
import { useAuth } from "../lib/use-auth";

type DashboardDeadline = {
  date: number;
  color: string;
  overdue?: boolean;
  title: string;
  kind: "start" | "deadline";
  endDate?: number;
};

const contributionColors = [
  "#67e8c9",
  "#fbbf6a",
  "#60a5fa",
  "#f472b6",
  "#a7f3d0",
  "#f87171",
  "#c084fc",
  "#fde047",
];

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(cx, cy, radius, endAngle);
  const end = polarPoint(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [workspace, setWorkspace] = useState<ApiWorkspace | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<ApiCalendarTask[]>([]);
  const [contributions, setContributions] = useState<ApiContributionSummary | null>(null);
  const [shortcuts, setShortcuts] = useState<ApiShortcut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);
  const [isGeneratingInviteToken, setIsGeneratingInviteToken] = useState(false);
  const [inviteTokenError, setInviteTokenError] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [shortcutLabel, setShortcutLabel] = useState("");
  const [shortcutUrl, setShortcutUrl] = useState("");
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [isCreatingShortcut, setIsCreatingShortcut] = useState(false);
  const [deletingShortcutId, setDeletingShortcutId] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [isLeavingWorkspace, setIsLeavingWorkspace] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const todayInputValue = useMemo(() => localDateInputValue(), []);

  useEffect(() => {
    if (!isAuthenticated || !id) {
      setWorkspace(null);
      setTasks([]);
      setCalendarTasks([]);
      setContributions(null);
      setShortcuts([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [workspaceData, taskData, calendarData, contributionData, shortcutData] = await Promise.all([
          getWorkspace(id),
          listTasks(id),
          getWorkspaceCalendar(id),
          getWorkspaceContributions(id),
          listShortcuts(id),
        ]);

        if (!isActive) return;
        setWorkspace(workspaceData);
        setTasks(taskData);
        setCalendarTasks(calendarData);
        setContributions(contributionData);
        setShortcuts(shortcutData);
        const state = location.state as { inviteCode?: string; inviteToken?: string; inviteWarning?: string } | null;
        setInviteCode(state?.inviteCode ?? state?.inviteToken ?? null);
        setInviteWarning(state?.inviteWarning ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load workspace";
        if (isActive) setError(message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [id, isAuthenticated, location.state]);

  const currentMember = workspace?.members?.find((member) => member.user.id === user?.id);
  const isLeader = currentMember?.role === "leader";
  const leaderCount = workspace?.members?.filter((member) => member.role === "leader").length ?? 0;
  const isSoleLeader = isLeader && leaderCount <= 1;
  const transferCandidates = useMemo(() => {
    return workspace?.members?.filter((member) => member.user.id !== user?.id) ?? [];
  }, [user?.id, workspace?.members]);
  const inviteLink = inviteCode ? `${window.location.origin}/join?code=${encodeURIComponent(inviteCode)}` : "";

  const deadlines = useMemo<DashboardDeadline[]>(() => {
    return calendarTasks.flatMap((task) => {
      const entries: DashboardDeadline[] = [];
      if (task.start_date) {
        entries.push({
          date: new Date(task.start_date).getDate(),
          color: "var(--c-accent-2)",
          title: task.title,
          kind: "start",
          endDate: task.deadline ? new Date(task.deadline).getDate() : undefined,
        });
      }

      if (task.deadline && task.status !== "done") {
        entries.push({
          date: new Date(task.deadline).getDate(),
          color: "#66aaff",
          overdue: task.is_overdue,
          title: task.title,
          kind: "deadline",
        });
      }

      return entries.filter((entry) => Number.isFinite(entry.date));
    });
  }, [calendarTasks]);

  const taskRows = useMemo<TaskRowItem[]>(() => {
    const projectName = workspace?.name ?? "Workspace";
    return tasks.map((task) => {
      const assigneeNames = task.assignees?.map((entry) => entry.user.name).filter(Boolean) ?? [];
      const due = task.deadline ? formatDueDate(task.deadline) : null;
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: due ? due.text : "No deadline",
        dueUrgent: task.is_overdue,
        hasDeadline: Boolean(task.deadline),
        project: projectName,
        assignee: assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned",
        isVerified: task.is_verified,
      };
    });
  }, [tasks, workspace?.name]);

  const contributionRows = useMemo(() => {
    return (contributions?.members ?? []).map((member, index) => ({
      ...member,
      color: contributionColors[index % contributionColors.length],
    }));
  }, [contributions?.members]);

  const donutSegments = useMemo(() => {
    if (!contributions || contributions.total_verified <= 0) return [];
    let cursor = 0;
    const gap = contributionRows.filter((member) => member.verified_tasks > 0).length > 1 ? 4 : 0;
    return contributionRows
      .filter((member) => member.verified_tasks > 0)
      .map((member) => {
        const sweep = (member.verified_tasks / contributions.total_verified) * 360;
        const start = cursor;
        const end = cursor + sweep;
        cursor = end;
        return {
          ...member,
          isFullCircle: sweep >= 359.5,
          d: describeArc(60, 60, 44, start + gap / 2, end - gap / 2),
        };
      });
  }, [contributionRows, contributions]);

  const refreshWorkspaceMembers = async () => {
    if (!id) return;
    const [workspaceData, contributionData] = await Promise.all([
      getWorkspace(id),
      getWorkspaceContributions(id),
    ]);
    setWorkspace(workspaceData);
    setContributions(contributionData);
  };

  const refreshTaskSurfaces = async () => {
    if (!id) return;
    const [taskData, calendarData, contributionData] = await Promise.all([
      listTasks(id),
      getWorkspaceCalendar(id),
      getWorkspaceContributions(id),
    ]);
    setTasks(taskData);
    setCalendarTasks(calendarData);
    setContributions(contributionData);
  };

  const refreshShortcuts = async () => {
    if (!id) return;
    const shortcutData = await listShortcuts(id);
    setShortcuts(shortcutData);
  };

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
      await refreshWorkspaceMembers();
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
    if (!id || !isLeader || isUpdatingMembers || memberId === user?.id) return;
    const confirmed = window.confirm("Remove this member from the project?");
    if (!confirmed) return;
    try {
      setIsUpdatingMembers(true);
      setMemberError(null);
      await removeMember(id, memberId);
      await refreshWorkspaceMembers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove member";
      setMemberError(message);
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  const handleAssigneeChange = (memberId: string) => {
    setAssigneeIds((current) =>
      current.includes(memberId) ? current.filter((entry) => entry !== memberId) : [...current, memberId]
    );
  };

  const handleTaskStartDateChange = (value: string) => {
    setTaskStartDate(value);
    if (value && taskDeadline && taskDeadline < value) {
      setTaskDeadline(value);
    }
    if (value && value < todayInputValue) {
      setTaskError("Start date and due date cannot be before today.");
    } else {
      setTaskError(null);
    }
  };

  const handleTaskDeadlineChange = (value: string) => {
    setTaskDeadline(value);
    if (value && value < todayInputValue) {
      setTaskError("Start date and due date cannot be before today.");
    } else if (taskStartDate && value && value < taskStartDate) {
      setTaskError("Due date cannot be before the start date.");
    } else {
      setTaskError(null);
    }
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
    if (!taskStartDate || !taskDeadline) {
      setTaskError("Start date and due date are required.");
      return;
    }
    if (taskStartDate < todayInputValue || taskDeadline < todayInputValue) {
      setTaskError("Start date and due date cannot be before today.");
      return;
    }
    if (taskDeadline < taskStartDate) {
      setTaskError("Due date cannot be before the start date.");
      return;
    }

    try {
      setIsCreatingTask(true);
      setTaskError(null);
      await createTask(id, {
        title,
        description: taskDescription.trim() ? taskDescription.trim() : undefined,
        priority: taskPriority,
        start_date: taskStartDate ? new Date(taskStartDate).toISOString() : undefined,
        deadline: taskDeadline ? new Date(taskDeadline).toISOString() : undefined,
        assigneeIds,
      });
      await refreshTaskSurfaces();
      setTaskTitle("");
      setTaskDescription("");
      setTaskStartDate("");
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

  const handleDeleteTask = async (taskId: string) => {
    if (!id || !isLeader || deletingTaskId) return;
    const confirmed = window.confirm("Delete this task? This cannot be undone.");
    if (!confirmed) return;
    try {
      setDeletingTaskId(taskId);
      await deleteTask(id, taskId);
      await refreshTaskSurfaces();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      setTaskError(message);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleCreateShortcut = async () => {
    if (!id || !isLeader || isCreatingShortcut) return;
    const label = shortcutLabel.trim();
    const url = shortcutUrl.trim();
    if (!label) {
      setShortcutError("Shortcut label is required.");
      return;
    }
    if (!url) {
      setShortcutError("Shortcut URL is required.");
      return;
    }

    try {
      new URL(url);
    } catch {
      setShortcutError("Enter a full URL, including https://");
      return;
    }

    try {
      setIsCreatingShortcut(true);
      setShortcutError(null);
      await createShortcut(id, { label, url });
      await refreshShortcuts();
      setShortcutLabel("");
      setShortcutUrl("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add shortcut";
      setShortcutError(message);
    } finally {
      setIsCreatingShortcut(false);
    }
  };

  const handleDeleteShortcut = async (shortcutId: string) => {
    if (!id || deletingShortcutId) return;
    const confirmed = window.confirm("Delete this shortcut?");
    if (!confirmed) return;
    try {
      setDeletingShortcutId(shortcutId);
      setShortcutError(null);
      await deleteShortcut(id, shortcutId);
      await refreshShortcuts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete shortcut";
      setShortcutError(message);
    } finally {
      setDeletingShortcutId(null);
    }
  };

  const handleGenerateInviteToken = async () => {
    if (!id || !isLeader || isGeneratingInviteToken) return;
    try {
      setIsGeneratingInviteToken(true);
      setInviteTokenError(null);
      const result = await createInviteLink(id);
      setInviteCode(result.inviteCode);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate invite code";
      setInviteTokenError(message);
    } finally {
      setIsGeneratingInviteToken(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteTokenError(null);
    } catch {
      setInviteTokenError("Failed to copy link. Please copy it manually.");
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!id || !currentMember || isLeavingWorkspace) return;
    setLeaveError(null);

    if (isSoleLeader) {
      if (transferCandidates.length === 0) {
        setLeaveError("Add another member before leaving, then transfer ownership to them.");
        return;
      }
      setTransferTargetId((current) => current || transferCandidates[0]?.user.id || "");
      setIsTransferModalOpen(true);
      return;
    }

    const confirmed = window.confirm("Leave this workspace? You will lose access to its tasks and activity.");
    if (!confirmed) return;

    try {
      setIsLeavingWorkspace(true);
      await leaveWorkspace(id);
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to leave workspace";
      setLeaveError(message);
    } finally {
      setIsLeavingWorkspace(false);
    }
  };

  const handleTransferAndLeave = async () => {
    if (!id || !transferTargetId || isLeavingWorkspace) return;
    try {
      setIsLeavingWorkspace(true);
      setLeaveError(null);
      await transferWorkspaceOwnership(id, transferTargetId);
      await leaveWorkspace(id);
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to transfer ownership and leave workspace";
      setLeaveError(message);
    } finally {
      setIsLeavingWorkspace(false);
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
            <div style={{ fontSize: 12, color: "var(--c-muted-foreground)", marginBottom: 6 }}>Invite code</div>
            {inviteCode ? (
              <div style={{ display: "grid", gap: 8 }}>
                <input className="formInput font-mono" value={inviteCode} readOnly />
                <input className="formInput font-mono" value={inviteLink} readOnly />
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>Generate a short code and shareable link for invitees.</p>
            )}
            {inviteTokenError ? <p className="emptyStateText errorText" style={{ margin: "8px 0 0" }}>{inviteTokenError}</p> : null}
          </div>
          <button className="ghostBtn" type="button" onClick={handleGenerateInviteToken} disabled={isGeneratingInviteToken}>
            {isGeneratingInviteToken ? "Generating..." : inviteCode ? "New code" : "Generate code"}
          </button>
          {inviteCode ? (
            <button className="ghostBtn" type="button" onClick={handleCopyInvite}>
              Copy link
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

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card cardPad4">
        <div className="sectionHeaderRow">
          <div>
            <h2 className="sectionTitle">Contribution</h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Verified task count and workspace share.
            </p>
          </div>
          <div className="metricPill">
            <span className="font-mono">{contributions?.total_verified ?? 0}</span>
            verified
          </div>
        </div>

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

        <div className="contributionPanel">
          <div className="contributionDonutWrap">
            <svg className="contributionDonut" viewBox="0 0 120 120" role="img" aria-label="Verified task share by member">
              <circle className="donutTrack" cx="60" cy="60" r="44" />
              {donutSegments.map((segment) =>
                segment.isFullCircle ? (
                  <circle
                    key={segment.user_id}
                    className="donutSegment"
                    cx="60"
                    cy="60"
                    r="44"
                    style={{ stroke: segment.color }}
                  />
                ) : (
                  <path
                    key={segment.user_id}
                    className="donutSegment"
                    d={segment.d}
                    style={{ stroke: segment.color }}
                  />
                )
              )}
            </svg>
            <div className="donutCenter">
              <span className="font-mono">{contributions?.total_verified ?? 0}</span>
              <small>verified</small>
            </div>
          </div>

          <div className="dataTableWrap">
            <table className="dataTable contributionTable">
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="tableNumber">Verified Tasks</th>
                  <th className="tableNumber">Share</th>
                </tr>
              </thead>
              <tbody>
                {contributionRows.map((member) => {
                  const workspaceMember = workspace.members?.find((entry) => entry.user.id === member.user_id);
                  return (
                    <tr key={member.user_id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="contributionColorDot" style={{ backgroundColor: member.color }} />
                          <div className="avatarSquare">{member.name?.[0] ?? "?"}</div>
                          <span>{member.name}</span>
                          {workspaceMember?.role === "leader" ? <span className="roleBadge">Leader</span> : null}
                          {isLeader && workspaceMember?.role !== "leader" ? (
                            <button
                              className="ghostBtn"
                              type="button"
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={isUpdatingMembers}
                              style={{ marginLeft: "auto" }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="tableNumber" style={{ color: "var(--c-success)", fontWeight: 800 }}>
                        {member.verified_tasks}
                      </td>
                      <td className="tableNumber" style={{ color: "var(--c-muted-foreground)" }}>
                        {Math.round(member.percentage)}%
                      </td>
                    </tr>
                  );
                })}
                {contributionRows.length ? null : (
                  <tr>
                    <td colSpan={3}>
                      <div className="emptyState" style={{ margin: 10 }}>
                        <p className="emptyStateTitle">No members yet</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      <div className="grid3">
        <div className="col gap6">
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
                      <TaskRow task={task} onClick={() => navigate(`/project/${id}/tasks/${task.id}`)} />
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
              <p className="breakText" style={{ margin: 0 }}>{workspace.description}</p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>No description yet.</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.23 }}
            className="card cardPad4 workspaceSettingsCard"
          >
            <div className="sectionHeaderRow">
              <div>
                <h3 className="sectionTitle">Workspace Settings</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Membership controls for this workspace.
                </p>
              </div>
              <LogOut size={18} className="muted" />
            </div>

            <button
              className="dangerBtn"
              type="button"
              onClick={handleLeaveWorkspace}
              disabled={isLeavingWorkspace}
            >
              <LogOut size={15} />
              {isLeavingWorkspace ? "Leaving..." : "Leave Workspace"}
            </button>
            {isSoleLeader ? (
              <p className="emptyStateText" style={{ margin: "10px 0 0" }}>
                Sole leaders must transfer ownership before leaving.
              </p>
            ) : null}
            {leaveError ? <p className="emptyStateText errorText" style={{ margin: "10px 0 0" }}>{leaveError}</p> : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card cardPad4"
          >
            <div className="sectionHeaderRow">
              <div>
                <h3 className="sectionTitle">Resource Shortcuts</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Shared links for this workspace.
                </p>
              </div>
              <Link2 size={18} className="muted" />
            </div>

            {isLeader ? (
              <>
                <div className="shortcutForm">
                  <input
                    className="formInput"
                    placeholder="Label"
                    value={shortcutLabel}
                    onChange={(event) => setShortcutLabel(event.target.value)}
                  />
                  <input
                    className="formInput"
                    placeholder="https://example.com"
                    value={shortcutUrl}
                    onChange={(event) => setShortcutUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateShortcut();
                      }
                    }}
                  />
                  <button className="ghostBtn" type="button" onClick={handleCreateShortcut} disabled={isCreatingShortcut}>
                    {isCreatingShortcut ? "Adding..." : "Add"}
                  </button>
                </div>
                {shortcutError ? <p className="emptyStateText errorText" style={{ margin: "10px 0 0" }}>{shortcutError}</p> : null}
              </>
            ) : null}

            <div className="shortcutList">
              {shortcuts.length === 0 ? (
                <div className="emptyState shortcutEmpty">
                  <Link2 size={18} />
                  <p className="emptyStateTitle">No shortcuts yet</p>
                  <p className="emptyStateText">Add docs, boards, repos, or references your team uses often.</p>
                </div>
              ) : (
                shortcuts.map((shortcut) => {
                  const canDelete = isLeader || shortcut.added_by === user?.id;
                  return (
                    <div className="shortcutItem" key={shortcut.id}>
                      <a className="shortcutLink" href={shortcut.url} target="_blank" rel="noreferrer">
                        <span className="shortcutIcon" aria-hidden="true">
                          <ExternalLink size={15} />
                        </span>
                        <span>
                          <span className="shortcutLabel">{shortcut.label}</span>
                          <span className="shortcutUrl">{shortcut.url}</span>
                        </span>
                      </a>
                      {canDelete ? (
                        <button
                          className="ghostBtn iconOnlyBtn"
                          type="button"
                          title="Delete shortcut"
                          aria-label={`Delete shortcut ${shortcut.label}`}
                          onClick={() => handleDeleteShortcut(shortcut.id)}
                          disabled={deletingShortcutId === shortcut.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {isLeader && isTaskModalOpen ? (
        <div role="dialog" aria-modal="true" className="modalOverlay" onClick={closeTaskModal}>
          <div className="card cardPad4 modalDialog" onClick={(event) => event.stopPropagation()}>
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
                  <span className="formLabel requiredLabel">Start date</span>
                  <span className="dateInputShell">
                    <input
                      className="formInput"
                      type="date"
                      required
                      min={todayInputValue}
                      value={taskStartDate}
                      onChange={(event) => handleTaskStartDateChange(event.target.value)}
                    />
                    <CalendarDays className="dateInputIcon" size={18} />
                  </span>
                </label>
                <label className="formField" style={{ margin: 0 }}>
                  <span className="formLabel requiredLabel">Deadline</span>
                  <span className="dateInputShell">
                    <input
                      className="formInput"
                      type="date"
                      required
                      min={taskStartDate || todayInputValue}
                      value={taskDeadline}
                      onChange={(event) => handleTaskDeadlineChange(event.target.value)}
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

      {isTransferModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="modalOverlay"
          onClick={() => {
            if (!isLeavingWorkspace) setIsTransferModalOpen(false);
          }}
        >
          <div className="card cardPad4 modalDialog" onClick={(event) => event.stopPropagation()}>
            <div className="sectionHeaderRow">
              <div>
                <h3 className="sectionTitle">Transfer ownership</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Choose a new leader before leaving this workspace.
                </p>
              </div>
              <LogOut size={18} className="muted" />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label className="formField">
                <span className="formLabel">New leader</span>
                <select
                  className="formInput"
                  value={transferTargetId}
                  onChange={(event) => setTransferTargetId(event.target.value)}
                  disabled={isLeavingWorkspace}
                >
                  {transferCandidates.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name} - {member.user.email}
                    </option>
                  ))}
                </select>
              </label>
              {leaveError ? <p className="emptyStateText errorText" style={{ margin: 0 }}>{leaveError}</p> : null}
              <div className="formActions">
                <button
                  className="ghostBtn"
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  disabled={isLeavingWorkspace}
                >
                  Cancel
                </button>
                <button
                  className="dangerBtn"
                  type="button"
                  onClick={handleTransferAndLeave}
                  disabled={isLeavingWorkspace || !transferTargetId}
                >
                  <LogOut size={15} />
                  {isLeavingWorkspace ? "Leaving..." : "Transfer & leave"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
