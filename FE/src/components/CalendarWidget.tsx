type Deadline = {
  date: number;
  color: string;
};

type CalendarWidgetProps = {
  deadlines: Deadline[];
};

export default function CalendarWidget({ deadlines }: CalendarWidgetProps) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const colorForDay = (day: number) => {
    const hit = deadlines.find((d) => d.date === day);
    return hit?.color;
  };

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
          const color = colorForDay(d);
          return (
            <div
              key={d}
              className="calendarCell"
              style={color ? { backgroundColor: color + "22", color } : undefined}
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