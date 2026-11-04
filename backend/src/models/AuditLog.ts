import { Schema, model, models, type Model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Append-only audit trail. The API never exposes update/delete for these
 * records; only inserts happen through the audit service.
 */
export const AUDIT_ACTIONS = [
  'AUTH_REGISTER',
  'AUTH_LOGIN',
  'AUTH_LOGIN_FAILED',
  'AUTH_REFRESH',
  'AUTH_REFRESH_REUSE_DETECTED',
  'AUTH_LOGOUT',
  'AUTH_LOGOUT_ALL',
  'AUTH_PASSWORD_RESET_REQUESTED',
  'AUTH_PASSWORD_RESET',
  'OTP_VERIFIED',
  'PROFILE_UPDATED',
  'ACCOUNT_DELETION_REQUESTED',
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'CONTACT_DELETED',
  'CONTACT_VERIFIED',
  'INCIDENT_CREATED',
  'INCIDENT_STATUS_CHANGED',
  'INCIDENT_ACKNOWLEDGED',
  'INCIDENT_RESOLVED',
  'INCIDENT_NOTE_ADDED',
  'LOCATION_ACCESSED',
  'GUARDIAN_LINK_CREATED',
  'GUARDIAN_LINK_REVOKED',
  'ADMIN_ACTION',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const auditSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorRole: { type: String, default: '' },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    resourceType: { type: String, default: '' },
    resourceId: { type: String, default: '', index: true },
    /** Never store raw PII beyond what the action needs. */
    detail: { type: String, default: '' },
    outcome: { type: String, enum: ['SUCCESS', 'FAILURE'], default: 'SUCCESS', index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditSchema.index({ createdAt: -1 });

export type AuditDoc = InferSchemaType<typeof auditSchema> & { _id: Types.ObjectId };
export const AuditLog =
  (models.AuditLog as Model<InferSchemaType<typeof auditSchema>>) ??
  model('AuditLog', auditSchema);
