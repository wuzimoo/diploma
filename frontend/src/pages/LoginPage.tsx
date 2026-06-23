import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { APP_LOGIN_CHIP, APP_LOGIN_COPY, APP_LOGIN_HEADLINE, APP_NAME } from "../lib/branding";

export function LoginPage() {
  const { user, login } = useAuth();
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
      setError("Anmeldung fehlgeschlagen. Bitte E-Mail, Passwort und API-Verbindung prufen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <span className="brand-chip">{APP_LOGIN_CHIP}</span>
        <h1>{APP_LOGIN_HEADLINE}</h1>
        <p><strong>{APP_NAME}</strong> fasst Bautagesberichte, Projektsteuerung und Freigaben in einer ruhigen Demo fur Bauunternehmen zusammen.</p>
        <p>{APP_LOGIN_COPY}</p>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label className="field">
            Passwort
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={loading} type="submit">
            {loading ? "Anmeldung..." : "Anmelden"}
          </button>
        </form>
        <div className="demo-logins">
          <button type="button" onClick={() => { setEmail("admin@baupilot.demo"); setPassword("Admin12345"); }}>Admin</button>
          <button type="button" onClick={() => { setEmail("foreman@baupilot.demo"); setPassword("Foreman12345"); }}>Polier</button>
          <button type="button" onClick={() => { setEmail("worker@baupilot.demo"); setPassword("Worker12345"); }}>Mitarbeiter</button>
        </div>
      </section>
    </main>
  );
}
