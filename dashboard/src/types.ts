/* Shared API types — mirrors the backend's public serializers exactly. */

export type Role = 'USER' | 'GUARDIAN' | 'ADMIN';
export type AccountType = 'INDIVIDUAL' | 'GUARDIAN' | 'CHILD';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETION_REQUESTED';

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: string;
  role: Role;
  accountType: AccountType;
  status: UserStatus;
  phoneVerified: boolean;
  emailVerified: boolean;
  guardianId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export const INCIDENT_TYPES = ['SOS', 'FALL_DETECTED', 'VOICE_TRIGGER', 'MANUAL'] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = [
  'CREATED',
  'PENDING_SYNC',
  'ALERTING',
  'NOTIFIED',
  'ACKNOWLEDGED',
  'RESPONDING',
  'ESCALATED',
  'RESOLVED',
  'CANCELLED',
  'DELIVERY_FAILED',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const ACTIVE_INCIDENT_STATUSES: IncidentStatus[] = [
  'PENDING_SYNC',
  'ALERTING',
  'NOTIFIED',
  'ACKNOWLEDGED',
  'RESPONDING',
  'ESCALATED',
  'DELIVERY_FAILED',
];

export type IncidentTypeValue = IncidentType;
export type ViewerRelation = 'OWNER' | 'GUARDIAN' | 'ADMIN';

export interface IncidentOwner {
  id: string;
  fullName: string;
  email: string;
  phoneMasked: string;
  role: string;
  accountType: string;
}

export interface IncidentLocationSnapshot {
  lat: number;
  lng: number;
  accuracyMeters?: number | null;
  capturedAt?: string | null;
  source?: string;
}

export interface StatusEvent {
  status: IncidentStatus;
  at: string;
  byUserId: string | null;
  byRole: string;
  note: string;
}

export interface IncidentNote {
  body: string;
  byUserId: string;
  byRole: string;
  at: string;
}

export interface IncidentDevice {
  platform: string;
  model: string;
  appVersion: string;
}

export interface Incident {
  id: string;
  userId: string;
  owner: IncidentOwner | null;
  clientIncidentId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  startedAt: string;
  clientCreatedAt: string;
  receivedAt: string;
  offlineCreated: boolean;
  syncedFromOffline: boolean;
  offlineDelaySeconds: number;
  location: IncidentLocationSnapshot | null;
  statusHistory: StatusEvent[];
  notes: IncidentNote[];
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  escalationLevel: number;
  lastEscalatedAt: string | null;
  device: IncidentDevice | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentLocation {
  id: string;
  incidentId: string;
  clientLocationId: string;
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  speedMps: number | null;
  headingDeg: number | null;
  batteryLevel: number | null;
  source: string;
  capturedAt: string;
  receivedAt: string;
  ageSeconds: number;
  isStale: boolean;
  offlineCaptured: boolean;
}

export const NOTIFICATION_STATUSES = [
  'PENDING_SYNC',
  'QUEUED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface Notification {
  id: string;
  incidentId: string;
  contactId: string | null;
  channel: 'SMS' | 'WHATSAPP' | 'PUSH';
  destinationMasked: string;
  status: NotificationStatus;
  provider: string;
  providerMessageId: string | null;
  simulated: boolean;
  attempts: number;
  lastError: string | null;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
}

export interface NotificationSummary {
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  simulated: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface IncidentsResponse {
  incidents: Incident[];
  pagination: Pagination;
}

export interface IncidentDetailResponse {
  incident: Incident;
  viewerRelation: ViewerRelation;
  locations: IncidentLocation[];
  notifications: Notification[];
  notificationSummary: NotificationSummary;
}

export interface NotificationsResponse {
  notifications: Notification[];
  summary: NotificationSummary;
  pagination: Pagination;
}

export interface AnalyticsSummary {
  range: { from: string; to: string };
  generatedAt: string;
  viewerRole: Role;
  incidents: {
    total: number;
    active: number;
    resolvedInRange: number;
    offline: number;
    escalated: number;
    avgAckSeconds: number | null;
    avgResolveSeconds: number | null;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byDay: { date: string; count: number }[];
  };
  notifications: NotificationSummary;
  users?: {
    total: number;
    active: number;
    guardians: number;
    suspended: number;
    verifiedGuardianLinks: number;
  };
  auditEvents?: number;
  linkedChildren?: number;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  detail: string;
  outcome: 'SUCCESS' | 'FAILURE';
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: Pagination;
}

export const RELATIONSHIPS = [
  'MOTHER',
  'FATHER',
  'SIBLING',
  'SPOUSE',
  'FRIEND',
  'NEIGHBOUR',
  'COLLEAGUE',
  'OTHER',
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  phoneMasked: string;
  relationship: Relationship;
  email: string;
  notificationPreferences: { push: boolean; sms: boolean; whatsapp: boolean };
  isPrimary: boolean;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED';
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuardianLink {
  id: string;
  status: 'PENDING' | 'VERIFIED' | 'REVOKED' | 'DECLINED';
  initiatedBy: 'GUARDIAN' | 'CHILD';
  viewerRole: 'GUARDIAN' | 'CHILD';
  guardianId: string;
  childId: string;
  counterpart: { fullName: string; email: string; phoneMasked: string } | null;
  verifiedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface GuardianLinksResponse {
  asGuardian: GuardianLink[];
  asChild: GuardianLink[];
}

export interface AdminGuardianLink {
  id: string;
  status: 'PENDING' | 'VERIFIED' | 'REVOKED' | 'DECLINED';
  guardian: { _id: string; fullName: string; email: string; phone: string } | null;
  child: { _id: string; fullName: string; email: string; phone: string } | null;
  verifiedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface AdminGuardianLinksResponse {
  links: AdminGuardianLink[];
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken?: string;
  otpRequired?: boolean;
}

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
}

export interface SocketSession {
  userId: string;
  role: Role;
  rooms: string[];
}

export interface LiveEvent {
  event: string;
  at: string;
  payload: unknown;
}
