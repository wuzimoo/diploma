import { HardHat, Languages, LogOut, MonitorCog, ShieldCheck } from "lucide-react";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../hooks/useI18n";
import { APP_NAME } from "../lib/branding";

export function SettingsPage({ mobile = false }: { mobile?: boolean }) {
  const { user, logout } = useAuth();
  const { t, translateText } = useI18n();

  const roleFocus =
    user?.role.code === "admin"
      ? t("Geschäftsleitung sieht Freigaben, Payroll und Stammdaten.")
      : user?.role.code === "foreman"
        ? t("Poliere koordinieren Teams, prüfen Berichte und steuern Projekte.")
        : t("Mitarbeiter erfassen Berichte, prüfen den Kalender und senden Medien vom Einsatz.");

  const content = (
    <div className={`settings-grid ${mobile ? "settings-grid-mobile" : ""}`}>
      <section className="summary-card settings-card settings-account-card">
        <div className="settings-card-head">
          <div className="settings-avatar" aria-hidden="true">
            {(user?.full_name || "B").slice(0, 1).toUpperCase()}
          </div>
          <div className="stack compact-stack">
            <strong>{user?.full_name}</strong>
            <span className="text-muted">{user?.email}</span>
          </div>
        </div>
        <div className="settings-meta-grid">
          <div className="settings-meta-item">
            <span>{t("Aktive Rolle")}</span>
            <strong>{translateText(user?.role.name)}</strong>
          </div>
          <div className="settings-meta-item">
            <span>{t("Arbeitsbereich")}</span>
            <strong>{t("Kundendemo-Workspace")}</strong>
          </div>
        </div>
      </section>

      <section className="table-card settings-card">
        <div className="settings-section-head">
          <div className="settings-section-icon"><Languages size={18} /></div>
          <div>
            <h3 className="section-title">{t("Sprache und Darstellung")}</h3>
            <p className="section-subtitle">{t("Sprache für diese Rolle wechseln.")}</p>
          </div>
        </div>
        <LanguageSwitcher className="settings-language-switcher" />
        <p className="helper">{t("Einstellungen bleiben auf diesem Gerät gespeichert.")}</p>
      </section>

      <section className="table-card settings-card">
        <div className="settings-section-head">
          <div className="settings-section-icon"><HardHat size={18} /></div>
          <div>
            <h3 className="section-title">{t("Rollenfokus")}</h3>
            <p className="section-subtitle">{roleFocus}</p>
          </div>
        </div>
        <div className="settings-pills">
          <span className="member-pill">{APP_NAME}</span>
          <span className="member-pill">{translateText(user?.role.name)}</span>
          <span className="member-pill">{t("3 Sprachen aktiv")}</span>
        </div>
      </section>

      <section className="table-card settings-card">
        <div className="settings-section-head">
          <div className="settings-section-icon"><MonitorCog size={18} /></div>
          <div>
            <h3 className="section-title">{t("Sitzung")}</h3>
            <p className="section-subtitle">{t("Sicher abmelden oder die Demo-Zugänge wechseln.")}</p>
          </div>
        </div>
        <div className="settings-session-list">
          <div className="settings-session-item">
            <ShieldCheck size={16} />
            <span>{t("Demo-Zugänge")}</span>
          </div>
          <div className="settings-session-item">
            <ShieldCheck size={16} />
            <span>{t("API und Sprache bleiben mit dieser Sitzung verbunden.")}</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={logout} type="button">
          <LogOut size={18} />
          {t("Abmelden")}
        </button>
      </section>
    </div>
  );

  if (mobile) {
    return (
      <>
        <header className="mobile-header settings-mobile-header">
          <h1>{t("Einstellungen")}</h1>
          <p>{t("Persönliche Einstellungen und Sprache fur diese Rolle.")}</p>
        </header>
      <main className="mobile-content settings-page-content settings-page-content-mobile">{content}</main>
      </>
    );
  }

  return (
    <section className="stack settings-page">
      <div className="section-shell-card">
        <p className="eyebrow">{t("Einstellungen")}</p>
        <h2 className="section-title">{t("Persönliche Einstellungen und Sprache fur diese Rolle.")}</h2>
      </div>
      {content}
    </section>
  );
}
