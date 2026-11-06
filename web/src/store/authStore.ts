/**
 * Auth store — extended to call the real backend when available.
 * Falls back to in-memory demo auth when no backend is configured.
 */
import { create } from "zustand";
import { authApi, isBackendAvailable } from "../api/endpoints";

export type Role = "USER" | "GUARDIAN" | "ADMIN" | "POLICE";

export interface RegisterExtra {
  bloodGroup?: string;
  medicalInfo?: string;
  stealthPin?: string;
  relationType?: string;
  organization?: string;
  badgeId?: string;
  jurisdiction?: string;
  contacts?: { name: string; relation: string; phone: string }[];
}

interface AuthState {
  user: { id?: string; name: string; email: string; role: Role; accessToken?: string } | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, role?: Role) => Promise<void>;
  register: (input: {
    fullName: string; email: string; password: string;
    phone?: string; role?: Role; extra?: RegisterExtra;
  }) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem("aegis_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.accessToken && !localStorage.getItem("aegis:access_token")) {
          localStorage.setItem("aegis:access_token", parsed.accessToken);
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  })(),
  loading: false,
  error: null,

  login: async (email, password, role = "USER") => {
    set({ loading: true, error: null });
    if (isBackendAvailable()) {
      try {
        const data = await authApi.login(email, password);
        const loggedUser = {
          id: data.userId, name: data.fullName, email: data.email,
          role: data.role, accessToken: data.accessToken,
        };
        localStorage.setItem("aegis:access_token", data.accessToken);
        localStorage.setItem("aegis:refresh_token", data.refreshToken);
        localStorage.setItem("aegis_user", JSON.stringify(loggedUser));
        set({
          user: loggedUser,
          loading: false,
          error: null
        });
        return;
      } catch (e: any) {
        const errMsg = e?.response?.data?.message || e?.message || "Backend login failed";
        console.warn("[auth] backend login failed, falling back to demo:", errMsg);
        set({ error: `Backend login failed: ${errMsg}. Using offline demo fallback.` });
      }
    }
    const name = email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const demoUser = { name, email, role };
    localStorage.setItem("aegis_user", JSON.stringify(demoUser));
    set({ user: demoUser, loading: false });
  },

  register: async ({ fullName, email, password, phone, role = "USER", extra }) => {
    set({ loading: true, error: null });
    if (isBackendAvailable()) {
      try {
        const data = await authApi.register({
          fullName, email, password, phone,
          role: role === "POLICE" ? "USER" : role,
          bloodGroup: extra?.bloodGroup,
          medicalInfo: extra?.medicalInfo,
          stealthPin: extra?.stealthPin,
        });
        const registeredUser = {
          id: data.userId, name: data.fullName, email: data.email,
          role: data.role, accessToken: data.accessToken,
        };
        localStorage.setItem("aegis:access_token", data.accessToken);
        localStorage.setItem("aegis:refresh_token", data.refreshToken);
        localStorage.setItem("aegis_user", JSON.stringify(registeredUser));
        set({
          user: registeredUser,
          loading: false,
          error: null
        });
        return;
      } catch (e: any) {
        const errMsg = e?.response?.data?.message || e?.message || "Backend registration failed";
        console.warn("[auth] backend register failed, falling back to demo:", errMsg);
        set({ error: `Backend registration failed: ${errMsg}. Using offline demo fallback.` });
      }
    }
    const demoUser = { name: fullName, email, role };
    localStorage.setItem("aegis_user", JSON.stringify(demoUser));
    set({ user: demoUser, loading: false });
  },

  logout: () => {
    if (isBackendAvailable()) authApi.logout();
    localStorage.removeItem("aegis_user");
    localStorage.removeItem("aegis:access_token");
    localStorage.removeItem("aegis:refresh_token");
    set({ user: null, error: null });
  },
}));
