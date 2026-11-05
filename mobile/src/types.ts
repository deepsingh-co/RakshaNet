/**
 * Wire types mirror the backend's public serializers. Keep them in sync with
 * backend/src/services/serialize.ts, incidentView.ts and the route schemas.
 */

export type UserRole = 'USER' | 'GUARDIAN' | 'ADMIN';
export type AccountType = 'INDIVIDUAL' | 'GUARDIAN' | 'CHILD';

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: string;
  role: UserRole;
  accountType: AccountType;
  status: 'ACTIVE' | 'SUSPENDED' | string;
  phoneVerified: boolean;
  emailVerified: boolean;
  guardianId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
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

export type IncidentType = 'SOS' | 'FALL_DETECTED' | 'VOICE_TRIGGER' | 'MANUAL';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus =
  | 'CREATED'
  | 'PENDING_SYNC'
  | 'ALERTING'
  | 'NOTIFIED'
  | 'ACKNOWLEDGED'
  | 'RESPONDING'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'DELIVERY_FAILED';

export const ACTIVE_INCIDENT_STATUSES: IncidentStatus[] = [
  'PENDING_SYNC',
  'ALERTING',
  'NOTIFIED',
  'ACKNOWLEDGED',
  'RESPONDING',
  'ESCALATED',
  'DELIVERY_FAILED',
];

export type LocationSource = 'GPS' | 'NETWORK' | 'CACHED' | 'MANUAL';

export interface LocationInput {
  lat: number;
  lng: number;
  accuracyMeters?: number | null;
  speedMps?: number | null;
  headingDeg?: number | null;
  batteryLevel?: number | null;
  source: LocationSource;
  capturedAt: string;
  offlineCaptured?: boolean;
  clientLocationId?: string;
}

export interface LocationPoint extends LocationInput {
  id: string;
  incidentId: string;
  clientLocationId: string;
  receivedAt: string;
  ageSeconds: number;
  isStale: boolean;
}

export interface IncidentOwner {
  id: string;
  fullName: string;
  email: string;
  phoneMasked: string;
  role: string;
  accountType: string;
}

export interface StatusHistoryEntry {
  status: IncidentStatus;
  at: string;
  byUserId: string | null;
  byRole: string;
  note: string;
}

export interface IncidentNote {
  id?: string;
  body: string;
  byUserId: string;
  byRole: string;
  /** Backend stores note timestamps as `at`. */
  at: string;
  createdAt?: string;
}

