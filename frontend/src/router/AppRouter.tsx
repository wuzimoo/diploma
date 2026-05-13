import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "../layouts/AdminLayout";
import { MobileLayout } from "../layouts/MobileLayout";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { CalendarPage } from "../pages/CalendarPage";
import { CreateReportPage } from "../pages/CreateReportPage";
import { EmployeesPage } from "../pages/EmployeesPage";
import { LoginPage } from "../pages/LoginPage";
import { MorePage } from "../pages/MorePage";
import { ObjectsPage } from "../pages/ObjectsPage";
import { ReportDetailsPage } from "../pages/ReportDetailsPage";
import { ReportReviewPage } from "../pages/ReportReviewPage";
import { ReportsListPage } from "../pages/ReportsListPage";
import { WorkerHomePage } from "../pages/WorkerHomePage";
import { useAuth } from "../hooks/useAuth";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="loading-screen">Завантаження Roman's ERP...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/worker" element={<Protected><MobileLayout /></Protected>}>
        <Route index element={<WorkerHomePage />} />
        <Route path="reports/new" element={<CreateReportPage />} />
        <Route path="reports/:id" element={<ReportDetailsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="more" element={<MorePage />} />
      </Route>
      <Route path="/admin" element={<Protected><AdminLayout /></Protected>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="reports" element={<ReportsListPage />} />
        <Route path="reports/:id" element={<ReportReviewPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="objects" element={<ObjectsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

