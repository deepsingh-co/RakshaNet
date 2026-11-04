import mongoose, { Schema, model, type Model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Emergency incident lifecycle.
 *
 * Offline honesty: an incident created while the device had no network is
 * submitted later with `offlineCreated: true` and the original device time.
 * The server never pretends it was online — it records the delay and keeps
 * the original `clientCreatedAt`.
 */
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

/** Statuses that still need attention in the command center. */
export const ACTIVE_INCIDENT_STATUSES: IncidentStatus[] = [
  'PENDING_SYNC',
  'ALERTING',
  'NOTIFIED',
  'ACKNOWLEDGED',
  'RESPONDING',
  'ESCALATED',
  'DELIVERY_FAILED',
];

export const LOCATION_SOURCES = ['GPS', 'NETWORK', 'CACHED', 'MANUAL'] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

/** Allowed status changes. Terminal states have no outgoing transitions. */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  CREATED: ['PENDING_SYNC', 'ALERTING', 'CANCELLED'],
  PENDING_SYNC: ['ALERTING', 'CANCELLED'],
  ALERTING: [
    'NOTIFIED',
    'ACKNOWLEDGED',
    'RESPONDING',
    'ESCALATED',
    'RESOLVED',
    'CANCELLED',
    'DELIVERY_FAILED',
  ],
  NOTIFIED: [
    'ACKNOWLEDGED',
    'RESPONDING',
    'ESCALATED',
    'RESOLVED',
    'CANCELLED',
    'DELIVERY_FAILED',
  ],
  ACKNOWLEDGED: ['RESPONDING', 'ESCALATED', 'RESOLVED'],
  RESPONDING: ['ESCALATED', 'RESOLVED'],
  ESCALATED: ['ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CANCELLED'],
  DELIVERY_FAILED: ['ACKNOWLEDGED', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
};

const locationSnapshotSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    accuracyMeters: { type: Number, default: null, min: 0 },
    capturedAt: { type: Date, default: null },
    source: { type: String, enum: LOCATION_SOURCES, default: 'GPS' },
  },
  { _id: false },
);

const statusEventSchema = new Schema(
  {
    status: { type: String, enum: INCIDENT_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    byUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    byRole: { type: String, default: 'SYSTEM' },
    note: { type: String, default: '', maxlength: 500 },
  },
  { _id: false },
);

const noteSchema = new Schema(
  {
    body: { type: String, required: true, maxlength: 1000 },
    byUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    byRole: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const deviceSchema = new Schema(
  {
    platform: { type: String, default: '' },
    model: { type: String, default: '' },
    appVersion: { type: String, default: '' },
  },
  { _id: false },
);

const incidentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    /** Generated on the device; makes offline retries idempotent. */
    clientIncidentId: { type: String, required: true, maxlength: 100 },

    type: { type: String, enum: INCIDENT_TYPES, default: 'SOS', index: true },
    severity: { type: String, enum: INCIDENT_SEVERITIES, default: 'CRITICAL', index: true },
    status: { type: String, enum: INCIDENT_STATUSES, default: 'ALERTING', index: true },

    description: { type: String, default: '', maxlength: 500 },

    /** Device time when the user triggered the incident. */
    startedAt: { type: Date, required: true },
    /** Device time when the request was created locally. */
    clientCreatedAt: { type: Date, default: null },
    /** Server time when the request arrived (exposes offline delay). */
    receivedAt: { type: Date, default: Date.now },

    offlineCreated: { type: Boolean, default: false, index: true },
    syncedFromOffline: { type: Boolean, default: false },

    /** Latest known location snapshot, mirrored from the Location collection. */
    location: { type: locationSnapshotSchema, default: null },

    statusHistory: { type: [statusEventSchema], default: [] },
    notes: { type: [noteSchema], default: [] },

    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    acknowledgedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    escalationLevel: { type: Number, default: 0, min: 0, max: 10 },
    lastEscalatedAt: { type: Date, default: null },

    device: { type: deviceSchema, default: null },
  },
  { timestamps: true },
);

incidentSchema.index({ userId: 1, clientIncidentId: 1 }, { unique: true });
incidentSchema.index({ userId: 1, startedAt: -1 });
incidentSchema.index({ status: 1, startedAt: -1 });
incidentSchema.index({ status: 1, lastEscalatedAt: 1 });

export type IncidentDoc = InferSchemaType<typeof incidentSchema> & { _id: Types.ObjectId };
export const Incident =
  (mongoose.models.Incident as Model<InferSchemaType<typeof incidentSchema>>) ??
  model('Incident', incidentSchema);

/** Terminal states cannot be changed again. */
export function isTerminal(status: IncidentStatus): boolean {
  return status === 'RESOLVED' || status === 'CANCELLED';
}

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return INCIDENT_TRANSITIONS[from]?.includes(to) ?? false;
}
