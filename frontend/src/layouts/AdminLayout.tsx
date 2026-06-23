import { BarChart3, Building2, CalendarDays, ClipboardList, HardHat, LogOut, ReceiptText, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { APP_NAME, APP_ROLE_FALLBACK } from "../lib/branding";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role.code === "admin";

  return (
    <div className="desktop-page">
      <div className="desktop-shell">
        <header className="desktop-header">
          <div className="brand">
            <h1>{APP_NAME}</h1>
            <p>{user?.role.name || APP_ROLE_FALLBACK}</p>
          </div>
          <nav className="top-links">
            <NavLink to="/admin"><BarChart3 size={18} />Cockpit</NavLink>
            <NavLink to="/admin/reports"><ClipboardList size={18} />Berichte</NavLink>
            <NavLink to="/admin/calendar"><CalendarDays size={18} />Kalender</NavLink>
            <NavLink to="/admin/objects"><Building2 size={18} />Projekte</NavLink>
            {isAdmin ? <NavLink to="/admin/employees"><Users size={18} />Mitarbeiter</NavLink> : null}
            {isAdmin ? <NavLink to="/admin/crews"><HardHat size={18} />Teams</NavLink> : null}
            {isAdmin ? <NavLink to="/admin/payroll"><ReceiptText size={18} />Lohn</NavLink> : null}
            <button className="link-button" onClick={logout} type="button"><LogOut size={18} />Abmelden</button>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
