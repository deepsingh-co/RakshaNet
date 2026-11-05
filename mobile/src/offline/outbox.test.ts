import { describe, expect, it } from 'vitest';
import type { IncidentCreatePayload } from '../types';
import {
  addRecord,
  attachLocationToRecord,
  cancelBeforeSync,
  emptyOfflineData,
  enqueueIncident,
  enqueueLocation,
  enqueueStatus,
  markIncidentFailed,
  markIncidentRetry,
  markIncidentSynced,
  markPendingOffline,
  mergeAfterSync,
  normalizeOfflineData,
  pendingCount,
  removeLocations,
  removeRecord,
  removeStatuses,
  retryIncident,
  type DeviceIncidentRecord,
} from './outbox';

function payload(id: string, extra: Partial<IncidentCreatePayload> = {}): IncidentCreatePayload {
  return {
    clientIncidentId: id,
    type: 'SOS',
    severity: 'CRITICAL',
    description: 'Test alert',
    startedAt: '2026-01-01T10:00:00.000Z',
    clientCreatedAt: '2026-01-01T10:00:00.000Z',
    offlineCreated: false,
    ...extra,
  };
}

function record(
  id: string,
  ownerUserId = 'user-1',
  extra: Partial<DeviceIncidentRecord> = {},
): DeviceIncidentRecord {
  return {
    clientIncidentId: id,
    ownerUserId,
    payload: payload(id),
    serverId: null,
    serverStatus: null,
    syncState: 'PENDING_SYNC',
    error: null,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    lastSyncedAt: null,
    offlineDelaySeconds: 0,
    notifications: null,
    ...extra,
  };
}

