import { CalendarDays, ClipboardPlus, Home, MoreHorizontal } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function MobileLayout() {
  return (
    <div className="mobile-page">
      <div className="mobile-shell">
        <div className="mobile-screen">
          <Outlet />
        </div>
        <nav className="bottom-nav">
          <NavLink to="/worker"><Home size={18} />Start</NavLink>
          <NavLink to="/worker/reports/new"><ClipboardPlus size={18} />Bericht</NavLink>
          <NavLink to="/worker/calendar"><CalendarDays size={18} />Kalender</NavLink>
          <NavLink to="/worker/more"><MoreHorizontal size={18} />Mehr</NavLink>
        </nav>
      </div>
    </div>
  );
}
