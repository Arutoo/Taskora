import { NavLink, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { listWorkspaces } from "../lib/api/workspaces";
import type { ApiWorkspace } from "../lib/api/types";
import { colorFromName } from "../lib/color";
import { useAuth } from "../lib/use-auth";
import { io, type Socket } from "socket.io-client";
import { readStoredAuth } from "../lib/auth-storage";
import { pushStoredNotification, readUnreadCount } from "../lib/notifications-storage";
import { useTheme } from "../hooks/use-theme";
import { Sun, Moon } from "lucide-react";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { theme, toggleTheme } = useTheme();

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
          setWorkspaces(data.filter((workspace) => !workspace.is_archived));
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
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const accessToken = readStoredAuth()?.accessToken ?? null;
    if (!accessToken) return;
    const socketUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    socketRef.current = socket;
    socket.on("notification:new", (data: { id?: string; message?: string; created_at?: string }) => {
      if (!data?.message) return;
      const list = pushStoredNotification(data);
      window.dispatchEvent(
        new CustomEvent("taskora:notification", {
          detail: { notification: data, list, unread: readUnreadCount() },
        })
      );
    });

    return () => {
      socket.off("notification:new");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const routeMatch = location.pathname.match(/^\/project\/([^/]+)/);
  const activeWorkspaceId = routeMatch?.[1] ?? workspaces[0]?.id;
  const handleLogout = () => {
    void logout();
  };

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brand">Taskora</div>
          <div className="sidebarSpacer" />
          <button
            onClick={toggleTheme}
            className="themeToggle"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
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
            {activeWorkspaceId ? (
              <NavLink
                to={`/project/${activeWorkspaceId}/tasks`}
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
          <div className="navSection accountSection">
            <div className="navSectionTitle">Account</div>
            <button className="navItem navItemButton" type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </nav>
      </aside>

      <main className="main">
        <div className="pageContainer">{children}</div>
      </main>
    </div>
  );
}
