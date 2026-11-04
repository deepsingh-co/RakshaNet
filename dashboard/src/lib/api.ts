import type {
  AdminGuardianLinksResponse,
  AnalyticsSummary,
  ApiErrorPayload,
  AuditLogsResponse,
  AuthResponse,
  GuardianLinksResponse,
  Incident,
  IncidentDetailResponse,
  IncidentsResponse,
  NotificationsResponse,
  Pagination,
  PublicUser,
  TrustedContact,
} from '../types';

const configured = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
export const API_URL = (configured || 'http://localhost:4000/api/v1').replace(/\/+$/, '');
export const API_ORIGIN = API_URL.replace(/\/api\/v1$/, '');

/* ------------------------------------------------------------------ */
/* Auth token — kept in memory only. Refresh lives in an httpOnly     */
/* cookie, so no token is ever written to localStorage.               */
/* ------------------------------------------------------------------ */

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/* ------------------------------------------------------------------ */
/* Errors                                                             */
/* ------------------------------------------------------------------ */

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

async function parseError(response: Response): Promise<ApiRequestError> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }
  const code = payload?.error?.code ?? `HTTP_${response.status}`;
  const message =
    payload?.error?.message ??
    payload?.message ??
    (response.status === 0 ? 'Network request failed' : `Request failed (${response.status})`);
  return new ApiRequestError(response.status, code, message, payload?.error?.details);
}

/* ------------------------------------------------------------------ */
/* Low-level fetch                                                    */
/* ------------------------------------------------------------------ */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

function doFetch(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

/** Refresh once; concurrent callers share the same in-flight request. */
export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await doFetch('/auth/refresh', { method: 'POST', body: {} });
        if (!response.ok) return null;
        const data = (await response.json()) as AuthResponse;
        accessToken = data.accessToken;
        return data;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

const NO_RETRY = ['/auth/login', '/auth/refresh', '/auth/logout'];

async function authorizedFetch(path: string, options: RequestOptions): Promise<Response> {
  let response = await doFetch(path, options);
  if (response.status === 401 && !NO_RETRY.some((prefix) => path.startsWith(prefix))) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await doFetch(path, options);
    } else {
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
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Cannot reach the SURAKSHA AI backend.');
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

export async function loginRequest(identifier: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ identifier, password }),
  });
  if (!response.ok) throw await parseError(response);
  const data = (await response.json()) as AuthResponse;
  accessToken = data.accessToken;
  return data;
}

export async function bootstrapSession(): Promise<AuthResponse | null> {
  return refreshSession();
}

export async function logoutRequest(): Promise<void> {
  try {
    await doFetch('/auth/logout', { method: 'POST', body: {} });
  } finally {
    accessToken = null;
  }
}

export async function logoutAllRequest(): Promise<void> {
  await apiRequest<{ ok: boolean }>('/auth/logout-all', { method: 'POST', body: {} });
  accessToken = null;
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
}

/* ------------------------------------------------------------------ */
/* Incidents                                                          */
/* ------------------------------------------------------------------ */

export interface IncidentQuery {
  active?: boolean;
  status?: string;
  type?: string;
  ownerId?: string;
  from?: string;
  to?: string;
  offlineOnly?: boolean;
  page?: number;
  limit?: number;
}

function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function fetchIncidents(query: IncidentQuery = {}, signal?: AbortSignal) {
  return apiRequest<IncidentsResponse>(
    `/incidents${queryString({
      active: query.active,
      status: query.status,
      type: query.type,
      ownerId: query.ownerId,
      from: query.from,
      to: query.to,
      offlineOnly: query.offlineOnly,
      page: query.page,
      limit: query.limit,
    })}`,
    { signal },
  );
}

export function fetchIncidentDetail(id: string, signal?: AbortSignal) {
  return apiRequest<IncidentDetailResponse>(`/incidents/${id}`, { signal });
}

export function updateIncidentStatus(
  id: string,
  status: string,
  note?: string,
): Promise<{ incident: Incident }> {
  return apiRequest(`/incidents/${id}/status`, {
    method: 'PATCH',
    body: { status, ...(note ? { note } : {}) },
  });
}

export function addIncidentNote(id: string, body: string) {
  return apiRequest<{ incident: Incident }>(`/incidents/${id}/notes`, {
    method: 'POST',
    body: { body },
  });
}

