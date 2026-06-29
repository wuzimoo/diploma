import { LogOut } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../hooks/useI18n";

export function MorePage() {
  const { user, logout } = useAuth();
  const { t, translateText } = useI18n();
  return (
    <>
      <header className="mobile-header">
        <h1>{t("Mehr")}</h1>
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
              <span className="text-muted">{translateText(user?.role.name)}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-block" onClick={logout} type="button"><LogOut size={18} />{t("Abmelden")}</button>
        </section>
      </main>
    </>
  );
}
