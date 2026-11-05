/**
 * API client for the imported advanced feature pages.
 *
 * These pages originally targeted separate services (a Spring Boot API for
 * pods/blockchain/safe-ride and a FastAPI AI service). Those services are NOT
 * part of RakshaNet. This client therefore refuses to make a request unless
 * the corresponding URL is explicitly configured:
 *
 *   VITE_FEATURES_API_URL  e.g. http://localhost:8080
 *   VITE_FEATURES_AI_URL   e.g. http://localhost:8000
 *
 * With no URL configured, requests fail immediately with a clear message and
 * the pages use their own local demo fallbacks. That keeps the distinction
 * between "demo" and "live" honest.
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'aegis:access_token';
const REFRESH_KEY = 'aegis:refresh_token';

const FEATURES_API = (import.meta.env.VITE_FEATURES_API_URL as string | undefined)?.trim();
const FEATURES_AI = (import.meta.env.VITE_FEATURES_AI_URL as string | undefined)?.trim();

export const isFeaturesBackendConfigured = Boolean(FEATURES_API);
export const isFeaturesAiConfigured = Boolean(FEATURES_AI);

export const api = axios.create({
  baseURL: FEATURES_API || '',
  timeout: 8_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  if (!FEATURES_API) {
    return Promise.reject(
      new Error('Advanced features backend is not configured (VITE_FEATURES_API_URL).'),
    );
  }
  const t = localStorage.getItem(TOKEN_KEY);
  if (t && cfg.headers) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

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
      } catch {
        refreshing = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
    }
    return Promise.reject(err);
  },
);

export const tokenStore = {
  set(access: string, refresh: string) {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  get() {
    return localStorage.getItem(TOKEN_KEY);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const isBackendAvailable = () => isFeaturesBackendConfigured;

export const aiApi = axios.create({
  baseURL: FEATURES_AI || '',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

aiApi.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  if (!FEATURES_AI) {
    return Promise.reject(
      new Error('Advanced AI service is not configured (VITE_FEATURES_AI_URL).'),
    );
  }
  return cfg;
});