export interface IncidentLocationSnapshot {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  capturedAt: string | null;
  source: LocationSource;
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
  statusHistory: StatusHistoryEntry[];
  notes: IncidentNote[];
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  escalationLevel: number;
  lastEscalatedAt: string | null;
  device: { platform: string; model: string; appVersion: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  incidentId: string;
  contactId: string | null;
  channel: 'SMS' | 'WHATSAPP' | 'PUSH' | string;
  destinationMasked: string;
  status: string;
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

export interface IncidentsResponse {
  incidents: Incident[];
  pagination: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface IncidentDetailResponse {
  incident: Incident;
  viewerRelation: 'OWNER' | 'GUARDIAN' | 'ADMIN';
  locations: LocationPoint[];
  notifications: NotificationRecord[];
  notificationSummary: NotificationSummary;
}

export interface DeviceInfo {
  platform: string;
  model: string;
  appVersion: string;
}

export interface IncidentCreatePayload {
  clientIncidentId: string;
  type: IncidentType;
  severity?: IncidentSeverity;
  description?: string;
  startedAt: string;
  clientCreatedAt?: string;
  offlineCreated?: boolean;
  location?: LocationInput;
  locations?: LocationInput[];
  device?: DeviceInfo;
}

export interface IncidentSyncResult {
  ok: boolean;
  clientIncidentId: string;
  serverId?: string;
  status?: IncidentStatus;
  deduplicated?: boolean;
  notifications?: NotificationSummary;
  offlineDelaySeconds?: number;
  error?: { code: string; message: string };
}

export interface IncidentSyncResponse {
  results: IncidentSyncResult[];
  accepted: number;
  duplicates: number;
  failed: number;
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  phoneMasked: string;
  relationship: string;
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
  status: 'PENDING' | 'VERIFIED' | 'REVOKED';
  initiatedBy: 'GUARDIAN' | 'CHILD';
  viewerRole: 'GUARDIAN' | 'CHILD';
  guardianId: string;
  childId: string;
  counterpart: {
    fullName: string;
    email: string;
    phoneMasked: string;
  } | null;
  verifiedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface GuardianLinksResponse {
  asGuardian: GuardianLink[];
  asChild: GuardianLink[];
}

export const RELATIONSHIPS = [
  'MOTHER',
  'FATHER',
  'SPOUSE',
  'SIBLING',
  'FRIEND',
  'GUARDIAN',
  'COLLEAGUE',
  'NEIGHBOUR',
  'OTHER',
] as const;

export type Relationship = (typeof RELATIONSHIPS)[number];

/* ------------------------------------------------------------------ */
/* Safety assistant (Gnani Prisma v3.0 STT + local intent)             */
/* ------------------------------------------------------------------ */

export type SafetyIntent =
  | 'EMERGENCY_SOS'
  | 'SHARE_LOCATION'
  | 'START_JOURNEY'
  | 'CHECK_IN'
  | 'CALL_CONTACT'
  | 'CANCEL_SOS'
  | 'GENERAL_HELP'
  | 'UNKNOWN';

export type SafetyAction =
  | 'OPEN_SOS'
  | 'SHARE_LOCATION'
  | 'START_JOURNEY'
  | 'CHECK_IN'
  | 'CALL_CONTACT'
  | 'CANCEL_SOS'
  | 'NONE';

export type SafetySeverity = IncidentSeverity;

export interface SafetyInterpretation {
  intent: SafetyIntent;
  severity: SafetySeverity;
  confidence: number;
  reply: string;
  action: SafetyAction;
  ambiguous: boolean;
  requiresConfirmation: boolean;
  language: string;
  provider: 'local-intent';
  mode: 'local';
  simulated: false;
  degraded: boolean;
  providerError?: string;
  transcript?: string;
  detectedLanguageCode?: string;
  at: string;
}

export interface GnaniTranscription {
  provider: 'gnani';
  model: string;
  requestId: string;
  transcript: string;
  detectedLanguageCode: string | null;
  processingTime: number | null;
  endToEndLatency: number | null;
  truncated: boolean;
  simulated: false;
}

export interface SafetyInterpretResponse {
  interpretation: SafetyInterpretation;
  honesty: {
    provider: 'local-intent';
    simulated: false;
    degraded: boolean;
    autoDispatch: false;
    autoIncidentCreation: false;
    requiresConfirmation: boolean;
    manualSosAvailable: true;
    note: string;
  };
}

export interface SafetyTranscribeResponse {
  transcription: GnaniTranscription;
  interpretation: SafetyInterpretation;
  honesty: {
    provider: 'gnani';
    model: string;
    simulated: false;
    degraded: boolean;
    autoDispatch: false;
    autoIncidentCreation: false;
    requiresConfirmation: boolean;
    manualSosAvailable: true;
    note: string;
  };
}

export interface SafetyStatusResponse {
  ok: boolean;
  provider: {
    name: string;
    model: string;
    mode: 'console' | 'live';
    configured: boolean;
    liveAvailable: boolean;
    sttEndpoint: string;
    textIntent: 'local';
  };
  capabilities: {
    speechToText: boolean;
    speechToTextAvailable: boolean;
    textInterpretation: boolean;
    textToSpeech: boolean;
    autoDispatch: false;
    autoIncidentCreation: false;
  };
  audio: {
    maxSeconds: number;
    maxUploadBytes: number;
    formats: string[];
  };
  languages: string[];
  intents: SafetyIntent[];
  honesty: {
    simulated: boolean;
    liveSttAvailable: boolean;
    localIntent: boolean;
    autoDispatch: false;
    requiresConfirmation: boolean;
    manualSosAvailable: boolean;
    note: string;
  };
}

