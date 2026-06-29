import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export const tokenStorageKey = "baupilot_token";
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");
export const authInvalidEvent = "baupilot:auth-invalid";

export function clearStoredAuth(notify = true) {
  localStorage.removeItem(tokenStorageKey);
  if (notify && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(authInvalidEvent));
  }
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenStorageKey);
  const isLoginRequest = typeof config.url === "string" && /\/auth\/login\/?$/.test(config.url);
  if (token && !isLoginRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;
    const isLoginRequest = typeof url === "string" && /\/auth\/login\/?$/.test(url);
    if (status === 401 && !isLoginRequest) {
      clearStoredAuth();
    }
    return Promise.reject(error);
  },
);

export function resolveApiUrl(path: string) {
  if (!path) return path;
  const normalizedPath = path.startsWith("/report-photos/")
    ? `/api${path}`
    : path;

  if (/^https?:\/\//i.test(normalizedPath)) {
    const url = new URL(normalizedPath);
    if (url.pathname.startsWith("/report-photos/")) {
      url.pathname = `/api${url.pathname}`;
    }
    return url.toString();
  }

  return `${API_ORIGIN}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}
