import { Download, Filter } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { useToast } from "../hooks/useToast";
import { api } from "../services/api";
import { PayrollSummary } from "../types/api";

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function payrollRange(anchor: Date) {
  return {
    start: formatDate(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 21)),
    end: formatDate(new Date(anchor.getFullYear(), anchor.getMonth(), 20))
  };
}

function monthRange(anchor: Date) {
  return {
    start: formatDate(new Date(anchor.getFullYear(), anchor.getMonth(), 1)),
    end: formatDate(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0))
  };
}

export function PayrollPage() {
  const { pushToast } = useToast();
  const [mode, setMode] = useState<"month" | "payroll" | "custom">("payroll");
  const [anchorMonth, setAnchorMonth] = useState("2026-05");
  const [customStart, setCustomStart] = useState("2026-04-21");
  const [customEnd, setCustomEnd] = useState("2026-05-20");
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null);

  const range = useMemo(() => {
    const [year, month] = anchorMonth.split("-").map(Number);
    const anchor = new Date(year, month - 1, 1);
    if (mode === "month") return monthRange(anchor);
    if (mode === "payroll") return payrollRange(anchor);
    return { start: customStart, end: customEnd };
  }, [anchorMonth, customEnd, customStart, mode]);

  function load() {
    api.get<PayrollSummary>("/payroll/summary", { params: { start_date: range.start, end_date: range.end } }).then((response) => setSummary(response.data));
  }

  useEffect(() => {
    load();
  }, [range.start, range.end]);

  function exportCsv() {
    api.get("/payroll/export.csv", { params: { start_date: range.start, end_date: range.end }, responseType: "blob" }).then((response) => {
      const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `builder-erp-payroll-${range.start}-${range.end}.csv`);
      link.click();
      URL.revokeObjectURL(url);
      pushToast({ tone: "success", title: "Експорт сформовано", description: "CSV завантажено." });
    });
  }

  return (
    <section className="stack">
      <section className="table-card stack">
        <div className="section-head">
          <div>
            <h2 className="section-title">Оплати</h2>
            <p className="section-subtitle">Розрахунок виплат за календарний місяць, payroll-період 21-20 або довільний діапазон.</p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={exportCsv}><Download size={16} />CSV</button>
        </div>
        <div className="filters payroll-filters">
          <label className="field">Режим<select value={mode} onChange={(event) => setMode(event.target.value as "month" | "payroll" | "custom")}><option value="payroll">Payroll 21-20</option><option value="month">Календарний місяць</option><option value="custom">Довільний період</option></select></label>
          <label className="field">Місяць<input type="month" value={anchorMonth} onChange={(event) => setAnchorMonth(event.target.value)} /></label>
          {mode === "custom" ? <label className="field">Початок<input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label> : <div className="summary-card compact-summary"><span className="text-muted">Початок</span><strong>{range.start}</strong></div>}
          {mode === "custom" ? <label className="field">Кінець<input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label> : <div className="summary-card compact-summary"><span className="text-muted">Кінець</span><strong>{range.end}</strong></div>}
          <button className="btn btn-primary" type="button" onClick={load}><Filter size={16} />Оновити</button>
        </div>
      </section>

      <section className="table-card stack">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Працівник</th>
                <th>Посада</th>
                <th>EUR/h</th>
                <th>Фінальні години</th>
                <th>Сума</th>
                <th>Звітів</th>
                <th>Pending</th>
                <th>Rejected</th>
              </tr>
            </thead>
            <tbody>
              {summary?.employees.map((employee) => (
                <Fragment key={employee.employee_id}>
                  <tr className="clickable-row" onClick={() => setExpandedEmployeeId((current) => current === employee.employee_id ? null : employee.employee_id)}>
                    <td><strong>{employee.name}</strong></td>
                    <td>{employee.position}</td>
                    <td>EUR {employee.hourly_rate.toFixed(2)}</td>
                    <td>{employee.approved_hours.toFixed(2)} h</td>
                    <td>EUR {employee.total_payment.toFixed(2)}</td>
                    <td>{employee.reports_count}</td>
                    <td>{employee.pending_count}</td>
                    <td>{employee.rejected_count}</td>
                  </tr>
                  {expandedEmployeeId === employee.employee_id ? (
                    <tr key={`${employee.employee_id}-details`}>
                      <td colSpan={8}>
                        <div className="report-list">
                          {employee.reports.length ? employee.reports.map((report) => (
                            <div className="report-item" key={report.id}>
                              <div className="report-item-top"><strong>{report.report_number}</strong><span>{report.report_date}</span></div>
                              <p>{report.construction_object_name}</p>
                              <div className="report-meta"><span>{report.description}</span><strong>{report.worked_hours.toFixed(2)} h</strong></div>
                            </div>
                          )) : <div className="empty-state"><strong>Фінально погоджених звітів немає</strong><span>У цьому періоді оплата ще не сформована.</span></div>}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
