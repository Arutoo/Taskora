import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type Deadline = {
  date?: number;
  dateValue?: string;
  color: string;
  overdue?: boolean;
  title?: string;
  kind?: "start" | "deadline";
  endDate?: string;
};

type CalendarWidgetProps = {
  deadlines: Deadline[];
};

type CalendarDate = {
  year: number;
  month: number;
  day: number;
  value: Date;
};

type CalendarDeadline = Deadline & {
  calendarDate: CalendarDate;
  calendarEndDate?: CalendarDate;
};

const monthYearFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const shortMonthDayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

function parseCalendarDate(value: string | undefined, fallbackDay?: number): CalendarDate | null {
  if (value) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return {
        year,
        month: month - 1,
        day,
        value: new Date(year, month - 1, day),
      };
    }
  }

  if (fallbackDay && Number.isFinite(fallbackDay)) {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: fallbackDay,
      value: new Date(today.getFullYear(), today.getMonth(), fallbackDay),
    };
  }

  return null;
}

function isSameMonth(date: CalendarDate, month: Date) {
  return date.year === month.getFullYear() && date.month === month.getMonth();
}

function formatAgendaDate(item: CalendarDeadline) {
  if (item.kind === "start" && item.calendarEndDate) {
    const start = item.calendarDate;
    const end = item.calendarEndDate;
    if (start.year === end.year && start.month === end.month) {
      return `${start.day}-${end.day}`;
    }
    if (start.year === end.year) {
      return `${shortMonthDayFormatter.format(start.value)}-${shortMonthDayFormatter.format(end.value)}`;
    }
    return `${shortDateFormatter.format(start.value)}-${shortDateFormatter.format(end.value)}`;
  }

  return shortMonthDayFormatter.format(item.calendarDate.value);
}

export default function CalendarWidget({ deadlines }: CalendarWidgetProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const today = new Date();
  const todayMatchesVisibleMonth =
    today.getFullYear() === visibleMonth.getFullYear() && today.getMonth() === visibleMonth.getMonth();

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    return [
      ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `empty-${index}`, day: null })),
      ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 })),
    ];
  }, [visibleMonth]);

  const normalizedDeadlines = useMemo<CalendarDeadline[]>(() => {
    return deadlines
      .map((deadline) => {
        const calendarDate = parseCalendarDate(deadline.dateValue, deadline.date);
        if (!calendarDate) return null;
        return {
          ...deadline,
          calendarDate,
          calendarEndDate: parseCalendarDate(deadline.endDate),
        };
      })
      .filter((deadline): deadline is CalendarDeadline => Boolean(deadline));
  }, [deadlines]);

  const deadlineForDay = (day: number) => {
    return normalizedDeadlines.find((deadline) => deadline.calendarDate.day === day && isSameMonth(deadline.calendarDate, visibleMonth));
  };

  const visibleDeadlines = normalizedDeadlines
    .filter((deadline) => isSameMonth(deadline.calendarDate, visibleMonth))
    .sort((a, b) => a.calendarDate.value.getTime() - b.calendarDate.value.getTime());
  const startDates = visibleDeadlines.filter((item) => item.kind === "start").slice(0, 4);
  const fallbackDates = visibleDeadlines.slice(0, 4);
  const agenda = startDates.length > 0 ? startDates : fallbackDates;

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="card cardPad4">
      <div className="calendarHeader">
        <h3 className="sectionTitle" style={{ marginBottom: 0 }}>
          Deadlines
        </h3>
        <div className="calendarNav">
          <button className="ghostBtn iconOnlyBtn" type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={15} />
          </button>
          <span className="calendarMonthLabel">{monthYearFormatter.format(visibleMonth)}</span>
          <button className="ghostBtn iconOnlyBtn" type="button" onClick={() => changeMonth(1)} aria-label="Next month">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="calendarGrid calendarWeekdays" aria-hidden="true">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={`${day}-${index}`} className="calendarWeekday">
            {day}
          </div>
        ))}
      </div>

      <div className="calendarGrid">
        {calendarDays.map((entry) => {
          if (!entry.day) {
            return <div key={entry.key} className="calendarCell calendarPlaceholder" aria-hidden="true" />;
          }

          const deadline = deadlineForDay(entry.day);
          const color = deadline?.color;
          const isToday = todayMatchesVisibleMonth && entry.day === today.getDate();
          const className = [
            "calendarCell",
            isToday ? "today" : "",
            deadline && !isToday ? (deadline.overdue ? "hasOverdue" : "hasDeadline") : "",
          ].filter(Boolean).join(" ");
          return (
            <div
              key={entry.key}
              className={className}
              style={color && !isToday && !deadline?.overdue ? { backgroundColor: color + "22", color } : undefined}
              title={deadline?.title ? `${deadline.kind === "start" ? "Start" : "Deadline"}: ${deadline.title}` : `Day ${entry.day}`}
            >
              {entry.day}
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
            <div className="calendarAgendaItem" key={`${item.calendarDate.value.toISOString()}-${item.title ?? index}-${item.kind ?? "deadline"}`}>
              <span className={item.overdue ? "agendaDot overdue" : `agendaDot ${item.kind === "start" ? "start" : ""}`} />
              <span className="calendarAgendaDay">{formatAgendaDate(item)}</span>
              <span className="calendarAgendaTitle">{item.title ?? "Task deadline"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
