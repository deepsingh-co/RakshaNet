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
  appendLocations as apiAppendLocations,
  syncIncidents as apiSyncIncidents,
  updateIncidentStatus as apiUpdateIncidentStatus,
} from '../lib/api';
import { createClientId, deviceInfo } from '../lib/device';
import { isOnline, subscribeNetworkState } from '../lib/network';
import { buildIncidentPayload } from '../lib/reporting';
import { OFFLINE_DATA_KEY, readJson, writeJson } from '../lib/storage';
import type {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  LocationInput,
} from '../types';
import { useAuth } from './AuthContext';
import {
  attachLocationToRecord,
  cancelBeforeSync,
  emptyOfflineData,
  enqueueIncident,
  enqueueLocation,
  enqueueStatus,
  markPendingOffline,
  mergeAfterSync,
  normalizeOfflineData,
  pendingCount,
  recordsForUser,
  retryIncident,
  type DeviceIncidentRecord,
  type OfflineData,
} from '../offline/outbox';
import { runSync, type SyncReport, type SyncTransport } from '../offline/sync';

const transport: SyncTransport = {
  syncIncidents: (payloads) => apiSyncIncidents(payloads),
  appendLocations: (serverId, locations) => apiAppendLocations(serverId, locations),
  updateStatus: (serverId, status, note) => apiUpdateIncidentStatus(serverId, status, note),
};

export interface CreateIncidentInput {
  type: IncidentType;
  severity?: IncidentSeverity;
  description?: string;
  location?: LocationInput | null;
}

interface OutboxContextValue {
  ready: boolean;
  syncing: boolean;
  records: DeviceIncidentRecord[];
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  report: SyncReport | null;
  createIncident: (input: CreateIncidentInput) => Promise<DeviceIncidentRecord>;
  attachLocation: (clientIncidentId: string, location: LocationInput) => void;
  queueLocation: (incidentServerId: string, location: LocationInput) => void;
  queueStatus: (
    incidentServerId: string,
    status: IncidentStatus,
    note?: string,
  ) => void;
  cancelLocal: (clientIncidentId: string) => void;
  retry: (clientIncidentId: string) => void;
  syncNow: () => Promise<void>;
}

const OutboxContext = createContext<OutboxContextValue | null>(null);

