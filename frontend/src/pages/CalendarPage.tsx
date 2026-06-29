import { Check, ChevronLeft, ChevronRight, Minus, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { useI18n } from "../hooks/useI18n";
import { formatHours, formatLongDate, formatMonthYear, reportCountLabel } from "../lib/format";
import { api } from "../services/api";
import { CalendarDay } from "../types/api";

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function fromIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildCalendarGrid(currentMonth: Date) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const cells: Array<{ type: "empty" } | { type: "day"; iso: string; day: number }> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ type: "empty" });
  }
  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    cells.push({ type: "day", iso: toIsoDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)), day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ type: "empty" });
  }
  return cells;
}

function statusIndicator(day: CalendarDay | undefined, t: (key: string) => string) {
  if (!day || day.count === 0) {
    return { icon: Minus, tone: "neutral", label: t("Keine Berichte") };
  }
  if (day.severity === "danger") {
    return { icon: X, tone: "danger", label: t("Abgelehnt oder zur Nacharbeit") };
  }
  if (day.severity === "warning") {
    return { icon: TriangleAlert, tone: "warning", label: t("Wartet auf Prüfung") };
  }
  return { icon: Check, tone: "success", label: t("Freigegeben") };
}

export function CalendarPage() {
  const { t, translateText, weekdaysShort } = useI18n();
  const location = useLocation();
  const reportBase = location.pathname.startsWith("/admin") ? "/admin/reports" : "/worker/reports";
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [rows, setRows] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));

  const monthRange = useMemo(() => ({ date_from: toIsoDate(startOfMonth(month)), date_to: toIsoDate(endOfMonth(month)) }), [month]);
  const monthDays = useMemo(() => buildCalendarGrid(month), [month]);
  const monthTitle = useMemo(() => formatMonthYear(month), [month]);
  const selectedDateLabel = useMemo(() => formatLongDate(fromIsoDate(selectedDate)), [selectedDate]);

  useEffect(() => {
    api.get<CalendarDay[]>("/calendar/detailed", { params: monthRange }).then((response) => {
      setRows(response.data);
      const monthStart = monthRange.date_from;
      setSelectedDate((current) => (current >= monthRange.date_from && current <= monthRange.date_to ? current : monthStart));
    });
  }, [monthRange]);

  const byDate = useMemo(() => new Map(rows.map((row) => [row.date, row])), [rows]);
  const selected = byDate.get(selectedDate);
  const selectedIndicator = statusIndicator(selected, t);
  const SelectedIcon = selectedIndicator.icon;

  return (
    <>
      <header className="mobile-header">
        <h1>{t("Berichtskalender")}</h1>
        <p>{t("Monatsansicht für Einreichungen, Freigaben und Tage mit Nacharbeit.")}</p>
      </header>
      <main className="mobile-content">
        <section className="calendar-board" aria-label={`${t("Berichtskalender")} ${monthTitle}`}>
          <div className="calendar-month-header">
            <button className="icon-btn" type="button" aria-label={t("Vorheriger Monat")} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
              <ChevronLeft size={18} />
            </button>
            <strong>{monthTitle}</strong>
            <button className="icon-btn" type="button" aria-label={t("Nächster Monat")} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="calendar-weekdays">
            {weekdaysShort.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {monthDays.map((cell, index) => {
              if (cell.type === "empty") {
                return <div className="calendar-empty" key={`empty-${index}`} aria-hidden="true" />;
              }
              const day = byDate.get(cell.iso);
              const indicator = statusIndicator(day, t);
              const Icon = indicator.icon;
              return (
                <button
                  className={`calendar-cell ${indicator.tone} ${selectedDate === cell.iso ? "selected" : ""}`}
                  key={cell.iso}
                  onClick={() => setSelectedDate(cell.iso)}
                  type="button"
                >
                  <strong>{cell.day}</strong>
                  <span className={`calendar-indicator ${indicator.tone}`} aria-label={indicator.label}>
                    <Icon size={12} />
                  </span>
                  <span className="calendar-cell-meta">{day ? reportCountLabel(day.count) : ""}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="summary-card stack">
          <div className="report-item-top">
            <div>
              <h2 className="section-title">{selectedDateLabel}</h2>
              <p className="section-subtitle">
                {selected ? `${reportCountLabel(selected.count)}, ${formatHours(selected.hours)}` : t("Keine Berichte an diesem Tag")}
              </p>
            </div>
            <div className="calendar-status-pill">
              <SelectedIcon size={16} />
              {selected?.count ? (
                <StatusBadge status={selected.severity === "danger" ? "rejected" : selected.severity === "warning" ? "submitted" : "admin_approved"} />
              ) : (
                <span className="calendar-pill-label">{t("Keine Berichte")}</span>
              )}
            </div>
          </div>
          {selected?.reports.length ? (
            selected.reports.map((report) => (
              <Link className="report-item" key={report.id} to={`${reportBase}/${report.id}`}>
                <div className="report-item-top"><strong>{report.report_number}</strong><StatusBadge status={report.status} /></div>
                <p>{report.employee} · {translateText(report.object)}</p>
                <div className="report-meta"><span>{translateText(report.description)}</span><strong>{formatHours(report.hours)}</strong></div>
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <strong>{t("Keine Berichte für diesen Tag")}</strong>
              <span>{t("Wählen Sie einen anderen Tag oder wechseln Sie den Monat.")}</span>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
