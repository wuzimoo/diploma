import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { api, tokenStorageKey } from "../services/api";
import { User } from "../types/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(tokenStorageKey);
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth/me")
      .then((response) => setUser(response.data))
      .catch(() => localStorage.removeItem(tokenStorageKey))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email: string, password: string) {
        const form = new URLSearchParams();
        form.set("username", email);
        form.set("password", password);
        const tokenResponse = await api.post("/auth/login", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        localStorage.setItem(tokenStorageKey, tokenResponse.data.access_token);
        const me = await api.get<User>("/auth/me");
        setUser(me.data);
        return me.data;
      },
      logout() {
        localStorage.removeItem(tokenStorageKey);
        setUser(null);
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

