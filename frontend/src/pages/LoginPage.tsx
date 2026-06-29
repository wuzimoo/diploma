import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../hooks/useI18n";
import { APP_LOGIN_CHIP, APP_LOGIN_COPY, APP_LOGIN_HEADLINE, APP_NAME } from "../lib/branding";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export function LoginPage() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("worker@baupilot.demo");
  const [password, setPassword] = useState("Worker12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.role.code === "worker" ? "/worker" : "/admin"} replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const loggedUser = await login(email, password);
      navigate(loggedUser.role.code === "worker" ? "/worker" : "/admin", { replace: true });
    } catch {
      setError(t("Anmeldung fehlgeschlagen. Bitte E-Mail, Passwort und API-Verbindung prüfen."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-head-row">
          <span className="brand-chip">{t(APP_LOGIN_CHIP)}</span>
          <LanguageSwitcher className="login-language-switcher" />
        </div>
        <h1>{t(APP_LOGIN_HEADLINE)}</h1>
        <p><strong>{APP_NAME}</strong> {t("Bautagesberichte, Projektsteuerung und Freigaben in einer ruhigen Demo fur Bauunternehmen zusammen.")}</p>
        <p>{t(APP_LOGIN_COPY)}</p>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            {t("Email")}
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label className="field">
            {t("Passwort")}
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={loading} type="submit">
            {loading ? t("Anmeldung...") : t("Anmelden")}
          </button>
        </form>
        <div className="demo-logins">
          <button type="button" onClick={() => { setEmail("admin@baupilot.demo"); setPassword("Admin12345"); }}>{t("Admin")}</button>
          <button type="button" onClick={() => { setEmail("foreman@baupilot.demo"); setPassword("Foreman12345"); }}>{t("Polier")}</button>
          <button type="button" onClick={() => { setEmail("worker@baupilot.demo"); setPassword("Worker12345"); }}>{t("Mitarbeiter")}</button>
        </div>
      </section>
    </main>
  );
}
