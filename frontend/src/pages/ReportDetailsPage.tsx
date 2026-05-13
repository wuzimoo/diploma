import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { DailyReport } from "../types/api";

export function ReportDetailsPage() {
  const { id } = useParams();
  const [report, setReport] = useState<DailyReport | null>(null);

  useEffect(() => {
    api.get<DailyReport>(`/daily-reports/${id}`).then((response) => setReport(response.data));
  }, [id]);

  if (!report) {
    return <main className="mobile-content"><div className="summary-card">Завантаження...</div></main>;
  }

  return (
    <>
      <header className="mobile-header">
        <h1>{report.report_number}</h1>
        <p>{report.construction_object.name}</p>
      </header>
      <main className="mobile-content">
        <section className="summary-card stack">
          <div className="report-item-top"><strong>{report.report_date}</strong><StatusBadge status={report.status} /></div>
          <div className="detail-grid">
            <span>Працівник</span><strong>{report.employee.first_name} {report.employee.last_name}</strong>
            <span>Час</span><strong>{report.start_time.slice(0, 5)} - {report.end_time.slice(0, 5)}</strong>
            <span>Години</span><strong>{report.worked_hours.toFixed(2)} h</strong>
          </div>
          <p>{report.work_description}</p>
          {report.rejection_reason && <p className="form-error">{report.rejection_reason}</p>}
        </section>
        <section className="photo-grid">
          {report.photos.map((photo) => <div className="photo-card" key={photo.id}>{photo.caption || photo.file_name}</div>)}
        </section>
      </main>
    </>
  );
}

