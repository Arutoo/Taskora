import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { listWorkspaces } from "../lib/api/workspaces";
import type { ApiWorkspace } from "../lib/api/types";
import { colorFromName } from "../lib/color";
import { useAuth } from "../lib/use-auth";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
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

  const firstWorkspaceId = workspaces[0]?.id;

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brand">Taskora</div>
          <div className="sidebarSpacer" />
        </div>

        <nav className="sidebarNav">
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
            end
          >
            My Dashboard
          </NavLink>

          <div className="navSectionHeader">
            <div className="navSectionTitle">Projects</div>
            <NavLink className="navSectionAction" to="/project/new" aria-label="Create project">
              <Plus size={14} />
            </NavLink>
          </div>
          <div className="navSection">
            {workspaces.map((workspace) => (
              <NavLink
                key={workspace.id}
                to={`/project/${workspace.id}`}
                className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
              >
                <span className="projectDot" style={{ backgroundColor: colorFromName(workspace.name) }} />
                <span className="navLabel">{workspace.name}</span>
              </NavLink>
            ))}
            {!isLoading && workspaces.length === 0 && !error ? (
              <div className="muted" style={{ padding: "8px 12px", fontSize: 12 }}>
                No workspaces yet
              </div>
            ) : null}
            {error ? (
              <div className="muted" style={{ padding: "8px 12px", fontSize: 12 }}>
                {error}
              </div>
            ) : null}
          </div>

          <div className="navSectionTitle">Workspace</div>
          <div className="navSection">
            {firstWorkspaceId ? (
              <NavLink
                to={`/project/${firstWorkspaceId}/tasks`}
                className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
              >
                Assigned Tasks
              </NavLink>
            ) : (
              <div className="navItem" style={{ opacity: 0.6, cursor: "not-allowed" }}>
                Assigned Tasks
              </div>
            )}
          </div>
        </nav>
      </aside>

      <main className="main">
        <div className="pageContainer">{children}</div>
      </main>
    </div>
  );
}
