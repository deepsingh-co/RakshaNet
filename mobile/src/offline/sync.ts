import type {
  IncidentCreatePayload,
  IncidentStatus,
  IncidentSyncResponse,
  LocationInput,
} from '../types';
import {
  markIncidentFailed,
  markIncidentRetry,
  markIncidentSynced,
  removeLocations,
  removeStatuses,
  type OfflineData,
  type PendingLocation,
  type PendingStatus,
} from './outbox';

/**
 * The sync engine is pure logic over an injected transport so it can be tested
 * without a phone, a network, or a logged-in session.
 */
export interface SyncTransport {
  syncIncidents(payloads: IncidentCreatePayload[]): Promise<IncidentSyncResponse>;
  appendLocations(
    incidentServerId: string,
    locations: LocationInput[],
  ): Promise<{ accepted: number; duplicates: number }>;
  updateStatus(
    incidentServerId: string,
    status: IncidentStatus,
    note: string,
  ): Promise<unknown>;
}

export interface SyncReport {
  attemptedIncidents: number;
  syncedIncidentIds: string[];
  retryIncidentIds: string[];
  failedIncidentIds: string[];
  attemptedLocations: number;
  removedLocationIds: string[];
  attemptedStatuses: number;
  removedStatusIds: string[];
  /** The request never reached the server (no HTTP status). */
  networkFailure: boolean;
  errors: string[];
  lastSyncedAt: string | null;
}

export interface SyncOutcome {
  data: OfflineData;
  report: SyncReport;
}

const BATCH_SIZE = 20;
const MAX_ROUNDS = 5;

function statusOf(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const value = (error as { status?: unknown }).status;
    if (typeof value === 'number') return value;
  }
  return null;
}

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

/** HTTP 4xx will not succeed on retry (except rate limits / timeouts). */
function isPermanent(error: unknown): boolean {
  const status = statusOf(error);
  if (status === null) return false;
  if (status === 408 || status === 425 || status === 429) return false;
  return status >= 400 && status < 500;
}

function isNetworkFailure(error: unknown): boolean {
  const status = statusOf(error);
  return status === null || status === 0;
}