describe('offline outbox', () => {
  it('enqueues an incident and keeps it in the outbox', () => {
    const data = enqueueIncident(emptyOfflineData(), record('a'));
    expect(data.records).toHaveLength(1);
    expect(data.outbox.incidentIds).toEqual(['a']);
    expect(pendingCount(data, 'user-1')).toBe(1);
    expect(pendingCount(data, 'user-2')).toBe(0);
  });

  it('does not duplicate a retried client incident id', () => {
    let data = enqueueIncident(emptyOfflineData(), record('a'));
    data = enqueueIncident(data, record('a', 'user-1', { createdAt: '2026-01-01T11:00:00.000Z' }));
    expect(data.records).toHaveLength(1);
    expect(data.outbox.incidentIds).toEqual(['a']);
  });

  it('marks a successful sync and clears the queue', () => {
    let data = enqueueIncident(emptyOfflineData(), record('a'));
    data = markIncidentSynced(data, 'a', {
      serverId: 'server-a',
      status: 'NOTIFIED',
      offlineDelaySeconds: 42,
      notifications: {
        total: 1,
        queued: 0,
        sent: 1,
        delivered: 0,
        failed: 0,
        simulated: 1,
      },
    });
    const item = data.records[0];
    expect(item.syncState).toBe('SYNCED');
    expect(item.serverId).toBe('server-a');
    expect(item.offlineDelaySeconds).toBe(42);
    expect(data.outbox.incidentIds).toEqual([]);
  });

  it('keeps transient failures queued and drops permanent ones', () => {
    let data = enqueueIncident(emptyOfflineData(), record('retry'));
    data = enqueueIncident(data, record('bad'));
    data = markIncidentRetry(data, 'retry', 'Network unreachable');
    data = markIncidentFailed(data, 'bad', 'Invalid payload');
    expect(data.outbox.incidentIds).toEqual(['retry']);
    expect(data.records.find((item) => item.clientIncidentId === 'retry')?.syncState).toBe(
      'PENDING_SYNC',
    );
    expect(data.records.find((item) => item.clientIncidentId === 'bad')?.syncState).toBe(
      'SYNC_FAILED',
    );

    data = retryIncident(data, 'bad');
    expect(data.outbox.incidentIds.sort()).toEqual(['bad', 'retry']);
  });

  it('cancels only before the server ever saw the alert', () => {
    let data = enqueueIncident(emptyOfflineData(), record('a'));
    data = cancelBeforeSync(data, 'a');
    expect(data.outbox.incidentIds).toEqual([]);
    expect(data.records[0].syncState).toBe('CANCELLED_LOCAL');
    expect(data.records[0].serverStatus).toBe('CANCELLED');
  });

  it('marks pending alerts offline with original device time', () => {
    const local = record('a', 'user-1', {
      payload: payload('a', {
        clientCreatedAt: '2026-01-01T09:59:00.000Z',
        location: {
          lat: 19.07,
          lng: 72.87,
          source: 'GPS',
          capturedAt: '2026-01-01T09:58:00.000Z',
        },
      }),
    });
    const other = record('b', 'user-2');
    let data = enqueueIncident(enqueueIncident(emptyOfflineData(), local), other);
    data = markPendingOffline(data, 'user-1');

    const a = data.records.find((item) => item.clientIncidentId === 'a')!;
    const b = data.records.find((item) => item.clientIncidentId === 'b')!;
    expect(a.payload.offlineCreated).toBe(true);
    expect(a.payload.clientCreatedAt).toBe('2026-01-01T09:59:00.000Z');
    expect(a.payload.location?.offlineCaptured).toBe(true);
    expect(b.payload.offlineCreated).toBe(false);
  });

  it('groups and removes location pings', () => {
    let data = emptyOfflineData();
    data = enqueueLocation(data, {
      clientLocationId: 'loc-1',
      incidentServerId: 'server-a',
      ownerUserId: 'user-1',
      body: { lat: 1, lng: 2, source: 'GPS', capturedAt: '2026-01-01T10:00:00.000Z' },
      queuedAt: '2026-01-01T10:00:01.000Z',
    });
    data = enqueueLocation(data, {
      clientLocationId: 'loc-1',
      incidentServerId: 'server-a',
      ownerUserId: 'user-1',
      body: { lat: 1, lng: 2, source: 'GPS', capturedAt: '2026-01-01T10:00:00.000Z' },
      queuedAt: '2026-01-01T10:00:02.000Z',
    });
    expect(data.outbox.locations).toHaveLength(1);
    data = removeLocations(data, ['loc-1']);
    expect(data.outbox.locations).toHaveLength(0);
  });

  it('queues status updates idempotently', () => {
    let data = emptyOfflineData();
    data = enqueueStatus(data, {
      id: 'status-1',
      incidentServerId: 'server-a',
      ownerUserId: 'user-1',
      status: 'RESOLVED',
      note: 'Safe now',
      queuedAt: '2026-01-01T10:00:00.000Z',
    });
    data = enqueueStatus(data, {
      id: 'status-1',
      incidentServerId: 'server-a',
      ownerUserId: 'user-1',
      status: 'RESOLVED',
      note: 'Safe now',
      queuedAt: '2026-01-01T10:00:01.000Z',
    });
    expect(data.outbox.statuses).toHaveLength(1);
    data = removeStatuses(data, ['status-1']);
    expect(data.outbox.statuses).toHaveLength(0);
  });

  it('attaches a location to a pending incident payload', () => {
    let data = enqueueIncident(emptyOfflineData(), record('a'));
    data = attachLocationToRecord(data, 'a', {
      lat: 19,
      lng: 72,
      source: 'GPS',
      capturedAt: '2026-01-01T10:01:00.000Z',
    });
    expect(data.records[0].payload.location?.lat).toBe(19);
    expect(data.records[0].payload.locations).toHaveLength(1);
  });

  it('normalizes corrupt persisted data instead of crashing', () => {
    expect(normalizeOfflineData(null).records).toEqual([]);
    expect(normalizeOfflineData({ outbox: { incidentIds: ['ghost'] } }).outbox.incidentIds).toEqual(
      [],
    );
  });

  it('removes a local record and its queue entry', () => {
    let data = enqueueIncident(emptyOfflineData(), record('a'));
    data = removeRecord(data, 'a');
    expect(data.records).toHaveLength(0);
    expect(data.outbox.incidentIds).toHaveLength(0);
  });

  it('preserves an SOS created while a sync snapshot is in flight', () => {
    const before = enqueueIncident(emptyOfflineData(), record('first'));
    const synced = markIncidentSynced(before, 'first', {
      serverId: 'server-first',
      status: 'NOTIFIED',
    });
    let latest = enqueueIncident(synced, record('second'));
    // The incident was updated during sync (for example a location attached).
    latest = markIncidentRetry(latest, 'first', 'slow network');
    const merged = mergeAfterSync(before, synced, latest);

    expect(merged.outbox.incidentIds).toEqual(['second']);
    expect(merged.records.find((item) => item.clientIncidentId === 'first')?.syncState).toBe(
      'SYNCED',
    );
    expect(merged.records.find((item) => item.clientIncidentId === 'second')?.syncState).toBe(
      'PENDING_SYNC',
    );
  });

  it('keeps records sorted newest first', () => {
    let data = addRecord(emptyOfflineData(), record('older'));
    data = addRecord(
      data,
      record('newer', 'user-1', { createdAt: '2026-01-02T10:00:00.000Z' }),
    );
    expect(data.records.map((item) => item.clientIncidentId)).toEqual(['newer', 'older']);
  });
});
