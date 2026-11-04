import mongoose, { Schema, model, type Model, type InferSchemaType, type Types } from 'mongoose';

/**
 * Per-recipient, per-channel delivery record.
 *
 * SENT means the provider accepted the message. DELIVERED is only ever set
 * by a verified provider webhook — the backend never assumes delivery.
 */
export const NOTIFICATION_CHANNELS = ['SMS', 'WHATSAPP', 'PUSH'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = [
  'QUEUED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'PENDING_SYNC',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

const notificationSchema = new Schema(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
    /** Incident owner — used for owner-scoped queries. */
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'TrustedContact', default: null, index: true },
    /** Present when the recipient is a registered app user (future push). */
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    destinationMasked: { type: String, default: '' },

    status: { type: String, enum: NOTIFICATION_STATUSES, default: 'QUEUED', index: true },

    provider: { type: String, default: '' },
    providerMessageId: { type: String, default: '', index: true },
    /** True only for the explicit dev console transport. */
    simulated: { type: Boolean, default: false },

    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, default: '' },

    queuedAt: { type: Date, default: Date.now },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },

    /** `${incidentId}:${contactId}:${channel}` — prevents duplicate sends. */
    idempotencyKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ incidentId: 1, status: 1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & {
  _id: Types.ObjectId;
};
export const Notification =
  (mongoose.models.Notification as Model<InferSchemaType<typeof notificationSchema>>) ??
  model('Notification', notificationSchema);
