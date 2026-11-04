import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN, getAccessToken, refreshSession } from '../lib/api';
import type { LiveEvent } from '../types';

const LIVE_EVENTS = [
  'incident:created',
  'incident:status_changed',
  'incident:updated',
  'incident:location_updated',
  'incident:acknowledged',
  'incident:resolved',
  'incident:cancelled',
  'incident:note_added',
  'notification:updated',
  'notification:delivered',
] as const;

interface RealtimeContextValue {
  connected: boolean;
  revision: number;
  lastEvent: LiveEvent | null;
  socketId: string | null;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Authenticated Socket.IO connection. The token is read at handshake time
 * from memory, so automatic reconnects use the freshest access token.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [revision, setRevision] = useState(0);
  const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(API_ORIGIN, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
      reconnectionAttempts: Infinity,
      auth: (callback: (data: { token: string }) => void) => {
        callback({ token: getAccessToken() ?? '' });
      },
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setSocketId(socket.id ?? null);
    };
    const onDisconnect = () => {
      setConnected(false);
      setSocketId(null);
    };
    const onConnectError = () => {
      setConnected(false);
      // The token may have expired while the socket was reconnecting.
      void refreshSession().then((session) => {
        if (session && !socket.connected) socket.connect();
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    for (const event of LIVE_EVENTS) {
      socket.on(event, (payload: unknown) => {
        setRevision((value) => value + 1);
        setLastEvent({ event, at: new Date().toISOString(), payload });
      });
    }

    return () => {
      for (const event of LIVE_EVENTS) socket.off(event);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const value = useMemo(
    () => ({ connected, revision, lastEvent, socketId }),
    [connected, revision, lastEvent, socketId],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used inside RealtimeProvider');
  return context;
}
