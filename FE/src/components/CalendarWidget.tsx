type Deadline = {
  date: number;
  color: string;
  overdue?: boolean;
};

type CalendarWidgetProps = {
  deadlines: Deadline[];
};

export default function CalendarWidget({ deadlines }: CalendarWidgetProps) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const deadlineForDay = (day: number) => {
    const hit = deadlines.find((d) => d.date === day);
    return hit;
  };
  const today = new Date().getDate();

  return (
    <div className="card cardPad4">
      <div className="calendarHeader">
        <h3 className="sectionTitle" style={{ marginBottom: 0 }}>
          Deadlines
        </h3>
        <span className="muted" style={{ fontSize: 12 }}>
          This month
        </span>
      </div>

      <div className="calendarGrid">
        {days.map((d) => {
          const deadline = deadlineForDay(d);
          const color = deadline?.color;
          const className = [
            "calendarCell",
            d === today ? "today" : "",
            deadline && d !== today ? (deadline.overdue ? "hasOverdue" : "hasDeadline") : "",
          ].filter(Boolean).join(" ");
          return (
            <div
              key={d}
              className={className}
              style={color && d !== today && !deadline?.overdue ? { backgroundColor: color + "22", color } : undefined}
              title={color ? `Deadline: day ${d}` : `Day ${d}`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
