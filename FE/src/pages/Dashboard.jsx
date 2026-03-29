import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

import TaskRow from "../components/TaskRow.jsx";
import CalendarWidget from "../components/CalendarWidget.jsx";
import ProjectCard from "../components/ProjectCard.jsx";

export default function Dashboard() {
  const navigate = useNavigate();

  const upcomingTasks = [];
  const calendarDeadlines = [];
  const projects = [];

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

            {upcomingTasks.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No tasks yet.
              </p>
            ) : (
              <div className="taskList">
                {upcomingTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onClick={() => navigate(`/task/${task.id}`)} />
                ))}
              </div>
            )}
          </motion.div>

          <div>
            <h2 className="sectionTitle">Projects</h2>

            {projects.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No projects yet.
              </p>
            ) : (
              <div className="gridProjects">
                {projects.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}
              </div>
            )}
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
                  0
                </p>
                <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
                  Completed
                </p>
              </div>

              <div>
                <p className="font-mono" style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--c-warning)" }}>
                  0
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