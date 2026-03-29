import { NavLink } from "react-router-dom";

export default function AppLayout({ children }) {
  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brand">Taskora</div>
          <div className="sidebarSpacer" />
        </div>

        <nav className="sidebarNav">
          <NavLink to="/" className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
            end
          >
            My Dashboard
          </NavLink>

          <div className="navSectionTitle">Projects</div>

          <div className="navSectionTitle">Workspace</div>
        </nav>
      </aside>

      <main className="main">
        <div className="pageContainer">{children}</div>
      </main>
    </div>
  );
}