function buildReport(): SyncReport {
  return {
    attemptedIncidents: 0,
    syncedIncidentIds: [],
    retryIncidentIds: [],
    failedIncidentIds: [],
    attemptedLocations: 0,
    removedLocationIds: [],
    attemptedStatuses: 0,
    removedStatusIds: [],
    networkFailure: false,
    errors: [],
    lastSyncedAt: null,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

async function syncIncidentsForUser(
  data: OfflineData,
  userId: string,
  transport: SyncTransport,
  report: SyncReport,
): Promise<OfflineData> {
  let working = data;
  let rounds = 0;

  while (rounds < MAX_ROUNDS) {
    rounds += 1;
    const queued = new Set(working.outbox.incidentIds);
    const batch = working.records
      .filter(
        (record) =>
          record.ownerUserId === userId &&
          record.syncState === 'PENDING_SYNC' &&
          queued.has(record.clientIncidentId),
      )
      .slice(0, BATCH_SIZE);

    if (batch.length === 0) break;
    report.attemptedIncidents += batch.length;

    let response: IncidentSyncResponse;
    try {
      response = await transport.syncIncidents(batch.map((record) => record.payload));
    } catch (error) {
      const permanent = isPermanent(error);
      if (isNetworkFailure(error)) report.networkFailure = true;
      const message = messageOf(error, 'Could not reach the server');
      report.errors.push(message);
      for (const record of batch) {
        working = permanent
          ? markIncidentFailed(working, record.clientIncidentId, message)
          : markIncidentRetry(working, record.clientIncidentId, message);
        if (permanent) report.failedIncidentIds.push(record.clientIncidentId);
        else report.retryIncidentIds.push(record.clientIncidentId);
      }
      // The request itself failed; hammering it again in a tight loop helps
      // nobody. Retry later when the network or session recovers.
      break;
    }

    const results = new Map(
      (response.results ?? []).map((result) => [result.clientIncidentId, result]),
    );

    for (const record of batch) {
      const result = results.get(record.clientIncidentId);
      if (result?.ok) {
        working = markIncidentSynced(working, record.clientIncidentId, result);
        report.syncedIncidentIds.push(record.clientIncidentId);
        continue;
      }

      const code = result?.error?.code ?? '';
      const permanent = code === 'VALIDATION_ERROR' || code === 'DUPLICATE_REJECTED';
      const message =
        result?.error?.message ?? 'The server did not accept this alert — retrying later';
      report.errors.push(message);
      working = permanent
        ? markIncidentFailed(working, record.clientIncidentId, message)
        : markIncidentRetry(working, record.clientIncidentId, message);
      if (permanent) report.failedIncidentIds.push(record.clientIncidentId);
      else report.retryIncidentIds.push(record.clientIncidentId);
    }

    // If every record in this round failed permanently there is nothing left
    // queued and the next iteration will exit naturally.
  }

  return working;
}

function groupLocations(
  data: OfflineData,
  userId: string,
): Map<string, PendingLocation[]> {
  const groups = new Map<string, PendingLocation[]>();
  for (const pending of data.outbox.locations) {
    if (pending.ownerUserId !== userId) continue;
    const existing = groups.get(pending.incidentServerId) ?? [];
    existing.push(pending);
    groups.set(pending.incidentServerId, existing);
  }
  return groups;
}

async function syncLocationsForUser(
  data: OfflineData,
  userId: string,
  transport: SyncTransport,
  report: SyncReport,
): Promise<OfflineData> {
  let working = data;
  for (const [serverId, items] of groupLocations(data, userId)) {
    const batch = items.slice(0, 100);
    report.attemptedLocations += batch.length;
    try {
      await transport.appendLocations(
        serverId,
        batch.map((item) => item.body),
      );
      working = removeLocations(working, batch.map((item) => item.clientLocationId));
      report.removedLocationIds.push(...batch.map((item) => item.clientLocationId));
    } catch (error) {
      const message = messageOf(error, 'Location update could not be sent');
      report.errors.push(message);
      if (isNetworkFailure(error)) report.networkFailure = true;
      if (isPermanent(error)) {
        // Closed incident, revoked access, deleted record: retrying forever
        // only hides the truth from the user.
        working = removeLocations(working, batch.map((item) => item.clientLocationId));
        report.removedLocationIds.push(...batch.map((item) => item.clientLocationId));
      }
    }
  }
  return working;
}

async function syncStatusesForUser(
  data: OfflineData,
  userId: string,
  transport: SyncTransport,
  report: SyncReport,
): Promise<OfflineData> {
  let working = data;
  const queued: PendingStatus[] = data.outbox.statuses
    .filter((item) => item.ownerUserId === userId)
    .slice(0, 50);

  for (const pending of queued) {
    report.attemptedStatuses += 1;
    try {
      await transport.updateStatus(pending.incidentServerId, pending.status, pending.note);
      working = removeStatuses(working, [pending.id]);
      report.removedStatusIds.push(pending.id);
    } catch (error) {
      const message = messageOf(error, 'Status update could not be sent');
      report.errors.push(message);
      if (isNetworkFailure(error)) report.networkFailure = true;
      if (isPermanent(error)) {
        working = removeStatuses(working, [pending.id]);
        report.removedStatusIds.push(pending.id);
      }
    }
  }
  return working;
}

/** Flush this user's incidents, then location pings, then status updates. */
export async function runSync(
  data: OfflineData,
  userId: string,
  transport: SyncTransport,
): Promise<SyncOutcome> {
  const report = buildReport();
  let working = await syncIncidentsForUser(data, userId, transport, report);
  working = await syncLocationsForUser(working, userId, transport, report);
  working = await syncStatusesForUser(working, userId, transport, report);

  const changed =
    report.syncedIncidentIds.length > 0 ||
    report.removedLocationIds.length > 0 ||
    report.removedStatusIds.length > 0;

  if (changed) {
    report.lastSyncedAt = new Date().toISOString();
    working = { ...working, lastSyncedAt: report.lastSyncedAt };
  }

  report.syncedIncidentIds = unique(report.syncedIncidentIds);
  report.retryIncidentIds = unique(report.retryIncidentIds);
  report.failedIncidentIds = unique(report.failedIncidentIds);
  report.removedLocationIds = unique(report.removedLocationIds);
  report.removedStatusIds = unique(report.removedStatusIds);
  report.errors = unique(report.errors);

  return { data: working, report };
}
