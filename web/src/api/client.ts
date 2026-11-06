/**
 * AEGIS API client — Axios instance with JWT interceptors.
 *
 * Env vars (Vite):
 *   VITE_API_BASE_URL  — e.g. http://localhost:8080
 *   VITE_WS_URL        — e.g. ws://localhost:8080/ws
 *
 * When the backend is unreachable, calls fail gracefully and the stores
 * fall back to the Zustand demo data.
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const TOKEN_KEY = "aegis:access_token";
const REFRESH_KEY = "aegis:refresh_token";

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string) || "",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ── Attach JWT on every request ─────────────────────────────────────
api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t && cfg.headers) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// ── 401 → attempt refresh once, else logout ─────────────────────────
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!original) return Promise.reject(err);

    if ((err.response?.status === 401 || err.response?.status === 403) && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (!refresh) {
        localStorage.removeItem(TOKEN_KEY);
        return Promise.reject(err);
      }
      try {
        refreshing ??= (async () => {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/api/v1/auth/refresh`,
            { refreshToken: refresh },
          );
          localStorage.setItem(TOKEN_KEY, data.accessToken);
          localStorage.setItem(REFRESH_KEY, data.refreshToken);
          return data.accessToken as string;
        })();
        const newToken = await refreshing;
        refreshing = null;
        if (newToken && original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch (e) {
        refreshing = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
    }
    return Promise.reject(err);
  },
);

// ── Token helpers ───────────────────────────────────────────────────
export const tokenStore = {
  set(access: string, refresh: string) {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  get() { return localStorage.getItem(TOKEN_KEY); },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const isBackendAvailable = () => Boolean(import.meta.env.VITE_API_BASE_URL);

export const aiApi = axios.create({
  baseURL: (import.meta.env.VITE_AI_API_BASE_URL as string) || "http://127.0.0.1:8000",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

