import { motion } from "framer-motion";
import { Bell, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CalendarWidget from "../components/CalendarWidget";
import ProjectCard from "../components/ProjectCard";
import { listWorkspaces } from "../lib/api/workspaces";
import type { ApiWorkspace } from "../lib/api/types";
import { useAuth } from "../lib/use-auth";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await listWorkspaces();
        if (isActive) {
          setWorkspaces(data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load workspaces";
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
  }, [isAuthenticated]);
  const calendarDeadlines: { date: number; color: string }[] = [];

  return (
    <div className="pageStack">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rowBetween">
        <div>
          <h1 className="pageTitle">My Dashboard</h1>
          <p className="pageSubtitle">Welcome back! Here's what needs your attention.</p>
        </div>

        <button className="iconBtn" type="button" aria-label="Notifications">
          <Bell size={20} color="var(--c-muted-foreground)" />
          <span className="badgeDot" />
        </button>
      </motion.div>

      <div className="grid3">
        <div className="col gap6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card cardPad4"
          >
            <h2 className="sectionTitle">Upcoming Tasks</h2>
            <div className="taskList">
              <p className="muted" style={{ margin: 0, padding: "12px 0" }}>
                Tasks will appear here once the tasks API is connected.
              </p>
            </div>
          </motion.div>

          <div>
            <div className="sectionHeaderRow">
              <h2 className="sectionTitle">Projects</h2>
              <button
                className="sectionActionBtn"
                type="button"
                onClick={() => navigate("/project/new")}
                aria-label="Create project"
              >
                <Plus size={14} />
                Create
              </button>
            </div>
            <div className="gridProjects">
              {workspaces.map((workspace, i) => (
                <ProjectCard key={workspace.id} project={workspace} index={i} />
              ))}
            </div>
            {!isLoading && workspaces.length === 0 && !error ? (
              <p className="muted" style={{ marginTop: 12 }}>
                No workspaces yet. Create one to get started.
              </p>
            ) : null}
            {error ? (
              <p className="muted" style={{ marginTop: 12 }}>
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="col gap6">
          <CalendarWidget deadlines={calendarDeadlines} />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card cardPad4"
          >
            <h3 className="sectionTitle">Your Stats</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "center" }}>
              <div>
                <p className="font-mono" style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--c-primary)" }}>
                  3
                </p>
                <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
                  Completed
                </p>
              </div>

              <div>
                <p className="font-mono" style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--c-warning)" }}>
                  1
                </p>
                <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
                  In Progress
                </p>
              </div>

              <div>
                <p
                  className="font-mono"
                  style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--c-destructive)" }}
                >
                  0
                </p>
                <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
                  Not Started
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}