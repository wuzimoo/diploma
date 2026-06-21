import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export const tokenStorageKey = "romans_erp_token";
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenStorageKey);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
