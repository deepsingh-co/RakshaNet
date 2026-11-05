import type {
  IncidentCreatePayload,
  IncidentStatus,
  IncidentSyncResult,
  LocationInput,
  NotificationSummary,
} from '../types';

export type LocalSyncState = 'PENDING_SYNC' | 'SYNCED' | 'SYNC_FAILED' | 'CANCELLED_LOCAL';

/** A device-created incident. The payload is kept so a retry is byte-for-byte
 * idempotent via `clientIncidentId`. */
export interface DeviceIncidentRecord {
  clientIncidentId: string;
  ownerUserId: string;
  payload: IncidentCreatePayload;
  serverId: string | null;
  serverStatus: IncidentStatus | null;
  syncState: LocalSyncState;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
  offlineDelaySeconds: number;
  notifications: NotificationSummary | null;
}

export interface PendingLocation {
  clientLocationId: string;
  incidentServerId: string;
  ownerUserId: string;
  body: LocationInput;
  queuedAt: string;
}

export interface PendingStatus {
  id: string;
  incidentServerId: string;
  ownerUserId: string;
  status: IncidentStatus;
  note: string;
  queuedAt: string;
}

export interface OutboxState {
  incidentIds: string[];
  locations: PendingLocation[];
  statuses: PendingStatus[];
}

export interface OfflineData {
  records: DeviceIncidentRecord[];
  outbox: OutboxState;
  lastSyncedAt: string | null;
}

const MAX_RECORDS = 100;

export function emptyOfflineData(): OfflineData {
  return {
    records: [],
    outbox: { incidentIds: [], locations: [], statuses: [] },
    lastSyncedAt: null,
  };
}

/** Tolerate an older/corrupt persisted shape instead of crashing on boot. */
export function normalizeOfflineData(raw: unknown): OfflineData {
  if (!raw || typeof raw !== 'object') return emptyOfflineData();
  const candidate = raw as Partial<OfflineData>;
  const records = Array.isArray(candidate.records)
    ? candidate.records.filter(
        (record): record is DeviceIncidentRecord =>
          Boolean(
            record &&
              typeof record === 'object' &&
              'clientIncidentId' in record &&
              'payload' in record,
          ),
      )
    : [];
  const outboxCandidate = candidate.outbox as Partial<OutboxState> | undefined;
  const known = new Set(records.map((record) => record.clientIncidentId));
  const incidentIds = Array.isArray(outboxCandidate?.incidentIds)
    ? [...new Set(outboxCandidate!.incidentIds.filter((id) => known.has(id)))]
    : [];
  return {
    records,
    outbox: {
      incidentIds,
      locations: Array.isArray(outboxCandidate?.locations) ? outboxCandidate!.locations : [],
      statuses: Array.isArray(outboxCandidate?.statuses) ? outboxCandidate!.statuses : [],
    },
    lastSyncedAt: candidate.lastSyncedAt ?? null,
  };
}

function touch(record: DeviceIncidentRecord, patch: Partial<DeviceIncidentRecord>): DeviceIncidentRecord {
  return { ...record, ...patch, updatedAt: new Date().toISOString() };
}

function replaceRecord(
  data: OfflineData,
  clientIncidentId: string,
  patch: Partial<DeviceIncidentRecord>,
): OfflineData {
  return {
    ...data,
    records: data.records.map((record) =>
      record.clientIncidentId === clientIncidentId ? touch(record, patch) : record,
    ),
  };
}

export function addRecord(data: OfflineData, record: DeviceIncidentRecord): OfflineData {
  const others = data.records.filter(
    (existing) => existing.clientIncidentId !== record.clientIncidentId,
  );
  const records = [record, ...others]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_RECORDS);
  return { ...data, records };
}

export function enqueueIncident(data: OfflineData, record: DeviceIncidentRecord): OfflineData {
  const next = addRecord(data, record);
  return {
    ...next,
    outbox: {
      ...next.outbox,
      incidentIds: [...new Set([...next.outbox.incidentIds, record.clientIncidentId])],
    },
  };
}

export function markIncidentSynced(
  data: OfflineData,
  clientIncidentId: string,
  result: Pick<IncidentSyncResult, 'serverId' | 'status' | 'offlineDelaySeconds' | 'notifications'>,
): OfflineData {
  return {
    ...replaceRecord(data, clientIncidentId, {
      serverId: result.serverId ?? null,
      serverStatus: result.status ?? null,
      syncState: 'SYNCED',
      error: null,
      lastSyncedAt: new Date().toISOString(),
      offlineDelaySeconds: result.offlineDelaySeconds ?? 0,
      notifications: result.notifications ?? null,
    }),
    outbox: {
      ...data.outbox,
      incidentIds: data.outbox.incidentIds.filter((id) => id !== clientIncidentId),
    },
  };
}

