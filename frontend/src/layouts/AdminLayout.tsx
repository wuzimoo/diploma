import { BarChart3, Building2, CalendarDays, ClipboardList, HardHat, LogOut, ReceiptText, Settings2, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../hooks/useI18n";
import { APP_NAME, APP_ROLE_FALLBACK } from "../lib/branding";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { t, translateText } = useI18n();
  const isAdmin = user?.role.code === "admin";

  return (
    <div className="desktop-page">
      <div className="desktop-shell">
        <aside className="desktop-sidebar">
          <div className="desktop-sidebar-brand">
            <div className="desktop-brand-mark" aria-hidden="true">
              <img src="/baupilot-icon.png" alt="" />
            </div>
            <div className="brand">
              <h1>{APP_NAME}</h1>
              <p>{translateText(user?.role.name) || t(APP_ROLE_FALLBACK)}</p>
            </div>
          </div>

          <div className="sidebar-group">
            <span className="sidebar-group-label">{t("Arbeitsbereich")}</span>
            <nav className="sidebar-nav">
              <NavLink to="/admin"><BarChart3 size={18} />{t("Cockpit")}</NavLink>
              <NavLink to="/admin/reports"><ClipboardList size={18} />{t("Berichte")}</NavLink>
              <NavLink to="/admin/calendar"><CalendarDays size={18} />{t("Kalender")}</NavLink>
              <NavLink to="/admin/objects"><Building2 size={18} />{t("Projekte")}</NavLink>
              {isAdmin ? <NavLink to="/admin/employees"><Users size={18} />{t("Mitarbeiter")}</NavLink> : null}
              {isAdmin ? <NavLink to="/admin/crews"><HardHat size={18} />{t("Kolonnen")}</NavLink> : null}
              {isAdmin ? <NavLink to="/admin/payroll"><ReceiptText size={18} />{t("Lohn")}</NavLink> : null}
            </nav>
          </div>

          <div className="sidebar-group sidebar-group-secondary">
            <span className="sidebar-group-label">{t("Systemzugang")}</span>
            <nav className="sidebar-nav">
              <NavLink to="/admin/settings"><Settings2 size={18} />{t("Einstellungen")}</NavLink>
            </nav>
          </div>

          <div className="desktop-sidebar-footer">
            <div className="sidebar-user-card">
              <span className="eyebrow">{t("Aktive Rolle")}</span>
              <strong>{user?.full_name}</strong>
              <p>{user?.email}</p>
            </div>
            <button className="btn btn-secondary btn-block" onClick={logout} type="button">
              <LogOut size={18} />
              {t("Abmelden")}
            </button>
          </div>
        </aside>

        <div className="desktop-main">
          <header className="desktop-header">
            <div className="workspace-header-copy">
              <span className="eyebrow">{t("Kundendemo-Workspace")}</span>
              <h2>{t("Operative Steuerung fur Bauunternehmen")}</h2>
            </div>
            <div className="workspace-header-actions">
              <div className="workspace-role-pill">{translateText(user?.role.name)}</div>
              <NavLink className="btn btn-secondary btn-sm" to="/admin/settings">
                <Settings2 size={16} />
                {t("Einstellungen")}
              </NavLink>
            </div>
          </header>
          <main className="desktop-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
