import { CalendarDays, ClipboardPlus, Home, MoreHorizontal } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function MobileLayout() {
  return (
    <div className="mobile-page">
      <div className="mobile-shell">
        <Outlet />
        <nav className="bottom-nav">
          <NavLink to="/worker"><Home size={18} />Головна</NavLink>
          <NavLink to="/worker/reports/new"><ClipboardPlus size={18} />Звіт</NavLink>
          <NavLink to="/worker/calendar"><CalendarDays size={18} />Календар</NavLink>
          <NavLink to="/worker/more"><MoreHorizontal size={18} />Ще</NavLink>
        </nav>
      </div>
    </div>
  );
}

