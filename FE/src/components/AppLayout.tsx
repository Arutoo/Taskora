import { NavLink, useLocation } from "react-router-dom";
import { DoorOpen, FolderKanban, Home, ListChecks, LogOut, Plus, Sparkles, Sun, Moon } from "lucide-react";
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
      <a href="#main-content" className="skipLink">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brandMark" aria-hidden="true">
            <Sparkles size={18} />
          </div>
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
        <p className="sidebarHint">Plan the work, track ownership, and keep project momentum visible.</p>

        <nav className="sidebarNav">
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
            end
          >
            <Home className="navItemIcon" />
            <span className="navLabel">My Dashboard</span>
          </NavLink>
          <NavLink
            to="/join"
            className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
          >
            <DoorOpen className="navItemIcon" />
            <span className="navLabel">Join Workspace</span>
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
            {isLoading ? (
              <div className="skeletonStack" aria-label="Loading projects">
                <div className="skeletonLine" />
                <div className="skeletonLine" />
              </div>
            ) : null}
            {!isLoading && workspaces.length === 0 && !error ? (
              <div className="emptyState" style={{ padding: "18px 12px" }}>
                <p className="emptyStateTitle">No projects yet</p>
                <p className="emptyStateText">Create a workspace to start tracking tasks.</p>
              </div>
            ) : null}
            {error ? (
              <div className="emptyState" style={{ padding: "18px 12px" }}>
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
                <ListChecks className="navItemIcon" />
                <span className="navLabel">Assigned Tasks</span>
              </NavLink>
            ) : (
              <div className="navItem" style={{ opacity: 0.6, cursor: "not-allowed" }}>
                <FolderKanban className="navItemIcon" />
                <span className="navLabel">Assigned Tasks</span>
              </div>
            )}
          </div>
          <div className="navSection accountSection">
            <div className="navSectionTitle">Account</div>
            <button className="navItem navItemButton" type="button" onClick={handleLogout}>
              <LogOut className="navItemIcon" />
              <span className="navLabel">Sign out</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="main" id="main-content">
        <div className="pageContainer">{children}</div>
      </main>
    </div>
  );
}
