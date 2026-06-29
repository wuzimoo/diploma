import { CalendarDays, ClipboardPlus, Home, MoreHorizontal } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useI18n } from "../hooks/useI18n";

export function MobileLayout() {
  const { t } = useI18n();

  return (
    <div className="mobile-page">
      <div className="mobile-shell">
        <div className="mobile-screen">
          <Outlet />
        </div>
        <div className="mobile-language-bar">
          <LanguageSwitcher className="mobile-language-switcher" />
        </div>
        <nav className="bottom-nav">
          <NavLink to="/worker"><Home size={18} />{t("Startseite")}</NavLink>
          <NavLink to="/worker/reports/new"><ClipboardPlus size={18} />{t("Bericht")}</NavLink>
          <NavLink to="/worker/calendar"><CalendarDays size={18} />{t("Kalender")}</NavLink>
          <NavLink to="/worker/more"><MoreHorizontal size={18} />{t("Mehr")}</NavLink>
        </nav>
      </div>
    </div>
  );
}
