import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("worker@romans-erp.demo");
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
      setError("Не вдалося увійти. Перевірте email, пароль і доступність API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <span className="brand-chip">Roman's ERP</span>
        <h1>Вхід до системи</h1>
        <p>Єдина система для щоденних звітів, об'єктів, матеріалів і контролю годин.</p>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label className="field">
            Пароль
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={loading} type="submit">
            {loading ? "Вхід..." : "Увійти"}
          </button>
        </form>
        <div className="demo-logins">
          <button type="button" onClick={() => { setEmail("admin@romans-erp.demo"); setPassword("Admin12345"); }}>Admin</button>
          <button type="button" onClick={() => { setEmail("foreman@romans-erp.demo"); setPassword("Foreman12345"); }}>Foreman</button>
          <button type="button" onClick={() => { setEmail("worker@romans-erp.demo"); setPassword("Worker12345"); }}>Worker</button>
        </div>
      </section>
    </main>
  );
}