export function markIncidentFailed(
  data: OfflineData,
  clientIncidentId: string,
  message: string,
): OfflineData {
  return {
    ...replaceRecord(data, clientIncidentId, {
      syncState: 'SYNC_FAILED',
      error: message,
    }),
    outbox: {
      ...data.outbox,
      incidentIds: data.outbox.incidentIds.filter((id) => id !== clientIncidentId),
    },
  };
}

/** Transient failure: stay queued so the next network or foreground event
 * retries automatically. Nothing is silently dropped. */
export function markIncidentRetry(
  data: OfflineData,
  clientIncidentId: string,
  message: string,
): OfflineData {
  return {
    ...replaceRecord(data, clientIncidentId, {
      syncState: 'PENDING_SYNC',
      error: message,
    }),
    outbox: {
      ...data.outbox,
      incidentIds: [...new Set([...data.outbox.incidentIds, clientIncidentId])],
    },
  };
}

export function retryIncident(data: OfflineData, clientIncidentId: string): OfflineData {
  const record = data.records.find((item) => item.clientIncidentId === clientIncidentId);
  if (!record || record.syncState === 'CANCELLED_LOCAL') return data;
  return {
    ...replaceRecord(data, clientIncidentId, {
      syncState: 'PENDING_SYNC',
      error: null,
    }),
    outbox: {
      ...data.outbox,
      incidentIds: [...new Set([...data.outbox.incidentIds, clientIncidentId])],
    },
  };
}

/** Cancel before the server ever saw the alert: nothing is sent, nobody is
 * falsely alerted, and the local record still explains what happened. */
export function cancelBeforeSync(data: OfflineData, clientIncidentId: string): OfflineData {
  return {
    ...replaceRecord(data, clientIncidentId, {
      syncState: 'CANCELLED_LOCAL',
      serverStatus: 'CANCELLED',
      error: null,
    }),
    outbox: {
      ...data.outbox,
      incidentIds: data.outbox.incidentIds.filter((id) => id !== clientIncidentId),
    },
  };
}

export function removeRecord(data: OfflineData, clientIncidentId: string): OfflineData {
  return {
    ...data,
    records: data.records.filter((record) => record.clientIncidentId !== clientIncidentId),
    outbox: {
      ...data.outbox,
      incidentIds: data.outbox.incidentIds.filter((id) => id !== clientIncidentId),
    },
  };
}

export function attachLocationToRecord(
  data: OfflineData,
  clientIncidentId: string,
  location: LocationInput,
): OfflineData {
  const record = data.records.find((item) => item.clientIncidentId === clientIncidentId);
  if (!record) return data;
  const existing = record.payload.locations ?? [];
  const nextLocations = [...existing, location].slice(-50);
  const payload: IncidentCreatePayload = {
    ...record.payload,
    location: record.payload.location ?? location,
    locations: nextLocations,
  };
  return replaceRecord(data, clientIncidentId, { payload });
}

export function enqueueLocation(data: OfflineData, pending: PendingLocation): OfflineData {
  if (
    data.outbox.locations.some(
      (item) =>
        item.clientLocationId === pending.clientLocationId ||
        (pending.clientLocationId && item.clientLocationId === pending.clientLocationId),
    )
  ) {
    return data;
  }
  return {
    ...data,
    outbox: {
      ...data.outbox,
      locations: [...data.outbox.locations, pending],
    },
  };
}

export function removeLocations(data: OfflineData, clientLocationIds: string[]): OfflineData {
  const remove = new Set(clientLocationIds);
  return {
    ...data,
    outbox: {
      ...data.outbox,
      locations: data.outbox.locations.filter((item) => !remove.has(item.clientLocationId)),
    },
  };
}

export function enqueueStatus(data: OfflineData, pending: PendingStatus): OfflineData {
  if (data.outbox.statuses.some((item) => item.id === pending.id)) return data;
  return {
    ...data,
    outbox: {
      ...data.outbox,
      statuses: [...data.outbox.statuses, pending],
    },
  };
}

export function removeStatuses(data: OfflineData, ids: string[]): OfflineData {
  const remove = new Set(ids);
  return {
    ...data,
    outbox: {
      ...data.outbox,
      statuses: data.outbox.statuses.filter((item) => !remove.has(item.id)),
    },
  };
}

/** The device lost the network before the server accepted these records. Mark
 * them honestly as offline-created so the server records the delay. */
export function markPendingOffline(data: OfflineData, ownerUserId: string): OfflineData {
  const pending = new Set(data.outbox.incidentIds);
  return {
    ...data,
    records: data.records.map((record) => {
      if (!pending.has(record.clientIncidentId) || record.ownerUserId !== ownerUserId) {
        return record;
      }
      return touch(record, {
        payload: {
          ...record.payload,
          offlineCreated: true,
          clientCreatedAt: record.payload.clientCreatedAt ?? record.payload.startedAt,
          location: record.payload.location
            ? { ...record.payload.location, offlineCaptured: true }
            : record.payload.location,
          locations: record.payload.locations?.map((location) => ({
            ...location,
            offlineCaptured: true,
          })),
        },
      });
    }),
  };
}

