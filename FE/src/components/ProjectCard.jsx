import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function ProjectCard({ project, index }) {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/project/${project.id}`)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card cardPad4 projectCard"
    >
      <div className="rowBetween" style={{ gap: 12 }}>
        <div>
          <h3 className="projectTitle">{project.name}</h3>
          <p className="projectSub">
            {project.completedTasks}/{project.taskCount} tasks completed
          </p>
        </div>
        <span
          className="projectDot"
          style={{ backgroundColor: project.color, width: 12, height: 12 }}
          aria-hidden="true"
        />
      </div>
    </motion.button>
  );
}