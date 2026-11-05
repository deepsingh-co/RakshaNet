import { describe, expect, it, vi } from 'vitest';
import type { IncidentCreatePayload, IncidentSyncResponse } from '../types';
import {
  emptyOfflineData,
  enqueueIncident,
  enqueueLocation,
  enqueueStatus,
  type DeviceIncidentRecord,
  type OfflineData,
} from './outbox';
import { runSync, type SyncTransport } from './sync';

function payload(id: string): IncidentCreatePayload {
  return {
    clientIncidentId: id,
    type: 'SOS',
    severity: 'CRITICAL',
    description: 'Madad chahiye',
    startedAt: '2026-01-01T10:00:00.000Z',
    clientCreatedAt: '2026-01-01T10:00:00.000Z',
    offlineCreated: true,
  };
}

function record(id: string, ownerUserId = 'user-1'): DeviceIncidentRecord {
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
  };
}

function apiError(status: number, message = 'Request failed'): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function successTransport(): SyncTransport {
  return {
    syncIncidents: vi.fn(async (payloads: IncidentCreatePayload[]) => ({
      results: payloads.map((item) => ({
        ok: true,
        clientIncidentId: item.clientIncidentId,
        serverId: `srv-${item.clientIncidentId}`,
        status: 'NOTIFIED' as const,
        deduplicated: false,
        offlineDelaySeconds: 30,
        notifications: {
          total: 1,
          queued: 0,
          sent: 1,
          delivered: 0,
          failed: 0,
          simulated: 1,
        },
      })),
      accepted: payloads.length,
      duplicates: 0,
      failed: 0,
    })),
    appendLocations: vi.fn(async () => ({ accepted: 1, duplicates: 0 })),
    updateStatus: vi.fn(async () => ({ ok: true })),
  };
}

function dataWithIncidents(...ids: string[]): OfflineData {
  let data = emptyOfflineData();
  for (const id of ids) data = enqueueIncident(data, record(id));
  return data;
}

