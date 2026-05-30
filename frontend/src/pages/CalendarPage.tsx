import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { CalendarDay } from "../types/api";

const monthDays = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  return `2026-05-${String(day).padStart(2, "0")}`;
});

export function CalendarPage() {
  const location = useLocation();
  const [rows, setRows] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("2026-05-29");
  const reportBase = location.pathname.startsWith("/admin") ? "/admin/reports" : "/worker/reports";
  useEffect(() => {
    api.get<CalendarDay[]>("/calendar/detailed", { params: { date_from: "2026-05-01", date_to: "2026-05-31" } }).then((response) => setRows(response.data));
  }, []);

  const byDate = new Map(rows.map((row) => [row.date, row]));
  const selected = byDate.get(selectedDate);

  return (
    <>
      <header className="mobile-header">
        <h1>Календар звітів</h1>
        <p>Місячний огляд: жовтий день означає відкритий або неперевірений звіт.</p>
      </header>
      <main className="mobile-content">
        <section className="calendar-board" aria-label="Календар звітів за травень 2026">
          <div className="calendar-month-header">
            <strong>Травень 2026</strong>
            <span>Місячний огляд</span>
          </div>
          <div className="calendar-weekdays">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {monthDays.map((date) => {
              const day = byDate.get(date);
              return (
                <button className={`calendar-cell ${day?.severity || ""} ${selectedDate === date ? "selected" : ""}`} key={date} onClick={() => setSelectedDate(date)} type="button">
                  <strong>{Number(date.slice(-2))}</strong>
                  {day ? <span>{day.count} звіт(и)</span> : <span>немає</span>}
                  {day?.severity && day.severity !== "ok" ? <i aria-label="Потрібна увага" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="summary-card stack">
          <div className="report-item-top">
            <div>
              <h2 className="section-title">{selectedDate}</h2>
              <p className="section-subtitle">{selected ? `${selected.count} звіт(и), ${selected.hours.toFixed(2)} h` : "Звітів за день немає"}</p>
            </div>
            {selected?.severity === "danger" ? <StatusBadge status="rejected" /> : selected?.severity === "warning" ? <StatusBadge status="review" /> : <StatusBadge status="approved" />}
          </div>
          {selected?.reports.map((report) => (
            <Link className="report-item" key={report.id} to={`${reportBase}/${report.id}`}>
              <div className="report-item-top"><strong>{report.report_number}</strong><StatusBadge status={report.status} /></div>
              <p>{report.employee} · {report.object}</p>
              <div className="report-meta"><span>{report.description}</span><strong>{report.hours.toFixed(2)} h</strong></div>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
