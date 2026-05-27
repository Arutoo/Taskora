import { motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { listWorkspaces } from "../lib/api/workspaces";
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
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [pendingWorkspaceFilter, setPendingWorkspaceFilter] = useState("all");
  const [isWorkspaceFilterOpen, setIsWorkspaceFilterOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [tasks, setTasks] = useState<Array<ApiTask & { workspaceName: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = useMemo<ApiTaskStatus | undefined>(() => {
    if (filter === "Not Started") return "todo";
    if (filter === "In Progress") return "in_progress";
    if (filter === "Completed") return "done";
    return undefined;
  }, [filter]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setWorkspaces([]);
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
        const workspaceData = (await listWorkspaces()).filter((workspace) => !workspace.is_archived);
        const taskGroups = await Promise.all(
          workspaceData.map(async (workspace) => {
            const workspaceTasks = await listTasks(workspace.id, { assigneeId: user.id });
            return workspaceTasks.map((task) => ({
              ...task,
              workspaceName: workspace.name,
            }));
          })
        );

        if (isActive) {
          setWorkspaces(workspaceData);
          setTasks(taskGroups.flat());
          if (projectId) {
            setWorkspaceFilter(projectId);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load assigned tasks";
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
  }, [isAuthenticated, projectId, user?.id]);

  const taskRows = useMemo<TaskRowItem[]>(() => {
    return tasks
      .filter((task) => !statusFilter || task.status === statusFilter)
      .filter((task) => workspaceFilter === "all" || task.workspace_id === workspaceFilter)
      .map((task) => {
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
        project: task.workspaceName,
        assignee,
        workspaceId: task.workspace_id,
        isVerified: task.is_verified,
      };
    });
  }, [statusFilter, tasks, workspaceFilter]);

  const selectedWorkspaceName = workspaces.find((workspace) => workspace.id === workspaceFilter)?.name;
  const workspaceFilterLabel = selectedWorkspaceName ?? "All Workspaces";
  const subtitle = selectedWorkspaceName
    ? `Tasks assigned to you in ${selectedWorkspaceName}`
    : "Tasks assigned to you across every workspace";

  const openWorkspaceFilter = () => {
    setPendingWorkspaceFilter(workspaceFilter);
    setIsWorkspaceFilterOpen(true);
  };

  const applyWorkspaceFilter = () => {
    setWorkspaceFilter(pendingWorkspaceFilter);
    setIsWorkspaceFilterOpen(false);
  };

  return (
    <div className="pageStack">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="pageTitle">Assigned Tasks</h1>
        <p className="pageSubtitle">{subtitle}</p>
      </motion.div>

      <div className="filterBar">
        <button type="button" onClick={openWorkspaceFilter} className="filterDropdownBtn">
          <span>Workspace: {workspaceFilterLabel}</span>
          <ChevronDown size={15} />
        </button>
      </div>

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
              <p className="emptyStateText">Try another workspace or status filter.</p>
            </div>
          ) : (
            taskRows.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => navigate(`/project/${task.workspaceId}/tasks/${task.id}`)}
              />
            ))
          )}
        </div>
      </motion.div>

      {isWorkspaceFilterOpen ? (
        <div role="dialog" aria-modal="true" className="modalOverlay" onClick={() => setIsWorkspaceFilterOpen(false)}>
          <div className="card cardPad4 modalDialog workspaceFilterModal" onClick={(event) => event.stopPropagation()}>
            <div className="sectionHeaderRow">
              <h3 className="sectionTitle">Filter by workspace</h3>
              <button
                className="ghostBtn iconOnlyBtn"
                type="button"
                onClick={() => setIsWorkspaceFilterOpen(false)}
                aria-label="Close workspace filter"
              >
                <X size={15} />
              </button>
            </div>

            <label className="formField">
              <span className="formLabel">Workspace</span>
              <select
                className="formInput"
                value={pendingWorkspaceFilter}
                onChange={(event) => setPendingWorkspaceFilter(event.target.value)}
              >
                <option value="all">All Workspaces</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="formActions">
              <button className="ghostBtn" type="button" onClick={() => setIsWorkspaceFilterOpen(false)}>
                Cancel
              </button>
              <button className="primaryBtn" type="button" onClick={applyWorkspaceFilter}>
                Apply filter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
