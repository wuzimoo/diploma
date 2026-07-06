import { CalendarDays, ClipboardPlus, Home, Settings2 } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../hooks/useI18n";

export function MobileLayout() {
  const { t } = useI18n();
  const { user } = useAuth();

  return (
    <div className="mobile-page">
      <div className="mobile-shell">
        <div className="mobile-top-rail">
          <span>{t("Kundendemo-Workspace")}</span>
          <strong>{user?.role.code === "worker" ? t("Feldmodus") : t("Einstellungen")}</strong>
        </div>
        <div className="mobile-screen">
          <Outlet />
        </div>
        <nav className="bottom-nav">
          <NavLink to="/worker"><Home size={18} />{t("Startseite")}</NavLink>
          <NavLink to="/worker/reports/new"><ClipboardPlus size={18} />{t("Bericht")}</NavLink>
          <NavLink to="/worker/calendar"><CalendarDays size={18} />{t("Kalender")}</NavLink>
          <NavLink to="/worker/settings"><Settings2 size={18} />{t("Einstellungen")}</NavLink>
        </nav>
      </div>
    </div>
  );
}
