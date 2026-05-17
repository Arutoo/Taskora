type Deadline = {
  date: number;
  color: string;
  overdue?: boolean;
  title?: string;
  kind?: "start" | "deadline";
  endDate?: number;
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
  const startDates = deadlines
    .filter((item) => item.kind === "start" && item.date >= today)
    .sort((a, b) => a.date - b.date)
    .slice(0, 4);
  const fallbackDates = deadlines
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date - b.date)
    .slice(0, 4);
  const agenda = startDates.length > 0 ? startDates : fallbackDates;

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
              title={deadline?.title ? `${deadline.kind === "start" ? "Start" : "Deadline"}: ${deadline.title}` : `Day ${d}`}
            >
              {d}
            </div>
          );
        })}
      </div>
      {agenda.length > 0 ? (
        <div className="calendarAgenda">
          <div className="calendarAgendaHeader">
            {startDates.length > 0 ? "Start - End dates" : "Upcoming dates"}
          </div>
          {agenda.map((item, index) => (
            <div className="calendarAgendaItem" key={`${item.date}-${item.title ?? index}-${item.kind ?? "deadline"}`}>
              <span className={item.overdue ? "agendaDot overdue" : `agendaDot ${item.kind === "start" ? "start" : ""}`} />
              <span className="calendarAgendaDay">
                {item.kind === "start" && item.endDate
                  ? `${item.date}-${item.endDate}`
                  : item.date}
              </span>
              <span className="calendarAgendaTitle">{item.title ?? "Task deadline"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
