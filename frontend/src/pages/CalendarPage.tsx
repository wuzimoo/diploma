import { useEffect, useState } from "react";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";

interface CalendarRow {
  date: string;
  status: string;
  count: number;
  hours: number;
}

export function CalendarPage() {
  const [rows, setRows] = useState<CalendarRow[]>([]);
  useEffect(() => {
    api.get<CalendarRow[]>("/calendar/report-summary").then((response) => setRows(response.data));
  }, []);
  return (
    <>
      <header className="mobile-header">
        <h1>Календар звітів</h1>
        <p>Стислий огляд активності по датах</p>
      </header>
      <main className="mobile-content">
        <div className="calendar-list">
          {rows.map((row) => (
            <article className="report-item" key={`${row.date}-${row.status}`}>
              <div className="report-item-top"><h3>{row.date}</h3><StatusBadge status={row.status} /></div>
              <div className="report-meta"><span>{row.count} звіт(и)</span><strong>{row.hours.toFixed(2)} h</strong></div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

