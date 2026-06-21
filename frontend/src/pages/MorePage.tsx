import { LogOut } from "lucide-react";

import { useAuth } from "../hooks/useAuth";

export function MorePage() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="mobile-header">
        <h1>Додатково</h1>
        <p>{user?.email}</p>
      </header>
      <main className="mobile-content more-page-content">
        <section className="summary-card stack more-profile-card">
          <div className="more-profile-head">
            <div className="more-profile-avatar" aria-hidden="true">
              {(user?.full_name || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="stack compact-stack">
              <strong>{user?.full_name}</strong>
              <span className="text-muted">{user?.role.name}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-block" onClick={logout} type="button"><LogOut size={18} />Вийти</button>
        </section>
      </main>
    </>
  );
}