export function OutboxProvider({ children }: { children: ReactNode }) {
  const { ready: authReady, user, offlineSession, tryReconnect } = useAuth();
  const [data, setData] = useState<OfflineData>(() => emptyOfflineData());
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const dataRef = useRef<OfflineData>(data);
  const syncPromise = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const commit = useCallback((next: OfflineData) => {
    dataRef.current = next;
    setData(next);
    void writeJson(OFFLINE_DATA_KEY, next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await readJson<unknown>(OFFLINE_DATA_KEY, null);
      if (cancelled) return;
      const loaded = normalizeOfflineData(raw);
      dataRef.current = loaded;
      setData(loaded);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createIncident = useCallback(
    async (input: CreateIncidentInput): Promise<DeviceIncidentRecord> => {
      if (!user) throw new Error('Sign in before creating an alert');
      const clientIncidentId = createClientId();
      const startedAt = new Date().toISOString();
      const online = await isOnline();
      const payload = buildIncidentPayload({
        clientIncidentId,
        type: input.type,
        severity:
          input.severity ??
          (input.type === 'SOS' ? 'CRITICAL' : input.type === 'MANUAL' ? 'MEDIUM' : 'HIGH'),
        description: input.description,
        startedAt,
        offlineCreated: !online,
        location: input.location ?? null,
        device: deviceInfo(),
      });
      const record: DeviceIncidentRecord = {
        clientIncidentId,
        ownerUserId: user.id,
        payload,
        serverId: null,
        serverStatus: null,
        syncState: 'PENDING_SYNC',
        error: null,
        createdAt: startedAt,
        updatedAt: startedAt,
        lastSyncedAt: null,
        offlineDelaySeconds: 0,
        notifications: null,
      };
      commit(enqueueIncident(dataRef.current, record));
      void syncNowRef.current?.();
      return record;
    },
    [commit, user],
  );

  const syncNow = useCallback(async () => {
    if (!user || !ready) return;
    if (syncPromise.current) return syncPromise.current;

    if (!pendingCount(dataRef.current, user.id)) {
      setSyncing(false);
      return;
    }

    const promise = (async () => {
      if (mounted.current) setSyncing(true);
      try {
        if (offlineSession) await tryReconnect();
        const before = dataRef.current;
        const outcome = await runSync(before, user.id, transport);
        let synced = outcome.data;
        if (outcome.report.networkFailure) {
          // The alert never reached the server. Record the original device
          // time and mark it offline-created so the delay is visible.
          synced = markPendingOffline(synced, user.id);
        }
        const merged = mergeAfterSync(before, synced, dataRef.current);
        commit(merged);
        if (mounted.current) setReport(outcome.report);
      } catch (error) {
        if (!mounted.current) return;
        setReport({
          attemptedIncidents: 0,
          syncedIncidentIds: [],
          retryIncidentIds: [],
          failedIncidentIds: [],
          attemptedLocations: 0,
          removedLocationIds: [],
          attemptedStatuses: 0,
          removedStatusIds: [],
          networkFailure: true,
          errors: [error instanceof Error ? error.message : 'Sync failed'],
          lastSyncedAt: null,
        });
      } finally {
        if (mounted.current) setSyncing(false);
      }
    })();

    syncPromise.current = promise;
    try {
      await promise;
    } finally {
      syncPromise.current = null;
    }
  }, [commit, offlineSession, ready, tryReconnect, user]);

  // The create flow needs the latest syncNow without depending on it (and
  // creating a dependency cycle in useCallback).
  const syncNowRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  const attachLocation = useCallback(
    (clientIncidentId: string, location: LocationInput) => {
      commit(attachLocationToRecord(dataRef.current, clientIncidentId, location));
      void syncNow();
    },
    [commit, syncNow],
  );

  const queueLocation = useCallback(
    (incidentServerId: string, location: LocationInput) => {
      if (!user) return;
      const clientLocationId = location.clientLocationId ?? createClientId();
      commit(
        enqueueLocation(dataRef.current, {
          clientLocationId,
          incidentServerId,
          ownerUserId: user.id,
          body: { ...location, clientLocationId },
          queuedAt: new Date().toISOString(),
        }),
      );
      void syncNow();
    },
    [commit, syncNow, user],
  );

  const queueStatus = useCallback(
    (incidentServerId: string, status: IncidentStatus, note = '') => {
      if (!user) return;
      commit(
        enqueueStatus(dataRef.current, {
          id: createClientId(),
          incidentServerId,
          ownerUserId: user.id,
          status,
          note,
          queuedAt: new Date().toISOString(),
        }),
      );
      void syncNow();
    },
    [commit, syncNow, user],
  );

  const cancelLocal = useCallback(
    (clientIncidentId: string) => {
      commit(cancelBeforeSync(dataRef.current, clientIncidentId));
    },
    [commit],
  );

  const retry = useCallback(
    (clientIncidentId: string) => {
      commit(retryIncident(dataRef.current, clientIncidentId));
      void syncNow();
    },
    [commit, syncNow],
  );

  /* Auto-sync on login, network regain, foreground and a slow retry loop. */
  useEffect(() => {
    if (!authReady || !ready || !user) return;
    void syncNow();

    const unsubscribeNetwork = subscribeNetworkState((online) => {
      if (online) void syncNow();
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    const interval = setInterval(() => {
      if (pendingCount(dataRef.current, user.id) > 0) void syncNow();
    }, 60_000);

    return () => {
      unsubscribeNetwork();
      subscription.remove();
      clearInterval(interval);
    };
  }, [authReady, ready, syncNow, user]);

  const records = useMemo(
    () => (user ? recordsForUser(data, user.id) : []),
    [data, user],
  );
  const pending = useMemo(() => (user ? pendingCount(data, user.id) : 0), [data, user]);

  const value = useMemo<OutboxContextValue>(
    () => ({
      ready,
      syncing,
      records,
      pending,
      lastSyncedAt: data.lastSyncedAt,
      lastError: report?.errors[0] ?? null,
      report,
      createIncident,
      attachLocation,
      queueLocation,
      queueStatus,
      cancelLocal,
      retry,
      syncNow,
    }),
    [
      ready,
      syncing,
      records,
      pending,
      data.lastSyncedAt,
      report,
      createIncident,
      attachLocation,
      queueLocation,
      queueStatus,
      cancelLocal,
      retry,
      syncNow,
    ],
  );

  return <OutboxContext.Provider value={value}>{children}</OutboxContext.Provider>;
}

export function useOutbox(): OutboxContextValue {
  const context = useContext(OutboxContext);
  if (!context) throw new Error('useOutbox must be used inside OutboxProvider');
  return context;
}
