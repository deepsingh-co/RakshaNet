import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  bootstrapSession,
  loginRequest,
  logoutAllRequest,
  logoutRequest,
  refreshSession,
  requestAccountDeletion,
  setAccessToken,
  setUnauthorizedHandler,
} from '../lib/api';
import type { PublicUser } from '../types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  requestDeletion: () => Promise<void>;
  updateUser: (user: PublicUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let active = true;

    setUnauthorizedHandler(() => {
      if (!active) return;
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    });

    void bootstrapSession()
      .then((session) => {
        if (!active) return;
        if (session) {
          setUser(session.user);
          setStatus('authenticated');
        } else {
          setStatus('anonymous');
        }
      })
      .catch(() => {
        if (active) setStatus('anonymous');
      });

    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  // Keep the in-memory access token fresh while a session is active. This
  // also gives Socket.IO a valid token on every reconnect attempt.
  useEffect(() => {
    if (status !== 'authenticated') return;
    const timer = window.setInterval(
      () => {
        void refreshSession().then((session) => {
          if (session) setUser(session.user);
        });
      },
      10 * 60 * 1000,
    );
    return () => window.clearInterval(timer);
  }, [status]);

  const login = useCallback(async (identifier: string, password: string) => {
    const session = await loginRequest(identifier, password);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const logoutAll = useCallback(async () => {
    await logoutAllRequest();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const requestDeletion = useCallback(async () => {
    await requestAccountDeletion();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const updateUser = useCallback((next: PublicUser) => setUser(next), []);

  const value = useMemo(
    () => ({ status, user, login, logout, logoutAll, requestDeletion, updateUser }),
    [status, user, login, logout, logoutAll, requestDeletion, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
