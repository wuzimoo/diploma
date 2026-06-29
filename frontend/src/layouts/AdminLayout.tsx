import { BarChart3, Building2, CalendarDays, ClipboardList, HardHat, LogOut, ReceiptText, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../hooks/useI18n";
import { APP_NAME, APP_ROLE_FALLBACK } from "../lib/branding";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { t, translateText } = useI18n();
  const isAdmin = user?.role.code === "admin";

  return (
    <div className="desktop-page">
      <div className="desktop-shell">
        <header className="desktop-header">
          <div className="brand">
            <h1>{APP_NAME}</h1>
            <p>{translateText(user?.role.name) || t(APP_ROLE_FALLBACK)}</p>
          </div>
          <nav className="top-links">
            <NavLink to="/admin"><BarChart3 size={18} />{t("Cockpit")}</NavLink>
            <NavLink to="/admin/reports"><ClipboardList size={18} />{t("Berichte")}</NavLink>
            <NavLink to="/admin/calendar"><CalendarDays size={18} />{t("Kalender")}</NavLink>
            <NavLink to="/admin/objects"><Building2 size={18} />{t("Projekte")}</NavLink>
            {isAdmin ? <NavLink to="/admin/employees"><Users size={18} />{t("Mitarbeiter")}</NavLink> : null}
            {isAdmin ? <NavLink to="/admin/crews"><HardHat size={18} />{t("Teams")}</NavLink> : null}
            {isAdmin ? <NavLink to="/admin/payroll"><ReceiptText size={18} />{t("Lohn")}</NavLink> : null}
            <LanguageSwitcher className="desktop-language-switcher" />
            <button className="link-button" onClick={logout} type="button"><LogOut size={18} />{t("Abmelden")}</button>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
