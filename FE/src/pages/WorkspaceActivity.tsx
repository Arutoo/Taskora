import { motion } from "framer-motion";
import { Activity, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getWorkspace } from "../lib/api/workspaces";
import { listWorkspaceActivity } from "../lib/api/workspacefunc";
import type { ApiActivityLog, ApiPaginated, ApiWorkspace } from "../lib/api/types";
import { formatDate } from "../lib/date";
import { useAuth } from "../lib/use-auth";

const PAGE_SIZE = 12;

const actionLabels: Record<ApiActivityLog["action_type"], string> = {
  task_created: "created a task",
  status_changed: "changed task status",
  task_verified: "verified a task",
  member_joined: "joined the workspace",
  shortcut_added: "added a shortcut",
  comment_added: "added a comment",
};

export default function WorkspaceActivity() {
  const { projectId } = useParams<{ projectId: string }>();
  const { isAuthenticated } = useAuth();
  const [workspace, setWorkspace] = useState<ApiWorkspace | null>(null);
  const [activity, setActivity] = useState<ApiPaginated<ApiActivityLog> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    if (!activity) return 1;
    return Math.max(1, Math.ceil(activity.total / activity.limit));
  }, [activity]);

  useEffect(() => {
    if (!isAuthenticated || !projectId) {
      setWorkspace(null);
      setActivity(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [workspaceData, activityData] = await Promise.all([
          getWorkspace(projectId),
          listWorkspaceActivity(projectId, page, PAGE_SIZE),
        ]);
        if (isActive) {
          setWorkspace(workspaceData);
          setActivity(activityData);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load activity";
        if (isActive) setError(message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [isAuthenticated, page, projectId]);

  const goToPage = (nextPage: number) => {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  };

  return (
    <div className="pageStack">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rowBetween">
        <div>
          <h1 className="pageTitle">Activity Log</h1>
          <p className="pageSubtitle">{workspace?.name ?? "Recent workspace events"}</p>
        </div>
        <div className="metricPill">
          <Activity size={16} />
          <span className="font-mono">{activity?.total ?? 0}</span>
          events
        </div>
      </motion.div>

      {isLoading ? (
        <div className="skeletonStack">
          <div className="skeletonLine" />
          <div className="skeletonLine" />
          <div className="skeletonLine" />
        </div>
      ) : error ? (
        <div className="emptyState">
          <p className="emptyStateTitle">Activity unavailable</p>
          <p className="emptyStateText errorText">{error}</p>
        </div>
      ) : !activity || activity.items.length === 0 ? (
        <div className="emptyState">
          <Sparkles size={18} />
          <p className="emptyStateTitle">No activity yet</p>
          <p className="emptyStateText">Task changes, comments, joins, and verification events will appear here.</p>
        </div>
      ) : (
        <div className="card cardPad4">
          <div className="activityList">
            {activity.items.map((item) => (
              <div className="activityItem" key={item.id}>
                <div className="activityMarker" />
                <div>
                  <p className="activityText">
                    <strong>{item.user?.name ?? "A member"}</strong> {actionLabels[item.action_type]}
                  </p>
                  <p className="activityMeta">
                    {formatDate(item.created_at)}
                    {item.reference_type ? ` - ${item.reference_type}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="notificationPager">
            <button
              className="ghostBtn iconOnlyBtn"
              type="button"
              aria-label="Previous activity page"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="font-mono">{page}/{totalPages}</span>
            <button
              className="ghostBtn iconOnlyBtn"
              type="button"
              aria-label="Next activity page"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
