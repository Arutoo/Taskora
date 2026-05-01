import type { Task } from "../lib/mock-data";

type TaskRowProps = {
  task: Task;
  onClick: () => void;
};

export default function TaskRow({ task, onClick }: TaskRowProps) {
  const statusClass =
    task.status === "in_progress"
      ? "statusDot statusInProgress"
      : task.status === "completed"
        ? "statusDot statusCompleted"
        : "statusDot statusNotStarted";

  return (
    <button type="button" onClick={onClick} className="taskRow">
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={statusClass} />
          <span className="taskTitle">{task.title}</span>
        </div>
        <div className="taskMeta">
          {task.project} • {task.assignee}
        </div>
      </div>
      <div className="taskDue font-mono">{task.dueDate}</div>
    </button>
  );
}