describe('sync engine', () => {
  it('uploads queued incidents and marks them synced', async () => {
    const transport = successTransport();
    const outcome = await runSync(dataWithIncidents('a', 'b'), 'user-1', transport);

    expect(transport.syncIncidents).toHaveBeenCalledTimes(1);
    expect(outcome.data.outbox.incidentIds).toEqual([]);
    expect(outcome.data.records.every((item) => item.syncState === 'SYNCED')).toBe(true);
    expect(outcome.data.records.every((item) => item.serverId?.startsWith('srv-'))).toBe(true);
    expect(outcome.report.syncedIncidentIds.sort()).toEqual(['a', 'b']);
    expect(outcome.data.lastSyncedAt).toBeTruthy();
  });

  it('never uploads another user’s queued alert', async () => {
    let data = dataWithIncidents('mine');
    data = enqueueIncident(data, record('theirs', 'user-2'));
    const transport = successTransport();
    await runSync(data, 'user-1', transport);

    const sent = (transport.syncIncidents as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as IncidentCreatePayload[];
    expect(sent.map((item) => item.clientIncidentId)).toEqual(['mine']);
  });

  it('splits uploads into server-sized batches of 20', async () => {
    const ids = Array.from({ length: 21 }, (_, index) => `incident-${index}`);
    const transport = successTransport();
    await runSync(dataWithIncidents(...ids), 'user-1', transport);
    expect(transport.syncIncidents).toHaveBeenCalledTimes(2);
  });

  it('keeps alerts queued after a server error and flags network failures', async () => {
    const transport = successTransport();
    transport.syncIncidents = vi.fn(async () => {
      throw apiError(0, 'Network unreachable');
    });
    const outcome = await runSync(dataWithIncidents('a'), 'user-1', transport);

    expect(outcome.data.outbox.incidentIds).toEqual(['a']);
    expect(outcome.data.records[0].syncState).toBe('PENDING_SYNC');
    expect(outcome.report.retryIncidentIds).toEqual(['a']);
    expect(outcome.report.networkFailure).toBe(true);
    expect(outcome.report.errors[0]).toContain('Network');
  });

  it('drops alerts that the server permanently rejects', async () => {
    const transport = successTransport();
    transport.syncIncidents = vi.fn(async () => {
      throw apiError(400, 'Invalid payload');
    });
    const outcome = await runSync(dataWithIncidents('bad'), 'user-1', transport);

    expect(outcome.data.outbox.incidentIds).toEqual([]);
    expect(outcome.data.records[0].syncState).toBe('SYNC_FAILED');
    expect(outcome.report.failedIncidentIds).toEqual(['bad']);
  });

  it('handles per-item validation errors without dropping valid alerts', async () => {
    const transport = successTransport();
    transport.syncIncidents = vi.fn(async (payloads: IncidentCreatePayload[]) => ({
      results: payloads.map(
        (item): IncidentSyncResponse['results'][number] =>
          item.clientIncidentId === 'bad'
            ? {
                ok: false,
                clientIncidentId: 'bad',
                error: { code: 'VALIDATION_ERROR', message: 'Bad payload' },
              }
            : {
                ok: true,
                clientIncidentId: item.clientIncidentId,
                serverId: 'srv-ok',
                status: 'NOTIFIED',
              },
      ),
      accepted: 1,
      duplicates: 0,
      failed: 1,
    }));
    const outcome = await runSync(dataWithIncidents('bad', 'ok'), 'user-1', transport);

    expect(outcome.data.outbox.incidentIds).toEqual([]);
    expect(
      outcome.data.records.find((item) => item.clientIncidentId === 'ok')?.syncState,
    ).toBe('SYNCED');
    expect(
      outcome.data.records.find((item) => item.clientIncidentId === 'bad')?.syncState,
    ).toBe('SYNC_FAILED');
    expect(outcome.report.failedIncidentIds).toEqual(['bad']);
  });

  it('flushes queued locations grouped by incident', async () => {
    let data = dataWithIncidents('a');
    data.outbox.locations = [
      {
        clientLocationId: 'loc-1',
        incidentServerId: 'server-a',
        ownerUserId: 'user-1',
        body: { lat: 19, lng: 72, source: 'GPS', capturedAt: '2026-01-01T10:00:00.000Z' },
        queuedAt: '2026-01-01T10:00:01.000Z',
      },
      {
        clientLocationId: 'loc-2',
        incidentServerId: 'server-a',
        ownerUserId: 'user-1',
        body: { lat: 19.1, lng: 72.1, source: 'GPS', capturedAt: '2026-01-01T10:00:10.000Z' },
        queuedAt: '2026-01-01T10:00:11.000Z',
      },
      {
        clientLocationId: 'loc-3',
        incidentServerId: 'server-b',
        ownerUserId: 'user-1',
        body: { lat: 18, lng: 73, source: 'GPS', capturedAt: '2026-01-01T10:00:20.000Z' },
        queuedAt: '2026-01-01T10:00:21.000Z',
      },
    ];
    const transport = successTransport();
    transport.syncIncidents = vi.fn(async () => ({
      results: [],
      accepted: 0,
      duplicates: 0,
      failed: 0,
    }));
    const outcome = await runSync(data, 'user-1', transport);

    expect(transport.appendLocations).toHaveBeenCalledTimes(2);
    expect(outcome.data.outbox.locations).toHaveLength(0);
    expect(outcome.report.removedLocationIds).toHaveLength(3);
    expect(outcome.report.networkFailure).toBe(false);
  });

  it('retries location pings after a transient error', async () => {
    let data = emptyOfflineData();
    data = enqueueLocation(data, {
      clientLocationId: 'loc-1',
      incidentServerId: 'server-a',
      ownerUserId: 'user-1',
      body: { lat: 19, lng: 72, source: 'GPS', capturedAt: '2026-01-01T10:00:00.000Z' },
      queuedAt: '2026-01-01T10:00:01.000Z',
    });
    const transport = successTransport();
    transport.appendLocations = vi.fn(async () => {
      throw apiError(503, 'Provider unavailable');
    });
    const outcome = await runSync(data, 'user-1', transport);
    expect(outcome.data.outbox.locations).toHaveLength(1);
    expect(outcome.report.networkFailure).toBe(false);
  });

  it('drops location pings for a closed incident', async () => {
    let data = emptyOfflineData();
    data = enqueueLocation(data, {
      clientLocationId: 'loc-1',
      incidentServerId: 'server-a',
      ownerUserId: 'user-1',
      body: { lat: 19, lng: 72, source: 'GPS', capturedAt: '2026-01-01T10:00:00.000Z' },
      queuedAt: '2026-01-01T10:00:01.000Z',
    });
    const transport = successTransport();
    transport.appendLocations = vi.fn(async () => {
      throw Object.assign(apiError(409, 'This incident is closed'), {
        code: 'INCIDENT_CLOSED',
      });
    });
    const outcome = await runSync(data, 'user-1', transport);
    expect(outcome.data.outbox.locations).toHaveLength(0);
    expect(outcome.report.errors[0]).toContain('closed');
  });

  it('flushes queued status updates and keeps them on transient failure', async () => {
    let data = emptyOfflineData();
    data = enqueueStatus(data, {
      id: 'status-1',
      incidentServerId: 'server-a',
      ownerUserId: 'user-1',
      status: 'RESOLVED',
      note: 'Safe now',
      queuedAt: '2026-01-01T10:00:00.000Z',
    });
    const ok = successTransport();
    const success = await runSync(data, 'user-1', ok);
    expect(success.data.outbox.statuses).toHaveLength(0);
    expect(ok.updateStatus).toHaveBeenCalledWith('server-a', 'RESOLVED', 'Safe now');

    const failing = successTransport();
    failing.updateStatus = vi.fn(async () => {
      throw apiError(500, 'Server unavailable');
    });
    const retry = await runSync(data, 'user-1', failing);
    expect(retry.data.outbox.statuses).toHaveLength(1);
    expect(retry.report.attemptedStatuses).toBe(1);
  });
});