export function recordsForUser(data: OfflineData, userId: string): DeviceIncidentRecord[] {
  return data.records
    .filter((record) => record.ownerUserId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function pendingCount(data: OfflineData, userId?: string): number {
  const belongs = (ownerUserId: string) => !userId || ownerUserId === userId;
  const pendingIncidents = data.outbox.incidentIds.filter((id) => {
    const record = data.records.find((item) => item.clientIncidentId === id);
    return record ? belongs(record.ownerUserId) : false;
  }).length;
  return (
    pendingIncidents +
    data.outbox.locations.filter((item) => belongs(item.ownerUserId)).length +
    data.outbox.statuses.filter((item) => belongs(item.ownerUserId)).length
  );
}

export function scopeDataForUser(data: OfflineData, userId: string): OfflineData {
  const records = data.records.filter((record) => record.ownerUserId === userId);
  const ids = new Set(records.map((record) => record.clientIncidentId));
  return {
    records,
    outbox: {
      incidentIds: data.outbox.incidentIds.filter((id) => ids.has(id)),
      locations: data.outbox.locations.filter((item) => item.ownerUserId === userId),
      statuses: data.outbox.statuses.filter((item) => item.ownerUserId === userId),
    },
    lastSyncedAt: data.lastSyncedAt,
  };
}

export function mergeScopedData(
  full: OfflineData,
  scoped: OfflineData,
  userId: string,
): OfflineData {
  const otherRecords = full.records.filter((record) => record.ownerUserId !== userId);
  const otherLocations = full.outbox.locations.filter((item) => item.ownerUserId !== userId);
  const otherStatuses = full.outbox.statuses.filter((item) => item.ownerUserId !== userId);
  return {
    records: [...otherRecords, ...scoped.records],
    outbox: {
      incidentIds: [
        ...new Set([
          ...full.outbox.incidentIds.filter((id) => {
            const record = full.records.find((item) => item.clientIncidentId === id);
            return record ? record.ownerUserId !== userId : false;
          }),
          ...scoped.outbox.incidentIds,
        ]),
      ],
      locations: [...otherLocations, ...scoped.outbox.locations],
      statuses: [...otherStatuses, ...scoped.outbox.statuses],
    },
    lastSyncedAt: scoped.lastSyncedAt ?? full.lastSyncedAt,
  };
}

/**
 * A sync run works on a snapshot. If the user creates a new SOS or a location
 * ping while the request is in flight, those additions must survive the
 * snapshot result replacing state. `before` is the snapshot, `synced` is the
 * engine output, `latest` is current state.
 */
export function mergeAfterSync(
  before: OfflineData,
  synced: OfflineData,
  latest: OfflineData,
): OfflineData {
  const beforeRecords = new Map(
    before.records.map((record) => [record.clientIncidentId, record.updatedAt]),
  );
  const mergedRecords = new Map(
    synced.records.map((record) => [record.clientIncidentId, record]),
  );
  for (const record of latest.records) {
    const previous = beforeRecords.get(record.clientIncidentId);
    if (!previous || record.updatedAt > previous) {
      const syncedRecord = mergedRecords.get(record.clientIncidentId);
      // The server may have accepted the alert while the user attached a
      // location locally. Keep the authoritative sync state but do not throw
      // away the newer payload.
      if (
        syncedRecord?.syncState === 'SYNCED' &&
        record.syncState === 'PENDING_SYNC'
      ) {
        mergedRecords.set(record.clientIncidentId, {
          ...syncedRecord,
          payload: record.payload,
        });
      } else {
        mergedRecords.set(record.clientIncidentId, record);
      }
    }
  }

  const beforeIncidentIds = new Set(before.outbox.incidentIds);
  const incidentIds = [
    ...new Set([
      ...synced.outbox.incidentIds,
      ...latest.outbox.incidentIds.filter((id) => !beforeIncidentIds.has(id)),
    ]),
  ];

  const beforeLocationIds = new Set(
    before.outbox.locations.map((item) => item.clientLocationId),
  );
  const locations = [
    ...synced.outbox.locations,
    ...latest.outbox.locations.filter(
      (item) => !beforeLocationIds.has(item.clientLocationId),
    ),
  ];

  const beforeStatusIds = new Set(before.outbox.statuses.map((item) => item.id));
  const statuses = [
    ...synced.outbox.statuses,
    ...latest.outbox.statuses.filter((item) => !beforeStatusIds.has(item.id)),
  ];

  return {
    records: [...mergedRecords.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    outbox: { incidentIds, locations, statuses },
    lastSyncedAt: synced.lastSyncedAt ?? latest.lastSyncedAt,
  };
}
