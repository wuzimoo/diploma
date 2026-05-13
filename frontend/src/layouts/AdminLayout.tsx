import { BarChart3, Building2, ClipboardList, LogOut, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="desktop-page">
      <div className="desktop-shell">
        <header className="desktop-header">
          <div className="brand">
            <h1>Roman's ERP</h1>
            <p>{user?.role.name || "Керування будівельною компанією"}</p>
          </div>
          <nav className="top-links">
            <NavLink to="/admin"><BarChart3 size={18} />Панель</NavLink>
            <NavLink to="/admin/reports"><ClipboardList size={18} />Звіти</NavLink>
            <NavLink to="/admin/employees"><Users size={18} />Працівники</NavLink>
            <NavLink to="/admin/objects"><Building2 size={18} />Об'єкти</NavLink>
            <button className="link-button" onClick={logout} type="button"><LogOut size={18} />Вийти</button>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

