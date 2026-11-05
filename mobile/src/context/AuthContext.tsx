import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import {
  ApiRequestError,
  fetchMe,
  getAccessToken,
  loginRequest,
  logoutAllRequest,
  logoutRequest,
  refreshSessionDetailed,
  registerRequest,
  setUnauthorizedHandler,
} from '../lib/api';
import { subscribeNetworkState } from '../lib/network';
import { readJson, removeKey, writeJson } from '../lib/storage';
import type { AuthResponse, PublicUser } from '../types';

const LAST_USER_KEY = 'suraksha.last-user.v1';

export interface SignUpInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  accountType: 'INDIVIDUAL' | 'GUARDIAN';
}

interface AuthContextValue {
  ready: boolean;
  user: PublicUser | null;
  /** Session restored from the device cache while the server is unreachable. */
  offlineSession: boolean;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: PublicUser) => void;
  tryReconnect: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFor(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'No internet connection. Your safety tools still work offline.';
    }
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [offlineSession, setOfflineSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const cacheUser = useCallback(async (next: PublicUser | null) => {
    if (next) await writeJson(LAST_USER_KEY, next);
    else await removeKey(LAST_USER_KEY);
  }, []);

  const applySession = useCallback(
    async (session: AuthResponse) => {
      setUser(session.user);
      setOfflineSession(false);
      await cacheUser(session.user);
    },
    [cacheUser],
  );

  /* Restore the session. If the server is unreachable, a cached profile keeps
   * the SOS screen usable — the refresh token stays on the device. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readJson<PublicUser | null>(LAST_USER_KEY, null);
      const result = await refreshSessionDetailed();
      if (cancelled) return;
      if (result.session) {
        setUser(result.session.user);
        setOfflineSession(false);
        await cacheUser(result.session.user);
      } else if (result.offline && cached) {
        setUser(cached);
        setOfflineSession(true);
      } else {
        setUser(null);
        setOfflineSession(false);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheUser]);

  const clearLocalSession = useCallback(async () => {
    setUser(null);
    setOfflineSession(false);
    await cacheUser(null);
  }, [cacheUser]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearLocalSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearLocalSession]);

  const tryReconnect = useCallback(async () => {
    if (!user) return;
    // A live access token means there is nothing to fix right now.
    if (getAccessToken() && !offlineSession) return;
    const result = await refreshSessionDetailed();
    if (!mounted.current) return;
    if (result.session) {
      await applySession(result.session);
    } else if (!result.offline) {
      await clearLocalSession();
    }
  }, [applySession, clearLocalSession, offlineSession, user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribeNetwork = subscribeNetworkState((online) => {
      if (online) void tryReconnect();
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void tryReconnect();
    });
    return () => {
      unsubscribeNetwork();
      subscription.remove();
    };
  }, [tryReconnect, user]);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      setBusy(true);
      setError(null);
      try {
        const session = await loginRequest(identifier, password);
        await applySession(session);
      } catch (err) {
        setError(messageFor(err));
        throw err;
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [applySession],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      setBusy(true);
      setError(null);
      try {
        const session = await registerRequest(input);
        await applySession(session);
      } catch (err) {
        setError(messageFor(err));
        throw err;
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await logoutRequest();
    } catch {
      // Best effort: the local session is cleared regardless.
    } finally {
      await clearLocalSession();
      if (mounted.current) setBusy(false);
    }
  }, [clearLocalSession]);

  const signOutAllDevices = useCallback(async () => {
    setBusy(true);
    try {
      await logoutAllRequest();
    } catch {
      // Best effort.
    } finally {
      await clearLocalSession();
      if (mounted.current) setBusy(false);
    }
  }, [clearLocalSession]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetchMe();
      setUser(response.user);
      setOfflineSession(false);
      await cacheUser(response.user);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'NETWORK_ERROR') return;
    }
  }, [cacheUser, user]);

  const updateUser = useCallback(
    (next: PublicUser) => {
      setUser(next);
      void cacheUser(next);
    },
    [cacheUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      offlineSession,
      busy,
      error,
      clearError: () => setError(null),
      signIn,
      signUp,
      signOut,
      signOutAllDevices,
      refreshUser,
      updateUser,
      tryReconnect,
    }),
    [
      ready,
      user,
      offlineSession,
      busy,
      error,
      signIn,
      signUp,
      signOut,
      signOutAllDevices,
      refreshUser,
      updateUser,
      tryReconnect,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
