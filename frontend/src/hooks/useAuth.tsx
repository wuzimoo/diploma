import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { api, authInvalidEvent, clearStoredAuth, tokenStorageKey } from "../services/api";
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
      .catch(() => {
        clearStoredAuth(false);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleAuthInvalid() {
      setUser(null);
      setLoading(false);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === tokenStorageKey && !event.newValue) {
        handleAuthInvalid();
      }
    }

    window.addEventListener(authInvalidEvent, handleAuthInvalid);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(authInvalidEvent, handleAuthInvalid);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email: string, password: string) {
        clearStoredAuth(false);
        setUser(null);
        const form = new URLSearchParams();
        form.set("username", email);
        form.set("password", password);
        try {
          const tokenResponse = await api.post("/auth/login", form, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
          });
          localStorage.setItem(tokenStorageKey, tokenResponse.data.access_token);
          const me = await api.get<User>("/auth/me");
          setUser(me.data);
          return me.data;
        } catch (error) {
          clearStoredAuth(false);
          setUser(null);
          throw error;
        }
      },
      logout() {
        clearStoredAuth(false);
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
