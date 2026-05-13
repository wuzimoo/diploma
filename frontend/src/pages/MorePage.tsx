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
      <main className="mobile-content">
        <section className="summary-card stack">
          <strong>{user?.full_name}</strong>
          <span className="text-muted">{user?.role.name}</span>
          <button className="btn btn-secondary btn-block" onClick={logout} type="button"><LogOut size={18} />Вийти</button>
        </section>
      </main>
    </>
  );
}

