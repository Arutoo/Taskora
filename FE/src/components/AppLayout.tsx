import { NavLink, useLocation } from "react-router-dom";
import { Activity, ChevronDown, CircleUserRound, DoorOpen, Home, ListChecks, LogOut, Plus, Sparkles, Sun, Moon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { listWorkspaces } from "../lib/api/workspaces";
import type { ApiNotification, ApiWorkspace } from "../lib/api/types";
import { colorFromName } from "../lib/color";
import { useAuth } from "../lib/use-auth";
import { io, type Socket } from "socket.io-client";
import { useTheme } from "../hooks/use-theme";
import NotificationsBell from "./NotificationsBell";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const { accessToken, isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { theme, toggleTheme } = useTheme();
  const workspaceIds = useMemo(() => workspaces.map((workspace) => workspace.id), [workspaces]);
  const workspaceIdsKey = workspaceIds.join(",");

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
    if (!accessToken) return;
    const socketUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    const joinWorkspaceRooms = () => {
      workspaceIds.forEach((workspaceId) => {
        socket.emit("workspace:join", workspaceId);
      });
    };

    socketRef.current = socket;
    socket.on("connect", joinWorkspaceRooms);
    socket.io.on("reconnect", joinWorkspaceRooms);
    socket.on("notification:new", (data: ApiNotification) => {
      if (!data?.message) return;
      window.dispatchEvent(
        new CustomEvent("taskora:notification", {
          detail: { notification: data },
        })
      );
    });

    return () => {
      socket.off("connect", joinWorkspaceRooms);
      socket.off("notification:new");
      socket.io.off("reconnect", joinWorkspaceRooms);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, isAuthenticated, workspaceIds, workspaceIdsKey]);

  const routeWorkspaceId = location.pathname.match(/^\/project\/([^/]+)/)?.[1];
  useEffect(() => {
    if (routeWorkspaceId) {
      setExpandedWorkspaceId(routeWorkspaceId);
    }
  }, [routeWorkspaceId]);

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
          <NotificationsBell />
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
            {workspaces.map((workspace) => {
              const isExpanded = expandedWorkspaceId === workspace.id;
              return (
                <div className="projectNavGroup" key={workspace.id}>
                  <NavLink
                    to={`/project/${workspace.id}`}
                    className={({ isActive }) => (isActive ? "navItem projectNavItem active" : "navItem projectNavItem")}
                    onClick={() => setExpandedWorkspaceId(workspace.id)}
                  >
                    <span className="projectDot" style={{ backgroundColor: colorFromName(workspace.name) }} />
                    <span className="navLabel">{workspace.name}</span>
                    <ChevronDown className={isExpanded ? "projectNavChevron expanded" : "projectNavChevron"} />
                  </NavLink>
                  {isExpanded ? (
                    <div className="projectSubnav">
                      <NavLink
                        to={`/project/${workspace.id}/activity`}
                        className={({ isActive }) => (isActive ? "projectSubnavItem active" : "projectSubnavItem")}
                      >
                        <Activity size={15} />
                        <span className="navLabel">Activity Log</span>
                      </NavLink>
                    </div>
                  ) : null}
                </div>
              );
            })}
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
            <NavLink
              to="/tasks"
              className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
            >
              <ListChecks className="navItemIcon" />
              <span className="navLabel">Assigned Tasks</span>
            </NavLink>
          </div>
          <div className="navSection accountSection">
            <div className="navSectionTitle">Account</div>
            <div className="sidebarProfile" aria-label="Signed-in profile">
              <div className="sidebarProfileIcon" aria-hidden="true">
                <CircleUserRound size={24} />
              </div>
              <div className="sidebarProfileText">
                <div className="sidebarProfileName">{user?.name ?? "No profile name"}</div>
                <div className="sidebarProfileEmail">{user?.email ?? "No email available"}</div>
              </div>
            </div>
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