/* ------------------------------------------------------------------ */
/* Analytics / notifications                                          */
/* ------------------------------------------------------------------ */

export function fetchAnalyticsSummary(query: { from?: string; to?: string; ownerId?: string } = {}) {
  return apiRequest<AnalyticsSummary>(`/analytics/summary${queryString(query)}`);
}

export function fetchNotifications(
  query: {
    status?: string;
    channel?: string;
    incidentId?: string;
    ownerId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  return apiRequest<NotificationsResponse>(`/notifications${queryString(query)}`, { signal });
}

function filenameFrom(disposition: string | null): string | null {
  if (!disposition) return null;
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? null;
}

export async function downloadIncidentCsv(query: {
  from?: string;
  to?: string;
  status?: string;
  type?: string;
  ownerId?: string;
}): Promise<{ rows: number; total: number; truncated: boolean }> {
  let response = await authorizedFetch(
    `/analytics/incidents.csv${queryString({
      from: query.from,
      to: query.to,
      status: query.status,
      type: query.type,
      ownerId: query.ownerId,
    })}`,
    {},
  );
  if (!response.ok) throw await parseError(response);

  const blob = await response.blob();
  const filename =
    filenameFrom(response.headers.get('Content-Disposition')) ??
    `suraksha-incidents-${new Date().toISOString().slice(0, 10)}.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return {
    rows: Number(response.headers.get('X-Export-Rows') ?? 0),
    total: Number(response.headers.get('X-Export-Total') ?? 0),
    truncated: response.headers.get('X-Export-Truncated') === 'true',
  };
}

/* ------------------------------------------------------------------ */
/* Users / guardians / contacts                                       */
/* ------------------------------------------------------------------ */

export function fetchUsers(query: {
  q?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return apiRequest<{ users: PublicUser[]; pagination: Pagination }>(
    `/users${queryString(query)}`,
  );
}

export function setUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
  return apiRequest<{ user: PublicUser }>(`/users/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function fetchGuardianLinks() {
  return apiRequest<GuardianLinksResponse>('/guardian/links');
}

export function fetchAllGuardianLinks() {
  return apiRequest<AdminGuardianLinksResponse>('/guardian/links/all');
}

export function inviteChild(childEmail: string) {
  return apiRequest<{ ok: boolean; message?: string; devCode?: string }>('/guardian/links', {
    method: 'POST',
    body: { childEmail },
  });
}

export function acceptGuardianLink(id: string, code: string) {
  return apiRequest<{ ok: boolean; status: string }>(`/guardian/links/${id}/accept`, {
    method: 'POST',
    body: { code },
  });
}

export function revokeGuardianLink(id: string) {
  return apiRequest<{ ok: boolean }>(`/guardian/links/${id}`, { method: 'DELETE' });
}

export function createChildAccount(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  preferredLanguage?: string;
}) {
  return apiRequest<{
    child: { id: string; fullName: string; email: string; phoneMasked: string; accountType: string };
    linkStatus: string;
  }>('/guardian/children', { method: 'POST', body: input });
}

export function fetchContacts() {
  return apiRequest<{ contacts: TrustedContact[] }>('/contacts');
}

export function createContact(input: {
  name: string;
  phone: string;
  relationship: string;
  email?: string;
}) {
  return apiRequest<{ contact: TrustedContact }>('/contacts', { method: 'POST', body: input });
}

export function requestContactVerification(id: string) {
  return apiRequest<{ ok: boolean; message: string; devCode?: string }>(
    `/contacts/${id}/request-verification`,
    { method: 'POST', body: {} },
  );
}

export function confirmContactVerification(id: string, code: string) {
  return apiRequest<{ contact: TrustedContact }>(`/contacts/${id}/confirm-verification`, {
    method: 'POST',
    body: { code },
  });
}

export function setPrimaryContact(id: string) {
  return apiRequest<{ contact: TrustedContact }>(`/contacts/${id}/primary`, {
    method: 'POST',
    body: {},
  });
}

export function deleteContact(id: string) {
  return apiRequest<{ ok: boolean }>(`/contacts/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/* Audit                                                              */
/* ------------------------------------------------------------------ */

export function fetchAuditLogs(query: {
  action?: string;
  actorRole?: string;
  outcome?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  return apiRequest<AuditLogsResponse>(`/audit${queryString(query)}`);
}

export function fetchAuditActions() {
  return apiRequest<{ actions: string[] }>('/audit/actions');
}
