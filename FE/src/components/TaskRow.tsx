type TaskRowStatus = "not_started" | "in_progress" | "completed" | "todo" | "done";

export type TaskRowItem = {
  id: string;
  title: string;
  status: TaskRowStatus;
  dueDate: string;
  dueUrgent?: boolean;
  project: string;
  assignee: string;
  workspaceId?: string;
};

type TaskRowProps = {
  task: TaskRowItem;
  onClick: () => void;
};

export default function TaskRow({ task, onClick }: TaskRowProps) {
  const statusClass =
    task.status === "in_progress"
      ? "statusDot statusInProgress"
      : task.status === "completed" || task.status === "done"
        ? "statusDot statusCompleted"
        : "statusDot statusNotStarted";

  const isCompleted = task.status === "completed" || task.status === "done";
  const dueLabel = isCompleted ? "Completed" : task.dueDate;

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
      <div
        className="taskDue font-mono"
        style={
          task.dueUrgent && !isCompleted
            ? { color: "#F45D5D", fontWeight: 800 }
            : undefined
        }
      >
        {dueLabel}
      </div>
    </button>
  );
}