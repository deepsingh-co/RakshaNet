import { clearRefreshToken, readRefreshToken, writeRefreshToken } from './storage';
import type {
  ApiErrorPayload,
  AuthResponse,
  GuardianLinksResponse,
  Incident,
  IncidentCreatePayload,
  IncidentDetailResponse,
  IncidentStatus,
  IncidentsResponse,
  IncidentSyncResponse,
  LocationInput,
  PublicUser,
  SafetyInterpretResponse,
  TrustedContact,
} from '../types';

/**
 * API base. EXPO_PUBLIC_* is inlined by Expo at build time, so this must be a
 * literal property access — dynamic env lookup would be undefined at runtime.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
).replace(/\/+$/, '');

let accessToken: string | null = null;
let refreshPromise: Promise<RefreshResult> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export interface RefreshResult {
  session: AuthResponse | null;
  /** True when the server could not be reached; the stored token is kept. */
  offline: boolean;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isPermanentApiError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

function doFetch(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function parseError(response: Response): Promise<ApiRequestError> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }
  return new ApiRequestError(
    response.status,
    payload?.error?.code ?? `HTTP_${response.status}`,
    payload?.error?.message ??
      payload?.message ??
      `Request failed (${response.status})`,
    payload?.error?.details,
  );
}

/** Refresh once; concurrent callers share the same in-flight rotation. */
export function refreshSessionDetailed(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = (async (): Promise<RefreshResult> => {
      const refreshToken = await readRefreshToken();
      if (!refreshToken) return { session: null, offline: false };

      let response: Response;
      try {
        response = await doFetch('/auth/refresh', {
          method: 'POST',
          body: { refreshToken },
        });
      } catch {
        // Offline: keep the rotated token on disk and let the caller run an
        // offline session instead of silently logging the user out.
        return { session: null, offline: true };
      }

      if (response.status === 400 || response.status === 401) {
        await clearRefreshToken();
        accessToken = null;
        return { session: null, offline: false };
      }
      if (!response.ok) {
        return { session: null, offline: true };
      }

      const session = (await response.json()) as AuthResponse;
      accessToken = session.accessToken;
      await writeRefreshToken(session.refreshToken);
      return { session, offline: false };
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function refreshSession(): Promise<AuthResponse | null> {
  const result = await refreshSessionDetailed();
  return result.session;
}

const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

async function authorizedFetch(path: string, options: RequestOptions): Promise<Response> {
  let response = await doFetch(path, options);
  if (response.status === 401 && !NO_RETRY.some((prefix) => path.startsWith(prefix))) {
    const refreshed = await refreshSessionDetailed();
    if (refreshed.session) {
      response = await doFetch(path, options);
    } else if (!refreshed.offline) {
      accessToken = null;
      unauthorizedHandler?.();
    }
  }
  return response;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await authorizedFetch(path, options);
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Cannot reach the SURAKSHA AI server.');
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

export async function loginRequest(identifier: string, password: string): Promise<AuthResponse> {
  const response = await doFetch('/auth/login', {
    method: 'POST',
    body: { identifier: identifier.trim(), password },
  });
  if (!response.ok) throw await parseError(response);
  const session = (await response.json()) as AuthResponse;
  accessToken = session.accessToken;
  await writeRefreshToken(session.refreshToken);
  return session;
}

export async function registerRequest(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  preferredLanguage?: string;
  accountType?: 'INDIVIDUAL' | 'GUARDIAN';
}): Promise<AuthResponse> {
  const response = await doFetch('/auth/register', {
    method: 'POST',
    body: { ...input, accountType: input.accountType ?? 'INDIVIDUAL' },
  });
  if (!response.ok) throw await parseError(response);
  const session = (await response.json()) as AuthResponse;
  accessToken = session.accessToken;
  await writeRefreshToken(session.refreshToken);
  return session;
}

export async function logoutRequest(): Promise<void> {
  const refreshToken = await readRefreshToken();
  try {
    if (refreshToken) {
      await doFetch('/auth/logout', { method: 'POST', body: { refreshToken } });
    }
  } finally {
    accessToken = null;
    await clearRefreshToken();
  }
}

export async function logoutAllRequest(): Promise<void> {
  await apiRequest<{ ok: boolean }>('/auth/logout-all', { method: 'POST', body: {} });
  accessToken = null;
  await clearRefreshToken();
}

export async function fetchMe(): Promise<{ user: PublicUser }> {
  return apiRequest('/auth/me');
}

export async function updateMeRequest(input: {
  fullName?: string;
  phone?: string;
  email?: string;
  preferredLanguage?: string;
}): Promise<{ user: PublicUser; otpRequired: boolean }> {
  return apiRequest('/users/me', { method: 'PATCH', body: input });
}

export async function verifyOtpRequest(code: string): Promise<{ user: PublicUser }> {
  return apiRequest('/auth/verify-otp', { method: 'POST', body: { code } });
}

export async function requestAccountDeletion(): Promise<void> {
  await apiRequest('/auth/account', { method: 'DELETE' });
  accessToken = null;
  await clearRefreshToken();
}

/* ------------------------------------------------------------------ */
/* Incidents                                                          */
/* ------------------------------------------------------------------ */

function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function createIncident(payload: IncidentCreatePayload): Promise<{
  incident: Incident;
  deduplicated: boolean;
  notifications?: unknown;
  offlineDelaySeconds?: number;
}> {
  return apiRequest('/incidents', { method: 'POST', body: payload });
}

export function syncIncidents(payloads: IncidentCreatePayload[]): Promise<IncidentSyncResponse> {
  return apiRequest('/incidents/sync', {
    method: 'POST',
    body: { incidents: payloads },
  });
}

export function fetchIncidents(
  query: {
    active?: boolean;
    status?: string;
    type?: string;
    ownerId?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<IncidentsResponse> {
  return apiRequest(
    `/incidents${queryString({
      active: query.active,
      status: query.status,
      type: query.type,
      ownerId: query.ownerId,
      page: query.page,
      limit: query.limit,
    })}`,
  );
}

export function fetchIncidentDetail(id: string): Promise<IncidentDetailResponse> {
  return apiRequest(`/incidents/${id}`);
}

export function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
  note?: string,
): Promise<{ incident: Incident }> {
  return apiRequest(`/incidents/${id}/status`, {
    method: 'PATCH',
    body: { status, ...(note ? { note } : {}) },
  });
}

export function addIncidentNote(id: string, body: string): Promise<{ incident: Incident }> {
  return apiRequest(`/incidents/${id}/notes`, { method: 'POST', body: { body } });
}

export function appendLocations(
  id: string,
  locations: LocationInput[],
): Promise<{ accepted: number; duplicates: number }> {
  return apiRequest(`/incidents/${id}/locations/batch`, {
    method: 'POST',
    body: { locations },
  });
}

/* ------------------------------------------------------------------ */
/* Contacts                                                           */
/* ------------------------------------------------------------------ */

export function fetchContacts(): Promise<{ contacts: TrustedContact[] }> {
  return apiRequest('/contacts');
}

export function createContact(input: {
  name: string;
  phone: string;
  relationship: string;
  email?: string;
  notificationPreferences?: { push: boolean; sms: boolean; whatsapp: boolean };
}): Promise<{ contact: TrustedContact }> {
  return apiRequest('/contacts', { method: 'POST', body: input });
}

export function requestContactVerification(id: string): Promise<{
  ok: boolean;
  message: string;
  devCode?: string;
}> {
  return apiRequest(`/contacts/${id}/request-verification`, { method: 'POST', body: {} });
}

export function confirmContactVerification(
  id: string,
  code: string,
): Promise<{ contact: TrustedContact }> {
  return apiRequest(`/contacts/${id}/confirm-verification`, {
    method: 'POST',
    body: { code },
  });
}

export function setPrimaryContact(id: string): Promise<{ contact: TrustedContact }> {
  return apiRequest(`/contacts/${id}/primary`, { method: 'POST', body: {} });
}

export function deleteContact(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/contacts/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* Guardian links                                                     */
/* ------------------------------------------------------------------ */

export function fetchGuardianLinks(): Promise<GuardianLinksResponse> {
  return apiRequest('/guardian/links');
}

export function inviteChild(childEmail: string): Promise<{
  ok: boolean;
  message?: string;
  devCode?: string;
}> {
  return apiRequest('/guardian/links', { method: 'POST', body: { childEmail } });
}

export function acceptGuardianLink(
  id: string,
  code: string,
): Promise<{ ok: boolean; status: string }> {
  return apiRequest(`/guardian/links/${id}/accept`, { method: 'POST', body: { code } });
}

export function revokeGuardianLink(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/guardian/links/${id}`, { method: 'DELETE' });
}

export function createChildAccount(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  preferredLanguage?: string;
}): Promise<{
  child: { id: string; fullName: string; email: string; phoneMasked: string; accountType: string };
  linkStatus: string;
}> {
  return apiRequest('/guardian/children', { method: 'POST', body: input });
}

/* ------------------------------------------------------------------ */
/* Safety advisor                                                     */
/* ------------------------------------------------------------------ */

export function interpretSafetyMessage(input: {
  text: string;
  language?: 'auto' | 'en' | 'hi' | 'hinglish';
}): Promise<SafetyInterpretResponse> {
  return apiRequest('/ai/interpret', { method: 'POST', body: input });
}
