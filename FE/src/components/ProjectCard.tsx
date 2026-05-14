import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import type { ApiWorkspace } from "../lib/api/types";
import { colorFromName } from "../lib/color";

type ProjectCardProps = {
  project: ApiWorkspace;
  index: number;
};

export default function ProjectCard({ project, index }: ProjectCardProps) {
  const navigate = useNavigate();
  const projectColor = colorFromName(project.name);

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/project/${project.id}`)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card cardPad4 projectCard"
      style={{ "--project-color": projectColor } as CSSProperties}
    >
      <div className="rowBetween" style={{ gap: 12 }}>
        <div>
          <h3 className="projectTitle">{project.name}</h3>
          <p className="projectSub">Workspace ready for planning, ownership, and deadlines.</p>
        </div>
        <span
          className="projectDot"
          style={{ backgroundColor: projectColor, width: 12, height: 12 }}
          aria-hidden="true"
        />
      </div>
      <div className="projectMetaRow">
        <span className="projectStatusPill">
          <span className="projectDot" style={{ backgroundColor: projectColor, width: 7, height: 7 }} />
          Active
        </span>
        <span className="muted" style={{ fontSize: 12 }}>
          Open board
        </span>
      </div>
    </motion.button>
  );
}
